/**
 * CalendarAlerts.tsx — Weather Panel
 * Powered by weather_agent.py via FastAPI localhost:8000
 * Endpoints: POST /weather/current  /weather/forecast  /weather/spray
 */
import { useState, useEffect, type FormEvent } from 'react';
import {
  Cloud, Droplet, Wind, Thermometer, Eye, Gauge,
  Loader2, RefreshCw, ShieldCheck, ShieldAlert, MapPin,
} from 'lucide-react';

const API = (import.meta as any).env?.VITE_SOIL_NPK_API_URL ?? 'http://localhost:8000';

// ── Types ─────────────────────────────────────────────────────────────────
interface CurrentWeather {
  location: string;
  temperature_c: number;
  feels_like_c?: number;
  humidity_pct: number;
  wind_speed_kmh: number;
  wind_direction?: string;
  condition: string;
  rain_expected: boolean;
  clouds_pct?: number;
  visibility_km?: number;
  pressure_hpa?: number;
  source: string;
  timestamp?: string;
  note?: string;
}

interface ForecastDay {
  date: string;
  day: string;
  temperature: { max_c: number; min_c: number; avg_c: number };
  humidity_pct: number;
  wind_speed_kmh: number;
  rainfall_mm: number;
  condition: string;
  farming_notes: string[];
}

