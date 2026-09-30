import React from 'react';
import { useState, useEffect, useRef } from 'react';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

// ── Phone Mockup State ────────────────────────
type PhoneScreen = 'home' | 'soil' | 'pest' | 'kit' | 'chat';

const soilNPK = [
  { label: 'Nitrogen (N)',    val: 'Low',    action: 'Add Urea 46%',    color: '#f59e0b', pct: 28 },
  { label: 'Phosphorus (P)', val: 'Normal', action: 'No action needed', color: '#4ade80', pct: 65 },
  { label: 'Potassium (K)',  val: 'Normal', action: 'No action needed', color: '#4ade80', pct: 70 },
];

const pestAlerts = [
  { crop: 'Wheat',   issue: 'Yellow Rust',        risk: 'High',   color: '#ef4444', icon: '🌾', advice: 'Apply Mancozeb 75% WP within 48 hrs' },
  { crop: 'Tomato',  issue: 'Whitefly Infestation',risk: 'Medium', color: '#f59e0b', icon: '🍅', advice: 'Use neem oil spray, 5ml per litre' },
  { crop: 'Mustard', issue: 'Aphids',              risk: 'Low',    color: '#4ade80', icon: '🌻', advice: 'Monitor, spray imidacloprid if spread' },
];

const kitStages = [
  { day: 'Day 1–3',   label: 'Seed Sown',         icon: '🌱', done: true  },
  { day: 'Day 4–7',   label: 'Germination',        icon: '🌿', done: true  },
  { day: 'Day 8–14',  label: 'Seedling Stage',     icon: '🪴', done: true  },
  { day: 'Day 15–21', label: 'Vegetative Growth',  icon: '🌳', done: false },
  { day: 'Day 22–30', label: 'Harvest Ready',      icon: '🎉', done: false },
];

const kitSensors = [
  { label: 'Water Level', value: '74%',  icon: '💧', color: '#38bdf8' },
  { label: 'Light (lux)', value: '3200', icon: '☀️', color: '#fbbf24' },
  { label: 'Humidity',    value: '68%',  icon: '🌫️', color: '#a78bfa' },
  { label: 'Temp',        value: '27°C', icon: '🌡️', color: '#f97316' },
];

const chatSuggestions = [
  'Wheat pattiyan peeli ho rahi hain',
  'Kaunsi fertilizer use karein?',
  'Meri mitti ka pH kaisa hai?',
  'Pest control ke upay batao',
];

const aiResponses: Record<string, { role: string; text: string; tag?: string; tagColor?: string }[]> = {
  default: [{ role: 'ai', text: 'Aapki problem samajh aa gayi. Kripya thoda aur detail batayein — kaun sa crop aur kab se problem shuru hui?', tag: 'Analyzing', tagColor: '#38bdf8' }],
  'Wheat pattiyan peeli ho rahi hain': [
    { role: 'ai', text: 'Yeh Nitrogen (N) ki kami ke sanket hain. Field B mein NPK sensor bhi low N indicate kar raha hai.', tag: 'Nitrogen Deficiency', tagColor: '#f59e0b' },
    { role: 'ai', text: 'Urvaan se Urea 46% mangwaayein — 25–30 kg per bigha. Subah ke waqt daalein jab mitti geeli ho.', tag: 'Dosage Advice', tagColor: '#22c55e' },
  ],
  'Kaunsi fertilizer use karein?': [
    { role: 'ai', text: 'Aapki soil report ke hisaab se: Nitrogen low hai. DAP ya Urea use karein. Phosphorus aur Potassium normal hain.', tag: 'Fertilizer Plan', tagColor: '#4ade80' },
  ],
  'Meri mitti ka pH kaisa hai?': [
    { role: 'ai', text: 'Aapka current soil pH 6.8 hai — yeh wheat aur mustard ke liye bilkul optimal range mein hai.', tag: 'pH Report', tagColor: '#a78bfa' },
  ],
  'Pest control ke upay batao': [
    { role: 'ai', text: 'Wheat mein Yellow Rust ka risk high hai. Abhi Mancozeb 75% WP spray karein. Tomato mein whitefly ke liye neem oil solution use karein.', tag: 'Pest Advisory', tagColor: '#ef4444' },
  ],
};

// ── Counter Hook ──────────────────────────────
function useCounter(target: number, duration: number, active: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [active, target, duration]);
  return count;
}

