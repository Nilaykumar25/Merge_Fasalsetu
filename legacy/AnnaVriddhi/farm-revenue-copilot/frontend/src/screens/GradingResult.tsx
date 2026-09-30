import { useState, useEffect } from "react";
import { C, radius, shadow } from "../tokens";
import { Card, PageHeader, Badge, Btn, IconBadge } from "../components/ui";
import type { Screen } from "../tokens";

function GradeBadge({ grade, size = 140 }: { grade: "A" | "B" | "C"; size?: number }) {
  const configs = {
    A: { color: C.sage, bg: C.sageTint, shadow: `${C.sage}30`, label: "Premium" },
    B: { color: C.amber, bg: C.amberTint, shadow: `${C.amber}30`, label: "Standard" },
    C: { color: C.rust, bg: C.rustTint, shadow: `${C.rust}30`, label: "Below grade" },
  };
  const c = configs[grade];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle at 35% 35%, ${c.bg}, ${c.bg}88)`,
        border: `3px solid ${c.color}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 8px 32px ${c.shadow}, 0 0 0 6px ${c.color}18`,
        flexShrink: 0,
      }}
    >
      <div style={{ fontFamily: "var(--font-display)", fontSize: size * 0.48, fontWeight: 800, color: c.color, lineHeight: 1, letterSpacing: "-0.04em" }}>{grade}</div>
      <div style={{ fontSize: size * 0.12, fontWeight: 700, color: c.color, marginTop: 2, letterSpacing: "0.04em", textTransform: "uppercase" }}>{c.label}</div>
    </div>
  );
}

interface GradingResultData {
  crop: string;
  cropId: string;
  grade: "A" | "B" | "C";
  quality_score: number;
  subscores?: {
    color_ripeness?: number;
    surface_defect?: number;
    shape?: number;
  };
  gradedAt: string;
}

export default function GradingResult({ navigate }: { navigate: (s: Screen) => void }) {
  const [result, setResult] = useState<GradingResultData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load result from sessionStorage (set by GradeCapture)
    const storedResult = sessionStorage.getItem('latest_grading_result');
    if (storedResult) {
      try {
        const parsed = JSON.parse(storedResult);
        setResult(parsed);
      } catch (err) {
        console.error('Error parsing grading result:', err);
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Grading Result"
          subtitle="Loading result..."
          back="Grade Produce"
          onBack={() => navigate("grade-capture")}
        />
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 14, color: C.inkMuted }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div>
        <PageHeader
          title="Grading Result"
          subtitle="No result available"
          back="Grade Produce"
          onBack={() => navigate("grade-capture")}
        />
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⊙</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 8 }}>
            No Grading Result
          </div>
          <div style={{ fontSize: 14, color: C.inkMuted, marginBottom: 24 }}>
            Grade a batch first to see results here
          </div>
          <Btn variant="primary" onClick={() => navigate("grade-capture")}>
            Grade Produce →
          </Btn>
        </div>
      </div>
    );
  }

  const grade = result.grade || "B";
  const qualityScore = result.quality_score || 0;
  const subscores = result.subscores || {};

  return (
    <div>
      <PageHeader
        title="Grading Result"
        subtitle={`${result.crop} · ${new Date(result.gradedAt).toLocaleDateString()}`}
        back="Grade Produce"
        onBack={() => navigate("grade-capture")}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="secondary" onClick={() => navigate("grading-history")}>View history</Btn>
            <Btn variant="primary">⊞ Share result</Btn>
          </div>
        }
      />

      {/* Hero result */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 28, marginBottom: 20, alignItems: "stretch" }}>
        <Card
          hover={false}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "36px 40px",
            background: `linear-gradient(135deg, ${C.sageTint} 0%, #d4e8d6 100%)`,
            border: `1px solid ${C.sage}33`,
            gap: 20,
          }}
        >
          <GradeBadge grade={grade} size={160} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, color: C.sageDeep, letterSpacing: "-0.03em" }}>{qualityScore} / 100</div>
            <div style={{ fontSize: 13, color: C.inkMuted, marginTop: 4 }}>Quality score</div>
          </div>
        </Card>

        <Card hover={false} style={{ padding: "28px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 20 }}>Quality signal breakdown</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {[
              { icon: "🎨", label: "Colour & ripeness", score: subscores.color_ripeness || 0, color: C.sage, detail: "Based on RGB analysis" },
              { icon: "🔍", label: "Surface quality", score: subscores.surface_defect || 0, color: C.sage, detail: "Defect detection" },
              { icon: "▭", label: "Shape uniformity", score: subscores.shape || 0, color: C.sage, detail: "Geometric analysis" },
            ].map(({ icon, label, score, color, detail }) => (
              <div key={label}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{label}</span>
                      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color }}>{score}</span>
                    </div>
                    <div style={{ fontSize: 11, color: C.inkMuted, marginTop: 1 }}>{detail}</div>
                  </div>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: C.line, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${score}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 12 }}>
        <Btn variant="primary" onClick={() => navigate("grade-capture")}>
          Grade Another Batch
        </Btn>
        <Btn variant="secondary" onClick={() => navigate("grading-history")}>
          View History
        </Btn>
        <Btn variant="ghost" onClick={() => navigate("dashboard")}>
          Back to Dashboard
        </Btn>
      </div>
    </div>
  );
}
