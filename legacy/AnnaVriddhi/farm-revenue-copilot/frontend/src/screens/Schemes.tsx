import { useState, useEffect } from "react";
import { C, radius, shadow } from "../tokens";
import { Card, PageHeader, Badge, Btn } from "../components/ui";
import type { Screen } from "../tokens";
import { useAuth } from "../contexts/AuthContext";

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

interface SchemeResponse {
  id: string;
  name: string;
  shortName: string;
  description: string;
  level: 'CENTRAL' | 'STATE';
  category: string;
  status: 'POTENTIALLY_ELIGIBLE' | 'MATCHED' | 'INSUFFICIENT_INFORMATION' | 'NOT_MATCHED';
  relevanceScore: number;
  matchedBecause: string[];
  missingInformation: string[];
  benefit: {
    type: string;
    description: string;
    percentage: number | null;
    amount: number | null;
    maximumAmount: number | null;
    frequency: string | null;
  };
  window: {
    status: 'OPEN' | 'CLOSING_SOON' | 'YEAR_ROUND' | 'UPCOMING' | 'CLOSED';
    daysRemaining: number | null;
    daysUntilStart: number | null;
  };
  documents: string[];
  application: {
    method: string | null;
    url: string | null;
  };
  revenueImpact: {
    available: boolean;
    type?: string;
    amount?: number;
    basis?: string;
  };
  source: {
    authority: string | null;
    url: string | null;
    lastVerifiedAt: string | null;
    verificationStatus: string;
  };
}

interface MatchResponse {
  success: boolean;
  farmerContext: {
    state: string;
    district?: string;
    crop?: string;
    landSize?: number;
    season?: string;
    activity?: string;
  };
  summary: {
    totalMatches: number;
    highRelevance: number;
    closingSoon: number;
    potentiallyEligible: number;
  };
  schemes: SchemeResponse[];
}

// ══════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

const STATES = [
  'All India',
  'Andhra Pradesh',
  'Bihar',
  'Gujarat',
  'Haryana',
  'Karnataka',
  'Madhya Pradesh',
  'Maharashtra',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'West Bengal',
];

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'INCOME_SUPPORT', label: 'Income Support & Credit' },
  { value: 'CROP_INSURANCE', label: 'Crop Insurance & Risk Protection' },
  { value: 'AGRICULTURAL_CREDIT', label: 'Agricultural Credit' },
  { value: 'IRRIGATION', label: 'Irrigation & Water' },
  { value: 'SOIL_HEALTH', label: 'Soil Health & Farming Practices' },
  { value: 'MARKET_ACCESS', label: 'Market Access & Selling' },
  { value: 'INFRASTRUCTURE', label: 'Infrastructure & Storage' },
  { value: 'MECHANIZATION', label: 'Technology & Mechanisation' },
  { value: 'CROP_MISSION', label: 'Specialised Crop Missions' },
];

const QUICK_SEARCHES = [
  { query: 'crop insurance', activity: 'INSURE_CROP' },
  { query: 'drip irrigation', activity: 'PLAN_IRRIGATION' },
  { query: 'kisan credit card', activity: 'SEEK_CREDIT' },
  { query: 'PM-KISAN', activity: null },
  { query: 'soil health', activity: null },
  { query: 'organic farming', activity: null },
  { query: 'solar pump', activity: 'BUY_EQUIPMENT' },
  { query: 'cold storage', activity: 'PLAN_TO_SELL' },
  { query: 'seed subsidy', activity: 'BUY_SEED' },
];

// ══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════

function getCategoryDisplay(category: string): string {
  const found = CATEGORIES.find(c => c.value === category);
  return found ? found.label : category;
}

function getWindowColor(status: string) {
  switch (status) {
    case 'CLOSING_SOON':
      return { color: C.rust, bg: C.rustTint };
    case 'OPEN':
      return { color: C.sage, bg: C.sageTint };
    case 'YEAR_ROUND':
      return { color: C.blue, bg: C.blueTint };
    case 'UPCOMING':
      return { color: C.amber, bg: C.amberTint };
    default:
      return { color: C.inkMuted, bg: C.line };
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'POTENTIALLY_ELIGIBLE':
      return { color: C.sage, bg: C.sageTint, label: 'Potentially Eligible' };
    case 'MATCHED':
      return { color: C.blue, bg: C.blueTint, label: 'Matched' };
    case 'INSUFFICIENT_INFORMATION':
      return { color: C.amber, bg: C.amberTint, label: 'More Info Needed' };
    default:
      return { color: C.inkMuted, bg: C.line, label: status };
  }
}