// ── Phone Mockup Component ────────────────────
function PhoneMockup() {
  const [screen, setScreen] = useState<PhoneScreen>('home');
  const [soilTab, setSoilTab] = useState<'live' | 'npk'>('live');
  const [pestSelected, setPestSelected] = useState<number | null>(null);
  const [chatHistory, setChatHistory] = useState<{ role: string; text: string; tag?: string; tagColor?: string }[]>([]);
  const [typing, setTyping] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [chatHistory, typing]);

  const handleChatSuggest = (text: string) => {
    if (typing) return;
    setChatHistory(h => [...h, { role: 'farmer', text }]);
    setTyping(true);
    const replies = aiResponses[text] || aiResponses.default;
    replies.forEach((r, i) => {
      setTimeout(() => {
        if (i === replies.length - 1) setTyping(false);
        setChatHistory(h => [...h, r]);
      }, 900 * (i + 1));
    });
  };

  const navItems: { id: PhoneScreen; icon: string; label: string }[] = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'soil', icon: '🧪', label: 'Soil' },
    { id: 'pest', icon: '🐛', label: 'Pests' },
    { id: 'kit',  icon: '🌱', label: 'My Kit' },
    { id: 'chat', icon: '🤖', label: 'AI' },
  ];

  const s: React.CSSProperties = { boxSizing: 'border-box' };

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Ambient glows */}
      <div style={{ position: 'absolute', top: 30, right: 10, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(74,222,128,0.15) 0%,transparent 70%)', filter: 'blur(28px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 40, left: 5, width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle,rgba(56,189,248,0.1) 0%,transparent 70%)', filter: 'blur(22px)', pointerEvents: 'none' }} />

      {/* Phone frame */}
      <div style={{ width: 260, height: 540, background: 'linear-gradient(160deg,#1a2e1a 0%,#0f1f0f 100%)', borderRadius: 40, border: '2px solid rgba(74,222,128,0.25)', boxShadow: '0 28px 70px rgba(0,0,0,0.55),0 0 0 6px rgba(255,255,255,0.03),inset 0 1px 0 rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        {/* Notch */}
        <div style={{ width: 80, height: 22, background: '#0a130a', borderRadius: '0 0 18px 18px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ width: 8, height: 8, background: '#1e3a1e', borderRadius: '50%', border: '1px solid rgba(74,222,128,0.3)' }} />
        </div>
        {/* Status bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 14px 5px', flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#e2e8f0' }}>10:42</span>
          <div style={{ display: 'flex', gap: 4, fontSize: 8, color: '#94a3b8' }}><span>▊▊▊</span><span>WiFi</span><span>🔋</span></div>
        </div>

        {/* Screen content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {screen === 'home' && <HomeScreen onNav={setScreen} />}
          {screen === 'soil' && <SoilScreen soilTab={soilTab} onTabChange={setSoilTab} onNav={setScreen} />}
          {screen === 'pest' && <PestScreen pestSelected={pestSelected} onSelect={setPestSelected} onNav={setScreen} />}
          {screen === 'kit'  && <KitScreen onNav={setScreen} />}
          {screen === 'chat' && (
            <ChatScreen
              chatHistory={chatHistory}
              typing={typing}
              onSuggest={handleChatSuggest}
              messagesRef={messagesRef}
              onNav={setScreen}
            />
          )}
        </div>

        {/* Bottom nav */}
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '6px 4px 8px', background: '#0a150a', borderTop: '1px solid rgba(74,222,128,0.15)', flexShrink: 0 }}>
          {navItems.map(n => {
            const active = n.id === screen;
            return (
              <button key={n.id} onClick={() => setScreen(n.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: active ? 'rgba(74,222,128,0.12)' : 'none', border: 'none', padding: '4px 8px', borderRadius: 10, cursor: 'pointer' }}>
                <span style={{ fontSize: 16 }}>{n.icon}</span>
                <span style={{ fontSize: 8, fontWeight: 600, color: active ? '#4ade80' : '#64748b' }}>{n.label}</span>
              </button>
            );
          })}
        </div>

        {/* Home bar */}
        <div style={{ width: 76, height: 3, background: 'rgba(255,255,255,0.18)', borderRadius: 10, margin: '5px auto 7px', flexShrink: 0 }} />
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', textAlign: 'center', color: 'rgba(74,222,128,0.65)' }}>Smart Farming Dashboard</div>
    </div>
  );
}

// ── Phone Sub-screens ─────────────────────────
function HomeScreen({ onNav }: { onNav: (s: PhoneScreen) => void }) {
  const alerts = [
    { icon: '💧', text: 'Irrigate by 6 AM tomorrow',    color: '#38bdf8', time: '2h ago' },
    { icon: '🌡️', text: '35°C heat wave — cover crops', color: '#f97316', time: '4h ago' },
    { icon: '⚠️', text: 'Nitrogen low in Field B',       color: '#f59e0b', time: '1d ago' },
  ];
  const stats = [
    { icon: '💧', label: 'Moisture', val: '62%',   sub: 'Field A',      color: '#38bdf8', nav: 'soil' as PhoneScreen },
    { icon: '🧪', label: 'Nitrogen', val: 'Low',   sub: 'Add Urea',     color: '#f59e0b', nav: 'soil' as PhoneScreen },
    { icon: '🌾', label: 'Crop',     val: 'Wheat', sub: 'Day 22 of 90', color: '#4ade80', nav: 'home' as PhoneScreen },
    { icon: '🌱', label: 'Kit Plant',val: 'Day 14',sub: 'On track',     color: '#a78bfa', nav: 'kit'  as PhoneScreen },
  ];
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>Namaste, Ramesh Ji 👋</div>
          <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>Thursday, 26 March · India</div>
        </div>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#4ade80,#166534)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff' }}>R</div>
      </div>
      <div style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 12, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>35°C ☀️</div>
          <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>Clear · Low humidity</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#4ade80' }}>Good day to irrigate</div>
          <div style={{ fontSize: 8, color: '#64748b', marginTop: 2 }}>Rain in 3 days</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
        {stats.map(s => (
          <div key={s.label} onClick={() => onNav(s.nav)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: `3px solid ${s.color}`, borderRadius: 10, padding: '9px 10px', cursor: 'pointer' }}>
            <div style={{ fontSize: 14 }}>{s.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', marginTop: 4 }}>{s.val}</div>
            <div style={{ fontSize: 8, color: '#64748b', marginTop: 1 }}>{s.label} · {s.sub}</div>
          </div>
        ))}
      </div>
      <div>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 6 }}>Recent Alerts</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {alerts.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 9, padding: '7px 9px' }}>
              <span style={{ fontSize: 14 }}>{a.icon}</span>
              <div style={{ flex: 1, fontSize: 10, color: '#e2e8f0' }}>{a.text}</div>
              <span style={{ fontSize: 8, color: '#64748b' }}>{a.time}</span>
            </div>
          ))}
        </div>
      </div>
      <div onClick={() => onNav('chat')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(90deg,rgba(74,222,128,0.1),rgba(56,189,248,0.07))', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 12, padding: '10px 13px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#4ade80' }}>Ask MannMitra AI…</span>
        </div>
        <span style={{ fontSize: 14, color: '#4ade80' }}>→</span>
      </div>
    </div>
  );
}

