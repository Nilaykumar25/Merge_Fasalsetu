import { C, radius, shadow } from "../tokens";
import { PageHeader, Card, IconBadge } from "../components/ui";
import type { Screen } from "../tokens";

export default function Help({ navigate }: { navigate: (s: Screen) => void }) {
  const steps = [
    { num: "01", icon: "⟳", bg: C.sageTint, color: C.sage, title: "Sensors read your field daily", body: "A small soil moisture sensor in your plot sends readings every 6 hours. Combined with live weather data and periodic field photos, this forms your crop's daily health score." },
    { num: "02", icon: "🧠", bg: "#EAF0FD", color: C.blue, title: "The system interprets crop state", body: "A rule-based model weighs moisture, weather, photo analysis, and your Soil Health Card data to identify risks and opportunities — before they cost you money." },
    { num: "03", icon: "⊞", bg: C.amberTint, color: C.amber, title: "You get a message — or silence", body: "When action is needed, you receive an SMS or WhatsApp message in your language. When no action is needed, you hear nothing — the system explicitly confirms 'all clear' so you know it's working." },
    { num: "04", icon: "₹", bg: C.sageTint, color: C.sageDeep, title: "Every message includes the rupee impact", body: "Not just 'irrigate now' — but 'irrigating now costs ₹320 and saves ₹1,400 in yield loss.' You make the decision; the system gives you the financial context to make it confidently." },
    { num: "05", icon: "🏆", bg: C.sageTint, color: C.sage, title: "At season end — a full review", body: "Every recommendation, whether you followed it, and the actual outcome — summarised in one shareable card. Next season's guidance improves based on your specific farm's history." },
  ];

  const faqs = [
    { q: "What happens when I have no internet?", a: "The sensor continues logging locally. When connectivity returns, data syncs automatically. You won't miss a recommendation — they queue and deliver when you're back online." },
    { q: "How accurate is the produce grading?", a: "The RGB image analysis approximates quality signals used in laboratory grading — size uniformity, colour consistency, surface blemishes. It's a calibrated estimate, not a certified lab result, and should be treated accordingly." },
    { q: "Is my farm data shared with anyone?", a: "Your specific farm data is never shared or sold. You can opt to contribute anonymised, aggregated data to help improve crop models for farmers like you — this is opt-in and controlled in Settings." },
    { q: "What if I disagree with a recommendation?", a: "The system logs your decision either way. Disagreeing (and being right or wrong) helps the model improve. You can also flag disagreements in the chatbot — that feedback is reviewed." },
    { q: "How are the scheme deadlines tracked?", a: "Scheme eligibility windows are maintained in a database updated seasonally. The system automatically alerts you when a deadline is approaching for schemes you qualify for based on your crop and location." },
  ];

  return (
    <div>
      <PageHeader
        title="How This Works"
        subtitle="Understanding Farm Revenue Copilot"
        back="Dashboard"
        onBack={() => navigate("dashboard")}
      />

      {/* How it works steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
        {steps.map((step) => (
          <div
            key={step.num}
            style={{
              display: "flex",
              gap: 20,
              background: C.surface,
              borderRadius: radius.xl,
              border: `1px solid ${C.line}`,
              boxShadow: shadow.card,
              padding: "24px 28px",
              alignItems: "flex-start",
            }}
          >
            <div style={{ fontFamily: "var(--font-display)", fontSize: 48, fontWeight: 800, color: C.line, letterSpacing: "-0.04em", flexShrink: 0, lineHeight: 1, userSelect: "none" }}>{step.num}</div>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flex: 1 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: step.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: step.icon === "₹" ? 20 : 24, fontFamily: step.icon === "₹" ? "var(--font-display)" : "inherit", fontWeight: step.icon === "₹" ? 800 : "normal", color: step.icon === "₹" ? step.color : "inherit", flexShrink: 0 }}>{step.icon}</div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 6, letterSpacing: "-0.01em" }}>{step.title}</div>
                <div style={{ fontSize: 14, color: C.inkMuted, lineHeight: 1.65 }}>{step.body}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: C.sageDeep, marginBottom: 16, letterSpacing: "-0.02em" }}>Frequently asked questions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {faqs.map(({ q, a }) => (
            <div
              key={q}
              style={{
                background: C.surface,
                borderRadius: radius.lg,
                border: `1px solid ${C.line}`,
                padding: "18px 22px",
                boxShadow: shadow.sm,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 8, display: "flex", gap: 8 }}>
                <span style={{ color: C.sage }}>Q</span> {q}
              </div>
              <div style={{ fontSize: 13, color: C.inkMuted, lineHeight: 1.65, paddingLeft: 18 }}>{a}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Support */}
      <div
        style={{
          background: `linear-gradient(135deg, ${C.sageTint}, #d4e8d6)`,
          borderRadius: radius.xl,
          padding: "24px 28px",
          border: `1px solid ${C.sage}33`,
          display: "flex",
          gap: 20,
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 36 }}>◊</span>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: C.sageDeep, marginBottom: 4 }}>Still have a question?</div>
          <div style={{ fontSize: 13, color: C.inkMuted }}>Ask in the chatbot — it knows your farm's data and can answer specific questions about your crop, schedule, and recommendations.</div>
        </div>
        <button
          onClick={() => navigate("chatbot")}
          style={{
            marginLeft: "auto",
            padding: "10px 20px",
            background: C.sage,
            color: "#fff",
            border: "none",
            borderRadius: radius.full,
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 14px rgba(92,122,94,0.3)",
          }}
        >
          Open chatbot →
        </button>
      </div>
    </div>
  );
}
