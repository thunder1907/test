"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getUserRole } from "@/lib/roles";

interface Complaint {
  id?: string;
  product_type: string;
  date: string;
  category: string;
  text: string;
  resolve_status: string;
  email: string;
  priority: string;
}

export default function DashboardPage() {
  const [role, setRole] = useState<"owner" | "employee">("employee");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

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

        // Fetch complaints from Supabase
        const query = supabase.from("Complain_Data").select("*");
        
        if (userRole === "employee") {
          query.eq("email", email);
        }
        
        const { data } = await query;

        if (data) {
          // Sort logic: High > Medium > Low
          const priorityOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
          const sorted = [...data].sort((a, b) => {
            const aPrio = priorityOrder[a.priority] ?? 3;
            const bPrio = priorityOrder[b.priority] ?? 3;
            if (aPrio !== bPrio) return aPrio - bPrio;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          });
          setComplaints(sorted);
        }
        setLoading(false);
      }
    });
  }, []);

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

  return (
    <div className={`min-h-screen p-6 ${role === "owner" ? "bg-slate-900 text-white" : "bg-white"}`}>
      {/* Role Debug Banner */}
      <div className={`text-[10px] uppercase font-bold text-center py-1 mb-4 rounded ${role === "owner" ? "bg-indigo-600" : "bg-slate-100 text-slate-400"}`}>
        Logged in as: {userEmail} • Mode: {role.toUpperCase()}
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className={`text-3xl font-black ${role === "owner" ? "text-white" : "text-slate-900"}`}>
              {role === "owner" ? "OWNER TERMINAL" : `Hi, ${userName} 👋`}
            </h1>
            <p className={`text-sm ${role === "owner" ? "text-slate-400" : "text-slate-500"}`}>
              {role === "owner" ? "Master control for all enterprise complaints" : "Track your complaint progress below"}
            </p>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
            className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${role === "owner" ? "bg-white text-slate-900 hover:bg-slate-200" : "bg-red-50 text-red-600 hover:bg-red-100"}`}
          >
            Logout
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
          {[
            { label: "Total", val: stats.total, color: role === "owner" ? "bg-slate-800" : "bg-blue-50" },
            { label: "Pending", val: stats.pending, color: "bg-amber-50" },
            { label: "Critical", val: stats.critical, color: "bg-red-50" },
            { label: "Resolved", val: stats.resolved, color: "bg-green-50" }
          ].map(s => (
            <div key={s.label} className={`p-6 rounded-2xl border ${s.color} ${role === "owner" ? "border-slate-700" : "border-slate-100 shadow-sm"}`}>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{s.label}</p>
              <p className={`text-3xl font-black ${role === "owner" ? "text-white" : "text-slate-900"}`}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* List */}
        <div className={`rounded-3xl border ${role === "owner" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100 shadow-xl"}`}>
          <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
            <h2 className="font-bold tracking-tight">
              {role === "owner" ? "URGENT ACTION QUEUE" : "MY COMPLAINTS"}
            </h2>
            {role === "owner" && (
              <span className="text-[10px] bg-red-600 text-white font-black px-2 py-1 rounded">PRIORITY SORT ACTIVE</span>
            )}
          </div>

          {loading ? (
            <div className="p-20 text-center animate-pulse">Loading intelligence...</div>
          ) : complaints.length === 0 ? (
            <div className="p-20 text-center text-slate-500">No active complaints found.</div>
          ) : (
            <div className="divide-y divide-slate-700/30">
              {complaints.map((item, idx) => {
                const style = statusStyle(item.resolve_status);
                const pStyle = prioStyle(item.priority);
                return (
                  <div key={item.id || idx} className={`p-6 transition-colors ${role === "owner" ? "hover:bg-slate-700/50" : "hover:bg-slate-50"}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-[9px] font-black px-2 py-1 rounded uppercase shadow-sm" style={pStyle}>
                            {item.priority || "Low"}
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-1 rounded uppercase ${role === "owner" ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
                            {item.category || "General"}
                          </span>
                        </div>
                        <h3 className={`text-lg font-bold mb-4 ${role === "owner" ? "text-white" : "text-slate-900"}`}>{item.text}</h3>
                        
                        <div className="flex flex-wrap items-center gap-6 text-[11px] font-medium text-slate-400">
                          <span>PRODUCT: <b className={role === "owner" ? "text-slate-200" : "text-slate-700"}>{item.product_type}</b></span>
                          <span>DATE: <b className={role === "owner" ? "text-slate-200" : "text-slate-700"}>{item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}</b></span>
                          {role === "owner" && (
                            <span className="bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded">FROM: {item.email}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg" style={style}>
                          {style.label}
                        </span>
                        {role === "owner" && (
                          <div className="mt-6">
                            <button className="text-[10px] font-black text-indigo-400 hover:text-white underline decoration-2 underline-offset-4 uppercase tracking-tighter transition-all">
                              Process Complaint →
                            </button>
                          </div>
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
    </div>
  );
}
