/**
 * Marketplace.tsx — KisanBazaar मंडी भाव
 * Full replication of market_portal.html
 * Backend: POST localhost:8000/market/prices
 */
import { useState, useRef, useEffect } from 'react';
import { Search, Loader2, Send } from 'lucide-react';

const API = (import.meta as any).env?.VITE_SOIL_NPK_API_URL ?? 'http://localhost:8000';

// ── MSP 2024-25 ───────────────────────────────────────────────────────────
const MSP: Record<string, number> = {
  Wheat: 2425, Paddy: 2300, Maize: 2090, Gram: 5440, Tur: 7550,
  Moong: 8682, Urad: 7400, Groundnut: 6783, Soybean: 4892,
  Cotton: 7121, Jowar: 3371, Bajra: 2625, Mustard: 5950,
  Sugarcane: 340, Ragi: 4290,
};

const CROPS = [
  'Wheat','Paddy','Tomato','Onion','Potato','Gram','Tur',
  'Maize','Cotton','Soybean','Groundnut','Mustard','Sugarcane',
  'Moong','Urad','Bajra','Jowar','Ragi',
];
const STATES = [
  'Maharashtra','Punjab','Uttar Pradesh','Madhya Pradesh','Haryana',
  'Rajasthan','Gujarat','Karnataka','Andhra Pradesh','Telangana',
  'Tamil Nadu','Bihar','Odisha','West Bengal',
];

// ── Types ─────────────────────────────────────────────────────────────────
interface MandiRow { market: string; state: string; min: number; max: number; modal: number }
interface PriceResult {
  crop: string; market: string; state: string;
  price: number; unit: string; msp: number | null;
  below_msp: boolean; trend: string; source: string; advice: string; timestamp: string;
}
interface ChatMsg { role: 'user'|'agent'; text: string }

// ── State → Mandis map ────────────────────────────────────────────────────
const STATE_MANDIS: Record<string, string[]> = {
  'Maharashtra':      ['Nagpur','Pune','Mumbai (Vashi APMC)','Nashik','Aurangabad','Solapur','Kolhapur'],
  'Punjab':           ['Ludhiana','Amritsar','Jalandhar','Patiala','Bathinda','Moga','Ferozepur'],
  'Uttar Pradesh':    ['Kanpur','Lucknow','Agra','Varanasi','Meerut','Allahabad','Bareilly','Mathura'],
  'Madhya Pradesh':   ['Indore','Bhopal','Gwalior','Jabalpur','Ujjain','Sagar','Ratlam'],
  'Haryana':          ['Karnal','Hisar','Rohtak','Ambala','Panipat','Sirsa','Fatehabad'],
  'Rajasthan':        ['Jaipur','Jodhpur','Kota','Ajmer','Bikaner','Alwar','Sikar'],
  'Gujarat':          ['Ahmedabad','Surat','Rajkot','Vadodara','Bhavnagar','Junagadh','Anand'],
  'Karnataka':        ['Hubli','Bangalore','Mysore','Belgaum','Davangere','Shimoga','Tumkur'],
  'Andhra Pradesh':   ['Guntur','Vijayawada','Visakhapatnam','Kurnool','Nellore','Tirupati','Kadapa'],
  'Telangana':        ['Hyderabad','Warangal','Nizamabad','Karimnagar','Khammam','Nalgonda','Adilabad'],
  'Tamil Nadu':       ['Chennai','Coimbatore','Madurai','Salem','Trichy','Tirunelveli','Erode'],
  'Bihar':            ['Patna','Muzaffarpur','Gaya','Bhagalpur','Darbhanga','Purnia','Ara'],
  'Odisha':           ['Bhubaneswar','Cuttack','Berhampur','Sambalpur','Rourkela','Balasore','Puri'],
  'West Bengal':      ['Kolkata','Siliguri','Asansol','Durgapur','Howrah','Burdwan','Malda'],
};

const ALL_INDIA_MANDIS = [
  { market:'Indore',        state:'Madhya Pradesh' },
  { market:'Nagpur',        state:'Maharashtra'    },
  { market:'Ludhiana',      state:'Punjab'         },
  { market:'Amritsar',      state:'Punjab'         },
  { market:'Azadpur',       state:'Delhi'          },
  { market:'Jaipur',        state:'Rajasthan'      },
  { market:'Hubli',         state:'Karnataka'      },
  { market:'Vashi APMC',    state:'Maharashtra'    },
];

