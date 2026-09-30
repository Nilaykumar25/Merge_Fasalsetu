import { useState } from "react";
import { C, radius, shadow } from "../tokens";
import { Btn, Badge } from "../components/ui";

export default function Landing({ navigate }: { navigate: (s: string) => void }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubmitted(true);
  };

  return (
    <div style={{ background: C.bg, color: C.ink, fontFamily: "var(--font-body)", minHeight: "100vh" }}>
      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          background: C.surface,
          borderBottom: `1px solid ${C.line}`,
          boxShadow: shadow.sm,
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.md,
              background: `linear-gradient(135deg, ${C.sage} 0%, ${C.sageMid} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              color: "#fff",
              fontWeight: 700,
            }}
          >
            ◈
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: C.sageDeep }}>
            AnnaVriddhi
          </div>
          <div style={{ fontSize: 11, color: C.inkMuted, fontWeight: 600, textTransform: "uppercase", marginLeft: 8 }}>
            Farm Revenue Copilot
          </div>
        </div>
        <button
          onClick={() => {
            // Navigate to Auth screen instead of directly to dashboard
            // This ensures proper authentication flow
            navigate("signin");
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            borderRadius: radius.full,
            fontWeight: 600,
            fontFamily: "var(--font-body)",
            cursor: "pointer",
            background: C.sage,
            color: "#fff",
            border: "none",
            padding: "9px 18px",
            fontSize: 13,
            transition: "all 0.15s",
            boxShadow: shadow.btn,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.opacity = "0.88";
            (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.opacity = "1";
            (e.currentTarget as HTMLElement).style.transform = "none";
          }}
        >
          Sign In →
        </button>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "80px 32px",
          maxWidth: 1200,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <Badge color={C.sage} bg={C.sageTint} size="lg">
            ★ Kharif 2026 — 2,500+ farms trusting AnnaVriddhi
          </Badge>
        </div>

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 52,
            fontWeight: 700,
            color: C.sageDeep,
            margin: "0 0 20px 0",
            lineHeight: 1.2,
            letterSpacing: "-0.03em",
            maxWidth: 900,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Know what your crop needs, before it costs you.
        </h1>

        <p
          style={{
            fontSize: 18,
            color: C.inkMuted,
            marginBottom: 40,
            lineHeight: 1.6,
            maxWidth: 700,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Real-time crop monitoring. Actionable recommendations. Revenue impact on every alert. No data app required — works over SMS.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 60 }}>
          <Btn
            variant="primary"
            size="lg"
            onClick={() => navigate("signin")}
          >
            Get Started
          </Btn>
          <Btn variant="ghost" size="lg">
            Watch 2-min overview
          </Btn>
        </div>

        {/* Hero graphic */}
        <div
          style={{
            background: `linear-gradient(135deg, ${C.sageTint} 0%, ${C.blueTint} 100%)`,
            borderRadius: radius.xl,
            padding: 40,
            border: `1px solid ${C.line}`,
            boxShadow: shadow.lg,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 20,
              marginBottom: 24,
            }}
          >
            {[
              { label: "Soil moisture", value: "74%", icon: "≈", color: C.blue },
              { label: "Crop health", value: "82/100", icon: "◈", color: C.sage },
              { label: "Risk level", value: "Low", icon: "✓", color: C.sage },
            ].map(({ label, value, icon, color }) => (
              <div
                key={label}
                style={{
                  background: C.surface,
                  borderRadius: radius.lg,
                  padding: 16,
                  boxShadow: shadow.sm,
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
                <div style={{ fontSize: 11, color: C.inkMuted, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>
                  {label}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: "var(--font-display)" }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: C.surface, borderRadius: radius.md, padding: 12, fontSize: 12, color: C.inkMuted }}>
            Live data from 100+ sensor points across your farm. Updates every 2 hours.
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────────── */}
      <section style={{ background: C.surface, padding: "60px 32px", borderTop: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 36,
              fontWeight: 700,
              color: C.sageDeep,
              textAlign: "center",
              marginBottom: 48,
              letterSpacing: "-0.02em",
            }}
          >
            The workflow — 4 steps
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 20,
            }}
          >
            {[
              {
                step: "1",
                title: "Sense",
                desc: "Sensors + photos + weather",
                icon: "⊙",
                detail: "Continuous field monitoring every 2 hours",
              },
              {
                step: "2",
                title: "Advise",
                desc: "Plain-language recommendation",
                icon: "★",
                detail: "SMS alert with action + ₹ impact",
              },
              {
                step: "3",
                title: "Act",
                desc: "One-tap confirmation",
                icon: "✓",
                detail: "Mark done. System records action.",
              },
              {
                step: "4",
                title: "Earn",
                desc: "Season review + insights",
                icon: "◆",
                detail: "See what worked, what to improve",
              },
            ].map(({ step, title, desc, icon, detail }) => (
              <div
                key={step}
                style={{
                  background: C.bg,
                  borderRadius: radius.lg,
                  padding: 24,
                  border: `1px solid ${C.line}`,
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = shadow.card;
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLElement).style.transform = "none";
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radius.md,
                    background: C.sageTint,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    marginBottom: 12,
                  }}
                >
                  {icon}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: C.sage,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 8,
                  }}
                >
                  Step {step}
                </div>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: C.ink,
                    margin: "0 0 4px 0",
                  }}
                >
                  {title}
                </h3>
                <p
                  style={{
                    fontSize: 12,
                    color: C.inkMuted,
                    margin: "0 0 12px 0",
                    lineHeight: 1.5,
                  }}
                >
                  {desc}
                </p>
                <div
                  style={{
                    fontSize: 11,
                    color: C.inkMuted,
                    lineHeight: 1.4,
                    fontStyle: "italic",
                  }}
                >
                  {detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ────────────────────────────────────────────────────── */}
      <section style={{ padding: "60px 32px", background: C.bg }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 36,
              fontWeight: 700,
              color: C.sageDeep,
              textAlign: "center",
              marginBottom: 48,
              letterSpacing: "-0.02em",
            }}
          >
            What you get
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 24,
            }}
          >
            {[
              {
                title: "Irrigation precision",
                desc: "Know exactly when to water — down to the day",
                icon: "≈",
                bg: C.blueTint,
              },
              {
                title: "Disease early warning",
                desc: "Rust, blast, leaf spot — flagged before spread",
                icon: "⊕",
                bg: C.amberTint,
              },
              {
                title: "Harvest window",
                desc: "5-day optimal window for best price + quality",
                icon: "□",
                bg: C.sageTint,
              },
              {
                title: "Produce grading",
                desc: "Photo → A–D grade + market price instantly",
                icon: "⊙",
                bg: C.sageTint,
              },
              {
                title: "Scheme matching",
                desc: "PM-KISAN, Fasal Bima, KCC — auto-matched",
                icon: "◐",
                bg: C.blueTint,
              },
              {
                title: "Season review",
                desc: "Your decisions vs. outcomes — ₹ impact shown",
                icon: "◆",
                bg: C.amberTint,
              },
            ].map(({ title, desc, icon, bg }) => (
              <div
                key={title}
                style={{
                  background: bg,
                  borderRadius: radius.lg,
                  padding: 28,
                  border: `1px solid ${C.line}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 32 }}>{icon}</div>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: C.ink,
                    margin: 0,
                  }}
                >
                  {title}
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: C.inkMuted,
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ───────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "80px 32px",
          background: `linear-gradient(135deg, ${C.sage}22 0%, ${C.blue}11 100%)`,
          borderTop: `1px solid ${C.line}`,
        }}
      >
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 36,
              fontWeight: 700,
              color: C.sageDeep,
              marginBottom: 16,
              letterSpacing: "-0.02em",
            }}
          >
            Start monitoring your crop today
          </h2>

          <p
            style={{
              fontSize: 16,
              color: C.inkMuted,
              marginBottom: 32,
              lineHeight: 1.6,
            }}
          >
            Get your first recommendation within 24 hours. Works on any phone over SMS — no data or app required.
          </p>

          {!submitted ? (
            <form
              onSubmit={handleSubmit}
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <input
                type="email"
                placeholder="your@phone.number"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  flex: 1,
                  padding: "11px 16px",
                  borderRadius: radius.full,
                  border: `1.5px solid ${C.line}`,
                  fontSize: 13,
                  fontFamily: "var(--font-body)",
                  background: C.surface,
                  color: C.ink,
                  transition: "all 0.15s",
                }}
                onFocus={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = C.sage;
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 3px ${C.sageTint}`;
                }}
                onBlur={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = C.line;
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              />
              <button
                type="submit"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  borderRadius: radius.full,
                  fontWeight: 600,
                  fontFamily: "var(--font-body)",
                  cursor: "pointer",
                  background: C.sage,
                  color: "#fff",
                  border: "none",
                  padding: "11px 24px",
                  fontSize: 13,
                  transition: "all 0.15s",
                  boxShadow: shadow.btn,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = "0.88";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = "1";
                  (e.currentTarget as HTMLElement).style.transform = "none";
                }}
              >
                Get Started
              </button>
            </form>
          ) : (
            <div
              style={{
                background: C.sageTint,
                border: `1px solid ${C.line}`,
                borderRadius: radius.lg,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: C.sageDeep }}>
                ✓ Thanks! We'll be in touch soon.
              </div>
              <div style={{ fontSize: 12, color: C.inkMuted, marginTop: 4 }}>
                Check your SMS for first recommendation.
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: 16,
              padding: 16,
              background: C.sageTint,
              borderRadius: radius.md,
              border: `1px solid ${C.line}`,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: C.sageDeep, marginBottom: 6 }}>
              Try Demo Account
            </div>
            <div style={{ fontSize: 11, color: C.inkMuted, marginBottom: 8, lineHeight: 1.5 }}>
              Experience the full app with sample farm data:
            </div>
            <div style={{ fontSize: 11, color: C.ink, fontFamily: 'monospace', background: C.surface, padding: '8px 10px', borderRadius: radius.sm, marginBottom: 4 }}>
              Email: <strong>demo@123</strong>
            </div>
            <div style={{ fontSize: 11, color: C.ink, fontFamily: 'monospace', background: C.surface, padding: '8px 10px', borderRadius: radius.sm }}>
              Password: <strong>123</strong>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer
        style={{
          background: C.surface,
          borderTop: `1px solid ${C.line}`,
          padding: "32px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <p style={{ fontSize: 12, color: C.inkMuted, margin: 0, lineHeight: 1.6 }}>
            AnnaVriddhi is a hackathon project built for Indian farmers. <br />
            Real crop data. Real recommendations. Real revenue impact.
          </p>
        </div>
      </footer>
    </div>
  );
}
