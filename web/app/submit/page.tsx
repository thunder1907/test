"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getUserRole } from "@/lib/roles";

const PRODUCT_TYPES = [
  { value: "", label: "Select product type..." },
  { value: "Electronic", label: "Electronic" },
  { value: "Grocery", label: "Grocery" },
  { value: "Clothes-Footwear", label: "Clothes & Footwear" },
  { value: "Snacks-Colddrinks", label: "Snacks & Cold Drinks" },
];

// Warranty durations in days
const WARRANTY_DAYS: Record<string, number> = {
  "Electronic": 365,
  "Grocery": 1,
  "Clothes-Footwear": 15,
  "Snacks-Colddrinks": 30,
};

const WARRANTY_LABELS: Record<string, string> = {
  "Electronic": "1 Year",
  "Grocery": "1 Day",
  "Clothes-Footwear": "15 Days",
  "Snacks-Colddrinks": "1 Month",
};

const COMPLAINT_TYPES = [
  { value: "", label: "Select complaint type..." },
  { value: "Defective Product", label: "Defective Product" },
  { value: "Wrong Item Delivered", label: "Wrong Item Delivered" },
  { value: "Late Delivery", label: "Late Delivery" },
  { value: "Poor Quality", label: "Poor Quality" },
  { value: "Missing Items", label: "Missing Items" },
  { value: "Damaged Packaging", label: "Damaged Packaging" },
  { value: "Other", label: "Other" },
];

function isWarrantyExpired(productType: string, buyDate: string): boolean {
  if (!productType || !buyDate) return false;
  const maxDays = WARRANTY_DAYS[productType];
  if (!maxDays) return false;

  const purchase = new Date(buyDate);
  const today = new Date();
  const diffTime = today.getTime() - purchase.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > maxDays;
}

