import { useState, useEffect } from "react";
import { C, radius, shadow } from "../tokens";
import { PageHeader, Badge } from "../components/ui";
import type { Screen } from "../tokens";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { supabase } from "../lib/supabase";

// Demo data for demo@123 only — all dates within Sep 1–10, 2026
const DEMO_HISTORY = [
  { id: 6, date: "10 Sep 2026", crop: "Tomato", variety: "Hybrid F1", grade: "A" as const, score: 92, price: 2240, qty: 12, img: "https://images.unsplash.com/photo-1546054454-aa26e2b734c7?w=120&h=80&fit=crop&auto=format" },
  { id: 5, date: "07 Sep 2026", crop: "Tomato", variety: "Hybrid F1", grade: "B" as const, score: 74, price: 2020, qty: 10, img: "https://images.unsplash.com/photo-1546054454-aa26e2b734c7?w=120&h=80&fit=crop&auto=format" },
  { id: 4, date: "05 Sep 2026", crop: "Onion", variety: "Nashik Red", grade: "A" as const, score: 88, price: 1940, qty: 22, img: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=120&h=80&fit=crop&auto=format" },
  { id: 3, date: "03 Sep 2026", crop: "Onion", variety: "Nashik Red", grade: "B" as const, score: 71, price: 1760, qty: 18, img: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=120&h=80&fit=crop&auto=format" },
  { id: 2, date: "02 Sep 2026", crop: "Tomato", variety: "Hybrid F1", grade: "A" as const, score: 91, price: 2200, qty: 14, img: "https://images.unsplash.com/photo-1546054454-aa26e2b734c7?w=120&h=80&fit=crop&auto=format" },
  { id: 1, date: "01 Sep 2026", crop: "Tomato", variety: "Hybrid F1", grade: "A" as const, score: 89, price: 2180, qty: 8, img: "https://images.unsplash.com/photo-1546054454-aa26e2b734c7?w=120&h=80&fit=crop&auto=format" },
];

const gradeConfig = {
  A: { color: C.sage, bg: C.sageTint },
  B: { color: C.amber, bg: C.amberTint },
  C: { color: C.rust, bg: C.rustTint },
};

type GradeType = "A" | "B" | "C";

interface GradingRecord {
  id: string | number;
  date: string;
  crop: string;
  variety: string;
  grade: GradeType;
  score: number;
  price: number;
  qty: number;
  img: string;
}

export default function GradingHistory({ navigate }: { navigate: (s: Screen) => void }) {
  const { farmer } = useAuth();
  const { crops } = useData();
  const isDemoAccount = localStorage.getItem('is_demo_account') === 'true';
  
  const [history, setHistory] = useState<GradingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGradingHistory();
  }, [farmer?.id, isDemoAccount]);

  const loadGradingHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      if (isDemoAccount) {
        // Demo account uses hardcoded data
        setHistory(DEMO_HISTORY);
        setLoading(false);
        return;
      }

      if (!farmer?.id) {
        setHistory([]);
        setLoading(false);
        return;
      }

      // Load grading history for all user's crops
      const { data: gradesData, error: gradesError } = await supabase
        .from('produce_grades')
        .select(`
          *,
          crop:crop_id (
            id,
            crop_name,
            variety
          )
        `)
        .in('crop_id', crops.map(c => c.id))
        .order('graded_date', { ascending: false });

      if (gradesError) throw gradesError;

      // Transform to UI format
      const transformedHistory: GradingRecord[] = (gradesData || []).map((record: any) => ({
        id: record.id,
        date: new Date(record.graded_date).toLocaleDateString('en-GB', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        }),
        crop: record.crop?.crop_name || 'Unknown',
        variety: record.crop?.variety || '—',
        grade: (record.grade || 'B') as GradeType,
        score: record.quality_score || 0,
        price: 0, // Would need market price data
        qty: 0, // Would need quantity data
        img: "https://images.unsplash.com/photo-1630873711080-aa3097d1da66?w=120&h=80&fit=crop&auto=format",
      }));

      setHistory(transformedHistory);
    } catch (err) {
      console.error('Error loading grading history:', err);
      setError('Failed to load grading history');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Grading History"
          subtitle="Loading your grading records..."
          back="Grade Produce"
          onBack={() => navigate("grade-capture")}
        />
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 14, color: C.inkMuted }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Grading History"
          subtitle="Error loading data"
          back="Grade Produce"
          onBack={() => navigate("grade-capture")}
        />
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 14, color: C.rust, marginBottom: 12 }}>{error}</div>
          <button
            onClick={loadGradingHistory}
            style={{
              padding: "8px 16px",
              background: C.sage,
              color: "#fff",
              border: "none",
              borderRadius: radius.md,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div>
        <PageHeader
          title="Grading History"
          subtitle="No grading records yet"
          back="Grade Produce"
          onBack={() => navigate("grade-capture")}
        />
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⊙</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 8 }}>
            No Grading History Yet
          </div>
          <div style={{ fontSize: 14, color: C.inkMuted, marginBottom: 24 }}>
            Start grading your produce to build your quality track record
          </div>
          <button
            onClick={() => navigate("grade-capture")}
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
            Grade Your First Batch →
          </button>
        </div>
      </div>
    );
  }

  const avgScore = history.length > 0 
    ? Math.round(history.reduce((a, h) => a + h.score, 0) / history.length) 
    : 0;
  const gradeACount = history.filter((h) => h.grade === "A").length;

  return (
    <div>
      <PageHeader
        title="Grading History"
        subtitle={`${history.length} batches graded this season`}
        back="Grade Produce"
        onBack={() => navigate("grade-capture")}
        actions={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: C.inkMuted }}>Season: Kharif 2026</span>
          </div>
        }
      />

      {/* Summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { icon: "▦", label: "Avg quality score", value: `${avgScore}/100`, color: C.sage },
          { icon: "🏆", label: "Grade A batches", value: `${gradeACount}/${history.length}`, color: C.sage },
          { icon: "₹", label: "Avg price achieved", value: "₹2,107/qtl", color: C.sageDeep },
          { icon: "📦", label: "Total graded", value: `${history.reduce((a, h) => a + h.qty, 0)} qtl`, color: C.ink },
        ].map(({ icon, label, value, color }) => (
          <div
            key={label}
            style={{
              background: C.surface,
              borderRadius: radius.lg,
              padding: "18px 20px",
              border: `1px solid ${C.line}`,
              boxShadow: shadow.card,
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
            <div style={{ fontSize: 11, color: C.inkMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, color, letterSpacing: "-0.02em" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* History list */}
      <div
        style={{
          background: C.surface,
          borderRadius: radius.xl,
          border: `1px solid ${C.line}`,
          boxShadow: shadow.card,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "80px 1fr 100px 80px 100px 100px 100px",
            padding: "12px 20px",
            background: C.bg,
            borderBottom: `1px solid ${C.line}`,
            fontSize: 11,
            fontWeight: 700,
            color: C.inkMuted,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            gap: 12,
          }}
        >
          <span>Photo</span>
          <span>Crop / Variety</span>
          <span>Date</span>
          <span>Grade</span>
          <span>Score</span>
          <span>Qty (qtl)</span>
          <span>Price/qtl</span>
        </div>

        {history.map((h, i) => {
          const gc = gradeConfig[h.grade];
          return (
            <div
              key={h.id}
              onClick={() => navigate("grading-result")}
              style={{
                display: "grid",
                gridTemplateColumns: "80px 1fr 100px 80px 100px 100px 100px",
                padding: "14px 20px",
                borderBottom: i < history.length - 1 ? `1px solid ${C.line}` : "none",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = C.bg)}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              <div
                style={{
                  width: 72,
                  height: 44,
                  borderRadius: radius.sm,
                  overflow: "hidden",
                  background: C.bg,
                }}
              >
                <img src={h.img} alt={h.crop} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{h.crop}</div>
                <div style={{ fontSize: 12, color: C.inkMuted }}>{h.variety} · Batch #{h.id}</div>
              </div>
              <div style={{ fontSize: 13, color: C.inkMuted }}>{h.date}</div>
              <div>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: gc.bg,
                    border: `2px solid ${gc.color}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-display)",
                    fontWeight: 800,
                    fontSize: 15,
                    color: gc.color,
                  }}
                >
                  {h.grade}
                </div>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: C.ink }}>{h.score}</div>
              <div style={{ fontSize: 14, color: C.ink, fontWeight: 600 }}>{h.qty}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: C.sageDeep }}>₹{h.price}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
