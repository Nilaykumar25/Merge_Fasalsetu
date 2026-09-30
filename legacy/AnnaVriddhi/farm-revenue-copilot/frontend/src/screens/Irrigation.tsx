import { useState, useEffect } from "react";
import { C, radius, shadow } from "../tokens";
import { Card, CircularGauge, PageHeader, Badge, Btn, GaugeBar } from "../components/ui";
import type { Screen } from "../tokens";
import { useData } from "../contexts/DataContext";
import { getIrrigationSchedule } from "../api/irrigation";

// Demo data for demo account
const DEMO_FORECAST = [
  { day: "Today", icon: "◉", temp: "26°C", rain: "0mm" },
  { day: "Fri", icon: "⛅", temp: "24°C", rain: "0mm" },
  { day: "Sat", icon: "◉", temp: "27°C", rain: "0mm" },
  { day: "Sun", icon: "◉", temp: "28°C", rain: "0mm" },
  { day: "Mon", icon: "🌧️", temp: "22°C", rain: "12mm" },
  { day: "Tue", icon: "⛅", temp: "23°C", rain: "3mm" },
  { day: "Wed", icon: "◉", temp: "25°C", rain: "0mm" },
];

const DEMO_IRRIGATION = {
  currentMoisture: 74,
  lowerThreshold: 65,
  upperThreshold: 80,
  waterDeficit: 0,
  etRate: 4.2,
  lastIrrigated: 4,
  cropWaterNeed: 5.1,
  nextIrrigationDays: 3,
  revenueImpact: 620,
};

export default function Irrigation({ navigate }: { navigate: (s: Screen) => void }) {
  const { currentCrop } = useData();
  const [irrigationData, setIrrigationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDemoAccount = localStorage.getItem('is_demo_account') === 'true';

  useEffect(() => {
    async function loadIrrigationData() {
      // Demo account - use hardcoded data
      if (isDemoAccount) {
        setIrrigationData(DEMO_IRRIGATION);
        setLoading(false);
        return;
      }

      // Real user - fetch from backend
      if (!currentCrop?.id) {
        setLoading(false);
        return;
      }

      try {
        const data = await getIrrigationSchedule(currentCrop.id);
        setIrrigationData(data);
        setError(null);
      } catch (err) {
        console.error('Failed to load irrigation data:', err);
        setError('Failed to load irrigation data');
      } finally {
        setLoading(false);
      }
    }

    loadIrrigationData();
  }, [currentCrop?.id, isDemoAccount]);

  const forecast = isDemoAccount ? DEMO_FORECAST : (irrigationData?.forecast || DEMO_FORECAST);
  return (
    <div>
      <PageHeader
        title="Irrigation Forecast"
        subtitle="Plot A · Wheat · Sensor SM-A12"
        back="Dashboard"
        onBack={() => navigate("dashboard")}
        actions={<Badge color={C.sage} bg={C.sageTint} size="lg">✓ No irrigation needed today</Badge>}
      />

      {/* Main gauges */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, marginBottom: 20 }}>
        {/* Big circular gauge */}
        <Card
          hover={false}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "36px 44px",
            background: `linear-gradient(135deg, ${C.sageTint} 0%, #d8ead9 100%)`,
            border: `1px solid ${C.sage}33`,
            gap: 20,
            minWidth: 280,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.sage }}>Current soil moisture</div>
          <CircularGauge value={74} label="of field capacity" unit="%" color={C.sage} size={200} />
          <div
            style={{
              background: "rgba(255,255,255,0.7)",
              borderRadius: radius.md,
              padding: "10px 20px",
              textAlign: "center",
              backdropFilter: "blur(4px)",
            }}
          >
            <div style={{ fontSize: 12, color: C.inkMuted }}>Next irrigation recommended in</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: C.sageDeep, letterSpacing: "-0.02em" }}>3 days</div>
          </div>
        </Card>

        <Card hover={false} style={{ padding: "24px 28px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 20 }}>Moisture & water balance</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <GaugeBar value={74} label="Current soil moisture" color={C.sage} />
            <GaugeBar value={65} label="Lower threshold (irrigate below)" color={C.amber} />
            <GaugeBar value={80} label="Upper threshold (field capacity)" color={C.blue} />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginTop: 20,
              paddingTop: 20,
              borderTop: `1px solid ${C.line}`,
            }}
          >
            {[
              { label: "Water deficit", value: "0 mm", icon: "✓", color: C.sage },
              { label: "ET rate (today)", value: "4.2 mm/day", icon: "💨", color: C.amber },
              { label: "Last irrigated", value: "4 days ago", icon: "≈", color: C.blue },
              { label: "Crop water need", value: "5.1 mm/day", icon: "◈", color: C.sageDeep },
            ].map(({ label, value, icon, color }) => (
              <div key={label} style={{ background: C.bg, borderRadius: radius.md, padding: "12px 14px" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  <span style={{ fontSize: 11, color: C.inkMuted, fontWeight: 600 }}>{label}</span>
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color, letterSpacing: "-0.02em" }}>{value}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 7-day weather strip */}
      <Card hover={false} style={{ padding: "24px 28px", marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 16 }}>7-day weather & irrigation schedule</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 12 }}>
          {forecast.map((f, i) => {
            const irrigate = i === 3;
            return (
              <div
                key={f.day}
                style={{
                  textAlign: "center",
                  padding: "14px 8px",
                  borderRadius: radius.lg,
                  background: irrigate ? `linear-gradient(135deg, ${C.sageTint}, #d4e8d6)` : C.bg,
                  border: irrigate ? `1.5px solid ${C.sage}55` : `1px solid ${C.line}`,
                  position: "relative",
                }}
              >
                {irrigate && (
                  <div
                    style={{
                      position: "absolute",
                      top: -10,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: C.sage,
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: radius.full,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Irrigate
                  </div>
                )}
                <div style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? C.sage : C.inkMuted, marginBottom: 8 }}>{f.day}</div>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{f.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{f.temp}</div>
                <div style={{ fontSize: 10, color: f.rain !== "0mm" ? C.blue : C.inkMuted, marginTop: 2 }}>{f.rain}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Revenue impact */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card
          hover={false}
          style={{
            background: `linear-gradient(135deg, ${C.sageTint} 0%, #d4e8d6 100%)`,
            border: `1px solid ${C.sage}33`,
            padding: "24px",
          }}
        >
          <div style={{ fontSize: 12, color: C.inkMuted, fontWeight: 600, marginBottom: 8 }}>Revenue impact — irrigating on schedule vs. skipping</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 800, color: C.sageDeep, letterSpacing: "-0.03em" }}>+₹620</div>
          <div style={{ fontSize: 13, color: C.inkMuted, marginTop: 4 }}>per acre over remaining crop cycle</div>
        </Card>
        <Card style={{ padding: "24px" }} onClick={() => navigate("recommendation")}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 12 }}>★ Smart recommendation</div>
          <p style={{ fontSize: 13, color: C.inkMuted, lineHeight: 1.6, marginBottom: 14 }}>
            Skip Sunday's planned irrigation — Monday's 12mm rain will exceed the crop's water need. Irrigating would over-saturate and risk root disease.
          </p>
          <Btn variant="primary" fullWidth>View full recommendation →</Btn>
        </Card>
      </div>
    </div>
  );
}
