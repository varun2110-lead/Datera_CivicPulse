import { useState } from "react";
import supabase from "./supabaseClient";

const ISSUES = [
  { value: "down",         label: "Completely down",    icon: "🔴" },
  { value: "404",          label: "Page not found",     icon: "🔍" },
  { value: "slow",         label: "Too slow to use",    icon: "🐌" },
  { value: "login_fail",   label: "Can't log in",       icon: "🔐" },
  { value: "upload_fail",  label: "File upload failing", icon: "📁" },
  { value: "data_error",   label: "Wrong data shown",   icon: "⚠️" },
  { value: "payment_fail", label: "Payment failing",    icon: "💳" },
  { value: "other",        label: "Something else",     icon: "❓" },
];

const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Other",
];

const SEVERITY_LABELS = {
  1: { label: "Minor inconvenience", color: "#22c55e" },
  2: { label: "Can't complete task",  color: "#f59e0b" },
  3: { label: "Blocking critical work", color: "#f97316" },
  4: { label: "Emergency — urgent access needed", color: "#ef4444" },
};

export default function ReportModal({ portal, onClose }) {
  const [issueType,   setIssueType]   = useState("");
  const [description, setDescription] = useState("");
  const [userState,   setUserState]   = useState("");
  const [severity,    setSeverity]    = useState(0);
  const [submitted,   setSubmitted]   = useState(false);
  const [loading,     setLoading]     = useState(false);

  async function submit() {
    if (!issueType) return;
    setLoading(true);
    await supabase.from("reports").insert({
      portal_id:   portal.id,
      issue_type:  issueType,
      description,
      user_state:  userState,
      severity,    // new field — make sure your Supabase table has this column
    });
    setSubmitted(true);
    setLoading(false);
  }

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 200, padding: 16, backdropFilter: "blur(4px)",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#0d0d12", border: "1px solid #2a2a3a",
        borderRadius: 16, padding: "28px 24px",
        maxWidth: 460, width: "100%",
        fontFamily: "'IBM Plex Mono', monospace",
        boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
        animation: "fadeIn 0.2s ease",
      }}>
        {submitted ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>✅</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#22c55e", marginBottom: 8, letterSpacing: ".05em" }}>
              REPORT LOGGED
            </div>
            <div style={{ fontSize: 12, color: "#444", marginBottom: 24, lineHeight: 1.7 }}>
              Your report strengthens the public record.<br />
              Every submission makes this data more accurate.
            </div>
            <button onClick={onClose} style={{
              padding: "10px 28px", background: "#0a0a0f",
              border: "1px solid #2a2a3a", borderRadius: 8,
              color: "#888", fontSize: 12, cursor: "pointer",
              letterSpacing: ".08em",
            }}>
              CLOSE
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".08em", marginBottom: 4 }}>
                REPORT AN ISSUE
              </div>
              <div style={{ fontSize: 11, color: "#555" }}>
                {portal.name}
              </div>
              <div style={{ fontSize: 10, color: "#333", marginTop: 2 }}>
                {portal.url}
              </div>
            </div>

            {/* Issue type */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: "#555", letterSpacing: ".08em", marginBottom: 8 }}>
                WHAT WENT WRONG?
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {ISSUES.map(i => (
                  <button key={i.value} onClick={() => setIssueType(i.value)} style={{
                    padding: "9px 12px", borderRadius: 8, fontSize: 12,
                    cursor: "pointer", textAlign: "left",
                    background: issueType === i.value ? "#2d0808" : "#0a0a0f",
                    border: `1px solid ${issueType === i.value ? "#ef4444" : "#1a1a24"}`,
                    color: issueType === i.value ? "#ef4444" : "#555",
                    display: "flex", alignItems: "center", gap: 8,
                    transition: "all 0.15s",
                  }}>
                    <span>{i.icon}</span>
                    <span>{i.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: "#555", letterSpacing: ".08em", marginBottom: 8 }}>
                HOW SEVERE? <span style={{ color: "#333" }}>(optional)</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[1, 2, 3, 4].map(n => (
                  <button key={n} onClick={() => setSeverity(n)} style={{
                    flex: 1, padding: "7px 0", borderRadius: 6, cursor: "pointer",
                    fontSize: 10, letterSpacing: ".05em",
                    background: severity === n ? `${SEVERITY_LABELS[n].color}22` : "#0a0a0f",
                    border: `1px solid ${severity === n ? SEVERITY_LABELS[n].color : "#1a1a24"}`,
                    color: severity === n ? SEVERITY_LABELS[n].color : "#555",
                    transition: "all 0.15s",
                  }}>
                    {"★".repeat(n)}
                  </button>
                ))}
              </div>
              {severity > 0 && (
                <div style={{ fontSize: 10, color: SEVERITY_LABELS[severity].color, marginTop: 5, textAlign: "center" }}>
                  {SEVERITY_LABELS[severity].label}
                </div>
              )}
            </div>

            {/* State */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: "#555", letterSpacing: ".08em", marginBottom: 6 }}>
                YOUR STATE <span style={{ color: "#333" }}>(optional)</span>
              </div>
              <select value={userState} onChange={e => setUserState(e.target.value)} style={{
                width: "100%", background: "#0a0a0f",
                border: "1px solid #1a1a24", borderRadius: 8,
                padding: "9px 12px", color: "#888", fontSize: 12,
                fontFamily: "inherit", outline: "none",
              }}>
                <option value="">Select state...</option>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 10, color: "#555", letterSpacing: ".08em", marginBottom: 6 }}>
                DETAILS <span style={{ color: "#333" }}>(optional)</span>
              </div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What were you trying to do when it failed?"
                rows={3}
                style={{
                  width: "100%", background: "#0a0a0f",
                  border: "1px solid #1a1a24", borderRadius: 8,
                  padding: "9px 12px", color: "#ccc", fontSize: 12,
                  resize: "none", fontFamily: "inherit", outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = "#6366f1"}
                onBlur={e => e.target.style.borderColor = "#1a1a24"}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={{
                flex: 1, padding: "10px 0",
                background: "transparent", border: "1px solid #1a1a24",
                borderRadius: 8, color: "#444", fontSize: 11,
                cursor: "pointer", letterSpacing: ".08em",
              }}>
                CANCEL
              </button>
              <button onClick={submit} disabled={!issueType || loading} style={{
                flex: 2, padding: "10px 0",
                background: issueType ? "#1a0808" : "#0a0a0f",
                border: `1px solid ${issueType ? "#ef4444" : "#1a1a24"}`,
                borderRadius: 8,
                color: issueType ? "#ef4444" : "#333",
                fontSize: 11, cursor: issueType ? "pointer" : "not-allowed",
                fontWeight: 700, letterSpacing: ".08em",
                transition: "all 0.2s",
              }}>
                {loading ? "SUBMITTING..." : "SUBMIT REPORT"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}