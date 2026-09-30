import { C, radius } from "../tokens";
import { Btn, Badge } from "../components/ui";
import type { Screen } from "../tokens";

export default function Alert({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <div
      style={{
        minHeight: "calc(100vh - 120px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(160deg, ${C.rustTint} 0%, #f8e0d8 40%, ${C.bg} 100%)`,
        borderRadius: radius.xxl,
        position: "relative",
        overflow: "hidden",
        padding: "48px",
      }}
    >
      <div style={{ position: "absolute", top: -80, right: -80, width: 340, height: 340, borderRadius: "50%", background: `${C.rust}10`, border: `1px solid ${C.rust}18` }} />
      <div style={{ position: "absolute", bottom: -40, left: 80, width: 200, height: 200, borderRadius: "50%", background: `${C.amber}08` }} />

      <div style={{ textAlign: "center", position: "relative", maxWidth: 600 }}>
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.rust}22 0%, ${C.rustTint} 100%)`,
            border: `2px solid ${C.rust}44`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 52,
            margin: "0 auto 28px",
            boxShadow: `0 8px 32px ${C.rust}18`,
            animation: "float 3s ease-in-out infinite",
          }}
        >
          !
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <Badge color={C.rust} bg={`${C.rust}18`} size="md">🚨 Urgent — Act today</Badge>
        </div>

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(28px, 4.5vw, 46px)",
            fontWeight: 700,
            color: C.rust,
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
            marginBottom: 16,
          }}
        >
          Soil moisture critically low —
          <br />irrigate within 24 hours.
        </h1>

        <p
          style={{
            fontSize: 17,
            lineHeight: 1.65,
            color: C.inkMuted,
            maxWidth: 440,
            margin: "0 auto 32px",
          }}
        >
          Soil moisture has dropped to <strong style={{ color: C.rust }}>31%</strong> — 14 points below the stress threshold for wheat at this growth stage. No rain is forecast for the next 6 days. Delay beyond today risks permanent yield reduction.
        </p>

        {/* Impact card */}
        <div
          style={{
            background: "rgba(255,255,255,0.8)",
            backdropFilter: "blur(8px)",
            borderRadius: radius.xl,
            padding: "20px 28px",
            border: `1.5px solid ${C.rust}33`,
            marginBottom: 32,
            display: "flex",
            gap: 24,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {[
            { label: "Cost of irrigating now", value: "₹320", color: C.sage, icon: "✓" },
            { label: "Loss if you delay 48h", value: "₹1,400", color: C.rust, icon: "📉" },
            { label: "Soil moisture now", value: "31%", color: C.rust, icon: "≈" },
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: 11, color: C.inkMuted, fontWeight: 600, marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color, letterSpacing: "-0.02em" }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Btn variant="danger" size="lg" onClick={() => navigate("irrigation")}>
            ≈ View irrigation plan →
          </Btn>
          <Btn variant="secondary" size="lg" onClick={() => navigate("dashboard")}>
            Back to dashboard
          </Btn>
        </div>

        <div style={{ marginTop: 24, fontSize: 12, color: C.inkMuted }}>
          Alert generated at 6:12 AM · Sensor ID: SM-A12 · Plot A
        </div>
      </div>
    </div>
  );
}
