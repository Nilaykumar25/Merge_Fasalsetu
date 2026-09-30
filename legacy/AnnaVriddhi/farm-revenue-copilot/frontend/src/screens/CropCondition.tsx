import { useState, useEffect } from "react";
import { C, radius } from "../tokens";
import { Card, CircularGauge, Sparkline, Badge, PageHeader, SectionLabel, Btn } from "../components/ui";
import type { Screen } from "../tokens";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { supabase } from "../lib/supabase";

// Demo data for demo@123 only
const DEMO_WEEK_DATA = {
  moisture: [68, 72, 75, 71, 74, 70, 74],
  health: [78, 79, 80, 81, 80, 82, 82],
  disease: [12, 14, 15, 18, 17, 18, 18],
};

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Today"];

export default function CropCondition({ navigate }: { navigate: (s: Screen) => void }) {
  const { farmer } = useAuth();
  const { currentCrop, cropHealth, loading: dataLoading } = useData();
  const isDemoAccount = localStorage.getItem('is_demo_account') === 'true';
  
  const [weekData, setWeekData] = useState(DEMO_WEEK_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWeekData();
  }, [currentCrop?.id, isDemoAccount]);

  const loadWeekData = async () => {
    if (isDemoAccount) {
      setWeekData(DEMO_WEEK_DATA);
      setLoading(false);
      return;
    }

    if (!currentCrop?.id) {
      setLoading(false);
      return;
    }

    try {
      // Load last 7 days of crop health data
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 6);

      const { data, error } = await supabase
        .from('crop_health_daily')
        .select('*')
        .eq('crop_id', currentCrop.id)
        .gte('date', fromDate.toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(7);

      if (error) throw error;

      if (data && data.length > 0) {
        setWeekData({
          moisture: data.map(d => d.soil_moisture_pct || 0),
          health: data.map(d => d.health_score || 0),
          disease: data.map(d => d.disease_risk_score || 0),
        });
      } else {
        // No historical data, use current data repeated
        const current = {
          moisture: Array(7).fill(cropHealth?.soil_moisture_pct || 0),
          health: Array(7).fill(cropHealth?.health_score || 0),
          disease: Array(7).fill(0),
        };
        setWeekData(current);
      }
    } catch (err) {
      console.error('Error loading week data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || dataLoading) {
    return (
      <div>
        <PageHeader
          title="Crop Condition"
          subtitle="Loading data..."
          back="Dashboard"
          onBack={() => navigate("dashboard")}
        />
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 14, color: C.inkMuted }}>Loading crop condition...</div>
        </div>
      </div>
    );
  }

  if (!isDemoAccount && !currentCrop) {
    return (
      <div>
        <PageHeader
          title="Crop Condition"
          subtitle="No crop selected"
          back="Dashboard"
          onBack={() => navigate("dashboard")}
        />
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>◈</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 8 }}>
            No Active Crop
          </div>
          <div style={{ fontSize: 14, color: C.inkMuted, marginBottom: 24 }}>
            Set up your farm and plant a crop to monitor its condition
          </div>
          <button
            onClick={() => navigate("settings")}
            style={{
              padding: "10px 20px",
              background: C.sage,
              color: "#fff",
              border: "none",
              borderRadius: radius.md,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Set Up Farm →
          </button>
        </div>
      </div>
    );
  }

  // Use demo data for demo account, real data for others
  const cropName = isDemoAccount ? "Wheat" : (currentCrop?.crop_name || "Crop");
  const plotName = isDemoAccount ? "Plot A" : "Current Plot";
  const healthScore = isDemoAccount ? 82 : (cropHealth?.health_score || 0);
  const soilMoisture = isDemoAccount ? 74 : (cropHealth?.soil_moisture_pct || 0);
  const nitrogenLevel = isDemoAccount ? 58 : (cropHealth?.nitrogen_pct || 0);
  const diseaseRisk = isDemoAccount ? 18 : (cropHealth?.disease_risk_score || 0);

  return (
    <div>
      <PageHeader
        title="Crop Condition"
        subtitle={`${plotName} · ${cropName} · Last updated ${isDemoAccount ? '2h ago' : 'recently'}`}
        back="Dashboard"
        onBack={() => navigate("dashboard")}
        actions={
          <Badge color={healthScore >= 70 ? C.sage : C.amber} bg={healthScore >= 70 ? C.sageTint : C.amberTint} size="lg">
            {healthScore >= 70 ? 'Healthy' : 'Monitor'} — Score {healthScore}
          </Badge>
        }
      />

      {/* Circular gauges row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        {[
          { value: soilMoisture, label: "Soil Moisture", unit: "%", color: C.blue },
          { value: healthScore, label: "Health Index", unit: "/100", color: C.sage, max: 100 },
          { value: diseaseRisk, label: "Disease Risk", unit: "%", color: C.rust },
          { value: nitrogenLevel, label: "Nitrogen", unit: "%", color: C.amber },
        ].map(({ value, label, unit, color, max }) => (
          <Card key={label} style={{ display: "flex", justifyContent: "center", padding: "28px 16px" }}>
            <CircularGauge value={value} max={max ?? 100} label={label} unit={unit} color={color} size={140} />
          </Card>
        ))}
      </div>

      {/* Trend charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
        {[
          { title: "Soil Moisture", data: weekData.moisture, color: C.blue, unit: "%" },
          { title: "Health Index", data: weekData.health, color: C.sage, unit: "/100" },
          { title: "Disease Risk", data: weekData.disease, color: C.rust, unit: "%" },
        ].map(({ title, data, color, unit }) => (
          <Card key={title} style={{ padding: "20px 20px 16px" }} hover={false}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{title}</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, color, letterSpacing: "-0.02em" }}>
                {data[data.length - 1]}{unit}
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Sparkline data={data} color={color} height={56} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              {days.map((d, i) => (
                <div key={d} style={{ fontSize: 9, color: i === 6 ? color : C.inkMuted, fontWeight: i === 6 ? 700 : 400, textAlign: "center" }}>{d}</div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Detail breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
        <Card hover={false} style={{ padding: "24px 28px" }}>
          <SectionLabel>Nutrient & Sensor Readings</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              { param: "Nitrogen (N)", value: "58 kg/ha", status: "low", statusColor: C.amber, optimal: "80–120 kg/ha", icon: "⊕" },
              { param: "Phosphorus (P)", value: "42 kg/ha", status: "optimal", statusColor: C.sage, optimal: "30–60 kg/ha", icon: "◐" },
              { param: "Potassium (K)", value: "98 kg/ha", status: "optimal", statusColor: C.sage, optimal: "80–120 kg/ha", icon: "∆" },
              { param: "Soil pH", value: "6.8", status: "optimal", statusColor: C.sage, optimal: "6.0–7.5", icon: "▦" },
              { param: "Organic Carbon", value: "0.38%", status: "low", statusColor: C.amber, optimal: ">0.5%", icon: "🌍" },
              { param: "Soil EC", value: "0.31 dS/m", status: "optimal", statusColor: C.sage, optimal: "<1.0 dS/m", icon: "⚡" },
              { param: "Canopy temperature", value: "24.2°C", status: "optimal", statusColor: C.sage, optimal: "±3°C ambient", icon: "🌡️" },
            ].map(({ param, value, status, statusColor, optimal, icon }, i) => (
              <div
                key={param}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 0",
                  borderBottom: i < 6 ? `1px solid ${C.line}` : "none",
                }}
              >
                <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{param}</div>
                  <div style={{ fontSize: 11, color: C.inkMuted }}>Optimal: {optimal}</div>
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: C.ink }}>{value}</div>
                <Badge color={statusColor} size="sm">{status}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Plain-language callouts */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card hover={false} style={{ padding: "20px" }}>
            <SectionLabel>Plain-language summary</SectionLabel>
            {[
              { icon: "✓", color: C.sage, bg: C.sageTint, title: "Looking good overall", body: "Crop health index at 82 is well within the healthy range. Canopy cover is excellent at 91%." },
              { icon: "!", color: C.amber, bg: C.amberTint, title: "Nitrogen slightly low", body: "N at 58 kg/ha is below the 80–120 ideal. A top-dressing of urea now could add ₹280 in yield value." },
              { icon: "⊕", color: C.blue, bg: C.blueTint, title: "No disease detected", body: "Photo analysis and sensor data show no signs of rust or blight. Re-check after next rain event." },
            ].map(({ icon, color, bg, title, body }) => (
              <div
                key={title}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "14px",
                  background: bg,
                  borderRadius: radius.md,
                  marginBottom: 10,
                  border: `1px solid ${color}22`,
                }}
              >
                <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 3 }}>{title}</div>
                  <div style={{ fontSize: 12, color: C.inkMuted, lineHeight: 1.55 }}>{body}</div>
                </div>
              </div>
            ))}
          </Card>

          <Card style={{ padding: "20px" }} onClick={() => navigate("recommendation")}>
            <div style={{ fontSize: 13, color: C.inkMuted, marginBottom: 8 }}>Top action available</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 12 }}>
              Apply nitrogen top-dressing before Day 85
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.sageTint, borderRadius: radius.sm, padding: "10px 14px", marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: C.inkMuted }}>Revenue impact</span>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, color: C.sageDeep }}>+₹280</span>
            </div>
            <Btn variant="primary" fullWidth>View recommendation →</Btn>
          </Card>
        </div>
      </div>
    </div>
  );
}
