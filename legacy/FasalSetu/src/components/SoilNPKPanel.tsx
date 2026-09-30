import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, FlaskConical, MessageCircle, X } from 'lucide-react';
import { predictNPK, type NPKPrediction } from '../services/npkPredictor';

const CHAT_API = (import.meta as any).env?.VITE_SOIL_NPK_API_URL ?? 'http://localhost:8000';

// ── Types ─────────────────────────────────────────────────────────────────────
interface SensorInputs {
  soil_humidity:    number;
  soil_temperature: number;
  soil_pH:          number;
  soil_conductivity:number;
}
interface ChatMsg { id: string; role: 'user' | 'bot'; text: string }

// ── Static config ─────────────────────────────────────────────────────────────
const SENSOR_CFG = [
  { key: 'soil_humidity',     label: 'Soil Moisture',    icon: '💧', unit: '%',    min: 0, max: 100, step: 0.1,  accent: '#60a5fa' },
  { key: 'soil_temperature',  label: 'Soil Temperature', icon: '🌡️', unit: '°C',   min: 0, max: 60,  step: 0.1,  accent: '#f87171' },
  { key: 'soil_pH',           label: 'pH Level',         icon: '⚗️', unit: '',     min: 3, max: 10,  step: 0.01, accent: '#f59e0b' },
  { key: 'soil_conductivity', label: 'EC Level',         icon: '⚡', unit: 'dS/m', min: 0, max: 3,   step: 0.01, accent: '#fb923c' },
] as const;

const DEFAULTS: SensorInputs = { soil_humidity: 70, soil_temperature: 25, soil_pH: 6.8, soil_conductivity: 0.54 };

const NPK_META = [
  { key: 'nitrogen',   letter: 'N', full: 'NITROGEN',   color: '#3b82f6', bg: 'rgba(59,130,246,.07)',  border: 'rgba(59,130,246,.2)'  },
  { key: 'phosphorus', letter: 'P', full: 'PHOSPHORUS', color: '#f97316', bg: 'rgba(249,115,22,.07)',  border: 'rgba(249,115,22,.2)'  },
  { key: 'potassium',  letter: 'K', full: 'POTASSIUM',  color: '#a855f7', bg: 'rgba(168,85,247,.07)',  border: 'rgba(168,85,247,.2)'  },
] as const;

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string; icon: string }> = {
  adequate:  { bg: '#dcfce7', color: '#15803d', label: 'Adequate', icon: '✓' },
  deficient: { bg: '#fee2e2', color: '#b91c1c', label: 'Low',      icon: '↓' },
  excess:    { bg: '#fef3c7', color: '#b45309', label: 'High',     icon: '↑' },
};

// ── Improvement steps derived from NPK + sensor values ───────────────────────
function getImprovementSteps(result: NPKPrediction, inputs: SensorInputs): string[] {
  const steps: string[] = [];
  if (result.nitrogen.status   === 'deficient') steps.push('🌿 Apply Urea (46-0-0) at 20 kg/acre — preferably in the morning after light irrigation.');
  if (result.nitrogen.status   === 'excess')    steps.push('⚠️ Nitrogen is high — skip nitrogen fertilizers for 2–3 weeks and increase irrigation to leach excess.');
  if (result.phosphorus.status === 'deficient') steps.push('🟠 Add Single Superphosphate (SSP) or DAP at sowing — phosphorus is immobile, apply near root zone.');
  if (result.phosphorus.status === 'excess')    steps.push('⚠️ Excess phosphorus can lock out zinc & iron — avoid further P application this season.');
  if (result.potassium.status  === 'deficient') steps.push('🟣 Apply Muriate of Potash (MOP) at 10 kg/acre — potassium improves drought resistance and grain quality.');
  if (result.potassium.status  === 'excess')    steps.push('⚠️ High potassium may interfere with magnesium uptake — test for secondary nutrient deficiency.');
  if (inputs.soil_pH < 6.0)  steps.push('🧪 Soil is acidic (pH ' + inputs.soil_pH + ') — apply agricultural lime at 2–4 bags/acre to raise pH toward 6.5.');
  if (inputs.soil_pH > 7.5)  steps.push('🧪 Soil is alkaline (pH ' + inputs.soil_pH + ') — apply gypsum or elemental sulfur to lower pH gradually.');
  if (inputs.soil_conductivity > 0.7) steps.push('⚡ High EC (' + inputs.soil_conductivity + ' dS/m) indicates salt stress — flush field with 2–3 irrigations of clean water.');
  if (inputs.soil_humidity < 40)      steps.push('💧 Soil moisture is low (' + inputs.soil_humidity + '%) — irrigate immediately to prevent nutrient lockout.');
  if (inputs.soil_humidity > 85)      steps.push('💧 Waterlogged conditions (' + inputs.soil_humidity + '%) — improve drainage to prevent root rot and anaerobic conditions.');
  if (inputs.soil_temperature > 35)   steps.push('🌡️ Soil temperature is high (' + inputs.soil_temperature + '°C) — use mulching to reduce soil temperature by 3–5°C.');
  if (steps.length === 0) steps.push('✅ All soil parameters are within optimal range. Continue current management practices and monitor weekly.');
  return steps;
}

