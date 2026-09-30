import { useState, useEffect } from "react";
import { C, radius, shadow } from "../tokens";
import { Card, IconBadge, Badge, PageHeader, Btn, GaugeBar } from "../components/ui";
import type { Screen } from "../tokens";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { getRecommendations } from "../api/recommendations";

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

interface RevenueImpact {
  value?: string;
  description?: string;
  revenue_impact_inr?: number;
}

interface ActionStep {
  label: string;
  detail?: string;
}

interface Recommendation {
  id: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  body: string;
  whyNow?: string;
  revenue?: RevenueImpact;
  revenue_impact_inr?: number;
  confidence?: number;
  actions?: ActionStep[];
  frequency?: string;
  createdAt?: string;
  created_at?: string;
  status?: string;
}

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

const TYPE_META: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  harvest:         { icon: '🌾', label: 'Harvest Window',     color: C.sageDeep,  bg: C.sageTint },
  irrigation:      { icon: '💧', label: 'Irrigation',         color: C.blue,      bg: C.blueTint },
  fertilizer:      { icon: '🌱', label: 'Fertilizer',         color: C.amber,     bg: C.amberTint },
  pesticide:       { icon: '🛡️', label: 'Pest Control',       color: C.rust,      bg: C.rustTint },
  'pest-management': { icon: '🔍', label: 'Pest Management',  color: C.rust,      bg: C.rustTint },
  cover:           { icon: '⛈️', label: 'Storm Warning',      color: C.rust,      bg: C.rustTint },
  monitoring:      { icon: '📊', label: 'Monitoring',         color: C.inkMuted,  bg: C.line },
  do_nothing:      { icon: '✅', label: 'All Good',           color: C.sage,      bg: C.sageTint },
};

const PRIORITY_META = {
  high:   { color: C.rust,      bg: C.rustTint,   label: '⏱ High Priority' },
  medium: { color: C.amber,     bg: C.amberTint,  label: '◎ Medium Priority' },
  low:    { color: C.inkMuted,  bg: C.line,       label: '○ Low Priority' },
};

function getTypeMeta(type: string) {
  return TYPE_META[type] ?? { icon: '★', label: type, color: C.sage, bg: C.sageTint };
}

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getRevenueDisplay(rec: Recommendation): { label: string; sub: string } | null {
  if (rec.revenue?.value) return { label: rec.revenue.value, sub: rec.revenue.description || '' };
  if (rec.revenue_impact_inr) return { label: `+₹${rec.revenue_impact_inr.toLocaleString('en-IN')}`, sub: 'estimated benefit per acre' };
  return null;
}

// ══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════

function PriorityDot({ priority }: { priority: string }) {
  const meta = PRIORITY_META[priority as keyof typeof PRIORITY_META] ?? PRIORITY_META.medium;
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: meta.color,
        marginRight: 6,
        flexShrink: 0,
      }}
    />
  );
}

function ActionStepRow({ step, index }: { step: ActionStep; index: number }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        padding: '12px 0',
        borderBottom: `1px solid ${C.line}`,
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: C.sageTint,
          border: `1.5px solid ${C.sage}44`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 800,
          color: C.sageDeep,
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {index + 1}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 2 }}>
          {step.label}
        </div>
        {step.detail && (
          <div style={{ fontSize: 12, color: C.inkMuted, lineHeight: 1.5 }}>{step.detail}</div>
        )}
      </div>
    </div>
  );
}

