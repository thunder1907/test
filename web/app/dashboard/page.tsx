"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { getUserRole } from "@/lib/roles";

interface Complaint {
  complaint_id?: number | string;
  product_type: string;
  date: string;
  category: string;
  text: string;
  resolve_status: string;
  email: string;
  priority: string;
  sentiment?: number;
}

export default function DashboardPage() {
  const [role, setRole] = useState<"owner" | "employee">("employee");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  // Search, Sort & Filter State (Owner only)
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "priority" | "date" | "status">("newest");
  const [filterBy, setFilterBy] = useState<"all" | "pending" | "resolved" | "high" | "pinned">("all");

  // Pin/Flag State (persisted in localStorage)
  const [pinnedIds, setPinnedIds] = useState<Set<string | number>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("pinnedComplaints");
        return saved ? new Set(JSON.parse(saved)) : new Set();
      } catch { return new Set(); }
    }
    return new Set();
  });

  // Customer Profile Modal State
  const [profileEmail, setProfileEmail] = useState<string | null>(null);

  // AI Modal State
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const togglePin = (id: string | number | undefined) => {
    if (!id) return;
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      localStorage.setItem("pinnedComplaints", JSON.stringify([...next]));
      return next;
    });
  };

  const fetchComplaints = async (userRole: string, email: string) => {
    // Order by complaint_id descending so the random large IDs we generate 
    // for new complaints appear at the very top, above the old CSV data.
    const query = supabase.from("Complain_Data").select("*").order("complaint_id", { ascending: false }).limit(5000);
    if (userRole === "employee") {
      query.eq("email", email);
    }
    const { data } = await query;

    if (data) {
      const priorityOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
      const sorted = [...data].sort((a, b) => {
        // Unprocessed new complaints (no priority yet) should be at the VERY TOP (-1) so owners can see them instantly.
        const aPrio = a.priority ? (priorityOrder[a.priority] ?? 3) : -1;
        const bPrio = b.priority ? (priorityOrder[b.priority] ?? 3) : -1;
        if (aPrio !== bPrio) return aPrio - bPrio;
        const aSent = a.sentiment !== undefined && a.sentiment !== null ? Number(a.sentiment) : 0;
        const bSent = b.sentiment !== undefined && b.sentiment !== null ? Number(b.sentiment) : 0;
        if (aSent !== bSent) return aSent - bSent;
        
        // Tie-breaker: use complaint_id (highest means newest) instead of date (which is purchase date)
        const aId = Number(a.complaint_id) || 0;
        const bId = Number(b.complaint_id) || 0;
        return bId - aId;
      });
      setComplaints(sorted);
    }
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const email = session.user.email || "";
        const userRole = getUserRole(email);
        
        setRole(userRole);
        setUserEmail(email);
        setUserName(
          session.user.user_metadata?.full_name ||
            email.split("@")[0] ||
            "User"
        );

        fetchComplaints(userRole, email);
      }
    });
  }, []);

  const openProcessModal = async (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setAnalysisResult(null);
    setAnalyzing(true);
    
    try {
      const res = await fetch("http://127.0.0.1:5001/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaint: complaint.text })
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysisResult(data);
      } else {
        console.error("Analysis API returned an error");
      }
    } catch (err) {
      console.error("Analysis failed", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleProcess = async (complaint_id: number | string | undefined) => {
    if (!complaint_id) return;
    
    // Optimistically update UI
    setComplaints(prev => prev.map(c => 
      c.complaint_id === complaint_id ? { ...c, resolve_status: "resolved" } : c
    ));

    const { error } = await supabase
      .from("Complain_Data")
      .update({ resolve_status: "resolved" })
      .eq("complaint_id", complaint_id);

    if (error) {
      console.error("Failed to update status:", error);
      // Revert if error
      fetchComplaints(role, userEmail);
    }
  };

  // Filtered + sorted complaints for owner view
  const displayedComplaints = useMemo(() => {
    let filtered = [...complaints];

    // 1. Keyword search — match against text, email, category, product_type
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        (c.text || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.category || "").toLowerCase().includes(q) ||
        (c.product_type || "").toLowerCase().includes(q)
      );
    }

    // 2. Quick filter pills
    if (filterBy === "pending") filtered = filtered.filter(c => c.resolve_status === "submitted");
    if (filterBy === "resolved") filtered = filtered.filter(c => c.resolve_status === "resolved");
    if (filterBy === "high") filtered = filtered.filter(c => c.priority === "High");
    if (filterBy === "pinned") filtered = filtered.filter(c => c.complaint_id && pinnedIds.has(c.complaint_id));

    // 3. Sort — pinned always float to the top
    const priorityOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
    filtered.sort((a, b) => {
      const aPinned = a.complaint_id && pinnedIds.has(a.complaint_id) ? 1 : 0;
      const bPinned = b.complaint_id && pinnedIds.has(b.complaint_id) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned; // pinned first

      switch (sortBy) {
        case "priority": {
          const ap = a.priority ? (priorityOrder[a.priority] ?? 3) : -1;
          const bp = b.priority ? (priorityOrder[b.priority] ?? 3) : -1;
          return ap - bp;
        }
        case "date":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "status": {
          const statusOrder: Record<string, number> = { submitted: 0, resolved: 1 };
          return (statusOrder[a.resolve_status] ?? 2) - (statusOrder[b.resolve_status] ?? 2);
        }
        case "newest":
        default:
          return (Number(b.complaint_id) || 0) - (Number(a.complaint_id) || 0);
      }
    });

    return filtered;
  }, [complaints, searchQuery, sortBy, filterBy, pinnedIds]);

  // Customer profile data
  const profileData = useMemo(() => {
    if (!profileEmail) return null;
    const userComplaints = complaints.filter(c => c.email === profileEmail);
    const total = userComplaints.length;
    const resolved = userComplaints.filter(c => c.resolve_status === "resolved").length;
    const pending = userComplaints.filter(c => c.resolve_status === "submitted").length;
    const highPriority = userComplaints.filter(c => c.priority === "High").length;
    const categories = [...new Set(userComplaints.map(c => c.category).filter(Boolean))];
    const products = [...new Set(userComplaints.map(c => c.product_type).filter(Boolean))];
    return { email: profileEmail, complaints: userComplaints, total, resolved, pending, highPriority, categories, products };
  }, [profileEmail, complaints]);

  const stats = {
    total: complaints.length,
    pending: complaints.filter((c) => c.resolve_status === "submitted").length,
    critical: complaints.filter((c) => c.priority === "High").length,
    resolved: complaints.filter((c) => c.resolve_status === "resolved").length,
  };

  const statusStyle = (status: string) => {
    switch (status) {
      case "submitted":
        return { background: "#fffbeb", color: "#d97706", label: "Pending" };
      case "resolved":
        return { background: "#ecfdf5", color: "#059669", label: "Resolved" };
      default:
        return { background: "#f3f4f6", color: "#6b7280", label: status };
    }
  };

  const prioStyle = (prio: string) => {
    switch (prio) {
      case "High":
        return { background: "#fee2e2", color: "#b91c1c" };
      case "Medium":
        return { background: "#fef3c7", color: "#b45309" };
      default:
        return { background: "#dcfce7", color: "#15803d" };
    }
  };

  const statsData = [
    { label: "Total Complaints", val: stats.total, color: "border-indigo-100 bg-indigo-50/50 text-indigo-900", accent: "text-indigo-600" },
    { label: "Pending Review", val: stats.pending, color: "border-amber-100 bg-amber-50/50 text-amber-900", accent: "text-amber-600" },
    { label: "Critical Priority", val: stats.critical, color: "border-rose-100 bg-rose-50/50 text-rose-900", accent: "text-rose-600" },
    { label: "Successfully Resolved", val: stats.resolved, color: "border-emerald-100 bg-emerald-50/50 text-emerald-900", accent: "text-emerald-600" }
  ];

  return (
    <div className="min-h-screen p-6 bg-slate-50 text-slate-900 selection:bg-indigo-100">
      {/* Role Debug Banner */}
      {role === "owner" && (
        <div className="flex justify-center mb-8">
          <div className="text-[10px] uppercase font-black tracking-widest py-1.5 px-5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            ROOT ACCESS: {userEmail}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto pb-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">
              {role === "owner" ? "OWNER TERMINAL" : `Hi, ${userName} 👋`}
            </h1>
            <p className="text-sm mt-1.5 font-medium text-slate-500">
              {role === "owner" ? "Enterprise master control and intelligence dashboard." : "Track your complaint progress below."}
            </p>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
            className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm transition-all"
          >
            Logout
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
          {statsData.map(s => (
            <div key={s.label} className={`p-6 rounded-3xl border ${s.color} shadow-sm transition-transform hover:-translate-y-1`}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">{s.label}</p>
              <p className={`text-4xl font-black tracking-tighter ${s.accent}`}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* List */}
        <div className="rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <h2 className="font-bold tracking-tight text-lg text-slate-800">
                {role === "owner" ? "URGENT ACTION QUEUE" : "MY COMPLAINTS"}
              </h2>
              {role === "owner" && (
                <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
                  {searchQuery ? `${displayedComplaints.length} RESULTS` : "AI PRIORITY SORT ACTIVE"}
                </span>
              )}
            </div>

            {/* Search + Sort + Filter — Owner Only */}
            {role === "owner" && (
              <div className="flex flex-col gap-3">
                {/* Search Bar */}
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                  <input
                    type="text"
                    placeholder="Search by keyword, email, category, product..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold bg-slate-100 hover:bg-slate-200 rounded-full w-5 h-5 flex items-center justify-center transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  {/* Filter Pills */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {(["all", "pending", "resolved", "high", "pinned"] as const).map((f) => {
                      const labels: Record<string, string> = { all: "All", pending: "⏳ Pending", resolved: "✅ Resolved", high: "🔴 High Priority", pinned: "📌 Pinned" };
                      const isActive = filterBy === f;
                      return (
                        <button
                          key={f}
                          onClick={() => setFilterBy(f)}
                          className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                            isActive
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200"
                              : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700"
                          }`}
                        >
                          {labels[f]}
                        </button>
                      );
                    })}
                  </div>

                  {/* Sort Dropdown */}
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sort</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer"
                    >
                      <option value="newest">Newest First</option>
                      <option value="priority">Priority (High → Low)</option>
                      <option value="date">Purchase Date</option>
                      <option value="status">Status (Pending First)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="p-32 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-slate-500">Loading intelligence...</p>
            </div>
          ) : (role === "owner" ? displayedComplaints : complaints).length === 0 ? (
            <div className="p-32 text-center text-slate-500 font-medium">
              {searchQuery ? "No complaints match your search." : "No active complaints found in the database."}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {(role === "owner" ? displayedComplaints : complaints).map((item, idx) => {
                const style = statusStyle(item.resolve_status);
                const pStyle = prioStyle(item.priority);
                const isResolved = item.resolve_status === "resolved";
                
                const isPinned = item.complaint_id ? pinnedIds.has(item.complaint_id) : false;
                
                return (
                  <div key={item.complaint_id || idx} className={`p-6 transition-all duration-200 hover:bg-slate-50 ${isResolved ? "opacity-50 grayscale bg-slate-50/50" : ""} ${isPinned ? "border-l-4 border-l-amber-400 bg-amber-50/30" : ""}`}>
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          {role === "owner" && (
                            <button
                              onClick={() => togglePin(item.complaint_id)}
                              title={isPinned ? "Unpin complaint" : "Pin complaint"}
                              className={`text-sm transition-all duration-200 hover:scale-125 ${isPinned ? "text-amber-500" : "text-slate-300 hover:text-amber-400"}`}
                            >
                              📌
                            </button>
                          )}
                          <span className="text-[10px] font-black px-3 py-1 rounded-md uppercase tracking-wider border" style={{ ...pStyle, borderColor: "currentColor", opacity: 0.8 }}>
                            {item.priority || "Low"}
                          </span>
                          <span className="text-[10px] font-bold px-3 py-1 rounded-md uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                            {item.category || "General"}
                          </span>
                          {isPinned && (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200">
                              Pinned
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold mb-4 leading-snug text-slate-900">{item.text}</h3>
                        
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <span className="uppercase tracking-widest text-[9px] font-bold text-slate-400">Product</span> 
                            <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{item.product_type}</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="uppercase tracking-widest text-[9px] font-bold text-slate-400">Date</span> 
                            <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}</span>
                          </span>
                          {role === "owner" && (
                            <button
                              onClick={() => setProfileEmail(item.email)}
                              className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-md flex items-center gap-1.5 hover:bg-indigo-100 hover:border-indigo-200 transition-colors cursor-pointer"
                            >
                              <span className="uppercase tracking-widest text-[9px] font-bold opacity-70">User</span> 
                              {item.email}
                              <span className="text-[9px] opacity-50">→</span>
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex md:flex-col items-center md:items-end justify-between gap-4 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 w-full md:w-auto">
                        <span className="text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm" style={style}>
                          {style.label}
                        </span>
                        {role === "owner" && !isResolved && (
                          <button 
                            onClick={() => openProcessModal(item)}
                            className="text-[10px] font-black px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl uppercase tracking-widest transition-all duration-200 shadow-md shadow-indigo-200 hover:shadow-lg hover:-translate-y-0.5"
                          >
                            Process Complaint
                          </button>
                        )}
                        {role === "owner" && isResolved && (
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-5 py-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                            ✓ Resolved
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* AI Processing Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                  <span className="text-indigo-600 text-2xl">⚡</span> AI Intelligence Analysis
                </h2>
                <p className="text-[10px] font-bold text-slate-500 mt-1.5 uppercase tracking-widest flex items-center gap-2">
                  <span className="bg-slate-200 px-2 py-0.5 rounded text-slate-700">#{selectedComplaint.complaint_id}</span>
                  <span>From: {selectedComplaint.email}</span>
                </p>
              </div>
              <button 
                onClick={() => setSelectedComplaint(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-8 bg-slate-50/50">
              {/* Original Complaint */}
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Original Text
                </p>
                <div className="p-5 bg-white rounded-2xl border border-slate-200 text-slate-700 text-sm leading-relaxed italic shadow-sm">
                  "{selectedComplaint.text}"
                </div>
              </div>

              {analyzing ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-6">
                  <div className="relative">
                    <div className="w-14 h-14 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-lg">🧠</div>
                  </div>
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest animate-pulse">Running neural classification...</p>
                </div>
              ) : analysisResult ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  {/* KPI Bar */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                      <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-2">Category Mapping</p>
                      <p className="font-black text-indigo-600 text-lg">{analysisResult.category}</p>
                    </div>
                    <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                      <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-2">System Priority</p>
                      <p className={`font-black text-lg ${analysisResult.priority === 'High' ? 'text-rose-600' : analysisResult.priority === 'Medium' ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {analysisResult.priority}
                      </p>
                    </div>
                    <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                      <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-2">Flag Status</p>
                      <p className={`font-black text-lg flex items-center gap-2 ${analysisResult.status === 'Suspicious' ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {analysisResult.status === 'Suspicious' ? '⚠️' : '✓'} {analysisResult.status}
                      </p>
                    </div>
                  </div>

                  {/* Logic and Reasons */}
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> AI Logic & Flags
                    </p>
                    <ul className="space-y-2">
                      {analysisResult.reason?.map((r: string, i: number) => (
                        <li key={i} className="text-sm font-medium text-slate-700 bg-amber-50/50 p-4 rounded-xl border border-amber-100 flex items-start gap-3 shadow-sm">
                          <span className="text-amber-500 mt-0.5 text-xs">▹</span> {r}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Recommended Actions
                    </p>
                    <ul className="space-y-2">
                      {analysisResult.actions?.map((act: string, i: number) => (
                        <li key={i} className="text-sm font-medium text-slate-700 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex items-start gap-3 shadow-sm">
                          <span className="text-emerald-500 mt-0.5 text-xs">✓</span> {act}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center">
                  <p className="text-rose-700 font-bold text-sm">Failed to connect to the Intelligence Engine.</p>
                  <p className="text-rose-600/70 text-xs mt-1">Make sure app.py is running on port 5001.</p>
                </div>
              )}
            </div>
            
            {/* Footer Actions */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Action Required
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setSelectedComplaint(null)}
                  className="px-6 py-3 rounded-xl font-bold text-[11px] uppercase tracking-wider text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors border border-transparent hover:border-slate-300"
                >
                  Close
                </button>
                <button 
                  onClick={() => {
                    handleProcess(selectedComplaint.complaint_id);
                    setSelectedComplaint(null);
                  }}
                  disabled={analyzing}
                  className="px-8 py-3 rounded-xl font-black text-[11px] uppercase tracking-wider bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  Mark as Resolved
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Profile Modal */}
      {profileEmail && profileData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Profile Header */}
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-violet-50">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-indigo-200">
                    {profileData.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">{profileData.email.split("@")[0]}</h2>
                    <p className="text-xs text-slate-500 font-medium">{profileData.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setProfileEmail(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/80 text-slate-500 hover:text-slate-900 hover:bg-white transition-colors shadow-sm"
                >
                  ✕
                </button>
              </div>

              {/* Profile Stats */}
              <div className="grid grid-cols-4 gap-3 mt-5">
                <div className="bg-white/80 rounded-xl p-3 text-center shadow-sm">
                  <p className="text-2xl font-black text-indigo-600">{profileData.total}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total</p>
                </div>
                <div className="bg-white/80 rounded-xl p-3 text-center shadow-sm">
                  <p className="text-2xl font-black text-amber-600">{profileData.pending}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pending</p>
                </div>
                <div className="bg-white/80 rounded-xl p-3 text-center shadow-sm">
                  <p className="text-2xl font-black text-emerald-600">{profileData.resolved}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Resolved</p>
                </div>
                <div className="bg-white/80 rounded-xl p-3 text-center shadow-sm">
                  <p className="text-2xl font-black text-rose-600">{profileData.highPriority}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Critical</p>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mt-4">
                {profileData.categories.map(c => (
                  <span key={c} className="text-[9px] font-bold uppercase tracking-wider bg-white/80 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">{c}</span>
                ))}
                {profileData.products.map(p => (
                  <span key={p} className="text-[9px] font-bold uppercase tracking-wider bg-indigo-100/80 text-indigo-600 px-2 py-0.5 rounded-md border border-indigo-200">{p}</span>
                ))}
              </div>
            </div>

            {/* Complaint History */}
            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">All Complaints ({profileData.total})</p>
              <div className="space-y-2">
                {profileData.complaints.map((c, i) => {
                  const s = statusStyle(c.resolve_status);
                  const p = prioStyle(c.priority);
                  return (
                    <div key={c.complaint_id || i} className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors bg-slate-50/50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{c.text}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border" style={{ ...p, borderColor: "currentColor" }}>{c.priority || "—"}</span>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-slate-100 text-slate-500">{c.category}</span>
                            <span className="text-[9px] text-slate-400 ml-auto">{c.date ? new Date(c.date).toLocaleDateString() : "—"}</span>
                          </div>
                        </div>
                        <span className="text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shrink-0" style={s}>{s.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <p className="text-[10px] font-bold text-slate-400">Resolution Rate: <span className="text-emerald-600 font-black">{profileData.total > 0 ? Math.round((profileData.resolved / profileData.total) * 100) : 0}%</span></p>
              <button
                onClick={() => { setSearchQuery(profileData.email); setProfileEmail(null); }}
                className="text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Filter Dashboard by User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