// ── Disease risk from soil conditions ────────────────────────────────────────
interface DiseaseRisk { name: string; risk: 'High' | 'Medium' | 'Low'; reason: string; action: string }

function getDiseaseRisks(result: NPKPrediction, inputs: SensorInputs): DiseaseRisk[] {
  const risks: DiseaseRisk[] = [];

  // Root rot — high moisture + low N
  if (inputs.soil_humidity > 80 && result.nitrogen.status === 'deficient')
    risks.push({ name: 'Root Rot', risk: 'High', reason: 'Waterlogged soil + low nitrogen weakens root immunity.', action: 'Improve drainage; apply Trichoderma bio-fungicide.' });
  else if (inputs.soil_humidity > 75)
    risks.push({ name: 'Root Rot', risk: 'Medium', reason: 'Elevated moisture increases fungal pressure.', action: 'Reduce irrigation frequency; check field drainage.' });

  // Powdery mildew — low humidity + high temp
  if (inputs.soil_temperature > 28 && inputs.soil_humidity < 50)
    risks.push({ name: 'Powdery Mildew', risk: 'High', reason: 'Warm dry conditions are ideal for powdery mildew spores.', action: 'Apply sulphur 80% WP spray; improve air circulation.' });
  else if (inputs.soil_temperature > 25 && inputs.soil_humidity < 60)
    risks.push({ name: 'Powdery Mildew', risk: 'Medium', reason: 'Moderate risk — monitor leaf surfaces weekly.', action: 'Preventive neem oil spray every 10 days.' });

  // Bacterial blight — high EC + high moisture
  if (inputs.soil_conductivity > 0.6 && inputs.soil_humidity > 70)
    risks.push({ name: 'Bacterial Blight', risk: 'High', reason: 'Salt stress + wet conditions create entry points for bacteria.', action: 'Apply copper oxychloride spray; reduce irrigation.' });

  // Fusarium wilt — acidic soil + high temp
  if (inputs.soil_pH < 6.0 && inputs.soil_temperature > 27)
    risks.push({ name: 'Fusarium Wilt', risk: 'High', reason: 'Acidic warm soil is a prime environment for Fusarium fungi.', action: 'Lime the soil; apply carbendazim 0.1% drench.' });
  else if (inputs.soil_pH < 6.5)
    risks.push({ name: 'Fusarium Wilt', risk: 'Medium', reason: 'Slightly acidic conditions favour Fusarium.', action: 'Monitor for wilting; apply lime to raise pH.' });

  // Nutrient deficiency disease — very low P
  if (result.phosphorus.status === 'deficient' && result.nitrogen.status === 'deficient')
    risks.push({ name: 'Chlorosis / Stunting', risk: 'High', reason: 'Both N and P deficient — plants will show yellowing and stunted growth.', action: 'Apply NPK 20-20-0 complex fertilizer immediately.' });

  // Alkaline-induced iron deficiency
  if (inputs.soil_pH > 7.8)
    risks.push({ name: 'Iron Deficiency Chlorosis', risk: 'Medium', reason: 'High pH locks out iron uptake causing interveinal yellowing.', action: 'Foliar spray of ferrous sulphate 0.5% solution.' });

  // If no risks
  if (risks.length === 0)
    risks.push({ name: 'No Significant Risk', risk: 'Low', reason: 'Soil conditions are within healthy parameters.', action: 'Continue regular monitoring every 7–10 days.' });

  return risks;
}

