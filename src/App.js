import { useEffect, useState, useCallback, useRef } from "react";
import supabase from "./supabaseClient";
import Dashboard from "./Dashboard";
import ReportModal from "./ReportModal";

export default function App() {
  const [portals, setPortals] = useState([]);
  const [checks, setChecks] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportTarget, setReportTarget] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [, setToasts] = useState([]);
  const prevStatusRef = useRef({});

  const addToast = useCallback((msg, type = "error") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  async function fetchData() {
    const [{ data: portalData }, { data: checkData }, { data: reportData }] =
      await Promise.all([
        supabase.from("portals").select("*"),
        supabase.from("checks").select("*").order("checked_at", { ascending: false }).limit(1000),
        supabase.from("reports").select("*"),
      ]);

    setPortals(portalData || []);
    setChecks(checkData || []);
    setReports(reportData || []);
    setLastUpdated(new Date());
    setLoading(false);
  }

  useEffect(() => {
    fetchData();

    const checksChannel = supabase
      .channel("realtime-checks")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "checks" }, (payload) => {
        const nc = payload.new;
        setChecks((prev) => [nc, ...prev].slice(0, 1000));
        setLastUpdated(new Date());

        const prev = prevStatusRef.current[nc.portal_id];

        if (nc.status === "down" && prev !== "down") {
          setPortals((ps) => {
            const p = ps.find((x) => x.id === nc.portal_id);
            if (p) addToast(`🔴 ${p.name} just went DOWN`);
            return ps;
          });
        }

        if (nc.status === "up" && (prev === "down" || prev === "timeout")) {
          setPortals((ps) => {
            const p = ps.find((x) => x.id === nc.portal_id);
            if (p) addToast(`✅ ${p.name} is back UP`, "success");
            return ps;
          });
        }

        prevStatusRef.current[nc.portal_id] = nc.status;
      })
      .subscribe();

    return () => supabase.removeChannel(checksChannel);
  }, [addToast]);

  // 🔥 MERGE + FIXED SEVERITY
  const merged = portals.map((p) => {
    const portalChecks = checks.filter((c) => c.portal_id === p.id);
    const latest = portalChecks[0] || null;

    const last10 = portalChecks.slice(0, 10);
    // 📊 TREND CALCULATION (ADD BELOW last10)
const recent5 = portalChecks
  .slice(0, 5)
  .map(c => c.response_ms)
  .filter(ms => ms != null);

const prev5 = portalChecks
  .slice(5, 10)
  .map(c => c.response_ms)
  .filter(ms => ms != null);

const avgRecent = recent5.length
  ? recent5.reduce((a, b) => a + b, 0) / recent5.length
  : null;

const avgPrev = prev5.length
  ? prev5.reduce((a, b) => a + b, 0) / prev5.length
  : null;

const trend =
  avgRecent && avgPrev
    ? avgRecent > avgPrev * 1.2
      ? "worse"
      : avgRecent < avgPrev * 0.8
      ? "better"
      : "stable"
    : "stable";
    const last288 = portalChecks.slice(0, 288);

    const upCount = last288.filter(
      (c) => c.status === "up" || c.status === "probe_blocked"
    ).length;

    const uptime = last288.length
      ? Math.round((upCount / last288.length) * 100)
      : null;

    let incidentStart = null;
    
    if (["down", "timeout", "slow"].includes(latest?.status)) {
      for (const c of portalChecks) {
        if (c.status === latest.status) incidentStart = c.checked_at;
        else break;
      }
    }
let incidentMinutes = 0;

if (incidentStart) {
  incidentMinutes = Math.floor(
    (Date.now() - new Date(incidentStart)) / 60000
  );
}
    const reportCount = reports.filter((r) => r.portal_id === p.id).length;

    // ✅ NEW SEVERITY SYSTEM (FIXED)
    let severity = 0;
    const status = latest?.status;

    // 1. STATUS (MAIN SIGNAL)
    if (status === "down") severity += 70;
    else if (status === "timeout") severity += 50;
    else if (status === "slow") severity += 30;

    // 2. REPORTS (LIMITED IMPACT)
    severity += Math.min(reportCount * 5, 25);

    // 3. UPTIME PENALTY
    if (uptime !== null) {
      severity += (100 - uptime) * 0.3;
    }

    // 4. INCIDENT DURATION
    if (incidentStart && (status === "down" || status === "timeout")) {
      const mins = (Date.now() - new Date(incidentStart)) / 60000;

      if (mins > 30) severity += 10;
      if (mins > 120) severity += 15;
      if (mins > 300) severity += 20;
    }

    // 5. IGNORE FAKE FAILURES
    if (status === "probe_blocked" || status === "up") {
      severity = 0;
    }
    // 🧠 SMART "UP BUT BROKEN" DETECTION (ADD HERE)
let isBroken = false;

if (status === "up") {
  const manyReports = reportCount >= 3;
  const highLatency = latest?.response_ms > 4000;
  const unstable = uptime !== null && uptime < 85;

  if (manyReports || highLatency || unstable) {
    isBroken = true;
  }
}
// 👥 CITIZEN IMPACT (ADD)
const IMPACT_MAP = {
  "income tax": 80000000,
  "aadhaar": 100000000,
  "epfo": 60000000,
  "irctc": 50000000,
  "passport": 15000000,
};

let citizensAffected = 500000;

const name = (p.name || "").toLowerCase();

for (const key in IMPACT_MAP) {
  if (name.includes(key)) {
    citizensAffected = IMPACT_MAP[key];
    break;
  }
}
   return {
  ...p,
  latest,
  last10,
  trend,
  uptime,
  incidentStart,
  incidentMinutes,
  reportCount,
  severity,
  citizensAffected,
  isBroken, // ✅ ADD THIS LINE
};
  });

  const filtered = merged.filter(
  (p) =>
    (filter === "all" || p.latest?.status === filter) &&
    (!search ||
      p.name.toLowerCase().includes(search.toLowerCase()))
);
  const stats = {
    total: merged.length,
    up: merged.filter((p) => p.latest?.status === "up").length,
    down: merged.filter((p) => p.latest?.status === "down").length,
    slow: merged.filter((p) => p.latest?.status === "slow").length,
    timeout: merged.filter((p) => p.latest?.status === "timeout").length,
    probe_blocked: merged.filter((p) => p.latest?.status === "probe_blocked").length,
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ background: "#050508", minHeight: "100vh" }}>
      <Dashboard
  merged={merged}
  filtered={filtered}
  filter={filter}
  setFilter={setFilter}
  search={search}              // ✅ ADD
  setSearch={setSearch}        // ✅ ADD
  stats={stats}
  lastUpdated={lastUpdated}
  onReport={setReportTarget}
/>

      {reportTarget && (
        <ReportModal
          portal={reportTarget}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
}