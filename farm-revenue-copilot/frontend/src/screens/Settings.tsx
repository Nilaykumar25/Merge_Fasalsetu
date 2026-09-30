import { useState } from "react";
import { C, radius, shadow } from "../tokens";
import { PageHeader, IconBadge } from "../components/ui";
import type { Screen } from "../tokens";

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 999,
        background: value ? C.sage : C.line,
        cursor: "pointer",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#fff",
          position: "absolute",
          top: 3,
          left: value ? 23 : 3,
          transition: "left 0.2s",
          boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
        }}
      />
    </div>
  );
}

function SettingRow({ icon, iconBg, bg, label, sub, right }: { icon: string; iconBg?: string; bg?: string; label: string; sub?: string; right: React.ReactNode }) {
  const bgColor = iconBg ?? bg ?? "#f0f0ee";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", borderBottom: `1px solid ${C.line}` }}>
      <IconBadge bg={bgColor} size={36}>{icon}</IconBadge>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.inkMuted, marginTop: 1 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

export default function Settings({ navigate }: { navigate: (s: Screen) => void }) {
  const [settings, setSettings] = useState({
    sms: true,
    whatsapp: true,
    voice: false,
    hindi: true,
    urgentOnly: false,
    morningAlert: true,
    autoSync: true,
    analytics: true,
  });

  const set = (key: keyof typeof settings) => (v: boolean) =>
    setSettings((s) => ({ ...s, [key]: v }));

  const groups = [
    {
      label: "Farm profile",
      rows: [
        { icon: "◈", bg: C.sageTint, label: "Farm name", sub: "Ramesh's Farm · Plot A", right: <span style={{ fontSize: 13, color: C.sage, cursor: "pointer", fontWeight: 600 }}>Edit →</span> },
        { icon: "⊗", bg: "#EAF0FD", label: "Location", sub: "Sector 12, Karnal, Haryana", right: <span style={{ fontSize: 13, color: C.sage, cursor: "pointer", fontWeight: 600 }}>Edit →</span> },
        { icon: "∆", bg: C.amberTint, label: "Current crop", sub: "Tomato · Hybrid F1 · Kharif 2026", right: <span style={{ fontSize: 13, color: C.sage, cursor: "pointer", fontWeight: 600 }}>Edit →</span> },
        { icon: "▭", bg: C.sageTint, label: "Plot size", sub: "2.5 acres", right: <span style={{ fontSize: 13, color: C.sage, cursor: "pointer", fontWeight: 600 }}>Edit →</span> },
      ],
    },
    {
      label: "Notification channels",
      rows: [
        { icon: "⊞", bg: "#D6EAF8", label: "SMS alerts", sub: "+91 98112 XXXXX", right: <Toggle value={settings.sms} onChange={set("sms")} /> },
        { icon: "◊", bg: "#E8F5E9", label: "WhatsApp", sub: "Same number", right: <Toggle value={settings.whatsapp} onChange={set("whatsapp")} /> },
        { icon: "▶", bg: C.amberTint, label: "Voice call alerts", sub: "Text-to-speech in Hindi", right: <Toggle value={settings.voice} onChange={set("voice")} /> },
        { icon: "⚡", bg: C.rustTint, label: "Urgent alerts only", sub: "Skip informational messages", right: <Toggle value={settings.urgentOnly} onChange={set("urgentOnly")} /> },
      ],
    },
    {
      label: "Language & timing",
      rows: [
        { icon: "◇", bg: C.sageTint, label: "Message language", sub: settings.hindi ? "Hindi" : "English", right: <span style={{ fontSize: 13, color: C.sage, cursor: "pointer", fontWeight: 600 }}>{settings.hindi ? "Hindi ›" : "English ›"}</span> },
        { icon: "⌚", bg: C.amberTint, label: "Morning summary", sub: "Daily 6 AM crop check", right: <Toggle value={settings.morningAlert} onChange={set("morningAlert")} /> },
      ],
    },
    {
      label: "Sensors & data",
      rows: [
        { icon: "⟳", bg: "#EAF0FD", label: "Sensor SM-A12", sub: "Soil moisture · Connected · Battery 72%", right: <span style={{ fontSize: 12, fontWeight: 600, color: C.sage }}>●&nbsp;Live</span> },
        { icon: "⟳", bg: C.sageTint, label: "Auto-sync", sub: "Sync when connected to WiFi", right: <Toggle value={settings.autoSync} onChange={set("autoSync")} /> },
        { icon: "▦", bg: C.sageTint, label: "Contribute anonymised data", sub: "Help improve crop models", right: <Toggle value={settings.analytics} onChange={set("analytics")} /> },
        { icon: "◰", bg: C.amberTint, label: "Soil Health Card", sub: "Uploaded · Feb 2022 · SHC renewal recommended", right: <span style={{ fontSize: 13, color: C.amber, cursor: "pointer", fontWeight: 600 }}>Update →</span> },
      ],
    },
    {
      label: "Account",
      rows: [
        { icon: "◈", bg: C.bg, label: "Farmer ID", sub: "FRC-MH-2026-003481", right: <span style={{ fontSize: 12, color: C.inkMuted }}>Verified ✓</span> },
        { icon: "?", bg: C.sageTint, label: "Help & support", sub: "How this works, FAQ", right: <span style={{ fontSize: 18, color: C.inkMuted }}>›</span> },
        { icon: "▬", bg: C.bg, label: "Privacy policy", sub: "Data usage & rights", right: <span style={{ fontSize: 18, color: C.inkMuted }}>›</span> },
      ],
    },
  ];

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Farm Revenue Copilot · v1.0.0"
        back="Dashboard"
        onBack={() => navigate("dashboard")}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {groups.map((group) => (
          <div
            key={group.label}
            style={{
              background: C.surface,
              borderRadius: radius.xl,
              border: `1px solid ${C.line}`,
              boxShadow: shadow.card,
              padding: "20px 24px",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: C.inkMuted, marginBottom: 4 }}>{group.label}</div>
            {group.rows.map((row) => (
              <SettingRow key={row.label} {...row} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