function SoilScreen({ soilTab, onTabChange, onNav }: { soilTab: 'live' | 'npk'; onTabChange: (t: 'live' | 'npk') => void; onNav: (s: PhoneScreen) => void }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>Soil Monitor</div>
        <div style={{ fontSize: 9, color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', padding: '3px 8px', borderRadius: 20 }}>● Live</div>
      </div>
      <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 3 }}>
        {(['live', 'npk'] as const).map(t => (
          <button key={t} onClick={() => onTabChange(t)} style={{ flex: 1, padding: 5, borderRadius: 8, border: 'none', fontSize: 10, fontWeight: 600, background: soilTab === t ? 'rgba(74,222,128,0.2)' : 'transparent', color: soilTab === t ? '#4ade80' : '#64748b', cursor: 'pointer' }}>
            {t === 'live' ? '📡 Live Feed' : '🧪 NPK Analysis'}
          </button>
        ))}
      </div>
      {soilTab === 'live' ? (
        <>
          <div style={{ background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>💧 Soil Moisture</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#38bdf8' }}>62%</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ width: '62%', height: '100%', background: 'linear-gradient(90deg,#38bdf8,#0ea5e9)', borderRadius: 10 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 8, color: '#64748b' }}>Dry (0%)</span>
              <span style={{ fontSize: 8, color: '#4ade80' }}>Optimal: 55–70%</span>
              <span style={{ fontSize: 8, color: '#64748b' }}>Wet (100%)</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
            {[{ icon: '📊', label: 'Soil pH', val: '6.8', note: 'Optimal', color: '#a78bfa' }, { icon: '🌡️', label: 'Soil Temp', val: '24°C', note: 'Normal', color: '#f97316' }].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: 18 }}>{s.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.val}</div>
                <div style={{ fontSize: 8, color: '#64748b', marginTop: 2 }}>{s.label}</div>
                <div style={{ fontSize: 8, color: '#4ade80', marginTop: 1 }}>{s.note}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', fontSize: 9, color: '#475569' }}>Last synced: 2 mins ago · Sensor ID: FS-B04</div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {soilNPK.map(n => (
              <div key={n.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>🧪 {n.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: n.color, background: `${n.color}18`, padding: '2px 8px', borderRadius: 20 }}>{n.val}</span>
                </div>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden', marginBottom: 5 }}>
                  <div style={{ width: `${n.pct}%`, height: '100%', background: n.color, borderRadius: 10 }} />
                </div>
                <div style={{ fontSize: 9, color: '#64748b' }}>Recommendation: {n.action}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 10, padding: '9px 11px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🛒</span>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#e2e8f0' }}>Order via Urvaan</div>
              <div style={{ fontSize: 9, color: '#64748b' }}>Urea 46% · 50 kg bag · ₹320</div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#4ade80' }}>→</div>
          </div>
        </>
      )}
    </div>
  );
}

