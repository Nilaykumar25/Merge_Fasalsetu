import { C, radius, shadow } from "../tokens";
import { PageHeader, Badge } from "../components/ui";
import type { Screen } from "../tokens";

const messages = [
  { id: 1, channel: "WhatsApp", channelIcon: "◊", channelColor: "#25D366", time: "9:12 AM", read: false, urgent: true, title: "◈ Harvest window identified", preview: "Your tomatoes are ready for harvest Sep 15–17. Estimated revenue impact: +₹1,840. Tap to view full plan." },
  { id: 2, channel: "SMS", channelIcon: "⊞", channelColor: C.blue, time: "Today", read: false, urgent: false, title: "✓ All clear — no action today", preview: "Crop health score: 82/100. No irrigation, disease treatment, or intervention needed. System will re-check tomorrow morning." },
  { id: 3, channel: "WhatsApp", channelIcon: "◊", channelColor: "#25D366", time: "Sep 9", read: true, urgent: false, title: "⊕ Disease check complete", preview: "No blight or rust detected. Nitrogen deficiency (moderate) detected. Urea top-dressing recommended — ₹280 yield impact." },
  { id: 4, channel: "SMS", channelIcon: "⊞", channelColor: C.blue, time: "Sep 8", read: true, urgent: false, title: "▦ Scheme alert: PMFBY deadline", preview: "You are eligible for PMFBY crop insurance. Deadline: Sep 30. Estimated cover: ₹2,400. Apply at your nearest CSC or online." },
  { id: 5, channel: "SMS", channelIcon: "⊞", channelColor: C.blue, time: "Sep 7", read: true, urgent: false, title: "≈ Skip irrigation today", preview: "6mm rain forecast for tomorrow. Skip planned irrigation — over-watering now risks root disease. Revised: irrigate Sep 12 if no rain." },
  { id: 6, channel: "Voice", channelIcon: "▶", channelColor: C.amber, time: "Sep 7", read: true, urgent: false, title: "⊙ Grading result: Batch #2", preview: "Grade B · Score 74/100. Price: ₹2,020/qtl. Surface quality slightly lower — see full grading report for improvement tips." },
  { id: 7, channel: "WhatsApp", channelIcon: "◊", channelColor: "#25D366", time: "Sep 5", read: true, urgent: true, title: "! Urgent: irrigate within 24h", preview: "Soil moisture dropped to 31%. No rain in 6-day forecast. Cost of irrigating now: ₹320. Estimated loss from delay: ₹1,400." },
];

export default function Messages({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <div>
      <PageHeader
        title="Messages & Alerts"
        subtitle="7 messages · 2 unread"
        back="Dashboard"
        onBack={() => navigate("dashboard")}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <Badge color={C.rust} bg={C.rustTint}>2 unread</Badge>
          </div>
        }
      />

      <div
        style={{
          background: C.surface,
          borderRadius: radius.xl,
          border: `1px solid ${C.line}`,
          boxShadow: shadow.card,
          overflow: "hidden",
        }}
      >
        {messages.map((msg, i) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              gap: 14,
              padding: "16px 20px",
              borderBottom: i < messages.length - 1 ? `1px solid ${C.line}` : "none",
              background: msg.read ? "transparent" : `${C.sageTint}50`,
              cursor: "pointer",
              transition: "background 0.15s",
              alignItems: "flex-start",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = C.bg)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = msg.read ? "transparent" : `${C.sageTint}50`)}
          >
            {/* Channel icon */}
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: `${msg.channelColor}18`,
                border: `1.5px solid ${msg.channelColor}33`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              {msg.channelIcon}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4, gap: 8 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: msg.read ? 500 : 700, color: C.ink }}>{msg.title}</span>
                  {msg.urgent && <Badge color={C.rust} size="sm">Urgent</Badge>}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                  {!msg.read && (
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.sage }} />
                  )}
                  <span style={{ fontSize: 11, color: C.inkMuted, whiteSpace: "nowrap" }}>{msg.time}</span>
                </div>
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: C.inkMuted,
                  lineHeight: 1.5,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {msg.preview}
              </div>
              <div style={{ marginTop: 6 }}>
                <Badge
                  color={msg.channelColor}
                  bg={`${msg.channelColor}14`}
                  size="sm"
                >
                  via {msg.channel}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
