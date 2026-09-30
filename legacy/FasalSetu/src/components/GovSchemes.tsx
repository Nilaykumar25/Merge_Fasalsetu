/**
 * GovSchemes.tsx
 * Government Scheme Search — powered by ChromaDB + sentence-transformers
 * Backend: POST localhost:8000/schemes/search
 */
import { useState } from 'react';
import { Search, Loader2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

const API = (import.meta as any).env?.VITE_SOIL_NPK_API_URL ?? 'http://localhost:8000';

// ── Types ─────────────────────────────────────────────────────────────────
interface Scheme {
  scheme_name:    string;
  level:          string;
  state:          string;
  category:       string;
  benefit_type:   string;
  benefit_amount: string;
  eligibility:    string;
  apply_url:      string;
  summary:        string;
  match_score:    number;
}

// ── Constants ─────────────────────────────────────────────────────────────
const STATES = [
  'All India', 'Uttar Pradesh', 'Madhya Pradesh', 'Punjab',
  'Maharashtra', 'West Bengal', 'Rajasthan', 'Gujarat',
  'Karnataka', 'Andhra Pradesh', 'Telangana', 'Tamil Nadu',
  'Bihar', 'Odisha', 'Haryana',
];

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'Income Support & Credit',          label: '💰 Income Support & Credit' },
  { value: 'Crop Insurance & Risk Protection', label: '🛡️ Crop Insurance & Risk' },
  { value: 'Irrigation & Water',               label: '💧 Irrigation & Water' },
  { value: 'Soil Health & Farming Practices',  label: '🌱 Soil Health & Practices' },
  { value: 'Market Access & Selling',          label: '🛒 Market Access & Selling' },
  { value: 'Infrastructure & Storage',         label: '🏗️ Infrastructure & Storage' },
  { value: 'Technology & Mechanisation',       label: '🚁 Technology & Mechanisation' },
  { value: 'Specialised Crop Missions',        label: '🌾 Specialised Crop Missions' },
];

const QUICK_SEARCHES = [
  'crop insurance', 'drip irrigation subsidy', 'kisan credit card',
  'organic farming', 'solar pump', 'soil health card', 'PM-KISAN',
  'cold storage', 'drone subsidy', 'women farmer scheme',
];

// ── Score bar ─────────────────────────────────────────────────────────────
function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? '#16a34a' : score >= 45 ? '#d97706' : '#dc2626';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 4, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 2, transition: 'width .5s ease' }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color, minWidth: 36 }}>{score}%</span>
    </div>
  );
}

