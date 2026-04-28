import AIDiagnosis from "./AIDiagnosis";

const STATUS_COLOR = { up:"#22c55e", down:"#ef4444", slow:"#f59e0b", timeout:"#f97316", probe_blocked:"#6366f1" };
const STATUS_BG    = { up:"#052e16", down:"#2d0808", slow:"#2d1a00", timeout:"#2d1000", probe_blocked:"#0f0f2d" };
const STATUS_LABEL = { up:"LIVE", down:"DOWN", slow:"SLOW", timeout:"TIMEOUT", probe_blocked:"BLOCKED" };

function incidentAge(start) {
  if (!start) return null;
  const mins = Math.floor((Date.now() - new Date(start)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins/60)}h ${mins%60}m`;
  return `${Math.floor(mins/1440)}d ${Math.floor((mins%1440)/60)}h`;
}

function UptimeBars({ checks }) {
  if (!checks?.length) return <div style={{ height: 16 }} />;
  const rev = [...checks].reverse();
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 16 }}>
      {rev.map((c, i) => {
        const color = c.status === "up" ? "#22c55e"
          : c.status === "probe_blocked" ? "#6366f1"
          : c.status === "slow" ? "#f59e0b"
          : c.status === "timeout" ? "#f97316"
          : "#ef4444";
        const h = c.status === "up" ? 16
          : c.status === "probe_blocked" ? 13
          : c.status === "slow" ? 10
          : c.status === "timeout" ? 7
          : 4;
        return <div key={i} title={`${c.status} · ${c.response_ms ?? "?"}ms`}
          style={{ width: 5, height: h, background: color, borderRadius: 1, opacity: 0.8 }} />;
      })}
    </div>
  );
}

export default function PortalCard({ portal, onReport }) {
  const { name, url, latest, uptime, last10, reportCount = 0, incidentStart, trend, citizensAffected } = portal;

  const status      = latest?.status || "unknown";
  const color       = STATUS_COLOR[status] || "#444";
  const bg          = STATUS_BG[status] || "#111";
  const ms          = latest?.response_ms;
  const msLabel     = ms == null ? "—" : ms > 3000 ? `${(ms/1000).toFixed(1)}s` : `${ms}ms`;
  const isFailure   = ["down","timeout"].includes(status);
  const isDegraded  = status === "slow";
  const age         = incidentAge(incidentStart);

  const borderColor = status === "down" ? "#3d1010"
    : status === "timeout" ? "#3d2000"
    : status === "slow" ? "#3d2800"
    : status === "probe_blocked" ? "#1e1e4a"
    : "#1a1a24";

  return (
    <div style={{
      background: "#0d0d12",
      border: `1px solid ${borderColor}`,
      borderRadius: 12,
      padding: "16px 18px",
      animation: status === "down" ? "pulseRed 3s ease-in-out infinite" : "none",
      transition: "border-color 0.3s",
    }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0,
              boxShadow: isFailure ? `0 0 6px ${color}` : "none",
            }} />
            <span style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {name}
            </span>
          </div>
          <div style={{ fontSize: 10, color: "#3a3a4a", paddingLeft: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {url?.replace(/^https?:\/\//, "")}
          </div>
        </div>

        <div style={{
          background: bg, color, fontSize: 9, fontWeight: 700,
          padding: "4px 9px", borderRadius: 5, letterSpacing: ".1em",
          border: `1px solid ${color}33`, whiteSpace: "nowrap",
        }}>
          {STATUS_LABEL[status] || status.toUpperCase()}
        </div>
      </div>
{portal.isBroken && (
  <div style={{
    background: "#2d1a00",
    border: "1px solid #f59e0b",
    borderRadius: 6,
    padding: "6px 10px",
    marginBottom: 10,
    fontSize: 11,
    color: "#f59e0b"
  }}>
    ⚠ Service operational but users facing issues
  </div>
)}
      {/* ── SPARKLINE ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <UptimeBars checks={last10} />
        <div style={{ fontSize: 9, color: "#333", letterSpacing: ".05em" }}>LAST 10 CHECKS</div>
      </div>

      {/* ── METRICS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
        {[
          { label: "RESPONSE", value: msLabel, warn: ms > 4000 },
          { label: "UPTIME",   value: uptime != null ? `${uptime}%` : "—", warn: uptime != null && uptime < 80 },
          { label: "HTTP",     value: latest?.http_code || "—" },
          { label: "REPORTS",  value: reportCount || "—", warn: reportCount > 0 },
        ].map(m => (
          <div key={m.label} style={{ background: "#0a0a0f", borderRadius: 6, padding: "7px 8px" }}>
            <div style={{ fontSize: 8, color: "#333", letterSpacing: ".08em", marginBottom: 3 }}>{m.label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: m.warn ? "#ef4444" : "#888" }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* ── TREND INDICATOR ── */}
      {trend && trend !== "stable" && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 10, marginBottom: 10, color: trend === "worse" ? "#f59e0b" : "#22c55e",
        }}>
          <span>{trend === "worse" ? "↑" : "↓"}</span>
          <span>Response time {trend === "worse" ? "increasing" : "improving"} vs last 5 checks</span>
        </div>
      )}

      {/* ── INCIDENT BANNER ── */}
      {(isFailure || isDegraded) && age && (
        <div style={{
          background: isFailure ? "#1a0505" : "#1a1200",
          border: `1px solid ${isFailure ? "#3d1010" : "#3d2800"}`,
          borderRadius: 6, padding: "7px 10px", marginBottom: 10,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 11, color: isFailure ? "#ef4444" : "#f59e0b" }}>
            {isFailure ? "⚠ Incident ongoing" : "⚡ Degraded performance"}
          </span>
          <span style={{ fontSize: 10, color: "#555" }}>since {age}</span>
        </div>
      )}

      {/* ── CITIZENS AFFECTED ── */}
      {status === "down" && (
        <div style={{
          background: "#1a0808", border: "1px solid #3d1010",
          borderRadius: 6, padding: "7px 10px", marginBottom: 10,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 11, color: "#ef4444" }}>🚨 Citizens affected</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#ef4444" }}>
            ~{citizensAffected >= 10000000
              ? `${(citizensAffected/10000000).toFixed(0)} Cr`
              : citizensAffected >= 100000
              ? `${(citizensAffected/100000).toFixed(0)} L`
              : citizensAffected.toLocaleString("en-IN")}
          </span>
        </div>
      )}

      {/* ── CITIZEN REPORTS ── */}
      {reportCount > 0 && (
        <div style={{
          background: "#1a0808", border: "1px solid #3d1010",
          borderRadius: 6, padding: "7px 10px", marginBottom: 10,
          fontSize: 11, color: "#ef4444",
        }}>
          🗣 {reportCount} citizen{reportCount > 1 ? "s" : ""} reported issues
        </div>
      )}

      {/* ── PROBE BLOCKED NOTE ── */}
      {status === "probe_blocked" && (
        <div style={{
          background: "#0a0a1f", border: "1px solid #1e1e4a",
          borderRadius: 6, padding: "7px 10px", marginBottom: 10,
          fontSize: 11, color: "#818cf8",
        }}>
          🛡 Bot probe blocked — likely working for real users
        </div>
      )}

      {/* ── AI DIAGNOSIS ── */}
      <AIDiagnosis portal={{ ...portal, reportCount }} />

      {/* ── ACTIONS ── */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <a href={url} target="_blank" rel="noreferrer" style={{
          flex: 1, textAlign: "center", padding: "7px 0",
          border: "1px solid #1a1a24", borderRadius: 6,
          color: "#555", fontSize: 11, letterSpacing: ".05em",
          transition: "all 0.15s",
        }}>
          VISIT ↗
        </a>
        <button onClick={() => onReport(portal)} style={{
          flex: 1, padding: "7px 0",
          border: "1px solid #3d1010", borderRadius: 6,
          background: "#1a0808", color: "#ef4444",
          cursor: "pointer", fontSize: 11, letterSpacing: ".05em",
        }}>
          REPORT ISSUE
        </button>
      </div>
    </div>
  );
}