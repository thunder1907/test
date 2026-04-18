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
}

export default function HistoryPage() {
  const [role, setRole] = useState<"owner" | "employee">("employee");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("All");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const userRole = getUserRole(session.user.email);
        setRole(userRole);

        // Fetch complaints from Supabase
        if (userRole === "employee") {
          const { data } = await supabase
            .from("Complain_Data")
            .select("*")
            .eq("email", session.user.email)
            .order("complaint_id", { ascending: false })
            .limit(5000);

          if (data) setComplaints(data);
        } else {
          // Owner sees ALL complaints
          const { data } = await supabase
            .from("Complain_Data")
            .select("*")
            .order("complaint_id", { ascending: false })
            .limit(5000);

          if (data) setComplaints(data);
        }
        setLoading(false);
      }
    });
  }, []);

  const statusStyle = (status: string) => {
    switch (status) {
      case "submitted":
        return { background: "#fffbeb", color: "#d97706", label: "Submitted" };
      case "in_progress":
        return { background: "#eff6ff", color: "#2563eb", label: "In Progress" };
      case "resolved":
        return { background: "#ecfdf5", color: "#059669", label: "Resolved" };
      case "rejected":
        return { background: "#fef2f2", color: "#dc2626", label: "Rejected" };
      default:
        return { background: "#f3f4f6", color: "#6b7280", label: status };
    }
  };

  const filtered =
    filter === "All"
      ? complaints
      : complaints.filter(
          (c) => c.resolve_status === filter || c.product_type === filter || c.category === filter
        );

  const filters = ["All", "submitted", "in_progress", "resolved", "rejected"];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "#111827" }}>
            Complaint History
          </h1>
          <p className="text-sm" style={{ color: "#6b7280" }}>
            {role === "employee" ? "Your" : "All"} registered complaints and their current status
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="text-xs px-3.5 py-1.5 rounded-full font-medium transition-all duration-150 capitalize border"
            style={{
              background: filter === f ? "#6d28d9" : "#ffffff",
              color: filter === f ? "#ffffff" : "#6b7280",
              borderColor: filter === f ? "#6d28d9" : "#e5e7eb",
            }}
          >
            {f === "submitted" ? "Pending" : f}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-xl p-10 border text-center"
          style={{ background: "#ffffff", borderColor: "#e5e7eb" }}
        >
          <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "#f3f4f6" }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium" style={{ color: "#374151" }}>
            {complaints.length === 0
              ? "No complaints registered yet"
              : "No complaints match this filter"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item, idx) => {
            const style = statusStyle(item.resolve_status);
            return (
              <div
                key={item.id || idx}
                className="rounded-xl p-5 border animate-fade-in-up"
                style={{
                  background: "#ffffff",
                  borderColor: "#e5e7eb",
                  boxShadow: "var(--shadow-sm)",
                  animationDelay: `${idx * 40}ms`,
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <p className="text-sm font-medium pr-4" style={{ color: "#111827" }}>
                    &ldquo;{item.text}&rdquo;
                  </p>
                  <span
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0"
                    style={{ background: style.background, color: style.color }}
                  >
                    {style.label}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: "#eff6ff", color: "#2563eb" }}
                  >
                    {item.product_type}
                  </span>
                  <span className="text-xs" style={{ color: "#9ca3af" }}>•</span>
                  <span
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: "#f3f4f6", color: "#4b5563" }}
                  >
                    {item.category}
                  </span>
                  <span className="text-xs ml-auto" style={{ color: "#9ca3af" }}>
                    Purchased: {item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
