import { useState } from "react";
import { C, radius, shadow } from "../tokens";
import { Card, PageHeader, Badge, Btn } from "../components/ui";
import type { Screen } from "../tokens";

const recommendations = [
  { date: "Sep 1", type: "Irrigation", action: "Irrigate Plot A — soil at 38%", followed: "yes" as const, predicted: "+₹340", actual: "+₹380", icon: "≈" },
  { date: "Sep 2", type: "Disease", action: "Apply fungicide — blight early-stage detected", followed: "yes" as const, predicted: "+₹920", actual: "+₹860", icon: "⊕" },
  { date: "Sep 3", type: "Fertilizer", action: "Urea top-dressing 25 kg/acre", followed: "partial" as const, predicted: "+₹280", actual: "+₹140", icon: "⊕" },
  { date: "Sep 4", type: "Do-nothing", action: "No irrigation — rain expected in 2 days", followed: "yes" as const, predicted: "Save ₹420", actual: "Saved ₹420", icon: "✓" },
  { date: "Sep 5", type: "Irrigation", action: "Irrigate — dry spell extending 7+ days", followed: "no" as const, predicted: "+₹380", actual: "−₹200", icon: "≈" },
  { date: "Sep 7", type: "Grading", action: "Grade batch #2 — harvest timing optimal", followed: "yes" as const, predicted: "Grade A", actual: "Grade A (+₹420)", icon: "⊙" },
  { date: "Sep 9", type: "Fertilizer", action: "Apply nitrogen top-dress 20 kg/acre", followed: "yes" as const, predicted: "+₹480", actual: "In progress", icon: "◈" },
  { date: "Sep 10", type: "Scheme", action: "Apply for PMFBY before Sep 30 deadline", followed: "no" as const, predicted: "₹2,400 cover", actual: "Pending", icon: "▦" },
];

const followedConfig = {
  yes: { color: C.sage, bg: C.sageTint, label: "Followed", icon: "✓" },
  no: { color: C.rust, bg: C.rustTint, label: "Skipped", icon: "✗" },
  partial: { color: C.amber, bg: C.amberTint, label: "Partial", icon: "~" },
};

