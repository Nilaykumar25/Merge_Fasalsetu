import { C, radius, shadow } from "../tokens";
import { Card, PageHeader, Badge, Sparkline } from "../components/ui";
import type { Screen } from "../tokens";

const monthlyRevData = [180, 240, 310, 290, 360, 420, 510, 490, 560, 680, 740, 820];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function RevenueSummary({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <div>
      <PageHeader
        title="Revenue Impact"
        subtitle="Kharif 2026 · Plot A · 2.5 acres · Tomato & Onion"
        back="Dashboard"
        onBack={() => navigate("dashboard")}
        actions={<Badge color={C.sage} bg={C.sageTint} size="lg">Season in progress</Badge>}
      />

      {/* Hero number */}
      <div
        style={{
          background: `linear-gradient(135deg, ${C.sageDeep} 0%, #2a3d2c 60%, #1a2a1c 100%)`,
          borderRadius: radius.xxl,
          padding: "40px 44px",
          marginBottom: 20,
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          gap: 48,
        }}
      >
        <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: `${C.sage}15` }} />
        <div style={{ position: "absolute", bottom: -40, left: 200, width: 180, height: 180, borderRadius: "50%", background: `${C.amber}10` }} />

        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: `${C.sageTint}88`, marginBottom: 10 }}>
            Total revenue added vs. unguided baseline
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(48px, 6vw, 80px)",
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "-0.04em",
              lineHeight: 1,
              marginBottom: 8,
            }}
          >
            ₹4,280
          </div>
          <div style={{ fontSize: 14, color: `${C.sageTint}cc` }}>this season so far · Season Sep–Dec 2026</div>
        </div>

        <div style={{ display: "flex", gap: 24, position: "relative" }}>
          {[
            { label: "Above last season", value: "+24%" },
            { label: "Recommendations followed", value: "18 / 25" },
            { label: "Projected season total", value: "₹6,800" },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>{value}</div>
              <div style={{ fontSize: 11, color: `${C.sageTint}88`, marginTop: 4, maxWidth: 90, lineHeight: 1.4 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Attribution breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        {[
          { icon: "≈", label: "Irrigation savings", value: "₹820", sub: "3 unnecessary irrigations avoided", color: C.blue, bg: C.blueTint },
          { icon: "◈", label: "Harvest timing", value: "₹1,840", sub: "Optimal window captured", color: C.sage, bg: C.sageTint },
          { icon: "⊙", label: "Grade improvement", value: "₹1,260", sub: "Grade B → A on 3 batches", color: C.amber, bg: C.amberTint },
          { icon: "▦", label: "Scheme benefits", value: "₹360", sub: "2 subsidies claimed this season", color: "#4A6FA5", bg: "#EAF0FD" },
        ].map(({ icon, label, value, sub, color, bg }) => (
          <Card key={label} style={{ padding: "20px", textAlign: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 12px" }}>{icon}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color, letterSpacing: "-0.02em", marginBottom: 4 }}>{value}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 11, color: C.inkMuted, lineHeight: 1.4 }}>{sub}</div>
          </Card>
        ))}
      </div>

      {/* Revenue trend chart */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
        <Card hover={false} style={{ padding: "24px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>Cumulative revenue impact (₹ hundreds)</div>
            <Badge color={C.sage} bg={C.sageTint}>Season Sep 2026 – Dec 2026</Badge>
          </div>
          <Sparkline data={monthlyRevData} color={C.sage} height={120} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            {months.map((m) => (
              <div key={m} style={{ fontSize: 10, color: C.inkMuted }}>{m}</div>
            ))}
          </div>
        </Card>

        <Card hover={false} style={{ padding: "24px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 16 }}>Revenue per recommendation type</div>
          {[
            { type: "Harvest timing", pct: 43, color: C.sage },
            { type: "Grade improvement", pct: 29, color: C.amber },
            { type: "Irrigation mgmt", pct: 19, color: C.blue },
            { type: "Scheme claims", pct: 9, color: "#4A6FA5" },
          ].map(({ type, pct, color }) => (
            <div key={type} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                <span style={{ color: C.ink, fontWeight: 600 }}>{type}</span>
                <span style={{ color, fontWeight: 700 }}>{pct}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: C.line }}>
                <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: 999 }} />
              </div>
            </div>
          ))}
          <div
            style={{
              marginTop: 16,
              padding: "12px",
              background: C.sageTint,
              borderRadius: radius.md,
              fontSize: 12,
              color: C.sageDeep,
              fontWeight: 600,
            }}
          >
            Projected to season end: <strong style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>₹6,800</strong>
          </div>
        </Card>
      </div>
    </div>
  );
}