function RecCard({
  rec,
  rank,
  expanded,
  onToggle,
}: {
  rec: Recommendation;
  rank: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const meta = getTypeMeta(rec.type);
  const priority = PRIORITY_META[rec.priority] ?? PRIORITY_META.medium;
  const revenue = getRevenueDisplay(rec);
  const date = formatDate(rec.createdAt || rec.created_at);

  return (
    <Card
      hover={false}
      style={{
        padding: 0,
        overflow: 'hidden',
        borderLeft: `4px solid ${priority.color}`,
      }}
    >
      {/* ── Header (always visible) ── */}
      <div
        onClick={onToggle}
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 14,
          cursor: 'pointer',
        }}
      >
        <IconBadge bg={meta.bg} size={44}>
          {meta.icon}
        </IconBadge>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
            <Badge color={meta.color} bg={meta.bg} size="sm">
              {meta.label}
            </Badge>
            <Badge color={priority.color} bg={priority.bg} size="sm">
              <PriorityDot priority={rec.priority} />
              {priority.label}
            </Badge>
            {rec.status === 'done' && (
              <Badge color={C.sage} bg={C.sageTint} size="sm">✓ Done</Badge>
            )}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, lineHeight: 1.4 }}>
            {rec.title}
          </div>
          {date && (
            <div style={{ fontSize: 11, color: C.inkMuted, marginTop: 4 }}>{date}</div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          {revenue && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: C.inkMuted, fontWeight: 600 }}>IMPACT</div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 16,
                  fontWeight: 800,
                  color: C.sageDeep,
                  letterSpacing: '-0.02em',
                }}
              >
                {revenue.label}
              </div>
            </div>
          )}
          <div style={{ fontSize: 11, color: expanded ? C.sage : C.inkMuted, fontWeight: 600 }}>
            {expanded ? '▲ Less' : '▼ Details'}
          </div>
        </div>
      </div>

      {/* ── Summary strip (always visible) ── */}
      <div
        style={{
          padding: '10px 20px',
          background: C.bg,
          borderTop: `1px solid ${C.line}`,
          fontSize: 12,
          color: C.inkMuted,
          lineHeight: 1.6,
        }}
      >
        {rec.body}
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div
          style={{
            padding: '20px 20px 16px',
            borderTop: `1px solid ${C.line}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Why now */}
          {rec.whyNow && (
            <div
              style={{
                background: `${meta.color}0d`,
                border: `1px solid ${meta.color}22`,
                borderRadius: radius.md,
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: meta.color, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                Why act now
              </div>
              <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.65 }}>{rec.whyNow}</div>
            </div>
          )}

          {/* Revenue impact detail */}
          {revenue && (
            <div
              style={{
                background: C.sageTint,
                border: `1px solid ${C.sage}33`,
                borderRadius: radius.md,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.sageDeep, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                  Revenue impact
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 28,
                    fontWeight: 800,
                    color: C.sageDeep,
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                  }}
                >
                  {revenue.label}
                </div>
                <div style={{ fontSize: 11, color: C.inkMuted, marginTop: 4 }}>{revenue.sub}</div>
              </div>
              {rec.confidence && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: C.inkMuted, fontWeight: 600, marginBottom: 6 }}>Confidence</div>
                  <div style={{ width: 100 }}>
                    <GaugeBar
                      value={rec.confidence}
                      label=""
                      color={rec.confidence >= 70 ? C.sage : rec.confidence >= 50 ? C.amber : C.rust}
                      showValue={true}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action steps */}
          {rec.actions && rec.actions.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.ink, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 4 }}>
                Action steps
              </div>
              <div>
                {rec.actions.map((step, i) => (
                  <ActionStepRow key={i} step={step} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Frequency */}
          {rec.frequency && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: C.inkMuted }}>🔁</span>
              <span style={{ fontSize: 12, color: C.inkMuted, fontStyle: 'italic' }}>{rec.frequency}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════
// HERO CARD (top recommendation)
// ══════════════════════════════════════════════════════════════

function HeroCard({ rec }: { rec: Recommendation }) {
  const meta = getTypeMeta(rec.type);
  const priority = PRIORITY_META[rec.priority] ?? PRIORITY_META.medium;
  const revenue = getRevenueDisplay(rec);

  return (
    <Card
      hover={false}
      style={{
        background: `linear-gradient(135deg, ${C.sageTint} 0%, #d8ead9 100%)`,
        border: `1px solid ${C.sage}33`,
        padding: 0,
        overflow: 'hidden',
        marginBottom: 20,
      }}
    >
      {/* Top band */}
      <div
        style={{
          padding: '24px 28px 20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 18,
        }}
      >
        <IconBadge bg={`${C.sage}22`} size={64}>
          {meta.icon}
        </IconBadge>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <Badge color={C.sageDeep} bg={`${C.sage}22`} size="sm">
              {meta.label}
            </Badge>
            <Badge color={priority.color} bg={priority.bg} size="sm">
              <PriorityDot priority={rec.priority} />
              {priority.label}
            </Badge>
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 26,
              fontWeight: 700,
              color: C.sageDeep,
              letterSpacing: '-0.025em',
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {rec.title}
          </h2>
          <p style={{ fontSize: 13, color: C.inkMuted, marginTop: 8, lineHeight: 1.65 }}>
            {rec.body}
          </p>
        </div>
      </div>

      {/* Stats strip */}
      <div
        style={{
          margin: '0 20px 20px',
          background: 'rgba(255,255,255,0.75)',
          borderRadius: radius.lg,
          padding: '16px 20px',
          backdropFilter: 'blur(4px)',
          display: 'grid',
          gridTemplateColumns: revenue ? '1fr auto' : '1fr',
          gap: 16,
          alignItems: 'center',
        }}
      >
        {revenue && (
          <div>
            <div style={{ fontSize: 11, color: C.inkMuted, fontWeight: 600, marginBottom: 2 }}>
              Expected revenue impact
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 40,
                fontWeight: 800,
                color: C.sageDeep,
                letterSpacing: '-0.04em',
                lineHeight: 1,
              }}
            >
              {revenue.label}
            </div>
            <div style={{ fontSize: 12, color: C.inkMuted, marginTop: 4 }}>{revenue.sub}</div>
          </div>
        )}

        {rec.confidence && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: C.inkMuted, fontWeight: 600, marginBottom: 8 }}>
              Confidence
            </div>
            <Badge
              color={rec.confidence >= 70 ? C.sage : rec.confidence >= 50 ? C.amber : C.rust}
              bg={rec.confidence >= 70 ? C.sageTint : rec.confidence >= 50 ? C.amberTint : C.rustTint}
              size="lg"
            >
              {rec.confidence}%
            </Badge>
          </div>
        )}
      </div>

      {/* Why now */}
      {rec.whyNow && (
        <div
          style={{
            margin: '0 20px 20px',
            background: `${C.sageDeep}0a`,
            borderRadius: radius.md,
            padding: '12px 14px',
            borderLeft: `3px solid ${C.sage}`,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: C.sageDeep, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            Why act now
          </div>
          <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.65 }}>{rec.whyNow}</div>
        </div>
      )}

      {/* Action steps inside hero */}
      {rec.actions && rec.actions.length > 0 && (
        <div style={{ margin: '0 20px 20px' }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: C.sageDeep,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            Action steps
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rec.actions.map((step, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  background: 'rgba(255,255,255,0.6)',
                  borderRadius: radius.md,
                  padding: '10px 14px',
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: C.sageTint,
                    border: `1.5px solid ${C.sage}44`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 800,
                    color: C.sageDeep,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{step.label}</div>
                  {step.detail && (
                    <div style={{ fontSize: 11, color: C.inkMuted, marginTop: 2 }}>{step.detail}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Frequency */}
      {rec.frequency && (
        <div
          style={{
            margin: '0 20px 20px',
            fontSize: 12,
            color: C.inkMuted,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>🔁</span>
          <span style={{ fontStyle: 'italic' }}>{rec.frequency}</span>
        </div>
      )}
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════
// SUMMARY BAR
// ══════════════════════════════════════════════════════════════

function SummaryBar({ recs }: { recs: Recommendation[] }) {
  const high = recs.filter(r => r.priority === 'high').length;
  const pending = recs.filter(r => !r.status || r.status === 'pending').length;
  const done = recs.filter(r => r.status === 'done').length;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
        marginBottom: 20,
      }}
    >
      {[
        { label: 'Total', value: recs.length, color: C.ink, bg: C.surface },
        { label: 'High Priority', value: high, color: C.rust, bg: C.rustTint },
        { label: 'Completed', value: done, color: C.sage, bg: C.sageTint },
      ].map(({ label, value, color, bg }) => (
        <div
          key={label}
          style={{
            background: bg,
            border: `1px solid ${C.line}`,
            borderRadius: radius.lg,
            padding: '14px 16px',
            boxShadow: shadow.sm,
          }}
        >
          <div style={{ fontSize: 11, color: C.inkMuted, fontWeight: 600, marginBottom: 4 }}>{label}</div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 28,
              fontWeight: 800,
              color,
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}
          >
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

export default function Recommendation({ navigate }: { navigate: (s: Screen) => void }) {
  const { farmer } = useAuth();
  const { currentCrop } = useData();
  const isDemoAccount = localStorage.getItem('is_demo_account') === 'true';

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadRecommendations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCrop?.id, isDemoAccount]);

  const loadRecommendations = async () => {
    if (isDemoAccount) {
      // Rich demo data
      setRecommendations([
        {
          id: 'demo-1',
          type: 'harvest',
          priority: 'high',
          title: 'Harvest your wheat between Sep 15–17 for best returns',
          body: 'Maturity indicators are strong. Nashik mandi prices are trending up. Weather is clear through Sep 15.',
          whyNow: 'Your wheat is at 94% maturity based on thermal accumulation. Mandi prices have risen 8% this week and are forecast to dip after Sep 20. Dry weather for the next 5 days gives a clean harvesting window.',
          revenue: { value: '+₹1,840', description: 'per acre · based on current mandi price trends' },
          confidence: 87,
          actions: [
            { label: 'Book harvesting equipment', detail: 'Schedule combine harvester 1–2 days in advance' },
            { label: 'Check mandi timings', detail: 'Nashik APMC opens 6 AM — plan transport to arrive early' },
            { label: 'Arrange storage backup', detail: 'In case of rain delay, keep 1–2 days of dry storage ready' },
          ],
          frequency: 'One-time window — act within the next 3 days',
          createdAt: new Date().toISOString(),
          status: 'pending',
        },
        {
          id: 'demo-2',
          type: 'irrigation',
          priority: 'medium',
          title: 'Irrigate field A before Sep 13',
          body: 'Soil moisture will drop below the safe threshold in 48 hours. Irrigate now to protect yield.',
          whyNow: 'Current soil moisture is at 62% with no significant rainfall expected in the next 4 days. Wheat in grain-fill stage requires 40–45% minimum to avoid stress.',
          revenue: { value: '₹400–500', description: 'Protected per acre by preventing stress loss' },
          confidence: 79,
          actions: [
            { label: 'Open main canal valve', detail: 'Run for ~3 hours for standard 40mm depth' },
            { label: 'Monitor for runoff', detail: 'Check furrow end after 2 hours' },
          ],
          frequency: 'Repeat every 8–10 days during grain fill',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          status: 'pending',
        },
        {
          id: 'demo-3',
          type: 'monitoring',
          priority: 'low',
          title: 'Check soil pH before next fertilizer application',
          body: 'Soil pH test is recommended to ensure nutrient availability before top-dressing.',
          revenue: { value: '₹200–300', description: 'Prevented by avoiding nutrient lockup' },
          actions: [
            { label: 'Collect 5–6 soil samples', detail: 'From different spots across the field, 6-inch depth' },
            { label: 'Send to nearest Soil Health Lab', detail: 'Results typically ready within 2–3 days' },
          ],
          createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          status: 'done',
        },
      ]);
      setLoading(false);
      return;
    }

    if (!currentCrop?.id) {
      setRecommendations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getRecommendations(currentCrop.id);
      setRecommendations(data || []);
    } catch (err: any) {
      console.error('Error loading recommendations:', err);
      setError('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <PageHeader title="Recommendations" back="Dashboard" onBack={() => navigate('dashboard')} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: 64,
            color: C.sage,
            fontSize: 14,
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              border: `3px solid ${C.sageTint}`,
              borderTop: `3px solid ${C.sage}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          Analysing your crop...
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <PageHeader title="Recommendations" back="Dashboard" onBack={() => navigate('dashboard')} />
        <Card hover={false} style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 14, color: C.rust, marginBottom: 16 }}>{error}</div>
          <Btn variant="primary" onClick={loadRecommendations}>Retry</Btn>
        </Card>
      </div>
    );
  }

  // ── Empty state ──
  if (recommendations.length === 0) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <PageHeader title="Recommendations" back="Dashboard" onBack={() => navigate('dashboard')} />
        <Card
          hover={false}
          style={{
            textAlign: 'center',
            padding: '56px 32px',
            background: `linear-gradient(135deg, ${C.sageTint}, #e8f0e6)`,
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.sageDeep, marginBottom: 8 }}>
            No Recommendations Yet
          </div>
          <div style={{ fontSize: 13, color: C.inkMuted, marginBottom: 28, maxWidth: 320, margin: '0 auto 28px' }}>
            {!currentCrop
              ? 'Set up your crop to receive personalised recommendations.'
              : 'Your crop is being analysed. Check back soon.'}
          </div>
          <Btn variant="primary" onClick={() => navigate('dashboard')}>Back to Dashboard</Btn>
        </Card>
      </div>
    );
  }

  const topRec = recommendations[0];
  const otherRecs = recommendations.slice(1);
  const priorityMeta = PRIORITY_META[topRec.priority] ?? PRIORITY_META.medium;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <PageHeader
        title="Recommendations"
        subtitle={farmer?.name ? `For ${farmer.name}'s farm` : undefined}
        back="Dashboard"
        onBack={() => navigate('dashboard')}
        actions={
          <Badge color={priorityMeta.color} bg={priorityMeta.bg} size="lg">
            {priorityMeta.label}
          </Badge>
        }
      />

      {/* Summary stats row */}
      {recommendations.length > 1 && <SummaryBar recs={recommendations} />}

      {/* Hero — top recommendation */}
      <HeroCard rec={topRec} />

      {/* Other recommendations */}
      {otherRecs.length > 0 && (
        <>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: C.inkMuted,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            More recommendations ({otherRecs.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {otherRecs.map((rec, i) => (
              <RecCard
                key={rec.id}
                rec={rec}
                rank={i + 2}
                expanded={expandedId === rec.id}
                onToggle={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Footer actions */}
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <Btn variant="primary" size="lg" onClick={() => navigate('dashboard')}>
          Back to Dashboard
        </Btn>
        <Btn variant="secondary" size="lg" onClick={loadRecommendations}>
          Refresh
        </Btn>
      </div>

      <style>
        {`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}
      </style>
    </div>
  );
}