// ── Mock multi-mandi data ─────────────────────────────────────────────────
function mockMandis(crop: string, filterState: string): MandiRow[] {
  const base = MSP[crop] ?? 2200;

  let entries: { market: string; state: string }[];
  if (!filterState) {
    entries = ALL_INDIA_MANDIS;
  } else {
    const mandisForState = STATE_MANDIS[filterState] ?? [filterState];
    entries = mandisForState.map(m => ({ market: m, state: filterState }));
  }

  // Generate realistic price variation per mandi
  return entries.map(({ market, state }, i) => {
    // Each mandi gets a slightly different base using a deterministic seed
    const seed = market.charCodeAt(0) + market.charCodeAt(market.length - 1);
    const variation = ((seed % 20) - 8) / 100; // -8% to +12%
    const modal = Math.round(base * (1 + variation));
    const min   = Math.round(modal * 0.93);
    const max   = Math.round(modal * 1.09);
    return { market, state, min, max, modal };
  }).sort((a, b) => b.modal - a.modal);
}

// ── Mock 7-day trend with dates ───────────────────────────────────────────
function mockTrend(base: number): { dates: string[]; prices: number[] } {
  let p = Math.round(base * 0.955);
  const prices: number[] = [];
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    dates.push(d.toLocaleDateString('en-IN', { day:'numeric', month:'short' }));
    p = Math.round(p + (Math.random() - 0.42) * base * 0.022);
    prices.push(p);
  }
  return { dates, prices };
}

