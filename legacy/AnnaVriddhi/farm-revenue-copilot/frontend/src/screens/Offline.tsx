import { useState } from "react";
import { C, radius, shadow } from "../tokens";
import { PageHeader, Card, Badge } from "../components/ui";
import type { Screen } from "../tokens";

export default function Offline({ navigate }: { navigate: (s: Screen) => void }) {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState("2h ago · 6:12 AM");

  function handleSync() {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setLastSync("Just now · 8:14 AM");
    }, 2000);
  }

  const queued = [
    { icon: "≈", label: "Soil moisture reading", time: "8:00 AM", size: "1.2 KB" },
    { icon: "🌡️", label: "Temperature log", time: "8:00 AM", size: "0.8 KB" },
    { icon: "⊙", label: "Field photo scan", time: "7:45 AM", size: "840 KB" },
    { icon: "✓", label: "Farmer action: followed harvest recommendation", time: "7:30 AM", size: "0.3 KB" },
  ];

  const synced = [
    { icon: "≈", label: "Soil moisture (6 AM)", time: "6:12 AM" },
    { icon: "🌡️", label: "Weather update", time: "6:12 AM" },
    { icon: "▦", label: "Crop health score computed", time: "6:15 AM" },
    { icon: "⊞", label: "SMS sent — all clear message", time: "6:15 AM" },
  ];

  return (
    <div>
      <PageHeader
        title="Sync Status"
        subtitle="Data queue & connectivity"
        back="Dashboard"
        onBack={() => navigate("dashboard")}
        actions={<Badge color={syncing ? C.amber : C.sage} bg={syncing ? C.amberTint : C.sageTint}>{syncing ? "⟳ Syncing…" : "●&nbsp;Connected"}</Badge>}
      />

      {/* Status card */}
      <div
        style={{
          background: syncing
            ? `linear-gradient(135deg, ${C.amberTint}, #fdebd0)`
            : `linear-gradient(135deg, ${C.sageTint}, #d4e8d6)`,
          borderRadius: radius.xxl,
          padding: "28px 32px",
          marginBottom: 20,
          border: `1px solid ${syncing ? C.amber : C.sage}33`,
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: syncing ? C.amber : C.sage,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            flexShrink: 0,
            animation: syncing ? "spin 1.5s linear infinite" : "none",
          }}
        >
          {syncing ? "⟳" : "✓"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: syncing ? C.amber : C.sageDeep, marginBottom: 4 }}>
            {syncing ? "Syncing data…" : "All data synced"}
          </div>
          <div style={{ fontSize: 13, color: C.inkMuted }}>
            Last sync: {lastSync} · Sensor SM-A12 connected · Battery 72%
          </div>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            padding: "10px 20px",
            background: syncing ? C.line : C.sage,
            color: syncing ? C.inkMuted : "#fff",
            border: "none",
            borderRadius: radius.full,
            fontWeight: 600,
            fontSize: 14,
            cursor: syncing ? "not-allowed" : "pointer",
            fontFamily: "var(--font-body)",
            transition: "all 0.15s",
          }}
        >
          {syncing ? "Syncing…" : "Sync now"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Queued */}
        <Card hover={false} style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>Queued to sync</div>
            <Badge color={C.amber} bg={C.amberTint}>{queued.length} items</Badge>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {queued.map(({ icon, label, time, size }, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "10px 0",
                  borderBottom: i < queued.length - 1 ? `1px solid ${C.line}` : "none",
                  alignItems: "center",
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 9, background: C.amberTint, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{label}</div>
                  <div style={{ fontSize: 10, color: C.inkMuted }}>{time}</div>
                </div>
                <div style={{ fontSize: 10, color: C.inkMuted }}>{size}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, padding: "10px 14px", background: C.amberTint, borderRadius: radius.sm, fontSize: 12, color: C.amber, fontWeight: 600 }}>
            Total queued: ~843 KB
          </div>
        </Card>

        {/* Synced */}
        <Card hover={false} style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>Recently synced</div>
            <Badge color={C.sage} bg={C.sageTint}>✓ Complete</Badge>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {synced.map(({ icon, label, time }, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "10px 0",
                  borderBottom: i < synced.length - 1 ? `1px solid ${C.line}` : "none",
                  alignItems: "center",
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 9, background: C.sageTint, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{label}</div>
                  <div style={{ fontSize: 10, color: C.inkMuted }}>{time}</div>
                </div>
                <div style={{ fontSize: 14, color: C.sage }}>✓</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, padding: "10px 14px", background: C.sageTint, borderRadius: radius.sm, fontSize: 12, color: C.sageDeep, fontWeight: 600 }}>
            All 24h data synced successfully
          </div>
        </Card>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