// ══════════════════════════════════════════════════════════════
// COMPONENTS
// ══════════════════════════════════════════════════════════════

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? C.sage : score >= 50 ? C.amber : C.rust;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: C.line, borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${score}%`,
            background: color,
            borderRadius: 3,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 40 }}>{score}%</span>
    </div>
  );
}

interface SchemeCardProps {
  scheme: SchemeResponse;
  rank: number;
  onExpand: () => void;
  expanded: boolean;
}

function SchemeCard({ scheme, rank, onExpand, expanded }: SchemeCardProps) {
  const windowStyle = getWindowColor(scheme.window.status);
  const statusStyle = getStatusColor(scheme.status);
  const levelColor = scheme.level === 'CENTRAL' ? C.blue : C.amber;
  const levelBg = scheme.level === 'CENTRAL' ? C.blueTint : C.amberTint;

  return (
    <Card
      style={{
        padding: 0,
        overflow: 'hidden',
        borderLeft: `4px solid ${scheme.relevanceScore >= 70 ? C.sage : C.amber}`,
      }}
      hover={true}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${C.line}`,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          cursor: 'pointer',
        }}
        onClick={onExpand}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: `linear-gradient(135deg, ${C.sageTint}, ${C.sage}22)`,
            border: `1px solid ${C.sage}44`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-display)',
            fontSize: 14,
            fontWeight: 800,
            color: C.sageDeep,
            flexShrink: 0,
          }}
        >
          {rank}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, lineHeight: 1.4, marginBottom: 6 }}>
            {scheme.name}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            <Badge color={levelColor} bg={levelBg} size="sm">
              {scheme.level}
            </Badge>
            <Badge color={statusStyle.color} bg={statusStyle.bg} size="sm">
              {statusStyle.label}
            </Badge>
            <Badge color={C.inkMuted} bg={C.bg} size="sm">
              {getCategoryDisplay(scheme.category)}
            </Badge>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: C.inkMuted, marginBottom: 4 }}>Relevance</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.sageDeep, fontFamily: 'var(--font-display)' }}>
            {scheme.relevanceScore}%
          </div>
          <div
            style={{
              fontSize: 11,
              color: expanded ? C.sage : C.inkMuted,
              marginTop: 8,
              fontWeight: 600,
            }}
          >
            {expanded ? '▲ Collapse' : '▼ View details'}
          </div>
        </div>
      </div>

      {/* Key Info */}
      <div
        style={{
          padding: '12px 20px',
          display: 'grid',
          gridTemplateColumns: expanded ? '1fr' : '2fr 1fr',
          gap: 12,
          background: C.bg,
        }}
      >
        <div>
          <div style={{ fontSize: 10, color: C.inkMuted, fontWeight: 600, marginBottom: 4 }}>
            BENEFIT
          </div>
          <div style={{ fontSize: 13, color: C.ink, fontWeight: 600, lineHeight: 1.5 }}>
            {scheme.benefit.description}
          </div>
          {scheme.benefit.amount && (
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: C.sageDeep,
                fontFamily: 'var(--font-display)',
                marginTop: 4,
              }}
            >
              ₹{scheme.benefit.amount.toLocaleString('en-IN')}
            </div>
          )}
        </div>
        {!expanded && (
          <div>
            <div style={{ fontSize: 10, color: C.inkMuted, fontWeight: 600, marginBottom: 4 }}>
              WINDOW
            </div>
            <Badge color={windowStyle.color} bg={windowStyle.bg}>
              {scheme.window.status === 'CLOSING_SOON' && scheme.window.daysRemaining
                ? `${scheme.window.daysRemaining} days left`
                : scheme.window.status.replace('_', ' ')}
            </Badge>
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div style={{ padding: '16px 20px', borderTop: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Match Score */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.ink, marginBottom: 8 }}>
              Match Score
            </div>
            <ScoreBar score={scheme.relevanceScore} />
          </div>

          {/* Why Matched */}
          {scheme.matchedBecause.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.ink, marginBottom: 8 }}>
                Why This Scheme Matched
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: C.inkMuted, lineHeight: 1.8 }}>
                {scheme.matchedBecause.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing Information */}
          {scheme.missingInformation.length > 0 && (
            <div
              style={{
                background: C.amberTint,
                border: `1px solid ${C.amber}33`,
                borderRadius: radius.md,
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: C.amber, marginBottom: 6 }}>
                Missing Information
              </div>
              <div style={{ fontSize: 12, color: C.ink }}>
                Please provide: {scheme.missingInformation.join(', ')}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.ink, marginBottom: 8 }}>
              Description
            </div>
            <div style={{ fontSize: 12, color: C.inkMuted, lineHeight: 1.7 }}>
              {scheme.description}
            </div>
          </div>

          {/* Documents */}
          {scheme.documents.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.ink, marginBottom: 8 }}>
                Required Documents
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {scheme.documents.map((doc, i) => (
                  <Badge key={i} color={C.inkMuted} bg={C.bg} size="sm">
                    {doc}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Revenue Impact */}
          {scheme.revenueImpact.available && (
            <div
              style={{
                background: C.sageTint,
                border: `1px solid ${C.sage}33`,
                borderRadius: radius.md,
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: C.sageDeep, marginBottom: 6 }}>
                Potential Revenue Impact
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.sageDeep, marginBottom: 2 }}>
                ₹{scheme.revenueImpact.amount?.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: 11, color: C.ink }}>{scheme.revenueImpact.basis}</div>
            </div>
          )}

          {/* Application */}
          {scheme.application.url && (
            <div>
              <Btn
                variant="primary"
                size="md"
                fullWidth
                onClick={() => window.open(scheme.application.url!, '_blank')}
              >
                Apply Online →
              </Btn>
              <div style={{ fontSize: 10, color: C.inkMuted, marginTop: 8, textAlign: 'center' }}>
                {scheme.application.method}
              </div>
            </div>
          )}

          {/* Source */}
          <div style={{ fontSize: 10, color: C.inkMuted, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
            <strong>Source:</strong> {scheme.source.authority} •{' '}
            <strong>Verified:</strong> {scheme.source.lastVerifiedAt ? new Date(scheme.source.lastVerifiedAt).toLocaleDateString() : 'N/A'}
            {scheme.source.url && (
              <>
                {' • '}
                <a
                  href={scheme.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: C.sage, textDecoration: 'none' }}
                >
                  Official Source →
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

export default function Schemes({ navigate }: { navigate: (s: Screen) => void }) {
  const { farmer } = useAuth();
  
  const [schemes, setSchemes] = useState<SchemeResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  
  const [selectedState, setSelectedState] = useState('All India');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedScheme, setExpandedScheme] = useState<string | null>(null);

  // Auto-load schemes on mount if farmer profile is available
  useEffect(() => {
    if (farmer?.state) {
      setSelectedState(farmer.state);
      loadSchemes(null, farmer.state);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmer?.state]);

  const loadSchemes = async (activity?: string | null, stateOverride?: string) => {
    // Determine the state to use: explicit override > dropdown > farmer profile
    const stateToUse = stateOverride ?? (selectedState !== 'All India' ? selectedState : (farmer?.state || null));

    if (!stateToUse) {
      setError('Please select a state or complete your farm profile to see matched schemes');
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const params = new URLSearchParams();
      
      params.append('state', stateToUse);
      if (farmer?.district) params.append('district', farmer.district);
      // Note: Add crop, landSize, season etc when available in farmer profile
      if (activity) params.append('activity', activity);
      if (selectedCategory) params.append('category', selectedCategory);

      const response = await fetch(`${API_BASE_URL}/schemes/match?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch schemes: ${response.statusText}`);
      }

      const data: MatchResponse = await response.json();
      setSchemes(data.schemes || []);
    } catch (err) {
      console.error('Error loading schemes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load schemes');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSearch = (activity: string | null) => {
    loadSchemes(activity, undefined);
  };

  const handleSearch = () => {
    loadSchemes(null, undefined);
  };

  return (
    <div>
      <PageHeader
        title="Government Schemes"
        subtitle={
          farmer
            ? `Find schemes for ${farmer.state || 'your farm'}`
            : 'Complete your profile to see matched schemes'
        }
        back="Dashboard"
        onBack={() => navigate('dashboard')}
        actions={
          schemes.length > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              <Badge color={C.sage} bg={C.sageTint}>
                {schemes.filter(s => s.status === 'POTENTIALLY_ELIGIBLE').length} eligible
              </Badge>
              <Badge color={C.rust} bg={C.rustTint}>
                {schemes.filter(s => s.window.status === 'CLOSING_SOON').length} closing soon
              </Badge>
            </div>
          )
        }
      />

      {/* Header Card */}
      <div
        style={{
          background: `linear-gradient(135deg, ${C.sageTint}, #d4e8d6)`,
          border: `1px solid ${C.sage}33`,
          borderRadius: radius.xl,
          padding: '20px 24px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 700,
              color: C.sageDeep,
              marginBottom: 4,
            }}
          >
            Government Scheme Finder
          </div>
          <div style={{ fontSize: 12, color: C.inkMuted }}>
            Search 50+ central & state schemes — crop insurance, subsidies, loans, irrigation & more
          </div>
        </div>
        <Badge color={C.sageDeep} bg={`${C.sage}22`}>
          Verified Schemes
        </Badge>
      </div>

      {/* Search/Filter Card */}
      <Card hover={false} style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 16 }}>
          Search Schemes
        </div>

        {/* State + Category */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: C.inkMuted,
                display: 'block',
                marginBottom: 6,
              }}
            >
              State
            </label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${C.line}`,
                borderRadius: radius.md,
                fontSize: 13,
                color: C.ink,
                background: C.surface,
                outline: 'none',
              }}
            >
              {STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: C.inkMuted,
                display: 'block',
                marginBottom: 6,
              }}
            >
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${C.line}`,
                borderRadius: radius.md,
                fontSize: 13,
                color: C.ink,
                background: C.surface,
                outline: 'none',
              }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Searches */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: C.inkMuted, fontWeight: 600, marginBottom: 8 }}>
            QUICK SEARCHES
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {QUICK_SEARCHES.map((qs) => (
              <button
                key={qs.query}
                onClick={() => handleQuickSearch(qs.activity)}
                style={{
                  fontSize: 11,
                  padding: '6px 12px',
                  borderRadius: 20,
                  background: C.sageTint,
                  border: `1px solid ${C.sage}33`,
                  color: C.sageDeep,
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = C.sage;
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = C.sageTint;
                  e.currentTarget.style.color = C.sageDeep;
                }}
              >
                {qs.query}
              </button>
            ))}
          </div>
        </div>

        {/* Search Button */}
        <Btn
          variant="primary"
          size="md"
          fullWidth
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? 'Searching...' : 'Search Schemes'}
        </Btn>
      </Card>

      {/* Error */}
      {error && (
        <div
          style={{
            background: C.rustTint,
            border: `1px solid ${C.rust}33`,
            borderRadius: radius.md,
            padding: '14px 16px',
            fontSize: 12,
            color: C.rust,
            marginBottom: 20,
          }}
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: 48,
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
          Searching government schemes...
        </div>
      )}

      {/* No Results */}
      {!loading && searched && schemes.length === 0 && !error && (
        <div
          style={{
            textAlign: 'center',
            padding: 48,
            color: C.inkMuted,
            fontSize: 14,
          }}
        >
          No schemes found matching your criteria. Try adjusting your filters or complete your farm
          profile.
        </div>
      )}

      {/* Results */}
      {!loading && schemes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12, color: C.inkMuted, fontWeight: 600 }}>
            {schemes.length} schemes found • sorted by relevance
          </div>
          {schemes.map((scheme, i) => (
            <SchemeCard
              key={scheme.id}
              scheme={scheme}
              rank={i + 1}
              expanded={expandedScheme === scheme.id}
              onExpand={() => setExpandedScheme(expandedScheme === scheme.id ? null : scheme.id)}
            />
          ))}
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