interface SprayCheck {
  safe_to_spray: boolean;
  verdict: string;
  reasons: string[];
  best_time: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────
function conditionIcon(condition: string) {
  const c = condition.toLowerCase();
  if (c.includes('rain') || c.includes('drizzle')) return '🌧️';
  if (c.includes('thunder')) return '⛈️';
  if (c.includes('snow')) return '❄️';
  if (c.includes('cloud')) return '☁️';
  if (c.includes('mist') || c.includes('fog') || c.includes('haze')) return '🌫️';
  if (c.includes('clear') || c.includes('sunny')) return '☀️';
  return '🌤️';
}

function tempColor(t: number) {
  if (t >= 38) return '#b91c1c';
  if (t >= 32) return '#d97706';
  if (t <= 12) return '#1d4ed8';
  return '#15803d';
}

export default function CalendarAlerts() {
  const [location, setLocation]   = useState('');
  const [locInput, setLocInput]   = useState('');
  const [current, setCurrent]     = useState<CurrentWeather | null>(null);
  const [forecast, setForecast]   = useState<ForecastDay[]>([]);
  const [spray, setSpray]         = useState<SprayCheck | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    // Try browser geolocation first
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const loc = `${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`;
          setLocation(loc);
          loadAll(loc);
        },
        () => loadAll('India'), // fallback — weather_agent resolves to India centre
        { timeout: 5000 }
      );
    } else {
      loadAll('India');
    }
  }, []);

  const loadAll = async (loc: string) => {
    setLoading(true); setError('');
    try {
      const [curRes, fcRes, spRes] = await Promise.all([
        fetch(`${API}/weather/current`,  { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ location: loc }) }),
        fetch(`${API}/weather/forecast`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ location: loc, days: 5 }) }),
        fetch(`${API}/weather/spray`,    { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ location: loc }) }),
      ]);
      const [curData, fcData, spData] = await Promise.all([curRes.json(), fcRes.json(), spRes.json()]);
      setCurrent(curData);
      setForecast(fcData.forecast ?? []);
      setSpray(spData);
      if (curData.location) setLocation(curData.location);
    } catch {
      setError('Backend offline — start uvicorn to get live weather from weather_agent.py');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (locInput.trim()) { setLocation(locInput.trim()); loadAll(locInput.trim()); setLocInput(''); }
  };

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:300, gap:12, color:'#6b7280' }}>
      <Loader2 size={32} style={{ animation:'spin 1s linear infinite', color:'#3b82f6' }} />
      <div style={{ fontSize:13 }}>Loading weather from weather_agent.py…</div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* ── Location search ── */}
      <form onSubmit={handleSearch} style={{ display:'flex', gap:8 }}>
        <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, background:'#fff', border:'1.5px solid #e5e7eb', borderRadius:10, padding:'8px 12px' }}>
          <MapPin size={14} color="#9ca3af" />
          <input value={locInput} onChange={e => setLocInput(e.target.value)}
            placeholder={location ? `Current: ${location.includes(',') && !location.includes(' ') ? 'GPS coordinates' : location}` : 'Enter city or state…'}
            style={{ flex:1, border:'none', outline:'none', fontSize:13, color:'#374151', background:'transparent' }} />
        </div>
        <button type="submit" style={{ padding:'8px 16px', background:'#3b82f6', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer' }}>
          Search
        </button>
        <button type="button" onClick={() => loadAll(location)}
          style={{ padding:'8px 12px', background:'#f3f4f6', border:'1px solid #e5e7eb', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center' }}>
          <RefreshCw size={14} color="#6b7280" />
        </button>
      </form>

      {error && (
        <div style={{ background:'#fef3c7', border:'1px solid #fcd34d', borderRadius:10, padding:'12px 16px', fontSize:12, color:'#b45309' }}>
          ⚠️ {error}
        </div>
      )}

      {current && (
        <>
          {/* ── Current weather card ── */}
          <div style={{ background:'linear-gradient(135deg,#1d4ed8,#2563eb,#3b82f6)', borderRadius:16, padding:'24px', color:'#fff', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,.06)' }} />
            <div style={{ position:'absolute', bottom:-30, left:-30, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,.04)' }} />

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,.7)', marginBottom:4 }}>Today's Weather</div>
                <div style={{ fontSize:14, fontWeight:600, color:'#fff', display:'flex', alignItems:'center', gap:5 }}>
                  <MapPin size={13} /> {current.location}
                </div>
              </div>
              <div style={{ fontSize:52 }}>{conditionIcon(current.condition)}</div>
            </div>

            <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:6 }}>
              <span style={{ fontFamily:'Playfair Display,Georgia,serif', fontSize:56, fontWeight:800, lineHeight:1 }}>{Math.round(current.temperature_c)}°</span>
              <span style={{ fontSize:18, color:'rgba(255,255,255,.8)' }}>C</span>
            </div>
            <div style={{ fontSize:15, color:'rgba(255,255,255,.85)', marginBottom:20 }}>{current.condition}</div>
            {current.feels_like_c && (
              <div style={{ fontSize:12, color:'rgba(255,255,255,.6)', marginBottom:16 }}>Feels like {Math.round(current.feels_like_c)}°C</div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, paddingTop:16, borderTop:'1px solid rgba(255,255,255,.15)' }}>
              {[
                { icon:<Droplet size={14}/>,    label:'Humidity',   val:`${current.humidity_pct}%` },
                { icon:<Wind size={14}/>,        label:'Wind',       val:`${Math.round(current.wind_speed_kmh)} km/h${current.wind_direction ? ' ' + current.wind_direction : ''}` },
                { icon:<Cloud size={14}/>,       label:'Rain',       val: current.rain_expected ? 'Expected' : 'None' },
                { icon:<Eye size={14}/>,         label:'Visibility', val: current.visibility_km ? `${current.visibility_km} km` : '—' },
              ].map(s => (
                <div key={s.label} style={{ textAlign:'center' }}>
                  <div style={{ display:'flex', justifyContent:'center', marginBottom:4, color:'rgba(255,255,255,.7)' }}>{s.icon}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{s.val}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.55)', marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {current.note && (
              <div style={{ marginTop:14, fontSize:11, color:'rgba(255,255,255,.55)', fontStyle:'italic' }}>
                ℹ️ {current.note}
              </div>
            )}
            <div style={{ marginTop:6, fontSize:10, color:'rgba(255,255,255,.4)' }}>
              Source: {current.source}{current.timestamp ? ` · ${current.timestamp}` : ''}
            </div>
          </div>

          {/* ── Spray check ── */}
          {spray && (
            <div style={{ background: spray.safe_to_spray ? '#f0fdf4' : '#fff5f5', border:`1.5px solid ${spray.safe_to_spray ? '#86efac' : '#fca5a5'}`, borderRadius:12, padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                {spray.safe_to_spray ? <ShieldCheck size={18} color="#15803d" /> : <ShieldAlert size={18} color="#b91c1c" />}
                <div style={{ fontSize:13, fontWeight:700, color: spray.safe_to_spray ? '#15803d' : '#b91c1c' }}>
                  Spray Conditions: {spray.verdict}
                </div>
              </div>
              {spray.reasons.map((r, i) => (
                <div key={i} style={{ fontSize:12, color:'#374151', lineHeight:1.6, paddingLeft:26 }}>• {r}</div>
              ))}
              <div style={{ fontSize:11, color:'#6b7280', marginTop:6, paddingLeft:26 }}>⏰ {spray.best_time}</div>
            </div>
          )}

          {/* ── 5-day forecast ── */}
          {forecast.length > 0 && (
            <div className="fs-card">
              <div className="fs-card-head">
                <div style={{ fontFamily:'Playfair Display,Georgia,serif', fontSize:12, fontWeight:700, color:'#374151' }}>📅 5-Day Forecast</div>
                <span style={{ fontSize:10, color:'#9ca3af' }}>weather_agent.py · OpenWeatherMap</span>
              </div>
              <div className="fs-card-body" style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {forecast.map((d, i) => (
                  <div key={i} style={{ display:'grid', gridTemplateColumns:'80px 40px 1fr auto', gap:12, alignItems:'center', padding:'10px 0', borderBottom: i < forecast.length-1 ? '1px solid #f3f4f6' : 'none' }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:'#374151' }}>{i === 0 ? 'Today' : d.day}</div>
                      <div style={{ fontSize:10, color:'#9ca3af' }}>{d.date.slice(5)}</div>
                    </div>
                    <div style={{ fontSize:24, textAlign:'center' }}>{conditionIcon(d.condition)}</div>
                    <div>
                      <div style={{ fontSize:11, color:'#374151', lineHeight:1.5 }}>{d.condition}</div>
                      {d.farming_notes.slice(0,1).map((n,j) => (
                        <div key={j} style={{ fontSize:10, color:'#6b7280', lineHeight:1.4 }}>• {n}</div>
                      ))}
                      {d.rainfall_mm > 0 && (
                        <div style={{ fontSize:10, color:'#2563eb' }}>🌧 {d.rainfall_mm}mm rain</div>
                      )}
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:14, fontWeight:700, color: tempColor(d.temperature.max_c) }}>{Math.round(d.temperature.max_c)}°</div>
                      <div style={{ fontSize:11, color:'#9ca3af' }}>{Math.round(d.temperature.min_c)}°</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