export default function SubmitPage() {
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<"owner" | "employee">("employee");

  const [productType, setProductType] = useState("");
  const [buyDate, setBuyDate] = useState("");
  const [complaintType, setComplaintType] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warrantyError, setWarrantyError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserEmail(session.user.email || "");
        setUserId(session.user.id);
        setUserName(
          session.user.user_metadata?.full_name ||
            session.user.email?.split("@")[0] ||
            "User"
        );
        setRole(getUserRole(session.user.email));
      }
    });
  }, []);

  // Check warranty whenever product type or buy date changes
  useEffect(() => {
    if (productType && buyDate) {
      if (isWarrantyExpired(productType, buyDate)) {
        const warrantyLabel = WARRANTY_LABELS[productType] || "N/A";
        setWarrantyError(
          `⚠️ Warranty period (${warrantyLabel}) for ${productType} has expired. Complaint cannot be submitted.`
        );
      } else {
        setWarrantyError(null);
      }
    } else {
      setWarrantyError(null);
    }
  }, [productType, buyDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Validate all fields
    if (!productType || !buyDate || !complaintType || !description.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    // Check warranty
    if (isWarrantyExpired(productType, buyDate)) {
      return; // warrantyError is already displayed
    }

    setLoading(true);

    try {
      // Generate a random ID to completely avoid the "User_pkey" sequence 
      // conflict caused by previous CSV data imports.
      const randomId = Math.floor(Math.random() * 10000000) + 10000;

      const { error: insertError } = await supabase
        .from("Complain_Data")
        .insert({
          complaint_id: randomId,
          email: userEmail,
          product_type: productType,
          date: buyDate,
          category: complaintType,
          text: description.trim(),
          resolve_status: "submitted",
        });

      if (insertError) throw insertError;

      setSuccessMsg("✅ Your complaint has been submitted successfully! Our team will review it shortly.");
      // Reset form
      setProductType("");
      setBuyDate("");
      setComplaintType("");
      setDescription("");
    } catch (err: any) {
      setError(err.message || "Failed to submit complaint. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Owner panel placeholder (to be built later)
  if (role === "owner") {
    return (
      <div className="max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1" style={{ color: "#111827" }}>
            Owner Panel — Submit & Analyze
          </h1>
          <p className="text-sm" style={{ color: "#6b7280" }}>
            Owner complaint analysis tools will be configured here.
          </p>
        </div>
      </div>
    );
  }

  // Employee Panel
  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#111827" }}>
          Submit a Complaint
        </h1>
        <p className="text-sm" style={{ color: "#6b7280" }}>
          Fill in the details below to register your complaint. We will review and resolve it as soon as possible.
        </p>
      </div>

      {/* Complaint Form */}
      <form onSubmit={handleSubmit}>
        <div
          className="rounded-xl p-6 border mb-6"
          style={{
            background: "#ffffff",
            borderColor: "#e5e7eb",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div className="space-y-5">
            {/* Product Type */}
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: "#6d28d9" }}
              >
                Product Type
              </label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                required
                className="w-full rounded-lg px-4 py-2.5 text-sm border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-1"
                style={{
                  background: "#f9fafb",
                  color: "#111827",
                  borderColor: "#e5e7eb",
                }}
              >
                {PRODUCT_TYPES.map((pt) => (
                  <option key={pt.value} value={pt.value}>
                    {pt.label}
                  </option>
                ))}
              </select>
              {productType && (
                <p className="text-xs mt-1.5" style={{ color: "#6b7280" }}>
                  Warranty period: <span className="font-semibold" style={{ color: "#6d28d9" }}>{WARRANTY_LABELS[productType]}</span>
                </p>
              )}
            </div>

            {/* Buy Date */}
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: "#6d28d9" }}
              >
                Purchase Date
              </label>
              <input
                type="date"
                value={buyDate}
                onChange={(e) => setBuyDate(e.target.value)}
                required
                max={new Date().toISOString().split("T")[0]}
                className="w-full rounded-lg px-4 py-2.5 text-sm border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-1"
                style={{
                  background: "#f9fafb",
                  color: "#111827",
                  borderColor: "#e5e7eb",
                }}
              />
            </div>

            {/* Warranty Error */}
            {warrantyError && (
              <div
                className="rounded-lg px-4 py-3 text-sm border font-semibold"
                style={{
                  background: "#fef2f2",
                  color: "#dc2626",
                  borderColor: "#fecaca",
                }}
              >
                {warrantyError}
              </div>
            )}

            {/* Complaint Type */}
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: "#6d28d9" }}
              >
                Complaint Type
              </label>
              <select
                value={complaintType}
                onChange={(e) => setComplaintType(e.target.value)}
                required
                className="w-full rounded-lg px-4 py-2.5 text-sm border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-1"
                style={{
                  background: "#f9fafb",
                  color: "#111827",
                  borderColor: "#e5e7eb",
                }}
              >
                {COMPLAINT_TYPES.map((ct) => (
                  <option key={ct.value} value={ct.value}>
                    {ct.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: "#6d28d9" }}
              >
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your issue in detail..."
                rows={5}
                required
                className="w-full rounded-lg px-4 py-3 text-sm border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-1 resize-vertical"
                style={{
                  background: "#f9fafb",
                  color: "#111827",
                  borderColor: "#e5e7eb",
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !!warrantyError}
              className="w-full px-6 py-3 rounded-lg text-sm font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #6d28d9, #4f46e5)",
                boxShadow: "0 2px 8px rgba(109,40,217,0.25)",
              }}
            >
              {loading && (
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
              )}
              {loading ? "Submitting..." : "Submit Complaint"}
            </button>
          </div>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm mb-6 border font-medium"
          style={{
            background: "#fef2f2",
            color: "#dc2626",
            borderColor: "#fecaca",
          }}
        >
          {error}
        </div>
      )}

      {/* Success */}
      {successMsg && (
        <div
          className="rounded-lg px-4 py-3 text-sm mb-6 border font-medium"
          style={{
            background: "#ecfdf5",
            color: "#059669",
            borderColor: "#a7f3d0",
          }}
        >
          {successMsg}
        </div>
      )}
    </div>
  );
}