// ── Scheme Card ───────────────────────────────────────────────────────────
function SchemeCard({ s, rank }: { s: Scheme; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const levelColor = s.level === 'Central' ? '#1d4ed8' : '#7c3aed';
  const levelBg    = s.level === 'Central' ? '#dbeafe' : '#ede9fe';

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'box-shadow .2s' }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(22,163,74,0.12)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)')}>

      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Playfair Display,Georgia,serif', fontSize: 13, fontWeight: 800, color: '#16a34a', flexShrink: 0 }}>
          {rank}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', lineHeight: 1.4, marginBottom: 4 }}>{s.scheme_name}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: levelBg, color: levelColor }}>{s.level}</span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#f3f4f6', color: '#6b7280' }}>{s.state}</span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#fef3c7', color: '#b45309' }}>{s.category}</span>
          </div>
        </div>
        <button onClick={() => setExpanded(e => !e)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4, flexShrink: 0 }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Key info always visible */}
      <div style={{ padding: '10px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 2 }}>Benefit</div>
          <div style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{s.benefit_type}</div>
          {s.benefit_amount && s.benefit_amount !== '—' && (
            <div style={{ fontSize: 13, fontWeight: 800, color: '#16a34a', fontFamily: 'Playfair Display,Georgia,serif', marginTop: 2 }}>{s.benefit_amount}</div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 2 }}>Match</div>
          <ScoreBar score={s.match_score} />
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid #f9fafb', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {s.eligibility && s.eligibility !== '—' && (
            <div>
              <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 3, marginTop: 10 }}>Eligibility</div>
              <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{s.eligibility}</div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 3 }}>Summary</div>
            <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.6 }}>{s.summary}</div>
          </div>
          {s.apply_url && s.apply_url !== '—' && (
            <a href={`https://${s.apply_url.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#16a34a', textDecoration: 'none', marginTop: 4 }}>
              <ExternalLink size={12} /> Apply at {s.apply_url}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function GovSchemes() {
  const [query, setQuery]       = useState('');
  const [state, setState]       = useState('All India');
  const [category, setCategory] = useState('');
  const [results, setResults]   = useState<Scheme[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [searched, setSearched] = useState(false);

  const search = async (q = query) => {
    if (!q.trim()) return;
    setLoading(true); setError(''); setResults([]); setSearched(true);
    try {
      const res = await fetch(`${API}/schemes/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          state: state === 'All India' ? '' : state,
          category,
          top_k: 8,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? `Server error ${res.status}`);
      }
      const data = await res.json();
      setResults(data.schemes ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Search failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fs-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontSize: 36 }}>🏛️</div>
        <div>
          <div style={{ fontFamily: 'Playfair Display,Georgia,serif', fontSize: 16, fontWeight: 700, color: '#14532d' }}>Government Scheme Finder</div>
          <div style={{ fontSize: 12, color: '#4b6b4b', marginTop: 3 }}>Search 50+ central & state schemes — crop insurance, subsidies, loans, irrigation & more.</div>
        </div>
        <div style={{ marginLeft: 'auto', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 700, color: '#15803d', whiteSpace: 'nowrap' }}>
          ChromaDB · Semantic Search
        </div>
      </div>

      {/* ── Filters + Search ── */}
      <div className="fs-card">
        <div className="fs-card-head">
          <div style={{ fontFamily: 'Playfair Display,Georgia,serif', fontSize: 12, fontWeight: 700, color: '#374151' }}>🔍 Search Schemes</div>
        </div>
        <div className="fs-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* State + Category row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>📍 State</label>
              <select value={state} onChange={e => setState(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#374151', background: '#f9fafb', outline: 'none' }}>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>📂 Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#374151', background: '#f9fafb', outline: 'none' }}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {/* Query input */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="e.g. crop insurance, drip irrigation subsidy, kisan loan…"
              style={{ flex: 1, padding: '10px 14px', border: '1.5px solid #bbf7d0', borderRadius: 8, fontSize: 13, color: '#1a2e1a', background: '#fff', outline: 'none' }}
            />
            <button onClick={() => search()} disabled={!query.trim() || loading}
              style={{ padding: '10px 20px', borderRadius: 8, background: query.trim() ? 'linear-gradient(135deg,#166534,#16a34a)' : '#e5e7eb', color: query.trim() ? '#fff' : '#9ca3af', border: 'none', cursor: query.trim() ? 'pointer' : 'default', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {loading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={15} />}
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>

          {/* Quick searches */}
          <div>
            <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, marginBottom: 6 }}>QUICK SEARCHES</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {QUICK_SEARCHES.map(q => (
                <button key={q} onClick={() => { setQuery(q); search(q); }}
                  style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', cursor: 'pointer', fontWeight: 500 }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: '#b91c1c' }}>
          ⚠️ {error}
          {error.includes('ChromaDB') && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#991b1b' }}>
              Run: <code style={{ background: '#fecaca', padding: '1px 6px', borderRadius: 4 }}>python seed_chromadb.py --json schemes_chromadb.json</code> then restart the backend.
            </div>
          )}
        </div>
      )}

      {/* ── Results ── */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32, color: '#16a34a', fontSize: 13 }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          Searching government schemes…
        </div>
      )}

      {!loading && searched && results.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 13 }}>
          No schemes found. Try a broader query or different category.
        </div>
      )}

      {!loading && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>
            {results.length} schemes found · sorted by relevance
          </div>
          {results.map((s, i) => <SchemeCard key={s.scheme_name + i} s={s} rank={i + 1} />)}
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
