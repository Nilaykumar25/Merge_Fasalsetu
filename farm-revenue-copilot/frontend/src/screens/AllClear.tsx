import { C, radius, shadow } from "../tokens";
import { Btn } from "../components/ui";
import type { Screen } from "../tokens";

export default function AllClear({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <div
      style={{
        minHeight: "calc(100vh - 120px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(160deg, ${C.sageTint} 0%, #d0e8d2 40%, #e8f4e9 100%)`,
        borderRadius: radius.xxl,
        position: "relative",
        overflow: "hidden",
        padding: "48px",
      }}
    >
      {/* Decorative background shapes */}
      <div style={{ position: "absolute", top: -80, right: -80, width: 360, height: 360, borderRadius: "50%", background: `${C.sage}14`, border: `1px solid ${C.sage}22` }} />
      <div style={{ position: "absolute", bottom: -60, left: -60, width: 280, height: 280, borderRadius: "50%", background: `${C.sage}10` }} />
      <div style={{ position: "absolute", top: "30%", right: "10%", width: 100, height: 100, borderRadius: "50%", background: `${C.sage}08` }} />

      <div style={{ textAlign: "center", position: "relative", maxWidth: 600 }}>
        {/* Checkmark */}
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.sage}33 0%, ${C.sageTint} 100%)`,
            border: `2px solid ${C.sage}44`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 56,
            margin: "0 auto 32px",
            boxShadow: `0 8px 32px ${C.sage}22`,
            animation: "float 4s ease-in-out infinite",
          }}
        >
          ✓
        </div>

        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: C.sage,
            marginBottom: 12,
          }}
        >
          Wednesday, 10 September 2026
        </div>

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(32px, 5vw, 52px)",
            fontWeight: 700,
            color: C.sageDeep,
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
            marginBottom: 16,
          }}
        >
          All clear — your crop
          <br />is looking healthy.
        </h1>

        <p
          style={{
            fontSize: 17,
            lineHeight: 1.65,
            color: C.inkMuted,
            maxWidth: 440,
            margin: "0 auto 36px",
          }}
        >
          No irrigation, intervention, or treatment needed today. Doing nothing is the right call —
          and it saves you an estimated <strong style={{ color: C.sageDeep }}>₹420</strong> in unnecessary costs.
        </p>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: 16,
            justifyContent: "center",
            marginBottom: 40,
            flexWrap: "wrap",
          }}
        >
          {[
            { icon: "◈", label: "Health index", value: "82/100" },
            { icon: "≈", label: "Soil moisture", value: "74% — good" },
            { icon: "◉", label: "Weather", value: "Clear, 26°C" },
          ].map(({ icon, label, value }) => (
            <div
              key={label}
              style={{
                background: "rgba(255,255,255,0.65)",
                backdropFilter: "blur(8px)",
                borderRadius: radius.lg,
                padding: "16px 20px",
                minWidth: 120,
                textAlign: "center",
                border: `1px solid ${C.sage}22`,
                boxShadow: `0 2px 12px ${C.sage}10`,
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 11, color: C.inkMuted, fontWeight: 600, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.sageDeep }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Btn variant="primary" size="lg" onClick={() => navigate("crop-condition")}>
            View crop details
          </Btn>
          <Btn variant="secondary" size="lg" onClick={() => navigate("dashboard")}>
            Back to dashboard
          </Btn>
        </div>

        <div
          style={{
            marginTop: 32,
            fontSize: 13,
            color: C.inkMuted,
          }}
        >
          Next check-in: <strong style={{ color: C.sageDeep }}>Tomorrow morning at 6 AM</strong>
        </div>
      </div>
    </div>
  );
}