// ── SVG Chart with Y-axis labels and date labels ──────────────────────────
function TrendChart({ dates, prices, color }: { dates: string[]; prices: number[]; color: string }) {
  if (prices.length < 2) return null;
  const W = 600, H = 120, padL = 56, padR = 12, padT = 10, padB = 28;
  const min = Math.min(...prices), max = Math.max(...prices);
  const range = max - min || 100;
  const px = (i: number) => padL + (i / (prices.length - 1)) * (W - padL - padR);
  const py = (v: number) => padT + (1 - (v - min) / range) * (H - padT - padB);

  const pts = prices.map((p, i) => `${px(i)},${py(p)}`).join(' ');
  const area = `M${padL},${H - padB} L${prices.map((p,i) => `${px(i)},${py(p)}`).join(' L')} L${px(prices.length-1)},${H-padB} Z`;

  // Y-axis ticks
  const yTicks = 4;
  const yStep = Math.ceil(range / yTicks / 50) * 50;
  const yStart = Math.floor(min / 50) * 50;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => yStart + i * yStep);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }}>
      {/* grid lines */}
      {yLabels.map(v => (
        <line key={v} x1={padL} x2={W - padR} y1={py(v)} y2={py(v)}
          stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3,3" />
      ))}
      {/* area fill */}
      <path d={area} fill={color + '15'} />
      {/* line */}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {/* dots */}
      {prices.map((p, i) => (
        <circle key={i} cx={px(i)} cy={py(p)} r="3.5" fill={color} stroke="#fff" strokeWidth="1.5" />
      ))}
      {/* Y-axis labels */}
      {yLabels.map(v => (
        <text key={v} x={padL - 6} y={py(v) + 4} textAnchor="end"
          style={{ fontSize: 10, fill: '#9ca3af', fontFamily: 'sans-serif' }}>
          ₹{v.toLocaleString()}
        </text>
      ))}
      {/* X-axis date labels */}
      {dates.map((d, i) => (
        <text key={i} x={px(i)} y={H - 4} textAnchor="middle"
          style={{ fontSize: 10, fill: '#9ca3af', fontFamily: 'sans-serif' }}>
          {d}
        </text>
      ))}
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function Marketplace() {
  const [crop, setCrop]       = useState('Wheat');
  const [state, setState]     = useState('');
  const [qty, setQty]         = useState('');
  const [result, setResult]   = useState<PriceResult | null>(null);
  const [mandis, setMandis]   = useState<MandiRow[]>([]);
  const [trend, setTrend]     = useState<{ dates: string[]; prices: number[] }>({ dates: [], prices: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [msgs, setMsgs]       = useState<ChatMsg[]>([{
    role: 'agent',
    text: 'Namaste! 🌾 I\'m your KisanBazaar advisor. Select a crop and click "Get Market Prices" — then ask me anything about selling!',
  }]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight); }, [msgs]);

  const fetchPrices = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/market/prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crop, state, city: state || 'India' }),
      });
      const data: PriceResult = await res.json();
      if ((data as any).error) throw new Error((data as any).error);
      setResult(data);
      const rows = mockMandis(crop, state);
      setMandis(rows);
      setTrend(mockTrend(data.price));
      setMsgs(p => [...p, { role: 'agent', text: `Loaded ${crop} prices for ${state}. ${data.advice}` }]);
    } catch (e: any) {
      // Offline fallback — use MSP-based mock
      const base = MSP[crop] ?? 2200;
      const rows = mockMandis(crop, state);
      const avg  = Math.round(rows.reduce((s, r) => s + r.modal, 0) / rows.length);
      const msp  = MSP[crop] ?? null;
      setMandis(rows);
      setTrend(mockTrend(avg));
      setResult({
        crop, market: state, state, price: avg, unit: '₹/quintal',
        msp, below_msp: msp ? avg < msp : false,
        trend: 'stable', source: 'msp-reference',
        advice: msp
          ? avg >= msp
            ? `Market price ₹${avg}/qtl is above MSP ₹${msp}/qtl. Good time to sell.`
            : `Market price ₹${avg}/qtl is below MSP ₹${msp}/qtl. Sell via NAFED/FCI.`
          : `No MSP for ${crop}. Check agmarknet.gov.in for live prices.`,
        timestamp: new Date().toLocaleString(),
      });
      setError('');
      setMsgs(p => [...p, { role: 'agent', text: `Backend offline — showing MSP-based estimates for ${crop}. Start uvicorn for live data.` }]);
    } finally {
      setLoading(false);
    }
  };

  const sendChat = async (text = chatInput.trim()) => {
    if (!text || chatLoading) return;
    setMsgs(p => [...p, { role: 'user', text }]);
    setChatInput(''); setChatLoading(true);
    try {
      const ctx = result
        ? `Crop: ${result.crop}, State: ${result.state}, Price: ₹${result.price}/qtl, MSP: ₹${result.msp ?? 'N/A'}/qtl. ${result.advice}`
        : `Crop: ${crop}, State: ${state}`;
      const res = await fetch(`${API}/query`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `${ctx}. Farmer asks: ${text}`, crop, location: state, session_id: 'market-chat' }),
      });
      const data = await res.json();
      setMsgs(p => [...p, { role: 'agent', text: data?.response ?? data?.message ?? 'Could not get a response.' }]);
    } catch {
      setMsgs(p => [...p, { role: 'agent', text: result ? `Based on data: ${result.advice}` : `MSP for ${crop}: ₹${MSP[crop] ?? 'N/A'}/qtl.` }]);
    } finally { setChatLoading(false); }
  };

  const msp = result?.msp ?? MSP[crop] ?? null;
  const avg = mandis.length ? Math.round(mandis.reduce((s,r) => s+r.modal,0)/mandis.length) : result?.price ?? 0;
  const best = mandis[0];
  const trendPrices = trend.prices;
  const trendDir = trendPrices.length > 1 ? (trendPrices[trendPrices.length-1] > trendPrices[0] ? 'rising' : 'falling') : 'stable';
  const trendPct = trendPrices.length > 1 ? Math.abs(((trendPrices[trendPrices.length-1]-trendPrices[0])/trendPrices[0])*100).toFixed(1) : '0';
  const trendColor = trendDir === 'rising' ? '#2d6a4f' : '#b91c1c';
  const vsMsp = msp && avg ? (((avg - msp) / msp) * 100) : null;

  const sel = { width:'100%', padding:'9px 12px', border:'1.5px solid #e5e7eb', borderRadius:8, fontSize:13, color:'#374151', background:'#f9fafb', outline:'none' } as React.CSSProperties;

  return (
    <div className="fs-panel" style={{ display:'flex', flexDirection:'column', gap:0, background:'#f9f8f4', borderRadius:12 }}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}
        .kb-tr:hover td{background:#f0fdf4!important}
      `}</style>

      {/* ── Top bar ── */}
      <div style={{ background:'#1a4731', padding:'0 20px', height:52, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontFamily:'Baloo 2,Playfair Display,Georgia,serif', fontSize:20, fontWeight:700, color:'#fff', letterSpacing:'-.3px' }}>
          Kisan<span style={{ color:'#52b788' }}>Bazaar</span>
          <span style={{ fontSize:13, fontWeight:400, opacity:.7, marginLeft:8 }}>मंडी भाव</span>
        </div>
        <div style={{ fontSize:11, background:'rgba(255,255,255,.12)', color:'#cde', padding:'3px 12px', borderRadius:20 }}>
          {result ? `${result.source} · ${result.timestamp}` : 'Live Mandi Prices'}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:0, alignItems:'start' }}>

        {/* ── Sidebar ── */}
        <div style={{ background:'#fff', borderRight:'1px solid #e8e8e0', padding:20, display:'flex', flexDirection:'column', gap:16 }}>

          {/* Search */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'#2d6a4f', marginBottom:14 }}>Search Prices</div>
            {[
              { label:'Your Crop / Commodity', el:<select value={crop} onChange={e=>setCrop(e.target.value)} style={sel}>{CROPS.map(c=><option key={c} value={c}>{c}</option>)}</select> },
              { label:'State', el:<select value={state} onChange={e=>setState(e.target.value)} style={sel}><option value="">All India</option>{STATES.map(s=><option key={s} value={s}>{s}</option>)}</select> },
              { label:'My Harvest (quintals)', el:<input type="number" value={qty} onChange={e=>setQty(e.target.value)} placeholder="e.g. 50" style={sel} /> },
            ].map(({label,el}) => (
              <div key={label} style={{ marginBottom:12 }}>
                <div style={{ fontSize:12, color:'#6b6b5d', marginBottom:4, fontWeight:500 }}>{label}</div>
                {el}
              </div>
            ))}
            <button onClick={fetchPrices} disabled={loading}
              style={{ width:'100%', padding:11, background: loading?'#e5e7eb':'#2d6a4f', color: loading?'#9ca3af':'#fff', border:'none', borderRadius:8, fontFamily:'Playfair Display,Georgia,serif', fontSize:15, fontWeight:600, cursor: loading?'default':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'background .2s' }}>
              {loading ? <><Loader2 size={15} style={{animation:'spin 1s linear infinite'}}/> Fetching…</> : <><Search size={15}/> Get Market Prices</>}
            </button>
            {error && <div style={{ marginTop:8, fontSize:11, color:'#b91c1c', background:'#fee2e2', padding:'7px 10px', borderRadius:6 }}>{error}</div>}
          </div>

          {/* MSP reference */}
          <div style={{ background:'#d8f3dc', border:'1.5px solid #b7e4c7', borderRadius:10, padding:'14px 16px' }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'#1a4731', marginBottom:10 }}>MSP 2024-25 (₹/QTL)</div>
            {Object.entries(MSP).map(([c,p]) => (
              <div key={c} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #b7e4c7', fontSize:13 }}>
                <span style={{ color:'#1a4731', fontWeight:500 }}>{c}</span>
                <span style={{ fontFamily:'Playfair Display,Georgia,serif', fontWeight:600, color:'#2d6a4f' }}>₹{p.toLocaleString()}</span>
              </div>
            ))}
          </div>

          {/* Data sources */}
          <div style={{ background:'#f0faf5', border:'1.5px solid #b7e4c7', borderRadius:10, padding:'14px 16px' }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'#2d6a4f', marginBottom:10 }}>Data Sources</div>
            {[
              { dot:'🟢', name:'data.gov.in', desc:'Agmarknet API · 3,000+ mandis · Daily prices' },
              { dot:'🟡', name:'eNAM API',    desc:'Live auctions · 1,000+ mandis · Real-time' },
              { dot:'🔵', name:'CEDA Ashoka', desc:'Historical trends · Free CSV download' },
            ].map(s => (
              <div key={s.name} style={{ marginBottom:8 }}>
                <div style={{ fontSize:12, color:'#374151' }}>{s.dot} <strong>{s.name}</strong></div>
                <div style={{ fontSize:11, color:'#6b7280', paddingLeft:18 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Main ── */}
        <div style={{ padding:20, display:'flex', flexDirection:'column', gap:18 }}>

          {/* Metric cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            {[
              { label:'Modal Price',    val: avg ? `₹${avg.toLocaleString()}` : '—',  sub:'₹/quintal avg',                                                                  accent:'#52b788', valColor:'#2a2a22' },
              { label:'Highest Mandi', val: best ? `₹${best.modal.toLocaleString()}` : '—', sub: best?.market ?? 'best price',                                             accent:'#e9a616', valColor:'#2a2a22' },
              { label:'vs MSP',        val: vsMsp !== null ? `${vsMsp>=0?'+':''}${vsMsp.toFixed(1)}%` : '—', sub: msp ? `MSP ₹${msp.toLocaleString()} · ${vsMsp!>=0?'Above':'Below'} MSP` : 'No MSP', accent:'#6c63ff', valColor: vsMsp!==null?(vsMsp>=0?'#2d6a4f':'#c0392b'):'#2a2a22' },
              { label:'Est. Revenue',  val: avg && qty ? `₹${(avg*parseFloat(qty)/1000).toFixed(0)}K` : '—', sub: qty ? `for ${qty} quintals` : 'enter quantity',           accent:'#ef6c00', valColor:'#2a2a22' },
            ].map(m => (
              <div key={m.label} style={{ background:'#fff', borderRadius:12, padding:'16px 18px', boxShadow:'0 2px 16px rgba(0,0,0,.07)', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:m.accent }} />
                <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'.7px', color:'#9e9e8f', marginBottom:6 }}>{m.label}</div>
                <div style={{ fontFamily:'Playfair Display,Georgia,serif', fontSize:26, fontWeight:700, color:m.valColor, lineHeight:1 }}>{m.val}</div>
                <div style={{ fontSize:12, color:'#9e9e8f', marginTop:4 }}>{m.sub}</div>
              </div>
            ))}
          </div>

          {/* Trend chart */}
          {trend.prices.length > 0 && (
            <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 2px 16px rgba(0,0,0,.07)', padding:20 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <div style={{ fontFamily:'Playfair Display,Georgia,serif', fontSize:15, fontWeight:600, color:'#2a2a22' }}>7-Day Price Trend — {crop}</div>
                <div style={{ fontSize:12, color:trendColor, fontWeight:500 }}>
                  {trendDir==='rising'?'▲ Rising':'▼ Falling'} {trendPct}% over 7 days
                </div>
              </div>
              <TrendChart dates={trend.dates} prices={trend.prices} color={trendColor} />
            </div>
          )}

          {/* Price table */}
          {mandis.length > 0 && (
            <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 2px 16px rgba(0,0,0,.07)', overflow:'hidden' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px 12px', borderBottom:'1px solid #e8e8e0' }}>
                <div style={{ fontFamily:'Playfair Display,Georgia,serif', fontSize:15, fontWeight:600, color:'#2a2a22' }}>{crop} Prices — {state || 'India'}</div>
                <div style={{ fontSize:11, background:'#d8f3dc', color:'#1a4731', padding:'3px 10px', borderRadius:20, fontWeight:500 }}>
                  {mandis.length} mandis · {new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                </div>
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>
                    {['Market / Mandi','State','Min ₹','Max ₹','Modal ₹','vs MSP','Est. Revenue'].map(h => (
                      <th key={h} style={{ textAlign:'left', fontSize:11, textTransform:'uppercase', letterSpacing:'.7px', color:'#9e9e8f', padding:'10px 16px', background:'#f5f5f0', borderBottom:'1px solid #e8e8e0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mandis.map((r,i) => {
                    const diff = msp ? r.modal - msp : null;
                    const pct  = diff !== null && msp ? ((diff/msp)*100).toFixed(1) : null;
                    const rev  = qty ? `₹${(r.modal*parseFloat(qty)).toLocaleString()}` : '—';
                    return (
                      <tr key={i} className="kb-tr">
                        <td style={{ padding:'11px 16px', fontSize:13, borderBottom:'1px solid #e8e8e0', fontWeight:600, color:'#2a2a22' }}>{r.market}</td>
                        <td style={{ padding:'11px 16px', fontSize:13, borderBottom:'1px solid #e8e8e0', color:'#6b6b5d' }}>{r.state}</td>
                        <td style={{ padding:'11px 16px', fontSize:13, borderBottom:'1px solid #e8e8e0', color:'#6b6b5d' }}>₹{r.min.toLocaleString()}</td>
                        <td style={{ padding:'11px 16px', fontSize:13, borderBottom:'1px solid #e8e8e0', color:'#6b6b5d' }}>₹{r.max.toLocaleString()}</td>
                        <td style={{ padding:'11px 16px', fontSize:13, borderBottom:'1px solid #e8e8e0', fontWeight:700, color:'#2a2a22' }}>₹{r.modal.toLocaleString()}</td>
                        <td style={{ padding:'11px 16px', fontSize:13, borderBottom:'1px solid #e8e8e0' }}>
                          {pct !== null
                            ? <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background: parseFloat(pct)>=0?'#d8f3dc':'#fdecea', color: parseFloat(pct)>=0?'#1a4731':'#c0392b' }}>{parseFloat(pct)>=0?'+':''}{pct}%</span>
                            : <span style={{ fontSize:11, color:'#9e9e8f' }}>No MSP</span>}
                        </td>
                        <td style={{ padding:'11px 16px', fontSize:13, borderBottom:'1px solid #e8e8e0', color:'#2d6a4f', fontWeight:500 }}>{rev}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Advice strip */}
          {result && (
            <div style={{ background: result.below_msp?'#fdecea':'#d8f3dc', border:`1px solid ${result.below_msp?'#f5c6c2':'#b7e4c7'}`, borderLeft:`4px solid ${result.below_msp?'#c0392b':'#2d6a4f'}`, borderRadius:8, padding:'12px 16px', fontSize:12, color: result.below_msp?'#c0392b':'#1a4731', lineHeight:1.7 }}>
              <span style={{ fontWeight:700 }}>{result.below_msp?'⚠️ Below MSP — ':'✅ '}</span>{result.advice}
            </div>
          )}

          {/* Agent chat */}
          <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 2px 16px rgba(0,0,0,.07)', display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #e8e8e0', display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, background:'#2d6a4f', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🤖</div>
              <div>
                <div style={{ fontFamily:'Playfair Display,Georgia,serif', fontWeight:600, fontSize:15, color:'#2a2a22' }}>FasalSetuBazaar AI Advisor</div>
                <div style={{ fontSize:11, color:'#52b788' }}>● Online — ask me anything about selling your crop</div>
              </div>
            </div>

            {/* Quick prompts */}
            <div style={{ padding:'8px 16px', display:'flex', flexWrap:'wrap', gap:6, borderBottom:'1px solid #f3f4f6' }}>
              {['Should I sell now?','Best mandi near me','Price trend this week','Compare with MSP','How much will I earn?'].map(q => (
                <button key={q} onClick={() => sendChat(q)}
                  style={{ fontSize:12, padding:'5px 12px', border:'1.5px solid #52b788', color:'#2d6a4f', borderRadius:20, background:'none', cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }}>
                  {q}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div ref={chatRef} style={{ minHeight:200, overflowY:'auto', padding:'14px 20px', display:'flex', flexDirection:'column', gap:10 }}>
              {msgs.map((m,i) => (
                <div key={i} style={{ display:'flex', justifyContent: m.role==='user'?'flex-end':'flex-start' }}>
                  <div style={{ maxWidth:'85%', padding:'10px 14px', borderRadius: m.role==='user'?'12px 12px 3px 12px':'12px 12px 12px 3px', background: m.role==='user'?'#2d6a4f':'#d8f3dc', color: m.role==='user'?'#fff':'#1a4731', fontSize:13.5, lineHeight:1.55 }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display:'flex', gap:5, padding:'10px 14px', background:'#f5f5f0', borderRadius:'12px 12px 12px 3px', width:'fit-content' }}>
                  {[0,1,2].map(i => <div key={i} style={{ width:7, height:7, background:'#9e9e8f', borderRadius:'50%', animation:`bounce 1s ${i*.15}s infinite` }} />)}
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{ padding:'12px 16px', borderTop:'1px solid #e8e8e0', display:'flex', gap:8 }}>
              <textarea value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat();} }}
                placeholder="Ask about prices, best mandi, when to sell..."
                rows={1}
                style={{ flex:1, padding:'10px 14px', border:'1.5px solid #e8e8e0', borderRadius:8, fontFamily:'inherit', fontSize:14, outline:'none', resize:'none', height:44, color:'#2a2a22', background:'#fff', transition:'border-color .2s' }} />
              <button onClick={() => sendChat()} disabled={!chatInput.trim()||chatLoading}
                style={{ padding:'10px 18px', background: chatInput.trim()?'#2d6a4f':'#e8e8e0', color: chatInput.trim()?'#fff':'#9e9e8f', border:'none', borderRadius:8, fontFamily:'Playfair Display,Georgia,serif', fontWeight:600, cursor: chatInput.trim()?'pointer':'default', fontSize:14, display:'flex', alignItems:'center', gap:6 }}>
                <Send size={14} /> Send
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
