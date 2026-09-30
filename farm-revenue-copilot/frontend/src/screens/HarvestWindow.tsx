import { C, radius, shadow } from "../tokens";
import { Card, PageHeader, Badge, Btn, Sparkline } from "../components/ui";
import type { Screen } from "../tokens";

const calendar = [
  { date: "10", day: "Wed", icon: "◉", temp: "28°C", moisture: 91, risk: "low" as const },
  { date: "11", day: "Thu", icon: "⛅", temp: "25°C", moisture: 90, risk: "low" as const },
  { date: "12", day: "Fri", icon: "◉", temp: "27°C", moisture: 89, risk: "low" as const },
  { date: "13", day: "Sat", icon: "◉", temp: "26°C", moisture: 88, risk: "low" as const },
  { date: "14", day: "Sun", icon: "◉", temp: "27°C", moisture: 87, risk: "low" as const },
  { date: "15", day: "Mon", icon: "◉", temp: "26°C", moisture: 86, risk: "low" as const, recommended: true },
  { date: "16", day: "Tue", icon: "◉", temp: "25°C", moisture: 85, risk: "low" as const, recommended: true },
  { date: "17", day: "Wed", icon: "◉", temp: "26°C", moisture: 85, risk: "low" as const, recommended: true },
  { date: "18", day: "Thu", icon: "⛅", temp: "24°C", moisture: 84, risk: "medium" as const },
  { date: "19", day: "Fri", icon: "🌦️", temp: "22°C", moisture: 80, risk: "medium" as const },
  { date: "20", day: "Sat", icon: "🌧️", temp: "19°C", moisture: 75, risk: "high" as const },
  { date: "21", day: "Sun", icon: "🌧️", temp: "18°C", moisture: 68, risk: "high" as const },
];

const priceData = [2140, 2160, 2180, 2200, 2210, 2220, 2240, 2230, 2220, 2200, 2180, 2150];
const riskColors = { low: C.sage, medium: C.amber, high: C.rust };

export default function HarvestWindow({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <div>
      <PageHeader
        title="Harvest Window"
        subtitle="Optimal 3-day window identified · Plot A · Tomato"
        back="Recommendation"
        onBack={() => navigate("recommendation")}
        actions={<Badge color={C.sage} bg={C.sageTint} size="lg">◈ Harvest Sep 15–17</Badge>}
      />

      {/* Calendar strip */}
      <Card hover={false} style={{ padding: "24px 24px", marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 16 }}>12-day harvest calendar (Sep 10–21)</div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {calendar.map((d) => {
            const rc = riskColors[d.risk];
            return (
              <div
                key={d.date}
                style={{
                  minWidth: 80,
                  flexShrink: 0,
                  textAlign: "center",
                  padding: "14px 10px",
                  borderRadius: radius.lg,
                  background: d.recommended
                    ? `linear-gradient(160deg, ${C.sageTint}, #d4e8d6)`
                    : C.bg,
                  border: d.recommended
                    ? `2px solid ${C.sage}`
                    : `1px solid ${C.line}`,
                  position: "relative",
                  transition: "all 0.15s",
                }}
              >
                {d.recommended && (
                  <div
                    style={{
                      position: "absolute",
                      top: -11,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: C.sage,
                      color: "#fff",
                      fontSize: 8,
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: 99,
                      whiteSpace: "nowrap",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Harvest
                  </div>
                )}
                <div style={{ fontSize: 11, color: C.inkMuted, fontWeight: 600, marginBottom: 2 }}>{d.day}</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: d.recommended ? C.sageDeep : C.ink, marginBottom: 4 }}>{d.date}</div>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{d.icon}</div>
                <div style={{ fontSize: 11, color: C.ink }}>{d.temp}</div>
                <div
                  style={{
                    marginTop: 8,
                    padding: "3px 6px",
                    borderRadius: radius.full,
                    background: `${rc}18`,
                    fontSize: 9,
                    fontWeight: 700,
                    color: rc,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {d.risk}
                </div>
                <div style={{ fontSize: 10, color: C.inkMuted, marginTop: 4 }}>M: {d.moisture}%</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Scoring breakdown + price chart */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <Card hover={false} style={{ padding: "24px 28px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 16 }}>Window scoring — Sep 15</div>
          {[
            { factor: "Grain maturity", score: 92, color: C.sage, note: "88% dry matter, golden colour" },
            { factor: "Weather safety", score: 96, color: C.sage, note: "5 consecutive dry days" },
            { factor: "Mandi price trend", score: 88, color: C.sage, note: "₹2,240/qtl · peak this week" },
            { factor: "Transport availability", score: 80, color: C.amber, note: "2 of 3 harvesters confirmed" },
          ].map(({ factor, score, color, note }) => (
            <div key={factor} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{factor}</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14, color }}>{score}</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: C.line, overflow: "hidden", marginBottom: 3 }}>
                <div style={{ height: "100%", width: `${score}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: 999 }} />
              </div>
              <div style={{ fontSize: 10, color: C.inkMuted }}>{note}</div>
            </div>
          ))}
          <div
            style={{
              background: C.sageTint,
              borderRadius: radius.md,
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 4,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: C.sageDeep }}>Overall window score</span>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, color: C.sageDeep }}>89 / 100</span>
          </div>
        </Card>

        <Card hover={false} style={{ padding: "24px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Mandi price trend (₹/qtl)</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, color: C.sageDeep }}>₹2,240</div>
          </div>
          <div style={{ fontSize: 11, color: C.inkMuted, marginBottom: 16 }}>Nashik Mandi · Sep 10–21 forecast</div>
          <Sparkline data={priceData} color={C.sage} height={100} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            {["10", "12", "14", "15–17 ★", "19", "21"].map((d) => (
              <div key={d} style={{ fontSize: 9, color: d.includes("★") ? C.sage : C.inkMuted, fontWeight: d.includes("★") ? 700 : 400 }}>{d}</div>
            ))}
          </div>
          <div
            style={{
              background: C.sageTint,
              borderRadius: radius.md,
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 16,
            }}
          >
            <span style={{ fontSize: 12, color: C.inkMuted }}>Revenue vs. harvesting Sep 21</span>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, color: C.sageDeep }}>+₹1,080</span>
          </div>
        </Card>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <Btn variant="primary" size="lg">⊞ Send harvest schedule to WhatsApp</Btn>
        <Btn variant="secondary" size="lg" onClick={() => navigate("dashboard")}>Back to dashboard</Btn>
      </div>
    </div>
  );
}
