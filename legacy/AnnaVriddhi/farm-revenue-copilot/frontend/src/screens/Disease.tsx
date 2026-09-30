import { C, radius, shadow } from "../tokens";
import { Card, PageHeader, Badge, Btn, IconBadge } from "../components/ui";
import type { Screen } from "../tokens";

export default function Disease({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <div>
      <PageHeader
        title="Disease & Fertilizer"
        subtitle="AI-powered field photo analysis · Plot A"
        back="Dashboard"
        onBack={() => navigate("dashboard")}
        actions={<Badge color={C.sage} bg={C.sageTint}>No active disease detected</Badge>}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, marginBottom: 20 }}>
        {/* Field photo card */}
        <Card hover={false} style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ position: "relative" }}>
            <img
              src="https://images.unsplash.com/photo-1715289718087-66a61b7b4c0d?w=800&h=420&fit=crop&auto=format"
              alt="Field crop photo analysis"
              style={{ width: "100%", height: 340, objectFit: "cover", display: "block" }}
            />
            {/* Analysis overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 50%)",
              }}
            />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Badge color="#fff" bg="rgba(0,0,0,0.5)">⊙ Analysed 2h ago</Badge>
                <Badge color={C.sage} bg="rgba(92,122,94,0.4)">✓ No disease</Badge>
                <Badge color={C.amber} bg="rgba(184,134,59,0.4)">⚠ N-deficiency risk</Badge>
              </div>
            </div>
            {/* Scan indicator region */}
            <div
              style={{
                position: "absolute",
                top: "20%",
                left: "15%",
                width: "30%",
                height: "25%",
                border: `2px solid ${C.amber}`,
                borderRadius: radius.sm,
                boxShadow: `0 0 0 1px ${C.amber}44`,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -22,
                  left: 0,
                  background: C.amber,
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 4,
                  whiteSpace: "nowrap",
                }}
              >
                N-deficiency yellowing
              </div>
            </div>
          </div>
          <div style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Latest field scan — Nov 14, 6:08 AM</div>
            <div style={{ fontSize: 12, color: C.inkMuted }}>ML model: PlantVillage-ft · 847 frames analysed · 99.1% frame quality</div>
          </div>
        </Card>

        {/* Diagnosis panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Status cards */}
          {[
            {
              icon: "✓",
              color: C.sage,
              bg: C.sageTint,
              title: "No disease detected",
              severity: "Clear",
              detail: "No leaf rust, blight, or smut markers detected in today's scan. Re-scan recommended after next rain event.",
            },
            {
              icon: "!",
              color: C.amber,
              bg: C.amberTint,
              title: "Nitrogen deficiency — early signs",
              severity: "Moderate risk",
              detail: "Yellowing in lower leaves detected in sector 3 (NW corner). Consistent with N levels of 58 kg/ha seen in soil sensors.",
            },
          ].map(({ icon, color, bg, title, severity, detail }) => (
            <Card
              key={title}
              hover={false}
              style={{
                background: bg,
                border: `1px solid ${color}33`,
                padding: "18px",
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{title}</div>
                  <Badge color={color} size="sm">{severity}</Badge>
                </div>
              </div>
              <p style={{ fontSize: 12, color: C.inkMuted, lineHeight: 1.55, margin: 0 }}>{detail}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Fertilizer recommendations */}
      <Card hover={false} style={{ padding: "24px 28px", marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 20 }}>Fertilizer recommendations — current deficiencies</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[
            {
              icon: "⊕",
              deficiency: "Nitrogen (N)",
              severity: "Moderate",
              severityColor: C.amber,
              recommendation: "Urea top-dressing",
              dose: "25 kg/acre",
              timing: "Apply within 5 days",
              cost: "₹440",
              impact: "+₹280 yield value",
            },
            {
              icon: "◐",
              deficiency: "Organic Carbon",
              severity: "Low",
              severityColor: C.blue,
              recommendation: "Vermicompost or FYM",
              dose: "500 kg/acre",
              timing: "Apply before next season",
              cost: "₹380",
              impact: "Long-term soil health",
            },
            {
              icon: "∆",
              deficiency: "Zinc (Zn)",
              severity: "Trace",
              severityColor: C.inkMuted,
              recommendation: "Zinc sulphate foliar spray",
              dose: "0.5% solution",
              timing: "Optional · monitor first",
              cost: "₹60",
              impact: "+₹40 est.",
            },
          ].map(({ icon, deficiency, severity, severityColor, recommendation, dose, timing, cost, impact }) => (
            <div
              key={deficiency}
              style={{
                background: C.bg,
                borderRadius: radius.lg,
                padding: "18px",
                border: `1px solid ${C.line}`,
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                <IconBadge bg={C.surface} size={36}>{icon}</IconBadge>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{deficiency}</div>
                  <Badge color={severityColor} size="sm">{severity}</Badge>
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.sageDeep, marginBottom: 8 }}>{recommendation}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 12, color: C.inkMuted }}>Dose: <strong style={{ color: C.ink }}>{dose}</strong></div>
                <div style={{ fontSize: 12, color: C.inkMuted }}>Timing: <strong style={{ color: C.ink }}>{timing}</strong></div>
                <div style={{ fontSize: 12, color: C.inkMuted }}>Est. cost: <strong style={{ color: C.ink }}>{cost}</strong></div>
              </div>
              <div
                style={{
                  marginTop: 10,
                  padding: "8px 12px",
                  background: C.sageTint,
                  borderRadius: radius.sm,
                  fontSize: 12,
                  fontWeight: 700,
                  color: C.sageDeep,
                }}
              >
                {impact}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: "flex", gap: 12 }}>
        <Btn variant="primary" size="lg">⊞ Send fertilizer plan to WhatsApp</Btn>
        <Btn variant="secondary" size="lg" onClick={() => navigate("grade-capture")}>⊙ Re-scan field now</Btn>
      </div>
    </div>
  );
}