function PestScreen({ pestSelected, onSelect, onNav }: { pestSelected: number | null; onSelect: (i: number | null) => void; onNav: (s: PhoneScreen) => void }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>Pest & Disease</div>
        <div style={{ fontSize: 9, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', padding: '3px 8px', borderRadius: 20 }}>1 High Risk</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(74,222,128,0.08)', border: '1.5px dashed rgba(74,222,128,0.3)', borderRadius: 12, padding: 14, cursor: 'pointer' }}>
        <span style={{ fontSize: 20 }}>📷</span>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#4ade80' }}>Scan Crop Leaf</div>
          <div style={{ fontSize: 9, color: '#64748b' }}>AI detects pest / disease instantly</div>
        </div>
      </div>
      <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', letterSpacing: '.05em', textTransform: 'uppercase' }}>Detected Issues</div>
      {pestAlerts.map((p, i) => (
        <div key={i} onClick={() => onSelect(pestSelected === i ? null : i)} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${pestSelected === i ? p.color + '55' : 'rgba(255,255,255,0.07)'}`, borderLeft: `3px solid ${p.color}`, borderRadius: 10, padding: '10px 11px', cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 16 }}>{p.icon}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>{p.crop}</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>{p.issue}</div>
              </div>
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, color: p.color, background: `${p.color}18`, padding: '2px 7px', borderRadius: 20 }}>{p.risk}</span>
          </div>
          {pestSelected === i && (
            <div style={{ marginTop: 9, paddingTop: 9, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>AI ADVICE</div>
              <div style={{ fontSize: 10, color: '#e2e8f0', lineHeight: 1.5 }}>{p.advice}</div>
              <div onClick={e => { e.stopPropagation(); onNav('chat'); }} style={{ display: 'inline-block', marginTop: 7, fontSize: 9, fontWeight: 700, color: '#4ade80', background: 'rgba(74,222,128,0.1)', padding: '4px 10px', borderRadius: 20 }}>Ask MannMitra AI →</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function KitScreen({ onNav }: { onNav: (s: PhoneScreen) => void }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>In-House Plant Kit</div>
        <div style={{ fontSize: 9, color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', padding: '3px 8px', borderRadius: 20 }}>Day 14</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {kitSensors.map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '9px 10px' }}>
            <div style={{ fontSize: 13 }}>{s.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: s.color, marginTop: 3 }}>{s.value}</div>
            <div style={{ fontSize: 8, color: '#64748b', marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', letterSpacing: '.05em', textTransform: 'uppercase' }}>Growth Timeline</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {kitStages.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, background: s.done ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.04)', border: s.done ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(255,255,255,0.1)', opacity: s.done ? 1 : 0.5 }}>
              {s.done ? '✓' : s.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: s.done ? '#e2e8f0' : '#64748b' }}>{s.label}</div>
              <div style={{ fontSize: 8, color: '#475569' }}>{s.day}</div>
            </div>
            {i === 2 && <div style={{ fontSize: 8, fontWeight: 700, color: '#4ade80', background: 'rgba(74,222,128,0.1)', padding: '2px 7px', borderRadius: 20 }}>You are here</div>}
          </div>
        ))}
      </div>
      <div style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 12, padding: '10px 13px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#4ade80', marginBottom: 3 }}>💰 Income Estimate</div>
        <div style={{ fontSize: 9, color: '#94a3b8' }}>This batch: ~₹480 (3 plants × ₹160 avg market rate)</div>
        <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>Next harvest in 16 days</div>
      </div>
    </div>
  );
}

function ChatScreen({ chatHistory, typing, onSuggest, messagesRef, onNav }: {
  chatHistory: { role: string; text: string; tag?: string; tagColor?: string }[];
  typing: boolean;
  onSuggest: (t: string) => void;
  messagesRef: React.RefObject<HTMLDivElement | null>;
  onNav: (s: PhoneScreen) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px', background: 'rgba(74,222,128,0.06)', borderBottom: '1px solid rgba(74,222,128,0.12)', flexShrink: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(74,222,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, border: '1px solid rgba(74,222,128,0.3)' }}>🤖</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>MannMitra AI</div>
          <div style={{ fontSize: 9, color: '#4ade80', marginTop: 1 }}>● Online · Hindi / English</div>
        </div>
      </div>
      <div ref={messagesRef} style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {chatHistory.length === 0 && (
          <>
            <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>🌾</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', marginBottom: 3 }}>MannMitra AI</div>
              <div style={{ fontSize: 10, color: '#64748b' }}>Apni khet ki koi bhi samasya poochein</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {chatSuggestions.map(s => (
                <button key={s} onClick={() => onSuggest(s)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 11px', textAlign: 'left', color: '#94a3b8', fontSize: 10, fontWeight: 500, cursor: 'pointer' }}>{s}</button>
              ))}
            </div>
          </>
        )}
        {chatHistory.map((m, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-end', gap: 5, justifyContent: m.role === 'farmer' ? 'flex-end' : 'flex-start' }}>
            {m.role === 'ai' && <div style={{ fontSize: 14, flexShrink: 0, marginBottom: 2 }}>🤖</div>}
            <div style={{ maxWidth: '80%' }}>
              {m.tag && <div style={{ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 20, marginBottom: 3, display: 'inline-block', letterSpacing: '.04em', background: `${m.tagColor}22`, color: m.tagColor }}>{m.tag}</div>}
              <div style={{ fontSize: 10, lineHeight: 1.55, padding: '8px 11px', borderRadius: 13, wordBreak: 'break-word', ...(m.role === 'farmer' ? { background: 'linear-gradient(135deg,#166534,#14532d)', color: '#dcfce7', borderBottomRightRadius: 3 } : { background: 'rgba(255,255,255,0.07)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)', borderBottomLeftRadius: 3 }) }}>{m.text}</div>
            </div>
          </div>
        ))}
        {typing && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5 }}>
            <div style={{ fontSize: 14 }}>🤖</div>
            <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 13, borderBottomLeftRadius: 3, padding: '10px 14px', display: 'flex', gap: 3, alignItems: 'center' }}>
              {[0, 0.2, 0.4].map((d, i) => <span key={i} style={{ fontSize: 11, color: '#4ade80', animation: `pmBounce 1s ${d}s infinite` }}>●</span>)}
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: '7px 10px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        {chatHistory.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 6, overflowX: 'auto' }}>
            {chatSuggestions.slice(0, 3).map(s => (
              <button key={s} onClick={() => onSuggest(s)} style={{ flexShrink: 0, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 20, padding: '4px 9px', fontSize: 8, color: '#4ade80', whiteSpace: 'nowrap', cursor: 'pointer' }}>{s}</button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '7px 12px', fontSize: 9, color: '#475569' }}>Apni fasal ki samasya likhein…</div>
          <button onClick={() => onSuggest(chatSuggestions[0])} style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#4ade80,#166534)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 800, boxShadow: '0 2px 10px rgba(74,222,128,0.35)', cursor: 'pointer' }}>↑</button>
        </div>
      </div>
    </div>
  );
}

// ── Scroll Reveal Hook ────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('fs-visible'); }),
      { threshold: 0.15 }
    );
    document.querySelectorAll('.fs-reveal, .fs-stagger > *').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ── Stats Section ─────────────────────────────
function StatCounter({ target, suffix = '', active }: { target: number; suffix?: string; active: boolean }) {
  const count = useCounter(target, 1800, active);
  return <span>{count}{suffix}</span>;
}

// ── Main Landing Page ─────────────────────────
export default function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  useScrollReveal();
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [statsActive, setStatsActive] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const sectionIds = ['hero', 'how', 'features', 'stats', 'school', 'footer'];
    const observer = new IntersectionObserver(
      entries => {
        // Find the entry closest to the top of the viewport
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveSection(visible[0].target.id);
      },
      { threshold: 0, rootMargin: '-60px 0px -50% 0px' }
    );
    sectionIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsActive(true); }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const t = (key: string) => {
    const en: Record<string, string> = {
      'hero.title': 'Smart Farming Starts Here',
      'hero.subtitle': 'Real-time soil monitoring, AI-powered crop advice, and a marketplace — all in one platform built for Indian farmers.',
      'hero.cta': 'Get Started Free',
      'hero.cta2': 'Watch Demo',
      'hero.proof': 'Trusted by farmers across India',
      'features.title': 'Everything a Modern Farmer Needs',
      'stats.farmers': '500+',
      'stats.farmers.label': 'Farmers Onboarded',
      'stats.districts.label': 'Districts Covered',
      'stats.accuracy.label': 'AI Accuracy',
      'testimonials.title': 'Farmers Love Fasal Setu',
      'school.title': 'Empowering the Next Generation',
      'school.subtitle': 'Our school drive brings smart agriculture education to rural students',
      'school.cta': 'Learn About Our Mission',
      'footer.tagline': 'Bridging the gap between technology and the Indian farmer.',
      'nav.login': 'Login',
      'nav.logout': 'Logout',
    };
    const hi: Record<string, string> = {
      'hero.title': 'स्मार्ट खेती यहाँ से शुरू होती है',
      'hero.subtitle': 'रियल-टाइम मिट्टी निगरानी, AI फसल सलाह, और मार्केटप्लेस — सब एक जगह।',
      'hero.cta': 'मुफ्त शुरू करें',
      'hero.cta2': 'डेमो देखें',
      'hero.proof': 'भारत भर के किसानों का भरोसा',
      'features.title': 'आधुनिक किसान की हर जरूरत',
      'stats.farmers': '500+',
      'stats.farmers.label': 'किसान जुड़े',
      'stats.districts.label': 'जिले कवर',
      'stats.accuracy.label': 'AI सटीकता',
      'testimonials.title': 'किसान फसल सेतु से प्यार करते हैं',
      'school.title': 'अगली पीढ़ी को सशक्त बनाना',
      'school.subtitle': 'हमारा स्कूल अभियान ग्रामीण छात्रों को स्मार्ट कृषि शिक्षा देता है',
      'school.cta': 'हमारे मिशन के बारे में जानें',
      'footer.tagline': 'तकनीक और भारतीय किसान के बीच की खाई पाटना।',
      'nav.login': 'लॉगिन',
      'nav.logout': 'लॉगआउट',
    };
    return (lang === 'hi' ? hi[key] : en[key]) ?? key;
  };

  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: lang === 'hi' ? 'होम' : 'Home',        href: '#hero',    id: 'hero'    },
    { label: lang === 'hi' ? 'तकनीक' : 'Technology', href: '#how',     id: 'how'     },
    { label: lang === 'hi' ? 'सेवाएं' : 'Services',  href: '#features',id: 'features'},
    { label: lang === 'hi' ? 'संसाधन' : 'Resources', href: '#stats',   id: 'stats'   },
    { label: lang === 'hi' ? 'हमारे बारे में' : 'About Us', href: '#school', id: 'school' },
    { label: lang === 'hi' ? 'संपर्क' : 'Contact',   href: '#footer',  id: 'footer'  },
  ];

  const navColor = scrolled ? 'var(--gray-700)' : 'rgba(255,255,255,0.85)';
  const navHover = scrolled ? 'var(--green-700)' : 'var(--white)';

  const marqueeItems = ['🌱 Real-time Soil Monitoring','🤖 AI Crop Advisor','📊 NPK Analytics','🛒 Agri Marketplace','🏫 School Drive Program','🌦️ Weather Integration','📱 Mobile-First Design','🔔 Smart Alerts'];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');
        :root {
          --green-950:#052e16;--green-900:#14532d;--green-800:#166534;--green-700:#15803d;
          --green-600:#16a34a;--green-500:#22c55e;--green-400:#4ade80;--green-300:#86efac;
          --green-200:#bbf7d0;--green-100:#dcfce7;--green-50:#f0fdf4;
          --amber-600:#d97706;--amber-500:#f59e0b;--amber-400:#fbbf24;
          --white:#ffffff;--gray-50:#f9fafb;--gray-100:#f3f4f6;--gray-200:#e5e7eb;
          --gray-500:#6b7280;--gray-700:#374151;--gray-900:#111827;
          --font-display:'Playfair Display',Georgia,serif;
          --font-body:'Crimson Pro',Georgia,serif;
          --radius-full:9999px;--ease:cubic-bezier(0.4,0,0.2,1);
        }
        .fs-reveal { opacity:0; transform:translateY(24px); transition:opacity 0.6s var(--ease),transform 0.6s var(--ease); }
        .fs-reveal.fs-visible { opacity:1; transform:translateY(0); }
        .fs-stagger > * { opacity:0; transform:translateY(24px); transition:opacity 0.6s var(--ease),transform 0.6s var(--ease); }
        .fs-stagger > *.fs-visible { opacity:1; transform:translateY(0); }
        .fs-stagger > *:nth-child(1){transition-delay:0ms}
        .fs-stagger > *:nth-child(2){transition-delay:100ms}
        .fs-stagger > *:nth-child(3){transition-delay:200ms}
        .fs-stagger > *:nth-child(4){transition-delay:300ms}
        .fs-stagger > *:nth-child(5){transition-delay:400ms}
        .fs-stagger > *:nth-child(6){transition-delay:500ms}
        @keyframes fsMarquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .fs-marquee { animation:fsMarquee 20s linear infinite; }
        @keyframes fsPhoneFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        .fs-phone-float { animation:fsPhoneFloat 3s ease-in-out infinite; }
        @keyframes fsFadeInUp { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
        .fs-fade-in-up { animation:fsFadeInUp 0.7s var(--ease) forwards; }
        .fs-fade-in-up-delay { animation:fsFadeInUp 0.7s 0.2s var(--ease) both; }
        @keyframes pmBounce { 0%,100%{transform:translateY(0);opacity:.4} 50%{transform:translateY(-4px);opacity:1} }
        .fs-btn { display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 28px;border-radius:var(--radius-full);font-family:var(--font-body);font-size:16px;font-weight:600;cursor:pointer;border:none;transition:200ms var(--ease);text-decoration:none;white-space:nowrap;min-height:52px; }
        .fs-btn-primary { background:var(--green-500);color:var(--green-950); }
        .fs-btn-primary:hover { background:var(--green-400);transform:translateY(-1px); }
        .fs-btn-outline { background:transparent;border:2px solid rgba(255,255,255,0.3);color:var(--white); }
        .fs-btn-outline:hover { background:rgba(255,255,255,0.1); }
        .fs-card { background:var(--white);border-radius:16px;padding:28px;box-shadow:0 1px 3px rgba(0,0,0,0.1);border:1px solid var(--gray-100); }
        html { scroll-behavior: smooth; }
        .fs-navbar { position:fixed;top:0;left:0;right:0;z-index:100;transition:background 300ms var(--ease),box-shadow 300ms var(--ease); }
        .fs-navbar.scrolled { background:rgba(255,255,255,0.97);backdrop-filter:blur(16px);box-shadow:0 1px 12px rgba(0,0,0,0.08); }
        .fs-nav-link { font-size:14px;font-weight:500;text-decoration:none;padding:6px 2px;position:relative;transition:color 200ms; }
        .fs-nav-link::after { content:'';position:absolute;bottom:-2px;left:0;right:0;height:2px;background:var(--green-400);border-radius:2px;transform:scaleX(0);transition:transform 250ms var(--ease); }
        .fs-nav-link:hover::after, .fs-nav-link.active::after { transform:scaleX(1); }
        .fs-nav-link.active { color:var(--green-400) !important; }
        .fs-hamburger { display:none;flex-direction:column;gap:5px;background:none;border:none;cursor:pointer;padding:4px; }
        .fs-hamburger span { display:block;width:22px;height:2px;border-radius:2px;transition:all 250ms; }
        .fs-mobile-menu { display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:99;flex-direction:column;padding:80px 24px 32px; }
        .fs-mobile-menu.open { display:flex; }
        @media(max-width:767px){
          .fs-hero-grid{grid-template-columns:1fr!important;}
          .fs-phone-col{display:none!important;}
          .fs-navbar-inner{padding:12px 16px!important;}
          .fs-nav-links{display:none!important;}
          .fs-hamburger{display:flex!important;}
        }
      `}</style>

      <div style={{ fontFamily: 'var(--font-body)', color: 'var(--gray-900)', background: 'var(--white)' }}>

        {/* Navbar */}
        <nav className={`fs-navbar${scrolled ? ' scrolled' : ''}`}>
          <div className="fs-navbar-inner" style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 40 }}>

            {/* Logo */}
            <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
              <span style={{ fontSize: 22 }}>🌾</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: scrolled ? 'var(--green-700)' : 'var(--white)', letterSpacing: '-0.01em' }}>Fasal Setu</span>
            </a>

            {/* Spacer — pushes everything right */}
            <div style={{ flex: 1 }} />

            {/* Nav links */}
            <div className="fs-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
              {navLinks.map(link => {
                const isActive = activeSection === link.id;
                const color = isActive ? 'var(--green-400)' : navColor;
                return (
                  <a key={link.label} href={link.href}
                    className={`fs-nav-link${isActive ? ' active' : ''}`}
                    style={{ color, fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: isActive ? 600 : 500 }}
                    onClick={e => {
                      e.preventDefault();
                      document.getElementById(link.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = navHover; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = navColor; }}>
                    {link.label}
                  </a>
                );
              })}
            </div>

            {/* Right: Login + Sign Up */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <button onClick={onLogin}
                style={{ background: 'transparent', border: `1.5px solid ${scrolled ? 'var(--green-600)' : 'rgba(255,255,255,0.6)'}`, color: scrolled ? 'var(--green-700)' : 'var(--white)', borderRadius: 'var(--radius-full)', padding: '7px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                {t('nav.login')}
              </button>
              <button onClick={onGetStarted}
                style={{ background: 'var(--green-500)', color: '#fff', border: 'none', borderRadius: 'var(--radius-full)', padding: '8px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', boxShadow: scrolled ? 'none' : '0 0 16px rgba(74,222,128,0.25)' }}>
                Sign Up
              </button>

              {/* Hamburger (mobile only) */}
              <button className="fs-hamburger" onClick={() => setMobileOpen(o => !o)} aria-label="Menu">
                <span style={{ background: scrolled ? 'var(--gray-700)' : 'var(--white)', transform: mobileOpen ? 'rotate(45deg) translate(5px,5px)' : 'none' }} />
                <span style={{ background: scrolled ? 'var(--gray-700)' : 'var(--white)', opacity: mobileOpen ? 0 : 1 }} />
                <span style={{ background: scrolled ? 'var(--gray-700)' : 'var(--white)', transform: mobileOpen ? 'rotate(-45deg) translate(5px,-5px)' : 'none' }} />
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile menu overlay */}
        <div className={`fs-mobile-menu${mobileOpen ? ' open' : ''}`}
          style={{ background: 'rgba(5,46,22,0.97)', backdropFilter: 'blur(16px)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {navLinks.map(link => (
              <a key={link.label} href={link.href} onClick={() => setMobileOpen(false)}
                style={{ color: 'var(--green-200)', fontSize: 20, fontWeight: 600, textDecoration: 'none', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {link.label}
              </a>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            <button onClick={() => { setMobileOpen(false); onLogin(); }}
              style={{ flex: 1, background: 'transparent', border: '1.5px solid rgba(255,255,255,0.4)', color: 'var(--white)', borderRadius: 'var(--radius-full)', padding: '12px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              {t('nav.login')}
            </button>
            <button onClick={() => { setMobileOpen(false); onGetStarted(); }}
              style={{ flex: 1, background: 'var(--green-500)', border: 'none', color: 'var(--green-950)', borderRadius: 'var(--radius-full)', padding: '12px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Sign Up
            </button>
          </div>
        </div>

        {/* Hero */}
        <section id="hero" style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 60% 40%,var(--green-800) 0%,var(--green-950) 60%,#020d07 100%)', display: 'flex', alignItems: 'center', padding: '120px 24px 80px', position: 'relative', overflow: 'hidden' }}>
          <div className="fs-hero-grid" style={{ maxWidth: 1200, margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
            <div className="fs-fade-in-up">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 'var(--radius-full)', padding: '6px 16px', marginBottom: 24 }}>
                <span>🌾</span>
                <span style={{ color: 'var(--green-300)', fontSize: 13, fontWeight: 600 }}>AI-Powered Smart Agriculture</span>
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(36px,5vw,68px)', fontWeight: 700, color: 'var(--white)', lineHeight: 1.1, letterSpacing: '-0.01em', marginBottom: 24 }}>{t('hero.title')}</h1>
              <p style={{ fontSize: '1.0625rem', color: 'var(--green-200)', marginBottom: 40, lineHeight: 1.7, maxWidth: 480, fontFamily: 'var(--font-body)' }}>{t('hero.subtitle')}</p>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
                <button onClick={onGetStarted} className="fs-btn fs-btn-primary">{t('hero.cta')} →</button>
                <button className="fs-btn fs-btn-outline">{t('hero.cta2')}</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--green-300)', fontSize: '0.9375rem' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <span style={{ fontSize: 20 }}>🌾</span>
                  <span style={{ fontSize: 20 }}>👨‍🌾</span>
                  <span style={{ fontSize: 20 }}>👩‍🌾</span>
                </div>
                <span>{t('hero.proof')}</span>
              </div>
            </div>
            <div className="fs-phone-col fs-fade-in-up-delay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
              <div style={{ position: 'absolute', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle,rgba(74,222,128,0.12) 0%,transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
              <div className="fs-phone-float"><PhoneMockup /></div>
            </div>
          </div>
        </section>

        {/* Marquee */}
        <div style={{ background: 'var(--green-700)', padding: '14px 0', overflow: 'hidden' }}>
          <div className="fs-marquee" style={{ display: 'flex', gap: 48, whiteSpace: 'nowrap', width: 'max-content' }}>
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span key={i} style={{ color: 'var(--white)', fontSize: 14, fontWeight: 600 }}>{item}</span>
            ))}
          </div>
        </div>

        {/* How it works */}
        <section id="how" style={{ padding: '80px 24px', background: 'var(--white)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div className="fs-reveal" style={{ textAlign: 'center', marginBottom: 60 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, color: 'var(--gray-900)', marginBottom: 16 }}>How Fasal Setu Works</h2>
              <p style={{ color: 'var(--gray-500)', fontSize: 16, maxWidth: 500, margin: '0 auto' }}>From sensor to insight in 4 simple steps</p>
            </div>
            <div className="fs-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 24 }}>
              {[
                { icon: '📡', step: '01', title: 'Install Sensor', desc: 'Place IoT sensor in your field to start monitoring soil health' },
                { icon: '📊', step: '02', title: 'Collect Data', desc: 'Real-time NPK, moisture, and temperature readings every hour' },
                { icon: '🤖', step: '03', title: 'AI Analysis', desc: 'Our AI processes your data and identifies issues before they escalate' },
                { icon: '✅', step: '04', title: 'Take Action', desc: 'Get precise recommendations and buy inputs from our marketplace' },
              ].map(item => (
                <div key={item.step} className="fs-card" style={{ textAlign: 'center', padding: '32px 24px' }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>{item.icon}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: 'var(--green-600)', letterSpacing: 2, marginBottom: 8 }}>STEP {item.step}</div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{item.title}</h3>
                  <p style={{ fontSize: 14, color: 'var(--gray-500)', lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" style={{ padding: '80px 24px', background: 'var(--green-50)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div className="fs-reveal" style={{ textAlign: 'center', marginBottom: 60 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, color: 'var(--gray-900)', marginBottom: 16 }}>{t('features.title')}</h2>
            </div>
            <div className="fs-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 24 }}>
              {[
                { icon: '🌡️', title: 'Soil Health Monitor', desc: 'Track moisture, pH, and NPK levels in real-time with IoT sensors' },
                { icon: '🤖', title: 'AI Farming Assistant', desc: 'Get instant answers to farming questions in Hindi or English' },
                { icon: '🔔', title: 'Smart Crop Alerts', desc: 'Receive critical alerts for pests, diseases, and weather events' },
                { icon: '🛒', title: 'Agri Marketplace', desc: 'Buy fertilizers, seeds, and tools with AI-curated recommendations' },
              ].map(f => (
                <div key={f.title} className="fs-card fs-reveal" style={{ padding: 28 }}>
                  <div style={{ fontSize: 36, marginBottom: 16 }}>{f.icon}</div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--gray-900)' }}>{f.title}</h3>
                  <p style={{ fontSize: 14, color: 'var(--gray-500)', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section id="stats" style={{ padding: '80px 24px', background: 'var(--green-900)' }}>
          <div ref={statsRef} style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div className="fs-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 40, textAlign: 'center' }}>
              {[
                { target: 500, suffix: '+', label: t('stats.farmers.label') },
                { target: 12,  suffix: '',  label: t('stats.districts.label') },
                { target: 95,  suffix: '%', label: t('stats.accuracy.label') },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 56, fontWeight: 800, color: 'var(--green-400)' }}>
                    <StatCounter target={s.target} suffix={s.suffix} active={statsActive} />
                  </div>
                  <div style={{ color: 'var(--green-200)', fontSize: 16, marginTop: 8 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section style={{ padding: '80px 24px', background: 'var(--white)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div className="fs-reveal" style={{ textAlign: 'center', marginBottom: 60 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, color: 'var(--gray-900)' }}>{t('testimonials.title')}</h2>
            </div>
            <div className="fs-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24 }}>
              {[
                { name: 'Ramesh Kumar', location: 'Pune, Maharashtra', quote: 'Fasal Setu helped me increase my wheat yield by 30% this season. The soil alerts saved my crop from a moisture crisis!', stars: 5 },
                { name: 'Sunita Devi', location: 'Nashik, Maharashtra', quote: 'The AI chatbot answers my questions in Hindi. I no longer need to call the agriculture officer for every small problem.', stars: 5 },
                { name: 'Arjun Patil', location: 'Solapur, Maharashtra', quote: 'Bought fertilizers from the marketplace at better prices. The AI Pick feature really helps choose the right product.', stars: 4 },
              ].map(t2 => (
                <div key={t2.name} className="fs-card fs-reveal" style={{ padding: 28 }}>
                  <div style={{ color: '#f59e0b', fontSize: 18, marginBottom: 16 }}>{'★'.repeat(t2.stars)}{'☆'.repeat(5 - t2.stars)}</div>
                  <p style={{ fontSize: 15, color: 'var(--gray-700)', lineHeight: 1.7, marginBottom: 20, fontStyle: 'italic' }}>"{t2.quote}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-full)', background: 'var(--green-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--green-700)', fontSize: 16 }}>{t2.name[0]}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-900)' }}>{t2.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{t2.location}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* School Drive Banner */}
        <section id="school" style={{ padding: '80px 24px', background: 'linear-gradient(135deg,var(--amber-500),var(--amber-600))' }}>
          <div className="fs-reveal" style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏫</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px,4vw,36px)', fontWeight: 800, color: 'var(--white)', marginBottom: 16 }}>{t('school.title')}</h2>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16, marginBottom: 32, lineHeight: 1.6 }}>{t('school.subtitle')}. We've reached 415 students across 3 schools and counting.</p>
            <button onClick={onGetStarted} className="fs-btn" style={{ background: 'var(--white)', color: 'var(--amber-600)', fontWeight: 700 }}>{t('school.cta')} →</button>
          </div>
        </section>

        {/* Footer */}
        <footer id="footer" style={{ background: 'var(--green-950)', padding: '60px 24px 32px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 40, marginBottom: 48 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--white)', marginBottom: 12 }}>🌾 Fasal Setu</div>
                <p style={{ color: 'var(--green-400)', fontSize: 14, lineHeight: 1.6 }}>{t('footer.tagline')}</p>
                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  {['𝕏', 'in', 'f'].map(icon => (
                    <a key={icon} href="#" style={{ width: 36, height: 36, borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green-300)', textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>{icon}</a>
                  ))}
                </div>
              </div>
              <div>
                <h4 style={{ color: 'var(--white)', fontWeight: 600, marginBottom: 16, fontSize: 14 }}>Platform</h4>
                {['Dashboard', 'AI Chat', 'Marketplace', 'Alerts'].map(l => (
                  <a key={l} href="#" onClick={e => { e.preventDefault(); onGetStarted(); }} style={{ display: 'block', color: 'var(--green-400)', fontSize: 14, marginBottom: 8, textDecoration: 'none' }}>{l}</a>
                ))}
              </div>
              <div>
                <h4 style={{ color: 'var(--white)', fontWeight: 600, marginBottom: 16, fontSize: 14 }}>Community</h4>
                {['School Drive', 'About Us', 'Contact', 'Privacy Policy'].map(l => (
                  <a key={l} href="#" style={{ display: 'block', color: 'var(--green-400)', fontSize: 14, marginBottom: 8, textDecoration: 'none' }}>{l}</a>
                ))}
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <p style={{ color: 'var(--green-600)', fontSize: 13 }}>© 2024 Fasal Setu. All rights reserved.</p>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
