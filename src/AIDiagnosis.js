import { useState } from "react";

function buildDiagnosis({ status, response_ms, http_code, reportCount, probe_note }) {
  // ── PROBE BLOCKED ─────────────────────────────────────────────────────────
  if (status === "probe_blocked") {
    return {
      problem: `Portal is blocking automated probes (HTTP ${http_code ?? "—"}) — real users are likely unaffected`,
      evidence: [
        `HTTP ${http_code} returned — this code is used to block bots and scrapers`,
        "Server is reachable but rejected the monitoring request",
        "Browser traffic is typically allowed through",
        probe_note || `${reportCount > 0 ? reportCount + " citizen report(s) on file — check if users are actually affected" : "No citizen complaints — suggests real users can access normally"}`,
      ],
      fix: [
        "This is NOT a confirmed outage — manually verify in a browser",
        "Consider switching to a headless browser probe (Playwright/Puppeteer) for this portal",
        "If citizen reports are also coming in, escalate as a real outage",
        "Track this portal's report count as the ground-truth signal",
      ],
    };
  }

  // ── DOWN ──────────────────────────────────────────────────────────────────
  if (status === "down") {
    if (http_code === null || http_code === undefined) {
      return {
        problem: "Server unreachable — no TCP connection established",
        evidence: [
          probe_note || "Request timed out with no HTTP response",
          "SSL handshake could not begin",
          `${reportCount > 0 ? reportCount + " citizen report(s) corroborate the outage" : "Automated probe confirms no response"}`,
        ],
        fix: [
          "Verify the server process is running (nginx/Apache/Node)",
          "Check firewall rules — port 80/443 may be blocked",
          "Confirm DNS resolves to the correct IP",
          "Review hosting provider status page for infrastructure issues",
        ],
      };
    }

    if (http_code === 503) {
      return {
        problem: "Service temporarily unavailable (503)",
        evidence: [
          "Server returned HTTP 503 — it is reachable but refusing requests",
          "Typically indicates maintenance mode or overload",
          `Response time: ${response_ms ?? "N/A"} ms`,
        ],
        fix: [
          "Check if the application is in scheduled maintenance",
          "Inspect upstream load balancer or reverse proxy configuration",
          "Scale up server resources if under load spike",
        ],
      };
    }

    if (http_code === 502 || http_code === 504) {
      return {
        problem: `Gateway error (${http_code}) — upstream backend not responding`,
        evidence: [
          `HTTP ${http_code} returned by the front-end proxy/load balancer`,
          "Backend application server likely crashed or is overloaded",
          `Response time: ${response_ms ?? "N/A"} ms`,
        ],
        fix: [
          "Restart the application server (Gunicorn, PM2, Tomcat, etc.)",
          "Check application logs for crash or OOM errors",
          "Verify the proxy's upstream host/port configuration",
        ],
      };
    }

    if (http_code >= 500) {
      return {
        problem: `Server-side error (HTTP ${http_code})`,
        evidence: [
          `HTTP ${http_code} indicates an unhandled server exception`,
          "The server is reachable but the application is failing",
          `${reportCount > 0 ? reportCount + " user report(s) on file" : "No citizen reports yet"}`,
        ],
        fix: [
          "Check application error logs for stack traces",
          "Review recent deployments — a bad release may have caused regression",
          "Verify database connectivity and query health",
        ],
      };
    }

    if (http_code === 404) {
      return {
        problem: "Page not found (404) — URL may have changed",
        evidence: [
          "Server responded with HTTP 404",
          "The resource at this URL no longer exists",
          "Common after CMS migrations or URL restructuring",
        ],
        fix: [
          "Check if the portal URL has been updated or redirected",
          "Review the ministry's official website for correct link",
          "Ensure redirect rules are in place for old URLs",
        ],
      };
    }

    if (http_code >= 400) {
      return {
        problem: `Client-side error (HTTP ${http_code})`,
        evidence: [
          `HTTP ${http_code} — the request was rejected by the server`,
          "Portal is reachable but the endpoint is invalid or misconfigured",
        ],
        fix: [
          "Verify the monitored URL is the correct public entry point",
          "Check for redirect loops that may exhaust request limits",
        ],
      };
    }
  }

  // ── SLOW ──────────────────────────────────────────────────────────────────
  if (status === "slow") {
    const sec = response_ms != null ? (response_ms / 1000).toFixed(1) : null;

    if (response_ms > 8000) {
      return {
        problem: "Critically slow response — effectively unusable for citizens",
        evidence: [
          `Response time: ${sec}s (threshold: 4s)`,
          "Indicates severe resource exhaustion or blocking I/O",
          `${reportCount > 0 ? reportCount + " user report(s) confirm degraded experience" : "Probe detected independently"}`,
        ],
        fix: [
          "Profile database queries — slow queries are the #1 cause",
          "Add or warm up server-side caches (Redis, Memcached)",
          "Check for synchronous external API calls blocking the request thread",
          "Consider CDN offloading for static assets",
        ],
      };
    }

    return {
      problem: "High latency — portal is slow but functional",
      evidence: [
        `Response time: ${sec}s (acceptable threshold: 4s)`,
        "Server is responding but with elevated delay",
        `HTTP ${http_code ?? "N/A"} — no error code`,
      ],
      fix: [
        "Enable HTTP/2 and response compression (gzip/brotli)",
        "Check server CPU and memory usage during peak hours",
        "Review database connection pool size",
        "Audit large page payloads or unoptimised images",
      ],
    };
  }

  // ── FALLBACK ──────────────────────────────────────────────────────────────
  return {
    problem: "Degraded or unknown state",
    evidence: [
      `Status: ${status}`,
      `HTTP code: ${http_code ?? "not available"}`,
      `Response time: ${response_ms != null ? response_ms + " ms" : "N/A"}`,
      `${reportCount > 0 ? reportCount + " citizen report(s) on file" : "No user reports"}`,
    ],
    fix: [
      "Manually verify the portal from multiple devices and ISPs",
      "Check server logs for intermittent errors",
      "Monitor over the next 24h for pattern detection",
    ],
  };
}