export default function SeasonReview({ navigate }: { navigate: (s: Screen) => void }) {
  const [tab, setTab] = useState<"cover" | "detail" | "share">("cover");

  return (
    <div>
      <PageHeader
        title="Season Review"
        subtitle="Kharif 2026 · Plot A · Wheat"
        back="Dashboard"
        onBack={() => navigate("dashboard")}
        actions={
          <div style={{ display: "flex", gap: 4, background: C.bg, borderRadius: radius.full, padding: 4, border: `1px solid ${C.line}` }}>
            {(["cover", "detail", "share"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "7px 18px",
                  borderRadius: radius.full,
                  border: "none",
                  background: tab === t ? C.sage : "transparent",
                  color: tab === t ? "#fff" : C.inkMuted,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  fontFamily: "var(--font-body)",
                }}
              >
                {t === "cover" ? "Overview" : t === "detail" ? "All recommendations" : "Share card"}
              </button>
            ))}
          </div>
        }
      />

      {tab === "cover" && (
        <div>
          {/* Hero wrapped card */}
          <div
            style={{
              background: `linear-gradient(135deg, ${C.sageDeep} 0%, #2a3d2c 50%, #1a2a1c 100%)`,
              borderRadius: radius.xxl,
              padding: "40px",
              marginBottom: 20,
              position: "relative",
              overflow: "hidden",
              display: "flex",
              gap: 48,
              alignItems: "center",
            }}
          >
            <div style={{ position: "absolute", top: -80, right: -80, width: 380, height: 380, borderRadius: "50%", background: `${C.sage}15` }} />
            <div style={{ position: "absolute", bottom: -50, left: 300, width: 200, height: 200, borderRadius: "50%", background: `${C.amber}10` }} />

            <div style={{ position: "relative" }}>
              <div style={{ fontSize: 11, color: `${C.sageTint}66`, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
                Season total revenue added
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(52px, 6vw, 80px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 10 }}>
                ₹4,280
              </div>
              <div style={{ fontSize: 14, color: `${C.sageTint}cc`, marginBottom: 24 }}>↑ 24% above last season</div>
              <div style={{ display: "flex", gap: 16 }}>
                {[
                  { label: "Followed", value: "18", icon: "✓" },
                  { label: "Partial", value: "4", icon: "🔶" },
                  { label: "Skipped", value: "3", icon: "⬜" },
                ].map(({ label, value, icon }) => (
                  <div key={label} style={{ background: "rgba(255,255,255,0.08)", borderRadius: radius.lg, padding: "14px 18px", textAlign: "center", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: "#fff" }}>{value}</div>
                    <div style={{ fontSize: 10, color: `${C.sageTint}88` }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { icon: "🏆", title: "Best week", value: "Sep 7 — Grade A tomato batch at ₹2,240/qtl" },
                { icon: "⊕", title: "Disease catch saved", value: "₹860 — caught blight in week 1" },
                { icon: "⚡", title: "Biggest miss", value: "Sep 5 irrigation — skipped, cost ₹200" },
                { icon: "◈", title: "Best crop result", value: "Tomato · Grade A · 12 qtl" },
              ].map(({ icon, title, value }) => (
                <div key={title} style={{ background: "rgba(255,255,255,0.07)", borderRadius: radius.md, padding: "12px 16px", display: "flex", gap: 12, alignItems: "center", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <span style={{ fontSize: 22 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 11, color: `${C.sageTint}77`, fontWeight: 600 }}>{title}</div>
                    <div style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Attribution */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {[
              { icon: "≈", label: "Irrigation", value: "₹820", pct: 19, color: C.blue },
              { icon: "◈", label: "Harvest timing", value: "₹1,840", pct: 43, color: C.sage },
              { icon: "⊙", label: "Grade quality", value: "₹1,260", pct: 29, color: C.amber },
              { icon: "▦", label: "Schemes", value: "₹360", pct: 9, color: "#4A6FA5" },
            ].map(({ icon, label, value, pct, color }) => (
              <Card key={label} style={{ padding: "18px", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color, letterSpacing: "-0.02em" }}>{value}</div>
                <div style={{ fontSize: 12, color: C.inkMuted, marginTop: 4 }}>{label}</div>
                <div style={{ height: 4, borderRadius: 999, background: C.line, marginTop: 10, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct * 2.3}%`, background: color, borderRadius: 999 }} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === "detail" && (
        <Card hover={false} style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "80px 100px 1fr 120px 120px 120px", padding: "12px 20px", background: C.bg, borderBottom: `1px solid ${C.line}`, fontSize: 11, fontWeight: 700, color: C.inkMuted, textTransform: "uppercase", letterSpacing: "0.06em", gap: 12 }}>
            <span>Date</span>
            <span>Type</span>
            <span>Recommendation</span>
            <span>Action taken</span>
            <span>Predicted</span>
            <span>Actual</span>
          </div>
          {recommendations.map((r, i) => {
            const fc = followedConfig[r.followed];
            return (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "80px 100px 1fr 120px 120px 120px",
                  padding: "14px 20px",
                  gap: 12,
                  borderBottom: i < recommendations.length - 1 ? `1px solid ${C.line}` : "none",
                  alignItems: "center",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = C.bg)}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
              >
                <span style={{ fontSize: 12, color: C.inkMuted }}>{r.date}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 16 }}>{r.icon}</span>
                  <span style={{ fontSize: 11, color: C.inkMuted, fontWeight: 600 }}>{r.type}</span>
                </div>
                <span style={{ fontSize: 13, color: C.ink }}>{r.action}</span>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: radius.full, background: fc.bg, border: `1px solid ${fc.color}33` }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: fc.color }}>{fc.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: fc.color }}>{fc.label}</span>
                </div>
                <span style={{ fontSize: 12, color: C.inkMuted }}>{r.predicted}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: r.followed === "yes" ? C.sageDeep : r.followed === "no" ? C.rust : C.amber }}>{r.actual}</span>
              </div>
            );
          })}
        </Card>
      )}

      {tab === "share" && (
        <div style={{ display: "flex", justifyContent: "center", gap: 32, alignItems: "flex-start" }}>
          {/* Shareable card preview */}
          <div
            style={{
              background: `linear-gradient(135deg, ${C.sageDeep} 0%, #2a3d2c 60%, #1a2a1c 100%)`,
              borderRadius: radius.xxl,
              padding: "36px",
              width: 400,
              position: "relative",
              overflow: "hidden",
              boxShadow: shadow.lg,
            }}
          >
            <div style={{ position: "absolute", top: -60, right: -60, width: 250, height: 250, borderRadius: "50%", background: `${C.sage}15` }} />
            <div style={{ position: "absolute", bottom: -40, left: -40, width: 150, height: 150, borderRadius: "50%", background: `${C.amber}10` }} />

            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: C.sage, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>◈</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Farm Revenue Copilot</div>
                <div style={{ marginLeft: "auto", fontSize: 12, color: `${C.sageTint}66` }}>Kharif 2026</div>
              </div>
              <div style={{ fontSize: 12, color: `${C.sageTint}66`, marginBottom: 4 }}>Ramesh's Farm · Nashik, Maharashtra</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 52, fontWeight: 800, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 6 }}>₹4,280</div>
              <div style={{ fontSize: 13, color: C.sageTint, marginBottom: 24 }}>added this season over baseline</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                {[
                  { label: "18 recommendations followed", icon: "✓" },
                  { label: "Grade A produce, 3 batches", icon: "🏆" },
                  { label: "Disease caught early — ₹860 saved", icon: "⊕" },
                  { label: "+24% vs. last season", icon: "📈" },
                ].map(({ label, icon }) => (
                  <div key={label} style={{ background: "rgba(255,255,255,0.07)", borderRadius: radius.sm, padding: "10px 12px", display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 16 }}>{icon}</span>
                    <span style={{ fontSize: 11, color: C.sageTint, lineHeight: 1.4 }}>{label}</span>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: "center", fontSize: 10, color: `${C.sageTint}44` }}>farmrevenuecopilot.in · Illustrative example</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Share your season summary</div>
            <p style={{ fontSize: 13, color: C.inkMuted, lineHeight: 1.6, maxWidth: 280, margin: 0 }}>Share this card on WhatsApp, print it, or save it as an image. A record of your season's journey.</p>
            <Btn variant="primary" size="lg">⊞ Share on WhatsApp</Btn>
            <Btn variant="secondary" size="lg">💾 Download as image</Btn>
            <Btn variant="ghost" size="md">🖨️ Print version</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
