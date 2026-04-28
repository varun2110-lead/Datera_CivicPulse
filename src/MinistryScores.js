export default function MinistryScores({ scores }) {
  if (!scores?.length) return null;

  return (
    <div style={{
      background: "#0d0d12", border: "1px solid #1a1a24",
      borderRadius: 12, padding: "18px 20px", marginBottom: 24,
    }}>
      <div style={{ fontSize: 10, color: "#444", letterSpacing: ".12em", marginBottom: 16 }}>
        MINISTRY ACCOUNTABILITY SCORECARD
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
        {scores.map(m => {
          const color = m.score > 80 ? "#22c55e" : m.score > 60 ? "#f59e0b" : "#ef4444";
          const grade = m.score > 90 ? "A" : m.score > 80 ? "B" : m.score > 60 ? "C" : m.score > 40 ? "D" : "F";
          const bgGrade = m.score > 80 ? "#052e16" : m.score > 60 ? "#2d1a00" : "#2d0808";

          return (
            <div key={m.name} style={{
              background: "#0a0a0f", borderRadius: 8,
              padding: "12px 14px",
              border: `1px solid ${m.score < 60 ? "#2d1010" : "#1a1a24"}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "#aaa", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>
                  {m.name}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color, fontWeight: 700 }}>{m.score}%</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color,
                    background: bgGrade, padding: "1px 6px", borderRadius: 4,
                  }}>
                    {grade}
                  </span>
                </div>
              </div>

              <div style={{ height: 3, background: "#1a1a1a", borderRadius: 2, overflow: "hidden", marginBottom: 8 }}>
                <div style={{ height: "100%", width: `${m.score}%`, background: color, borderRadius: 2, transition: "width 0.6s ease" }} />
              </div>

              <div style={{ display: "flex", gap: 12, fontSize: 10, color: "#444" }}>
                <span>{m.total} portal{m.total > 1 ? "s" : ""}</span>
                {m.down > 0 && <span style={{ color: "#ef4444" }}>⚠ {m.down} down</span>}
                {m.reports > 0 && <span style={{ color: "#f59e0b" }}>🗣 {m.reports} reports</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}