export default function AIDiagnosis({ portal }) {
  const [open, setOpen] = useState(false);

  const { latest, reportCount = 0 } = portal;
  const status      = latest?.status      || "unknown";
  const response_ms = latest?.response_ms ?? null;
  const http_code   = latest?.http_code   ?? null;
  const probe_note  = latest?.probe_note  ?? null;

  if (status === "up" && reportCount === 0) return null;

  const diagnosis = buildDiagnosis({ status, response_ms, http_code, reportCount, probe_note });

  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          padding: "6px 0",
          background: open ? "#0d1a0d" : "#111",
          border: `1px solid ${open ? "#22c55e33" : "#2a2a2a"}`,
          borderRadius: 8,
          color: open ? "#22c55e" : "#666",
          fontSize: 12,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <span style={{ fontSize: 13 }}>🔍</span>
        {open ? "Diagnosis" : "Show diagnosis"}
        <span style={{ marginLeft: "auto", paddingRight: 10, fontSize: 11, opacity: 0.5 }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div style={{
          background: "#0a0f0a",
          border: "1px solid #1a2a1a",
          borderTop: "none",
          borderRadius: "0 0 8px 8px",
          padding: "12px 14px",
          fontSize: 12,
          lineHeight: 1.7,
        }}>
          <DiagSection label="Problem"       color="#ef4444" items={[diagnosis.problem]} />
          <DiagSection label="Evidence"      color="#f59e0b" items={diagnosis.evidence} />
          <DiagSection label="Suggested Fix" color="#22c55e" items={diagnosis.fix} />
        </div>
      )}
    </div>
  );
}

function DiagSection({ label, color, items }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        fontSize: 10, fontWeight: 600, color,
        textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4,
      }}>
        {label}
      </div>
      {items.filter(Boolean).map((line, i) => (
        <div key={i} style={{
          color: "#aaa",
          paddingLeft: 8,
          borderLeft: `2px solid ${color}44`,
          marginBottom: 2,
        }}>
          {line}
        </div>
      ))}
    </div>
  );
}