import PortalCard from "./PortalCard";
import MinistryScores from "./MinistryScores";

const STATUS_COLOR = { up:"#22c55e", down:"#ef4444", slow:"#f59e0b", timeout:"#f59e0b", probe_blocked:"#6366f1" };

function incidentAge(start) {
  if (!start) return null;
  const mins = Math.floor((Date.now() - new Date(start)) / 60000);
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`;
}

function formatCitizens(n) {
  if (n >= 10000000) return `${(n / 10000000).toFixed(0)}Cr`;
  if (n >= 100000)   return `${(n / 100000).toFixed(0)}L`;
  return n.toLocaleString("en-IN");
}

// ── UPTIME SPARKLINE ─────────────────────────────────────────────────────────
function UptimeBars({ checks }) {
  if (!checks?.length) return null;
  const reversed = [...checks].reverse(); // oldest first
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 20 }}>
      {reversed.map((c, i) => {
        const color = c.status === "up" ? "#22c55e"
          : c.status === "probe_blocked" ? "#6366f1"
          : c.status === "slow" ? "#f59e0b"
          : "#ef4444";
        const h = c.status === "up" ? 20
          : c.status === "probe_blocked" ? 16
          : c.status === "slow" ? 12
          : 6;
        return (
          <div key={i} title={`${c.status} — ${c.response_ms ?? "?"}ms`}
            style={{ width: 6, height: h, background: color, borderRadius: 2, opacity: 0.85 }} />
        );
      })}
    </div>
  );
}

// ── CRITICAL FAILURE LEADERBOARD ─────────────────────────────────────────────
function CriticalLeaderboard({ portals, onReport }) {
  const ranked = [...portals]
    .filter(p => ["down", "timeout", "slow"].includes(p.latest?.status))
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 5);

  if (ranked.length === 0) {
    return (
      <div style={{
        background: "linear-gradient(135deg, #050d05 0%, #050508 100%)",
        border: "1px solid #1a3a1a", borderRadius: 14, padding: "20px 24px",
        marginBottom: 24, display: "flex", alignItems: "center", gap: 14,
      }}>
        <span style={{ fontSize: 28 }}>✅</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#22c55e", letterSpacing: ".05em" }}>
            ALL SYSTEMS OPERATIONAL
          </div>
          <div style={{ fontSize: 12, color: "#3a5a3a", marginTop: 3 }}>
            No confirmed failures detected — {portals.length} portals monitored
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: "linear-gradient(135deg, #0d0505 0%, #050508 100%)",
      border: "1px solid #3d1010", borderRadius: 14, padding: "20px 24px",
      marginBottom: 24, boxShadow: "0 0 40px rgba(239,68,68,0.08)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <span style={{ fontSize: 18 }}>🚨</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", letterSpacing: ".12em" }}>
          MOST CRITICAL FAILURES
        </span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#444", letterSpacing: ".05em" }}>
          RANKED BY SEVERITY SCORE
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ranked.map((p, i) => {
          const age    = incidentAge(p.incidentStart);
          const ms     = p.latest?.response_ms;
          const msText = ms == null ? "no resp" : ms > 3000 ? `${(ms/1000).toFixed(1)}s` : `${ms}ms`;
          const sColor = p.severity > 70 ? "#ef4444" : p.severity > 40 ? "#f59e0b" : "#888";

          return (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              background: i === 0 ? "#110505" : "#0d0d0d",
              border: `1px solid ${i === 0 ? "#2d1010" : "#1a1a1a"}`,
              borderRadius: 10, padding: "12px 16px",
              animation: i === 0 && p.latest?.status === "down" ? "pulseRed 2s ease-in-out infinite" : "none",
            }}>
              {/* Rank medal */}
              <div style={{
                fontSize: 16, fontWeight: 700, minWidth: 28, textAlign: "center",
                color: i === 0 ? "#ef4444" : i === 1 ? "#f97316" : i === 2 ? "#f59e0b" : "#555",
              }}>
                {["①","②","③","④","⑤"][i]}
              </div>

              {/* Name */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e0e0e0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>
                  {age ? `down ${age}` : p.latest?.status} · {msText}
                  {p.trend === "worse" && <span style={{ color: "#ef4444", marginLeft: 6 }}>↑ getting slower</span>}
                  {p.trend === "better" && <span style={{ color: "#22c55e", marginLeft: 6 }}>↓ recovering</span>}
                </div>
              </div>

              {/* Sparkline */}
              <UptimeBars checks={p.last10} />

              {/* Citizens affected */}
              {p.latest?.status === "down" && (
                <div style={{ fontSize: 10, color: "#888", textAlign: "right", minWidth: 60 }}>
                  <div style={{ color: "#ef4444", fontWeight: 700 }}>{formatCitizens(p.citizensAffected)}</div>
                  <div>affected</div>
                </div>
              )}

              {/* Reports */}
              {p.reportCount > 0 && (
                <div style={{ fontSize: 10, color: "#ef4444", background: "#2d0808", border: "1px solid #3d1010", borderRadius: 5, padding: "3px 8px", whiteSpace: "nowrap" }}>
                  🚨 {p.reportCount}
                </div>
              )}

              {/* Severity */}
              <div style={{ fontSize: 12, fontWeight: 700, color: sColor, minWidth: 28, textAlign: "right" }}>
                {Math.round(p.severity)}
              </div>

              {/* Status */}
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: ".08em",
                color: STATUS_COLOR[p.latest?.status] || "#888",
                background: p.latest?.status === "down" ? "#2d0808" : p.latest?.status === "slow" ? "#2d1a00" : "#1a1a1a",
                padding: "3px 8px", borderRadius: 5,
                border: `1px solid ${(STATUS_COLOR[p.latest?.status] || "#444")}33`,
                whiteSpace: "nowrap",
              }}>
                {p.latest?.status?.toUpperCase()}
              </div>

              <button onClick={() => onReport(p)} style={{
                padding: "4px 10px", fontSize: 10, background: "transparent",
                border: "1px solid #3d1010", borderRadius: 6,
                color: "#ef4444", cursor: "pointer", whiteSpace: "nowrap",
              }}>
                Report ↗
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, sub }) {
  return (
    <div style={{
      background: "#0d0d12", border: "1px solid #1a1a24",
      borderRadius: 12, padding: "16px 20px",
      borderTop: `2px solid ${color}`,
    }}>
      <div style={{ fontSize: 10, color: "#444", letterSpacing: ".1em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "#555", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ── SEARCH BAR ───────────────────────────────────────────────────────────────
function SearchBar({ value, onChange }) {
  return (
    <div style={{ position: "relative", marginBottom: 16 }}>
      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#444", fontSize: 14 }}>⌕</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search portals by name or URL..."
        style={{
          width: "100%", padding: "10px 12px 10px 36px",
          background: "#0d0d12", border: "1px solid #1a1a24",
          borderRadius: 8, color: "#ccc", fontSize: 13,
          outline: "none", fontFamily: "inherit",
          transition: "border-color 0.2s",
        }}
        onFocus={e => e.target.style.borderColor = "#6366f1"}
        onBlur={e => e.target.style.borderColor = "#1a1a24"}
      />
      {value && (
        <button onClick={() => onChange("")} style={{
          position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 16,
        }}>×</button>
      )}
    </div>
  );
}

// ── GLOBAL HEALTH BAR ────────────────────────────────────────────────────────
function HealthBar({ stats }) {
  const confirmedUp = stats.up + stats.probe_blocked;
  const pct = stats.total ? Math.round((confirmedUp / stats.total) * 100) : 0;
  const color = pct > 80 ? "#22c55e" : pct > 60 ? "#f59e0b" : "#ef4444";
  const grade = pct > 90 ? "A" : pct > 80 ? "B" : pct > 60 ? "C" : pct > 40 ? "D" : "F";

  return (
    <div style={{ background: "#0d0d12", border: "1px solid #1a1a24", borderRadius: 12, padding: "16px 20px", marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: "#555", letterSpacing: ".08em" }}>OVERALL GOVERNMENT PORTAL HEALTH</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 20, fontWeight: 700, color }}>{pct}%</span>
          <span style={{
            fontSize: 12, fontWeight: 700, color,
            background: pct > 80 ? "#052e16" : pct > 60 ? "#2d1a00" : "#2d0808",
            padding: "2px 8px", borderRadius: 4,
          }}>{grade}</span>
        </div>
      </div>
      <div style={{ height: 6, background: "#1a1a1a", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.8s ease" }} />
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
        {[
          { label: "up",      color: "#22c55e", count: stats.up },
          { label: "blocked", color: "#6366f1", count: stats.probe_blocked },
          { label: "slow",    color: "#f59e0b", count: stats.slow },
          { label: "timeout", color: "#f97316", count: stats.timeout },
          { label: "down",    color: "#ef4444", count: stats.down },
        ].map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, background: s.color, borderRadius: 2 }} />
            <span style={{ fontSize: 10, color: "#555" }}>{s.count} {s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function Dashboard({
  merged, filtered, filter, setFilter, search, setSearch,
  stats, ministryScores, lastUpdated, onReport, critical, onExport,
}) {
  const totalDown = stats.down + stats.timeout;
  const activeCrisis = totalDown > 0;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 20px" }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <span style={{ fontSize: 32 }}>☠️</span>
            <div>
              <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-1px", color: "#f0f0f0" }}>
                Death<span style={{ color: "#ef4444" }}>Audit</span>
              </div>
              <div style={{ fontSize: 10, color: "#444", letterSpacing: ".15em", marginTop: -2 }}>
                GOVERNMENT PORTAL MONITORING — INDIA
              </div>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: activeCrisis ? "#1a0808" : "#051a05",
              border: `1px solid ${activeCrisis ? "#ef444444" : "#22c55e44"}`,
              borderRadius: 6, padding: "4px 10px",
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: activeCrisis ? "#ef4444" : "#22c55e",
                animation: "blink 1s ease-in-out infinite",
              }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: activeCrisis ? "#ef4444" : "#22c55e", letterSpacing: ".1em" }}>
                {activeCrisis ? `${totalDown} FAILING` : "ALL LIVE"}
              </span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#333", marginLeft: 44 }}>
            Last pinged: <span style={{ color: "#555" }}>{lastUpdated?.toLocaleTimeString("en-IN")}</span>
            {" · "}
            <span style={{ color: "#555" }}>{stats.total} portals tracked</span>
            {" · "}
            <span style={{ color: "#555" }}>{stats.total_reports} citizen reports</span>
          </div>
        </div>

        {/* Export */}
        <button onClick={onExport} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 16px", borderRadius: 8, cursor: "pointer",
          background: "#0d0d12", border: "1px solid #2a2a3a",
          color: "#888", fontSize: 11, letterSpacing: ".06em",
          transition: "all 0.2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.color = "#a5b4fc"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a3a"; e.currentTarget.style.color = "#888"; }}
        >
          📋 EXPORT REPORT
        </button>
      </div>

      {/* ── STAT CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 24 }}>
        <StatCard label="MONITORED"     value={stats.total}                           color="#555"    sub={`${stats.total} portals`} />
        <StatCard label="LIVE"          value={stats.up}                              color="#22c55e" sub="responding OK" />
        <StatCard label="DOWN"          value={stats.down}                            color="#ef4444" sub={stats.down > 0 ? "confirmed failure" : "none"} />
        <StatCard label="SLOW/TIMEOUT"  value={(stats.slow||0)+(stats.timeout||0)}   color="#f59e0b" sub="degraded service" />
        <StatCard label="BOT BLOCKED"   value={stats.probe_blocked}                  color="#6366f1" sub="likely working" />
        <StatCard label="CITIZEN REPORTS" value={stats.total_reports}                color="#ec4899" sub="user-reported" />
      </div>

      {/* ── CRITICAL LEADERBOARD ── */}
      <CriticalLeaderboard portals={merged} onReport={onReport} />

      {/* ── GLOBAL HEALTH ── */}
      <HealthBar stats={stats} />

      {/* ── MINISTRY SCORES ── */}
      <MinistryScores scores={ministryScores} />

      {/* ── FILTER + SEARCH ── */}
      <SearchBar value={search} onChange={setSearch} />

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { key: "all",           label: `All`,       count: merged.length },
          { key: "up",            label: "Up",        count: stats.up },
          { key: "down",          label: "Down",      count: stats.down },
          { key: "slow",          label: "Slow",      count: stats.slow },
          { key: "timeout",       label: "Timeout",   count: stats.timeout },
          { key: "probe_blocked", label: "Blocked",   count: stats.probe_blocked },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding: "6px 14px", borderRadius: 6,
            border: `1px solid ${filter === f.key ? (STATUS_COLOR[f.key] || "#6366f1") : "#1a1a24"}`,
            background: filter === f.key ? `${STATUS_COLOR[f.key] || "#6366f1"}11` : "transparent",
            color: filter === f.key ? (STATUS_COLOR[f.key] || "#a5b4fc") : "#555",
            fontSize: 11, cursor: "pointer", letterSpacing: ".05em",
            transition: "all 0.15s",
          }}>
            {f.label} <span style={{ opacity: 0.6 }}>({f.count})</span>
          </button>
        ))}
        {search && (
          <span style={{ fontSize: 11, color: "#555", alignSelf: "center", marginLeft: 8 }}>
            Showing {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{search}"
          </span>
        )}
      </div>

      {/* ── PORTAL GRID ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
        {filtered
          .sort((a, b) => {
            // Sort: failures first, then by severity
            const order = { down: 0, timeout: 1, slow: 2, probe_blocked: 3, up: 4 };
            const oa = order[a.latest?.status] ?? 5;
            const ob = order[b.latest?.status] ?? 5;
            if (oa !== ob) return oa - ob;
            return b.severity - a.severity;
          })
          .map(portal => (
            <PortalCard key={portal.id} portal={portal} onReport={onReport} />
          ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 0", color: "#333" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>◌</div>
          <div style={{ fontSize: 13, letterSpacing: ".08em" }}>NO PORTALS MATCH THIS FILTER</div>
        </div>
      )}

      <div style={{ textAlign: "center", padding: "32px 0 16px", fontSize: 10, color: "#222", letterSpacing: ".1em" }}>
        DEATHAUDIT · GOVERNMENT PORTAL INTELLIGENCE · DATA REFRESHES EVERY 5 MINUTES
      </div>
    </div>
  );
}