// ── Chatbot ───────────────────────────────────────────────────────────────────
function SoilChatbot({ inputs, result }: { inputs: SensorInputs; result: NPKPrediction }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([{
    id: '0', role: 'bot',
    text: `I've analysed your soil. N: ${result.nitrogen.value} mg/kg (${result.nitrogen.status}), P: ${result.phosphorus.value} mg/kg (${result.phosphorus.status}), K: ${result.potassium.value} mg/kg (${result.potassium.status}). Ask me anything about improving your soil or preventing disease.`,
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const context = `Soil: moisture ${inputs.soil_humidity}%, temp ${inputs.soil_temperature}°C, pH ${inputs.soil_pH}, EC ${inputs.soil_conductivity} dS/m. Predicted NPK — N: ${result.nitrogen.value} mg/kg (${result.nitrogen.status}), P: ${result.phosphorus.value} mg/kg (${result.phosphorus.status}), K: ${result.potassium.value} mg/kg (${result.potassium.status}).`;

  const send = async () => {
    const q = input.trim(); if (!q || loading) return;
    setMsgs(p => [...p, { id: Date.now().toString(), role: 'user', text: q }]);
    setInput(''); setLoading(true);
    try {
      const res = await fetch(`${CHAT_API}/query`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `${context} Question: ${q}`, soil_data: { ...inputs, nitrogen: result.nitrogen.value, phosphorus: result.phosphorus.value, potassium: result.potassium.value }, session_id: 'soil-chat' }),
      });
      const data = await res.json();
      setMsgs(p => [...p, { id: Date.now() + 'b', role: 'bot', text: data?.response ?? data?.message ?? data?.answer ?? 'Server responded but no text found.' }]);
    } catch {
      setMsgs(p => [...p, { id: Date.now() + 'e', role: 'bot', text: `Based on your readings: ${result.recommendation}` }]);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 400, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #f3f4f6', background: '#f0fdf4', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>🌱</span>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>Soil & NPK AI Advisor</div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#16a34a' }}>
          <div style={{ width: 6, height: 6, background: '#22c55e', borderRadius: '50%' }} /> Live
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {msgs.map(m => (
          <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '82%', padding: '8px 12px', borderRadius: m.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px', background: m.role === 'user' ? '#16a34a' : '#f9fafb', color: m.role === 'user' ? '#fff' : '#111827', fontSize: 12, lineHeight: 1.6, border: m.role === 'bot' ? '1px solid #e5e7eb' : 'none' }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 4, padding: '8px 12px', background: '#f9fafb', borderRadius: '12px 12px 12px 3px', width: 'fit-content', border: '1px solid #e5e7eb' }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, background: '#9ca3af', borderRadius: '50%', animation: `bounce 1s ${i*0.15}s infinite` }} />)}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: '8px 12px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask about your soil or disease risk…"
          className="soil-chat-input"
          style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, outline: 'none', background: '#ffffff', color: '#111827', caretColor: '#111827' }} />
        <button onClick={send} disabled={!input.trim() || loading}
          style={{ width: 34, height: 34, borderRadius: 8, background: input.trim() ? '#16a34a' : '#e5e7eb', border: 'none', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {loading ? <Loader2 size={13} color="#fff" style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} color={input.trim() ? '#fff' : '#9ca3af'} />}
        </button>
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export default function SoilNPKPanel() {
  const [inputs, setInputs] = useState<SensorInputs>(DEFAULTS);
  const [result, setResult] = useState<NPKPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [showChat, setShowChat] = useState(false);

  const set = (key: keyof SensorInputs, val: number) => setInputs(p => ({ ...p, [key]: val }));

  const runPrediction = () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const now = new Date();
      setResult(predictNPK(
        inputs.soil_conductivity, inputs.soil_humidity,
        inputs.soil_pH, inputs.soil_temperature,
        now.getHours(),
        Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000),
      ));
    } catch (e: any) { setError(e.message ?? 'Prediction failed.'); }
    finally { setLoading(false); }
  };

  const phSt = inputs.soil_pH < 6.0 ? { label: 'Acidic',   bg: '#fee2e2', color: '#b91c1c' }
    : inputs.soil_pH > 7.5           ? { label: 'Alkaline', bg: '#fef3c7', color: '#b45309' }
    :                                  { label: 'Optimal',  bg: '#dcfce7', color: '#15803d' };
  const ecSt = inputs.soil_conductivity > 0.7 ? { label: 'High',   bg: '#fee2e2', color: '#b91c1c' }
    : inputs.soil_conductivity < 0.2           ? { label: 'Low',    bg: '#fef3c7', color: '#b45309' }
    :                                            { label: 'Normal', bg: '#dcfce7', color: '#15803d' };

  const improvements = result ? getImprovementSteps(result, inputs) : [];
  const diseaseRisks = result ? getDiseaseRisks(result, inputs) : [];

  const RISK_STYLE = {
    High:   { bg: '#fee2e2', color: '#b91c1c', dot: '#ef4444' },
    Medium: { bg: '#fef3c7', color: '#b45309', dot: '#f59e0b' },
    Low:    { bg: '#dcfce7', color: '#15803d', dot: '#22c55e' },
  };

  return (
    <div className="fs-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .soil-slider{-webkit-appearance:none;appearance:none;height:4px;border-radius:2px;outline:none;cursor:pointer;}
        .soil-slider::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#16a34a;cursor:pointer;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.2);}
        .soil-chat-input::placeholder{color:#9ca3af!important;opacity:1;}
        .soil-chat-input{color:#111827!important;background:#ffffff!important;}
      `}</style>

      {/* ── 1. Sensor Inputs ── */}
      <div className="fs-card">
        <div className="fs-card-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Playfair Display,Georgia,serif', fontSize: 12, fontWeight: 700, color: '#374151' }}>
            <FlaskConical size={15} color="#16a34a" /> Sensor Readings
          </div>
          <span style={{ fontSize: 10, color: '#9ca3af' }}>Adjust manually · IoT auto-fill coming soon</span>
        </div>
        <div className="fs-card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          {SENSOR_CFG.map(s => {
            const val = inputs[s.key as keyof SensorInputs];
            const pct = ((val - s.min) / (s.max - s.min)) * 100;
            return (
              <div key={s.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16 }}>{s.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{s.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="number" value={val} min={s.min} max={s.max} step={s.step}
                      onChange={e => set(s.key as keyof SensorInputs, parseFloat(e.target.value) || 0)}
                      style={{ width: 70, padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, fontWeight: 700, color: '#111827', textAlign: 'right', outline: 'none' }} />
                    <span style={{ fontSize: 11, color: '#9ca3af', minWidth: 28 }}>{s.unit}</span>
                  </div>
                </div>
                <input type="range" min={s.min} max={s.max} step={s.step} value={val}
                  onChange={e => set(s.key as keyof SensorInputs, parseFloat(e.target.value))}
                  className="soil-slider"
                  style={{ width: '100%', background: `linear-gradient(90deg,${s.accent} ${pct}%,#e5e7eb ${pct}%)` }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#d1d5db', marginTop: 3 }}>
                  <span>{s.min}{s.unit}</span><span>{s.max}{s.unit}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: '0 16px 14px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: phSt.bg, color: phSt.color }}>pH {phSt.label}</span>
          <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: ecSt.bg, color: ecSt.color }}>EC {ecSt.label}</span>
          <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#f0fdf4', color: '#16a34a' }}>💧 {inputs.soil_humidity}%</span>
          <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#fff7ed', color: '#c2410c' }}>🌡 {inputs.soil_temperature}°C</span>
        </div>
        <div style={{ padding: '0 16px 16px' }}>
          <button onClick={runPrediction} disabled={loading}
            style={{ width: '100%', padding: '11px 0', borderRadius: 8, background: loading ? '#e5e7eb' : 'linear-gradient(135deg,#15803d,#16a34a)', color: loading ? '#9ca3af' : '#fff', border: 'none', cursor: loading ? 'default' : 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {loading ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Analysing…</> : '🔬 Analyse Soil & Predict NPK'}
          </button>
          {error && <div style={{ marginTop: 8, fontSize: 11, color: '#b91c1c', background: '#fee2e2', padding: '7px 10px', borderRadius: 6 }}>{error}</div>}
        </div>
      </div>

      {result && (<>

        {/* ── 2. NPK Results ── */}
        <div className="fs-card">
          <div className="fs-card-head">
            <div style={{ fontFamily: 'Playfair Display,Georgia,serif', fontSize: 12, fontWeight: 700, color: '#374151' }}>🧪 Predicted NPK Values</div>
            <span style={{ fontSize: 10, color: '#9ca3af' }}>{result.confidence}</span>
          </div>
          <div className="fs-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              {NPK_META.map(m => {
                const d  = result[m.key as keyof NPKPrediction] as { value: number; unit: string; status: string };
                const st = STATUS_STYLE[d.status] ?? STATUS_STYLE['adequate'];
                const barPct = Math.min(100, Math.max(0, ((d.value - 24) / 0.4) * 100));
                return (
                  <div key={m.key} style={{ borderRadius: 10, padding: '14px 16px', border: `1px solid ${m.border}`, background: m.bg }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontFamily: 'Playfair Display,Georgia,serif', fontSize: 28, fontWeight: 900, color: m.color, lineHeight: 1 }}>{m.letter}</div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: st.bg, color: st.color }}>{st.icon} {st.label}</span>
                    </div>
                    <div style={{ fontSize: 9, color: '#9ca3af', letterSpacing: '.6px', marginTop: 2 }}>{m.full}</div>
                    <div style={{ fontFamily: 'Playfair Display,Georgia,serif', fontSize: 32, fontWeight: 800, color: '#111827', marginTop: 10, lineHeight: 1 }}>{d.value}</div>
                    <div style={{ fontSize: 9, color: '#9ca3af', marginBottom: 10 }}>{d.unit}</div>
                    <div style={{ height: 4, borderRadius: 2, background: '#e5e7eb', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barPct}%`, background: m.color, borderRadius: 2, transition: 'width .6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── 3. Improvement Steps ── */}
        <div className="fs-card">
          <div className="fs-card-head">
            <div style={{ fontFamily: 'Playfair Display,Georgia,serif', fontSize: 12, fontWeight: 700, color: '#374151' }}>🌱 Steps to Improve Soil Quality</div>
            <span style={{ fontSize: 10, color: '#9ca3af' }}>{improvements.length} action{improvements.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="fs-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {improvements.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f3f4f6', fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
                <span style={{ fontFamily: 'Playfair Display,Georgia,serif', fontSize: 13, fontWeight: 700, color: '#16a34a', flexShrink: 0, minWidth: 20 }}>{i + 1}.</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 4. Disease Risk ── */}
        <div className="fs-card">
          <div className="fs-card-head">
            <div style={{ fontFamily: 'Playfair Display,Georgia,serif', fontSize: 12, fontWeight: 700, color: '#374151' }}>🦠 Disease Risk Assessment</div>
            <span style={{ fontSize: 10, color: '#9ca3af' }}>Based on NPK + soil conditions</span>
          </div>
          <div className="fs-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {diseaseRisks.map((d, i) => {
              const rs = RISK_STYLE[d.risk];
              return (
                <div key={i} style={{ borderRadius: 10, border: `1px solid ${rs.bg}`, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: rs.bg }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: rs.dot, flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: rs.color }}>{d.name}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: 'rgba(255,255,255,.6)', color: rs.color }}>{d.risk} Risk</span>
                  </div>
                  <div style={{ padding: '10px 14px', background: '#fff', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>📋 {d.reason}</div>
                    <div style={{ fontSize: 11, color: '#15803d', fontWeight: 600, lineHeight: 1.5 }}>💊 {d.action}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 5. Ask AI ── */}
        <button onClick={() => setShowChat(c => !c)}
          style={{ padding: '12px 0', borderRadius: 10, background: showChat ? '#f3f4f6' : '#f0fdf4', border: `1px solid ${showChat ? '#e5e7eb' : 'rgba(34,197,94,.3)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: showChat ? '#6b7280' : '#15803d' }}>
          {showChat ? <><X size={14} /> Close Soil Advisor</> : <><MessageCircle size={14} /> Have questions? Ask the Soil AI Advisor</>}
        </button>

        {showChat && <SoilChatbot inputs={inputs} result={result} />}

      </>)}
    </div>
  );
}
