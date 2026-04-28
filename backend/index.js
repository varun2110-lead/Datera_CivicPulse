const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// How many consecutive ECONNREFUSED / 5xx errors before we call a portal "down".
// 3 probes × 5 min apart = confirmed down only after 15 minutes of hard failures.
const DOWN_THRESHOLD = 3;

// Per-portal failure streak tracker (in-memory, resets on process restart).
// Shape: { [portalId]: { streak: number, lastFailType: string } }
const failureStreaks = {};

// HTTP codes that mean the server is reachable but blocking the probe.
const BOT_BLOCK_CODES = new Set([403, 406, 429]);

function classifyRawResult({ httpCode, responseMs, timedOut, connectionRefused }) {
  // Timeout = almost certainly firewall / bot protection on Indian govt sites.
  // These servers silently drop non-browser requests — this is NOT a real outage.
  if (timedOut) return "probe_blocked";

  // httpCode === null without a timeout means the connection died mid-flight
  // (SSL error, DNS failure, network reset). Still ambiguous — treat as blocked.
  if (httpCode === null) return "probe_blocked";

  // ECONNREFUSED is the only unambiguous failure signal.
  // A live server never refuses connections — only a crashed/stopped process does.
  if (connectionRefused) return "error";

  // Active bot block via HTTP status
  if (BOT_BLOCK_CODES.has(httpCode)) return "probe_blocked";

  // 503 — could be maintenance mode or transient overload, not a confirmed down
  if (httpCode === 503) return "probe_blocked";

  // Genuine server-side failures
  if (httpCode >= 500) return "error";

  // 4xx — server is up, URL/content is broken
  if (httpCode >= 400) return "error";

  // Server responded normally — check speed
  if (responseMs > 4000) return "slow";
  return "up";
}

function resolveStatus(portalId, rawResult) {
  // Successes and probe blocks always reset the streak — not a real failure
  if (rawResult === "up" || rawResult === "slow" || rawResult === "probe_blocked") {
    failureStreaks[portalId] = { streak: 0, lastFailType: null };
    return rawResult;
  }

  // Hard failure (ECONNREFUSED or 5xx) — increment streak
  const prev = failureStreaks[portalId] || { streak: 0, lastFailType: null };
  const streak = prev.streak + 1;
  failureStreaks[portalId] = { streak, lastFailType: rawResult };

  if (streak < DOWN_THRESHOLD) {
    // Not confirmed yet — surface as "timeout" (amber warning, not red alarm)
    return "timeout";
  }

  // Confirmed down after N consecutive hard failures
  return "down";
}

async function pingPortal(portal) {
  const start = Date.now();
  let timedOut = false;
  let connectionRefused = false;
  let httpCode = null;
  let responseMs = null;

  try {
    const res = await axios.get(portal.url, {
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-IN,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

    responseMs = Date.now() - start;
    httpCode = res.status;
  } catch (err) {
    responseMs = Date.now() - start;
    if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
      timedOut = true;
    } else if (err.code === "ECONNREFUSED") {
      connectionRefused = true;
    }
    // Any other network error (ENOTFOUND, ECONNRESET, SSL) leaves timedOut=false
    // and httpCode=null → classifyRawResult returns probe_blocked
  }

  const rawResult = classifyRawResult({ httpCode, responseMs, timedOut, connectionRefused });
  const status    = resolveStatus(portal.id, rawResult);
  const streak    = failureStreaks[portal.id]?.streak || 0;

  let probe_note = null;
  if (rawResult === "probe_blocked") {
    probe_note = timedOut
      ? "Request timed out — firewall or bot protection suspected"
      : httpCode
      ? `HTTP ${httpCode} — server is blocking automated probes`
      : "Connection dropped mid-flight — SSL/DNS issue, real users likely unaffected";
  } else if (status === "timeout") {
    probe_note = `Hard failure ${streak}/${DOWN_THRESHOLD} — waiting for confirmation before marking down`;
  } else if (status === "down") {
    probe_note = `Confirmed down — ${streak} consecutive hard failures (ECONNREFUSED / 5xx)`;
  }

  return {
    portal_id:   portal.id,
    status,
    response_ms: responseMs,
    http_code:   httpCode,
    ssl_valid:   portal.url.startsWith("https"),
    fail_streak: streak,
    probe_note,
  };
}

const STATUS_ICON = {
  up:            "✓",
  slow:          "⚠",
  timeout:       "⏱",
  down:          "✗",
  probe_blocked: "🛡",
};
const STATUS_NOTE = {
  probe_blocked: "(bot-blocked — likely working for real users)",
  timeout:       "(hard failure, not yet confirmed down)",
};

async function runChecks() {
  console.log(`\n[${new Date().toISOString()}] Starting check cycle...`);

  const { data: portals, error } = await supabase.from("portals").select("*");
  if (error) {
    console.error("Failed to fetch portals:", error);
    return;
  }

  const results = [];
  const counts = { up: 0, slow: 0, timeout: 0, down: 0, probe_blocked: 0 };

  for (const portal of portals) {
    const result = await pingPortal(portal);
    results.push(result);
    counts[result.status] = (counts[result.status] || 0) + 1;

    const icon = STATUS_ICON[result.status] || "?";
    const ms   = result.response_ms ? `${result.response_ms}ms` : "—";
    const note = STATUS_NOTE[result.status] || "";
    console.log(
      `  ${icon} ${portal.name.padEnd(35)} [${result.status.padEnd(14)}] ${ms.padEnd(8)} ${note}`
    );

    await sleep(800 + Math.random() * 700);
  }

  const { error: insertError } = await supabase.from("checks").insert(results);
  if (insertError) {
    console.error("Insert error:", insertError);
  } else {
    console.log(
      `[OK] Stored ${results.length} checks.` +
      ` Up: ${counts.up} | Slow: ${counts.slow} | Blocked: ${counts.probe_blocked} | Timeout: ${counts.timeout} | Down: ${counts.down}`
    );
  }
}

runChecks();
setInterval(runChecks, 10 * 60 * 1000);