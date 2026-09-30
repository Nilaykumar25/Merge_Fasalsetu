import { useState } from 'react';
import * as React from 'react';
import { useWeather } from '../services/weatherLocation';
import Chatbot from './Chatbot';
import CropLog from './CropLog';
import CropSuggestions from './CropSuggestions';
import CalendarAlerts from './CalendarAlerts';
import Settings from './Settings';
import VoiceTest from './VoiceTest';
import SoilNPKPanel from './SoilNPKPanel';
import GovSchemes from './GovSchemes';
import Marketplace from './Marketplace';
import Compliance from './Compliance';

interface HomePageProps {
  selectedPhase: string;
  selectedLanguage: string;
  onPhaseChange: (phase: string) => void;
  onLanguageChange: (language: string) => void;
  onLogoClick: () => void;
  onAddCrop?: () => void;
  onLogout?: () => void;
  userName?: string;
}

type Panel = 'home' | 'soil' | 'crops' | 'weather' | 'ai' | 'disease' | 'alerts' | 'market' | 'community' | 'schemes' | 'compliance' | 'settings';

const TITLES: Record<Panel, string> = {
  home: 'Dashboard', soil: 'Soil & NPK', crops: 'Crop Log',
  weather: 'Weather', ai: 'AI Advisor', disease: 'Disease Detection',
  alerts: 'Alerts', market: 'Marketplace',
  community: 'Community', schemes: 'Govt Schemes', compliance: 'Compliance', settings: 'Settings',
};

const NAV = [
  { section: 'Overview', items: [
    { id: 'home' as Panel, icon: '⌂', label: 'Dashboard' },
    { id: 'soil' as Panel, icon: '◉', label: 'Soil & NPK' },
    { id: 'crops' as Panel, icon: '✿', label: 'Crop Log', badge: '3', badgeType: 'g' },
    { id: 'weather' as Panel, icon: '☁', label: 'Weather' },
  ]},
  { section: 'Tools', items: [
    { id: 'ai' as Panel, icon: '◈', label: 'AI Advisor', badge: '● Live', badgeType: 'live' },
    { id: 'disease' as Panel, icon: '🔬', label: 'Disease Detection', badge: 'New', badgeType: 'g' },
    { id: 'schemes' as Panel, icon: '🏛️', label: 'Govt Schemes' },
    { id: 'compliance' as Panel, icon: '🛡️', label: 'Compliance' },
    { id: 'alerts' as Panel, icon: '◎', label: 'Alerts', badge: '4', badgeType: 'r' },
    { id: 'market' as Panel, icon: '⊞', label: 'Marketplace' },
  ]},
  { section: 'Community', items: [
    { id: 'community' as Panel, icon: '◍', label: 'Community' },
    { id: 'settings' as Panel, icon: '⋯', label: 'Settings' },
  ]},
];

export default function HomePage({ selectedPhase, selectedLanguage, onPhaseChange, onLanguageChange, onLogoClick, onAddCrop, onLogout, userName = 'Farmer' }: HomePageProps) {
  const [panel, setPanel] = useState<Panel>('home');
  const { weather } = useWeather();

  const go = (p: Panel) => setPanel(p);

  const weatherLabel = weather
    ? `${weather.condition.split(' ')[0] === 'Clear' ? '☀️' : weather.rain_expected ? '🌧️' : '🌤️'} ${Math.round(weather.temperature_c)}°C · ${weather.location.split(',')[0]}`
    : '🌤️ Loading…';
  const locationLabel = weather ? weather.location : '📍 Detecting…';

  return (
    <div className="fs-dashboard" style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Crimson Pro', Georgia, serif", fontSize: 14, background: '#070d09', color: '#f0fdf4' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&family=Crimson+Pro:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');
        .fs-sb-nav::-webkit-scrollbar{width:3px}.fs-sb-nav::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}
        .fs-content::-webkit-scrollbar{width:4px}.fs-content::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:2px}
        .fs-dashboard *{font-family:'Crimson Pro',Georgia,serif!important;}
        .fs-dashboard h1,.fs-dashboard h2,.fs-dashboard h3,.fs-dashboard h4,.fs-dashboard [class*="scard-val"],[style*="Playfair"]{font-family:'Playfair Display',Georgia,serif!important;}
        .fs-nav-item{display:flex;align-items:center;gap:9px;padding:8px 10px;margin:1px 0;border-radius:8px;cursor:pointer;transition:all .15s;color:rgba(255,255,255,.35);font-size:12px;font-weight:500;border:1px solid transparent;}
        .fs-nav-item:hover{background:rgba(255,255,255,.05);color:rgba(255,255,255,.6);}
        .fs-nav-item.active{background:rgba(34,197,94,.1);color:#4ade80;border-color:rgba(34,197,94,.2);}
        .fs-scard{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;cursor:pointer;transition:all .2s;position:relative;overflow:hidden;}
        .fs-scard:hover{border-color:#d1d5db;transform:translateY(-1px);}
        .fs-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;}
        .fs-card-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #f3f4f6;}
        .fs-card-body{padding:14px 16px;}
        .fs-alert{display:flex;align-items:flex-start;gap:12px;padding:11px 13px;border-radius:8px;border-left:2.5px solid;margin-bottom:6px;cursor:pointer;}
        .fs-alert:last-child{margin-bottom:0;}
        .fs-badge{font-size:9px;font-weight:700;padding:2px 6px;border-radius:20px;line-height:1.4;}
        .fs-badge.g{background:rgba(34,197,94,.12);color:#4ade80;}
        .fs-badge.r{background:rgba(248,113,113,.1);color:#f87171;}
        .fs-badge.live{background:rgba(34,197,94,.12);color:#4ade80;animation:livepulse 1.5s ease-in-out infinite;}
        @keyframes livepulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes sbpulse{0%{box-shadow:0 0 0 0 rgba(34,197,94,.4)}70%{box-shadow:0 0 0 6px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}
        .fs-panel{animation:fspanelin .25s ease;}
        @keyframes fspanelin{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fs-prog{height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;}
        .fs-prog-fill{height:100%;background:linear-gradient(90deg,#166534,#4ade80);border-radius:2px;}
        .fs-crop-tag{font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;white-space:nowrap;}
        .fs-crop-tag.ok{background:#dcfce7;color:#15803d;}
        .fs-crop-tag.warn{background:#fef3c7;color:#b45309;}
        .fs-crop-tag.bad{background:#fee2e2;color:#b91c1c;}
        .fs-task{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f3f4f6;cursor:pointer;}
        .fs-task:last-child{border-bottom:none;}
        .fs-mcard{background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;cursor:pointer;transition:all .2s;}
        .fs-mcard:hover{border-color:#d1d5db;transform:translateY(-2px);}
        .fs-ev{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px;cursor:pointer;transition:border-color .2s;}
        .fs-ev:hover{border-color:#d1d5db;}
        .fs-toggle{width:36px;height:20px;background:#d1d5db;border-radius:10px;position:relative;cursor:pointer;transition:background .2s;flex-shrink:0;}
        .fs-toggle.on{background:#16a34a;}
        .fs-toggle::after{content:'';position:absolute;top:3px;left:3px;width:14px;height:14px;background:#fff;border-radius:50%;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.3);}
        .fs-toggle.on::after{left:19px;}
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 240, flexShrink: 0, background: '#0e1a11', borderRight: '1px solid rgba(255,255,255,.06)', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {/* Logo */}
        <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onLogoClick} style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#22c55e,#16a34a)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, boxShadow: '0 0 20px rgba(34,197,94,.3)', border: 'none', cursor: 'pointer', flexShrink: 0 }}>🌾</button>
          <div>
            <div style={{ fontFamily: "Playfair Display, Georgia, serif", fontWeight: 800, fontSize: 15, color: '#f0fdf4', letterSpacing: '-.3px' }}>FasalSetu</div>
            <div style={{ fontSize: 9, color: 'rgba(240,253,244,.35)', letterSpacing: '.8px', fontWeight: 500, marginTop: 1 }}>AI Farming Companion</div>
          </div>
        </div>

        {/* User card */}
        <div style={{ margin: '12px 12px 4px', padding: '10px 12px', background: '#121f15', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#166534,#064e3b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, border: '1.5px solid rgba(34,197,94,.3)', flexShrink: 0 }}>{userName.charAt(0).toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#f0fdf4' }}>{userName}</div>
            <div style={{ fontSize: 10, color: 'rgba(240,253,244,.35)' }}>📍 {locationLabel}</div>
          </div>
          <div style={{ width: 8, height: 8, background: '#22c55e', borderRadius: '50%', animation: 'sbpulse 2s infinite', flexShrink: 0 }} />
        </div>

        {/* Nav */}
        <div className="fs-sb-nav" style={{ padding: 8, flex: 1, overflowY: 'auto' }}>
          {NAV.map(group => (
            <div key={group.section}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.25)', letterSpacing: '1.2px', textTransform: 'uppercase', padding: '14px 8px 6px' }}>{group.section}</div>
              {group.items.map(item => (
                <div key={item.id} className={`fs-nav-item${panel === item.id ? ' active' : ''}`} onClick={() => go(item.id)}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13 }}>{item.icon}</div>
                  <span style={{ flex: 1, fontSize: 13 }}>{item.label}</span>
                  {item.badge && <span className={`fs-badge ${item.badgeType}`}>{item.badge}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Kit footer */}
        <div onClick={() => go('crops')} style={{ margin: '8px 12px 14px', padding: '12px 14px', background: 'linear-gradient(135deg,rgba(245,158,11,.07),rgba(34,197,94,.05))', border: '1px solid rgba(245,158,11,.18)', borderRadius: 12, cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>🪴</span>
            <div>
              <div style={{ fontFamily: "Playfair Display, Georgia, serif", fontSize: 11, fontWeight: 700, color: '#fcd34d' }}>Growing Kit</div>
              <div style={{ fontSize: 10, color: 'rgba(240,253,244,.35)', marginTop: 1 }}>Day 14 of 90 · Tomato</div>
            </div>
          </div>
          <div style={{ height: 3, background: 'rgba(255,255,255,.08)', borderRadius: 2 }}>
            <div style={{ height: '100%', width: '15%', background: 'linear-gradient(90deg,#22c55e,#f59e0b)', borderRadius: 2 }} />
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f0fdf4' }}>
        {/* Topbar */}
        <div style={{ height: 56, borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, flexShrink: 0, background: '#fff' }}>
          <div style={{ fontFamily: "Playfair Display, Georgia, serif", fontSize: 14, fontWeight: 700, color: '#111827', letterSpacing: '-.2px' }}>{TITLES[panel]}</div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: '5px 12px', fontSize: 11, fontWeight: 600, color: '#16a34a', cursor: 'pointer' }} onClick={() => go('weather')}>{weatherLabel}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 20, padding: '5px 12px', fontSize: 11, fontWeight: 600, color: '#1d4ed8', cursor: 'pointer' }}>💧 Irrigate by 6 AM</div>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 32, height: 32, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}>🔔</div>
            <div style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, background: '#ef4444', borderRadius: '50%', border: '1.5px solid #fff' }} />
          </div>
          <Settings currentLanguage={selectedLanguage} onLanguageChange={onLanguageChange} onLogout={onLogout} />
        </div>

        {/* Content */}
        <div className="fs-content" style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {panel === 'home'      && <PanelHome onNav={go} onAddCrop={onAddCrop} />}
          {panel === 'soil'      && <PanelSoil />}
          {panel === 'crops'     && <div className="fs-panel"><CropLog onAddCrop={onAddCrop} /></div>}
          {panel === 'weather'   && <div className="fs-panel"><CalendarAlerts /></div>}
          {panel === 'ai'        && <PanelAI />}
          {panel === 'disease'   && <PanelDisease />}
          {panel === 'schemes'    && <GovSchemes />}
          {panel === 'compliance' && <Compliance />}
          {panel === 'alerts'     && <PanelAlerts />}
          {panel === 'market'    && <Marketplace />}
          {panel === 'community' && <PanelCommunity />}
          {panel === 'settings'  && <PanelSettings currentLanguage={selectedLanguage} onLanguageChange={onLanguageChange} onLogout={onLogout} />}
        </div>
      </div>
    </div>
  );
}

// ── PANEL: HOME ──────────────────────────────
function PanelHome({ onNav, onAddCrop }: { onNav: (p: Panel) => void; onAddCrop?: () => void }) {
  const [tasks, setTasks] = useState([
    { done: true,  text: 'Morning soil check — Field A', time: '5:30 AM', pri: 'lo', priLabel: 'Done' },
    { done: false, text: 'Irrigate Field A & B',          time: '6:00 AM', pri: 'hi', priLabel: 'Urgent' },
    { done: false, text: 'Apply Urea 20kg/acre — Field A',time: '9:00 AM', pri: 'md', priLabel: 'Today' },
    { done: false, text: 'Inspect mustard for aphids',    time: '4:00 PM', pri: 'lo', priLabel: 'Low' },
  ]);
  const toggle = (i: number) => setTasks(t => t.map((x, j) => j === i ? { ...x, done: !x.done } : x));
  const priColor: Record<string, string> = { hi: '#fee2e2', md: '#fef3c7', lo: '#dcfce7' };
  const priText: Record<string, string>  = { hi: '#b91c1c', md: '#b45309', lo: '#15803d' };

  return (
    <div className="fs-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        {[
          { icon: '💧', label: 'Soil Moisture · Field A', val: '62', unit: '%',    pill: 'Optimal', pillC: '#dcfce7', pillT: '#15803d', accent: '#22c55e', nav: 'soil' as Panel },
          { icon: '🧪', label: 'Nitrogen · Add Urea',     val: '42', unit: ' kg/ha',pill: 'Low',     pillC: '#fef3c7', pillT: '#b45309', accent: '#f59e0b', nav: 'soil' as Panel },
          { icon: '🌡️', label: 'Heatwave in 2 days',      val: '35', unit: ' °C',   pill: 'Heat Risk',pillC: '#fee2e2', pillT: '#b91c1c', accent: '#f87171', nav: 'weather' as Panel },
          { icon: '🌾', label: 'Active Crop · Field A',   val: 'Wheat', unit: '',   pill: 'Day 22',  pillC: '#f3e8ff', pillT: '#6d28d9', accent: '#c084fc', nav: 'crops' as Panel },
        ].map(s => (
          <div key={s.label} className="fs-scard" onClick={() => onNav(s.nav)} style={{ '--accent': s.accent } as any}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: s.accent }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
              <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 20, background: s.pillC, color: s.pillT }}>{s.pill}</span>
            </div>
            <div style={{ fontFamily: "Playfair Display, Georgia, serif", fontSize: s.val.length > 4 ? 20 : 26, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{s.val}<span style={{ fontSize: 12, color: '#6b7280', fontWeight: 400 }}>{s.unit}</span></div>
            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 5 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Alerts */}
          <div className="fs-card">
            <div className="fs-card-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "Playfair Display, Georgia, serif", fontSize: 12, fontWeight: 700, color: '#374151' }}><span style={{ width: 22, height: 22, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>◎</span>Active Alerts</div>
              <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 500, cursor: 'pointer' }} onClick={() => onNav('alerts')}>View all →</span>
            </div>
            <div className="fs-card-body">
              {[
                { cls: 'red',    ac: '#ef4444', bg: '#fee2e2', icon: '💧', title: 'Irrigate Field A by 6 AM',      desc: 'Moisture dropping — wheat facing stress',       time: '2h ago' },
                { cls: 'orange', ac: '#f97316', bg: '#fff7ed', icon: '🌡️', title: '35°C heatwave in 2 days',       desc: 'Cover crops with shade nets immediately',       time: '4h ago' },
                { cls: 'gold',   ac: '#f59e0b', bg: '#fffbeb', icon: '🧪', title: 'Nitrogen low in Field A',        desc: 'Apply 20 kg Urea/acre this week',               time: '1d ago' },
              ].map(a => (
                <div key={a.title} className="fs-alert" style={{ borderLeftColor: a.ac, background: a.bg }}>
                  <span style={{ fontSize: 15, marginTop: 1, flexShrink: 0 }}>{a.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', lineHeight: 1.4 }}>{a.title}</div>
                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{a.desc}</div>
                  </div>
                  <span style={{ fontSize: 10, color: '#9ca3af', whiteSpace: 'nowrap', paddingTop: 2 }}>{a.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks */}
          <div className="fs-card">
            <div className="fs-card-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "Playfair Display, Georgia, serif", fontSize: 12, fontWeight: 700, color: '#374151' }}><span style={{ width: 22, height: 22, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>✓</span>Today's Tasks</div>
              <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 500, cursor: 'pointer' }}>+ Add</span>
            </div>
            <div className="fs-card-body">
              {tasks.map((t, i) => (
                <div key={i} className="fs-task" onClick={() => toggle(i)}>
                  <div style={{ width: 18, height: 18, border: `1.5px solid ${t.done ? '#22c55e' : '#d1d5db'}`, borderRadius: 5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, background: t.done ? '#dcfce7' : 'transparent', color: '#16a34a' }}>{t.done ? '✓' : ''}</div>
                  <span style={{ fontSize: 12, color: t.done ? '#9ca3af' : '#374151', flex: 1, textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</span>
                  <span style={{ fontSize: 10, color: '#9ca3af' }}>{t.time}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: priColor[t.pri], color: priText[t.pri] }}>{t.priLabel}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Soil quick */}
          <div className="fs-card">
            <div className="fs-card-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "Playfair Display, Georgia, serif", fontSize: 12, fontWeight: 700, color: '#374151' }}><span style={{ width: 22, height: 22, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>◉</span>Soil Health</div>
              <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 500, cursor: 'pointer' }} onClick={() => onNav('soil')}>Details →</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center' }}>
              {[{ lbl: 'Moisture', val: '62%', tag: 'Optimal', tagC: '#dcfce7', tagT: '#15803d', valC: '#22c55e' },
                { lbl: 'pH',       val: '6.8', tag: 'Neutral', tagC: '#dcfce7', tagT: '#15803d', valC: '#111827' },
                { lbl: 'EC',       val: '1.2', tag: 'Watch',   tagC: '#fef3c7', tagT: '#b45309', valC: '#f59e0b' }].map((s, i) => (
                <div key={s.lbl} style={{ padding: '12px 8px', borderRight: i < 2 ? '1px solid #f3f4f6' : 'none' }}>
                  <div style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>{s.lbl}</div>
                  <div style={{ fontFamily: "Playfair Display, Georgia, serif", fontSize: 20, fontWeight: 800, color: s.valC }}>{s.val}</div>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: s.tagC, color: s.tagT, marginTop: 4, display: 'inline-block' }}>{s.tag}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI tip */}
          <div className="fs-card" style={{ cursor: 'pointer', background: 'linear-gradient(135deg,rgba(34,197,94,.04),rgba(34,197,94,.01))' }} onClick={() => onNav('ai')}>
            <div className="fs-card-head" style={{ borderBottom: 'none', paddingBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "Playfair Display, Georgia, serif", fontSize: 12, fontWeight: 700, color: '#22c55e' }}><span style={{ width: 22, height: 22, background: 'rgba(34,197,94,.1)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>◈</span>AI Tip · Today</div>
              <div style={{ width: 8, height: 8, background: '#22c55e', borderRadius: '50%', animation: 'sbpulse 2s infinite' }} />
            </div>
            <div style={{ padding: '0 16px 14px', fontSize: 12, color: '#374151', lineHeight: 1.65 }}>🌾 Wheat Day 22 — irrigate before 6 AM. Apply Urea after irrigation, not before. Avoid evening watering; fungal risk is high with current humidity (34%).</div>
            <div style={{ padding: '0 16px 12px', fontSize: 10, color: '#22c55e', fontWeight: 600 }}>Tap for full AI chat →</div>
          </div>

          {/* Crops summary */}
          <div className="fs-card">
            <div className="fs-card-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "Playfair Display, Georgia, serif", fontSize: 12, fontWeight: 700, color: '#374151' }}><span style={{ width: 22, height: 22, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>✿</span>My Crops</div>
              <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 500, cursor: 'pointer' }} onClick={() => onNav('crops')}>All crops →</span>
            </div>
            <div className="fs-card-body">
              {[
                { emoji: '🌾', name: 'Wheat',   meta: 'Field A · 2.5 ac', stage: 'Vegetative', days: '22/90d', pct: 24, tag: 'ok',   tagLabel: 'On Track' },
                { emoji: '🌿', name: 'Mustard', meta: 'Field B · 1.8 ac', stage: 'Rosette',    days: '17/75d', pct: 22, tag: 'warn', tagLabel: 'Low Water' },
                { emoji: '🧅', name: 'Onion',   meta: 'Field C · 1.2 ac', stage: 'Bulb Stage', days: '38/120d',pct: 31, tag: 'ok',   tagLabel: 'On Track' },
              ].map(c => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: 24, width: 38, textAlign: 'center', flexShrink: 0 }}>{c.emoji}</span>
                  <div style={{ minWidth: 90 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{c.meta}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9ca3af', marginBottom: 5 }}><span>{c.stage}</span><span>{c.days}</span></div>
                    <div className="fs-prog"><div className="fs-prog-fill" style={{ width: `${c.pct}%` }} /></div>
                  </div>
                  <span className={`fs-crop-tag ${c.tag}`}>{c.tagLabel}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PANEL: SOIL ──────────────────────────────
function PanelSoil() {
  return <SoilNPKPanel />;
}

// ── PANEL: AI ────────────────────────────────
function PanelAI() {
  return (
    <div className="fs-panel" style={{ background: '#fff', borderRadius: 12, border: '1px solid #d1fae5', overflow: 'hidden', minHeight: 'calc(100vh - 100px)' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #d1fae5', display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4' }}>
        <div style={{ width: 22, height: 22, background: '#dcfce7', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, border: '1px solid #86efac' }}>◈</div>
        <span style={{ fontFamily: "Playfair Display, Georgia, serif", fontSize: 13, fontWeight: 700, color: '#15803d' }}>FasalSetu AI Advisor</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#16a34a', marginLeft: 8 }}>
          <div style={{ width: 6, height: 6, background: '#22c55e', borderRadius: '50%', animation: 'sbpulse 2s infinite' }} />
          Powered by Gemini AI
        </div>
      </div>
      <div style={{ background: '#fff' }}>
        <Chatbot />
      </div>
    </div>
  );
}

// ── PANEL: DISEASE DETECTION ─────────────────
function PanelDisease() {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setFileName(file.name); setResult(null); setError('');
    const reader = new FileReader();
    reader.onloadend = () => { const b64 = reader.result as string; setPreview(b64); setImageBase64(b64); };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };
  // In HomePage.tsx — replace your handleAnalyze function

  const handleAnalyze = async () => {
    if (!imageBase64) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const { detectDiseaseFromImage } = await import('../services/diseaseDetectionService');
      const res = await detectDiseaseFromImage(imageBase64);  // base64 string — now works

      if (res?.structured) {
        setResult(res.structured);
      } else {
        setError(
          'Detection failed. Make sure the Colab ngrok tunnel is running ' +
          'and VITE_MODEL_API_URL is set in your .env file.'
        );
      }
    } catch (e: any) {
      setError(e.message || 'Detection failed');
    } finally {
      setLoading(false);
    }
  };

  const sevStyle: Record<string, { bg: string; text: string; border: string }> = {
    severe:   { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
    moderate: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
    mild:     { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
    healthy:  { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
    unknown:  { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' },
  };

  return (
    <div className="fs-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,rgba(34,197,94,0.06),rgba(34,197,94,0.02))', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontSize: 32 }}>🔬</div>
        <div>
          <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 15, fontWeight: 700, color: '#111827' }}>AI Crop Disease Detection</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 3 }}>Upload a leaf photo — EfficientNet model identifies disease, severity, treatment & prevention steps.</div>
        </div>
        <div style={{ marginLeft: 'auto', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 700, color: '#15803d', whiteSpace: 'nowrap' }}>EfficientNet Model</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Upload */}
        <div className="fs-card">
          <div className="fs-card-head">
            <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 12, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 22, height: 22, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>📷</span>
              Upload Crop Image
            </div>
          </div>
          <div className="fs-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} onClick={() => document.getElementById('disease-file-input')?.click()}
              style={{ border: `2px dashed ${dragOver ? '#22c55e' : 'rgba(34,197,94,0.25)'}`, borderRadius: 12, padding: '24px 16px', textAlign: 'center', cursor: 'pointer', background: dragOver ? 'rgba(34,197,94,0.06)' : 'rgba(34,197,94,0.02)', transition: 'all 0.2s' }}>
              {preview ? (
                <div><img src={preview} alt="Crop preview" style={{ maxHeight: 180, maxWidth: '100%', borderRadius: 8, margin: '0 auto', objectFit: 'cover', border: '1px solid #e5e7eb' }} /><div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>📎 {fileName}</div></div>
              ) : (
                <><div style={{ fontSize: 44, marginBottom: 10 }}>🌿</div><div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Drop image here or click to upload</div><div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>JPG, PNG up to 10MB · Clear leaf photos work best</div><div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14 }}><div style={{ background: '#dcfce7', border: '1px solid rgba(34,197,94,.2)', color: '#15803d', fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 6 }}>📷 Camera</div><div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#374151', fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 6 }}>📁 Gallery</div></div></>
              )}
            </div>
            <input id="disease-file-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>🌾 Crop Type (optional hint)</label>
              <select style={{ width: '100%', padding: '9px 12px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#374151', outline: 'none' }}>
                <option>Auto-detect</option><option>Wheat</option><option>Rice</option><option>Maize</option><option>Tomato</option><option>Potato</option><option>Mustard</option><option>Grape</option><option>Apple</option><option>Other</option>
              </select>
            </div>
            {error && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#b91c1c' }}>{error}</div>}
            <button onClick={handleAnalyze} disabled={!preview || loading}
              style={{ width: '100%', background: preview && !loading ? 'linear-gradient(135deg,#22c55e,#16a34a)' : '#e5e7eb', color: preview && !loading ? '#fff' : '#9ca3af', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, cursor: preview && !loading ? 'pointer' : 'not-allowed', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading ? <><span>🔬</span> Analyzing…</> : <><span>🔍</span> Detect Disease</>}
            </button>
            {preview && <button onClick={() => { setPreview(null); setImageBase64(null); setFileName(''); setResult(null); setError(''); }} style={{ width: '100%', background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px', fontSize: 12, color: '#9ca3af', cursor: 'pointer' }}>✕ Clear image</button>}
          </div>
        </div>

        {/* Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!result && !loading && (
            <div className="fs-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 52, marginBottom: 14, opacity: 0.35 }}>🧬</div>
              <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>No Analysis Yet</div>
              <div style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.6 }}>Upload a clear photo of the affected leaf and click "Detect Disease" to get an instant AI diagnosis with treatment steps.</div>
            </div>
          )}
          {loading && (
            <div className="fs-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔬</div>
              <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Analyzing Image…</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>Running EfficientNet disease detection model</div>
              <div style={{ width: '60%', height: 3, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}><div style={{ height: '100%', background: 'linear-gradient(90deg,#22c55e,#16a34a)', borderRadius: 2, width: '60%', animation: 'fsMarquee 1.2s linear infinite' }} /></div>
            </div>
          )}
          {result && (() => {
            const sev = sevStyle[result.severity] || sevStyle.unknown;
            return (
              <>
                <div className="fs-card" style={{ borderLeft: `3px solid ${sev.border}` }}>
                  <div className="fs-card-head">
                    <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 12, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>🦠 Detection Result</div>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: sev.bg, color: sev.text }}>{result.severity.toUpperCase()}</span>
                  </div>
                  <div className="fs-card-body">
                    <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Plant</div>
                    <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 2 }}>{result.plantName}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginTop: 10, marginBottom: 4 }}>Disease</div>
                    <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 14, fontWeight: 700, color: result.isHealthy ? '#15803d' : '#b91c1c', marginBottom: 12 }}>{result.diseaseName}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontSize: 11, color: '#6b7280', flexShrink: 0 }}>Confidence</div>
                      <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}><div style={{ height: '100%', width: `${result.confidence}%`, background: result.confidence >= 80 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,#f59e0b,#d97706)', borderRadius: 3 }} /></div>
                      <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 13, fontWeight: 700, color: '#22c55e', flexShrink: 0 }}>{result.confidence.toFixed(1)}%</div>
                    </div>
                    {result.notes && <div style={{ marginTop: 10, background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 6, padding: '8px 10px', fontSize: 11, color: '#b45309' }}>⚠ {result.notes}</div>}
                  </div>
                </div>
                <div className="fs-card">
                  <div className="fs-card-head"><div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 12, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>💊 Treatment Steps</div></div>
                  <div className="fs-card-body">
                    <ol style={{ paddingLeft: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {result.treatment.map((step: string, i: number) => (
                        <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{ flexShrink: 0, width: 20, height: 20, background: '#dcfce7', border: '1px solid #86efac', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#15803d', marginTop: 1 }}>{i + 1}</span>
                          <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
                <div className="fs-card">
                  <div className="fs-card-head"><div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 12, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>🛡️ Prevention</div></div>
                  <div className="fs-card-body">
                    <ul style={{ paddingLeft: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {result.prevention.map((step: string, i: number) => (
                        <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{ flexShrink: 0, fontSize: 14, marginTop: 1 }}>🛡</span>
                          <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Supported diseases */}
      <div className="fs-card">
        <div className="fs-card-head">
          <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 12, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>📋 Supported Diseases</div>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>38 classes · PlantVillage dataset</span>
        </div>
        <div className="fs-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
            {[
              { name: 'Yellow Rust',    crop: 'Wheat',    icon: '🌾' },
              { name: 'Early Blight',   crop: 'Tomato',   icon: '🍅' },
              { name: 'Late Blight',    crop: 'Potato',   icon: '🥔' },
              { name: 'Leaf Blast',     crop: 'Rice',     icon: '🌾' },
              { name: 'Common Rust',    crop: 'Maize',    icon: '🌽' },
              { name: 'Apple Scab',     crop: 'Apple',    icon: '🍎' },
              { name: 'Black Rot',      crop: 'Grape',    icon: '🍇' },
              { name: 'Bacterial Spot', crop: 'Pepper',   icon: '🫑' },
              { name: 'Powdery Mildew', crop: 'Multiple', icon: '🌿' },
              { name: 'Healthy Leaf',   crop: 'All',      icon: '✅' },
            ].map(d => (
              <div key={d.name} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>{d.icon}</span>
                <div><div style={{ fontSize: 11, fontWeight: 600, color: '#111827' }}>{d.name}</div><div style={{ fontSize: 10, color: '#9ca3af' }}>{d.crop}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PANEL: PEST ──────────────────────────────
function PanelPest() {
  const [preview, setPreview]   = React.useState<string | null>(null);
  const [base64, setBase64]     = React.useState<string | null>(null);
  const [loading, setLoading]   = React.useState(false);
  const [result, setResult]     = React.useState<any | null>(null);
  const [error, setError]       = React.useState('');
  const fileRef                 = React.useRef<HTMLInputElement>(null);

  const SEASON_PESTS = [
    { emoji: '🐛', name: 'Aphids',         risk: 'HIGH', riskC: '#fee2e2', riskT: '#b91c1c', tx: 'Neem oil spray' },
    { emoji: '🍄', name: 'Yellow Rust',    risk: 'MED',  riskC: '#fef3c7', riskT: '#b45309', tx: 'Propiconazole' },
    { emoji: '🦗', name: 'Termites',       risk: 'LOW',  riskC: '#dcfce7', riskT: '#15803d', tx: 'Chlorpyrifos' },
    { emoji: '🌫️', name: 'Powdery Mildew', risk: 'MED',  riskC: '#fef3c7', riskT: '#b45309', tx: 'Sulphur 80%' },
    { emoji: '🦟', name: 'Whitefly',       risk: 'LOW',  riskC: '#dcfce7', riskT: '#15803d', tx: 'Yellow traps' },
    { emoji: '🦠', name: 'Root Rot',       risk: 'HIGH', riskC: '#fee2e2', riskT: '#b91c1c', tx: 'Reduce water' },
  ];

  const SEV_STYLE: Record<string, { bg: string; color: string }> = {
    severe:   { bg: '#fee2e2', color: '#b91c1c' },
    moderate: { bg: '#fef3c7', color: '#b45309' },
    mild:     { bg: '#fef9c3', color: '#854d0e' },
    healthy:  { bg: '#dcfce7', color: '#15803d' },
    unknown:  { bg: '#f3f4f6', color: '#6b7280' },
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const b64 = e.target?.result as string;
      setPreview(b64);
      setBase64(b64);
      setResult(null);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) handleFile(file);
  };

  const analyse = async () => {
    if (!base64) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const { detectDiseaseFromImage } = await import('../services/diseaseDetectionService');
      const res = await detectDiseaseFromImage(base64);
      if (res?.structured) setResult(res.structured);
      else setError('Detection failed. Make sure the ngrok tunnel is running.');
    } catch (e: any) {
      setError(e.message || 'Detection failed');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setPreview(null); setBase64(null); setResult(null); setError(''); };

  return (
    <div className="fs-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* ── Upload card ── */}
        <div className="fs-card">
          <div className="fs-card-head">
            <div style={{ fontFamily: 'Playfair Display,Georgia,serif', fontSize: 12, fontWeight: 700, color: '#374151' }}>⌖ Pest & Disease Scan</div>
            {preview && <button onClick={reset} style={{ fontSize: 10, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>✕ Clear</button>}
          </div>
          <div className="fs-card-body">
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

            {!preview ? (
              <div onDrop={handleDrop} onDragOver={e => e.preventDefault()}
                style={{ border: '1.5px dashed rgba(34,197,94,.35)', borderRadius: 12, padding: 28, textAlign: 'center', background: 'rgba(34,197,94,.02)', cursor: 'pointer' }}
                onClick={() => fileRef.current?.click()}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📸</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Upload or Drop Photo</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>AI identifies pests & diseases instantly</div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14 }}>
                  <button onClick={e => { e.stopPropagation(); fileRef.current?.setAttribute('capture','environment'); fileRef.current?.click(); }}
                    style={{ background: '#dcfce7', border: '1px solid rgba(34,197,94,.2)', color: '#15803d', fontSize: 11, fontWeight: 600, padding: '7px 16px', borderRadius: 6, cursor: 'pointer' }}>
                    📷 Camera
                  </button>
                  <button onClick={e => { e.stopPropagation(); fileRef.current?.removeAttribute('capture'); fileRef.current?.click(); }}
                    style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#374151', fontSize: 11, fontWeight: 600, padding: '7px 16px', borderRadius: 6, cursor: 'pointer' }}>
                    📁 Upload
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <img src={preview} alt="crop" style={{ width: '100%', borderRadius: 10, maxHeight: 200, objectFit: 'cover', marginBottom: 12 }} />
                <button onClick={analyse} disabled={loading}
                  style={{ width: '100%', padding: '10px 0', borderRadius: 8, background: loading ? '#e5e7eb' : 'linear-gradient(135deg,#15803d,#16a34a)', color: loading ? '#9ca3af' : '#fff', border: 'none', cursor: loading ? 'default' : 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {loading
                    ? <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #9ca3af', borderTopColor: '#374151', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Analysing…</>
                    : '🔬 Scan for Pests & Disease'}
                </button>
                {error && <div style={{ marginTop: 8, fontSize: 11, color: '#b91c1c', background: '#fee2e2', padding: '7px 10px', borderRadius: 6 }}>{error}</div>}
              </div>
            )}
          </div>
        </div>

        {/* ── Season threat index ── */}
        <div className="fs-card">
          <div className="fs-card-head"><div style={{ fontFamily: 'Playfair Display,Georgia,serif', fontSize: 12, fontWeight: 700, color: '#374151' }}>⚠️ Season Threat Index</div></div>
          <div className="fs-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {SEASON_PESTS.map(p => (
                <div key={p.name} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, marginBottom: 5 }}>{p.emoji}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#111827' }}>{p.name}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 3, display: 'inline-block', marginTop: 4, background: p.riskC, color: p.riskT }}>{p.risk}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>{p.tx}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Result card ── */}
      {result && (() => {
        const sev = SEV_STYLE[result.severity] ?? SEV_STYLE.unknown;
        return (
          <div className="fs-card">
            <div className="fs-card-head">
              <div style={{ fontFamily: 'Playfair Display,Georgia,serif', fontSize: 12, fontWeight: 700, color: '#374151' }}>🔬 Scan Result</div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: sev.bg, color: sev.color }}>
                {result.severity?.toUpperCase()}
              </span>
            </div>
            <div className="fs-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Plant',      val: result.plantName },
                  { label: 'Issue',      val: result.diseaseName },
                  { label: 'Confidence', val: `${result.confidence}%` },
                ].map(f => (
                  <div key={f.label} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{f.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{f.val}</div>
                  </div>
                ))}
              </div>

              {result.treatment?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', marginBottom: 6 }}>💊 Treatment Steps</div>
                  {result.treatment.map((t: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: 11, color: '#374151' }}>
                      <span style={{ fontWeight: 700, color: '#16a34a', minWidth: 18 }}>{i + 1}.</span>
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              )}

              {result.prevention?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', marginBottom: 6 }}>🛡️ Prevention</div>
                  {result.prevention.map((p: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', fontSize: 11, color: '#374151' }}>
                      <span style={{ color: '#f59e0b' }}>•</span><span>{p}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── PANEL: ALERTS ────────────────────────────
function PanelAlerts() {
  const alerts = [
    { ac: '#ef4444', bg: '#fee2e2', icon: '💧', title: 'Irrigate Field A by 6 AM tomorrow',    desc: 'Soil moisture dropping. Wheat facing moisture stress.', time: '2h ago' },
    { ac: '#f97316', bg: '#fff7ed', icon: '🌡️', title: '35°C heatwave in 2 days — cover crops', desc: 'Use shade nets on Field A & B. Avoid afternoon field work.', time: '4h ago' },
    { ac: '#f59e0b', bg: '#fffbeb', icon: '🧪', title: 'Nitrogen level low in Field A',          desc: 'Apply 20 kg Urea per acre within 3 days.', time: '1d ago' },
    { ac: '#60a5fa', bg: '#eff6ff', icon: '🌧️', title: 'Rain expected Saturday',                 desc: 'Skip fertilizer on Friday evening.', time: '1d ago' },
    { ac: '#f97316', bg: '#fff7ed', icon: '🐛', title: 'Aphid risk high this season',             desc: 'Inspect wheat leaves weekly. Apply Neem spray.', time: '2d ago' },
  ];
  return (
    <div className="fs-panel">
      <div className="fs-card">
        <div className="fs-card-head">
          <div style={{ fontFamily: "Playfair Display, Georgia, serif", fontSize: 12, fontWeight: 700, color: '#374151' }}>◎ All Alerts</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['🚨 Urgent 2','#fee2e2','#b91c1c'],['⚠ Warning 1','#fef3c7','#b45309'],['ℹ Info 1','#eff6ff','#1d4ed8']].map(([l,bg,c]) => (
              <span key={l as string} style={{ fontSize: 10, background: bg as string, color: c as string, padding: '3px 8px', borderRadius: 4, fontWeight: 700, cursor: 'pointer' }}>{l}</span>
            ))}
          </div>
        </div>
        <div className="fs-card-body">
          {alerts.map(a => (
            <div key={a.title} className="fs-alert" style={{ borderLeftColor: a.ac, background: a.bg }}>
              <span style={{ fontSize: 15, marginTop: 1, flexShrink: 0 }}>{a.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', lineHeight: 1.4 }}>{a.title}</div>
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{a.desc}</div>
              </div>
              <span style={{ fontSize: 10, color: '#9ca3af', whiteSpace: 'nowrap', paddingTop: 2 }}>{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── PANEL: MARKET ────────────────────────────
function PanelMarket() {
  const products = [
    { emoji: '🌾', name: 'HD-2967 Wheat Seeds',    brand: 'IARI · Certified',       price: '₹480', old: '₹600', ai: false },
    { emoji: '🧪', name: 'Urea Fertilizer 50kg',   brand: 'IFFCO',                  price: '₹290', old: '₹350', ai: true  },
    { emoji: '🌿', name: 'Neem Oil Pesticide 1L',  brand: 'Urvaan Partner',          price: '₹180', old: '₹220', ai: false },
    { emoji: '💊', name: 'DAP Fertilizer 25kg',    brand: 'Coromandel',              price: '₹660', old: '₹750', ai: true  },
    { emoji: '🪴', name: 'FasalSetu Starter Kit',  brand: 'FasalSetu · Hardware',    price: '₹2,499',old:'₹3,000',ai: false },
    { emoji: '🌱', name: 'Mustard RH-30 Seeds',    brand: 'Mahyco · Certified',      price: '₹350', old: '₹420', ai: false },
  ];
  return (
    <div className="fs-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: '#fffbeb', border: '1px solid rgba(245,158,11,.2)', borderRadius: 12, padding: '10px 14px', fontSize: 11, color: '#b45309' }}>
        ⭐ <strong>AI Recommended for you:</strong> Based on low Nitrogen & Phosphorus in Field A — Urea and DAP are shown first.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {products.map(p => (
          <div key={p.name} className="fs-mcard">
            <div style={{ height: 80, background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, borderBottom: '1px solid #e5e7eb' }}>{p.emoji}</div>
            <div style={{ padding: '11px 13px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#111827' }}>{p.name}</div>
              <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2 }}>{p.brand}</div>
              {p.ai && <div style={{ fontSize: 9, background: '#fef3c7', color: '#b45309', fontWeight: 600, padding: '2px 6px', borderRadius: 3, marginTop: 3, display: 'inline-block' }}>⭐ AI Pick</div>}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 }}>
                <div>
                  <div style={{ fontFamily: "Playfair Display, Georgia, serif", fontSize: 14, fontWeight: 800, color: '#22c55e' }}>{p.price}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af', textDecoration: 'line-through', marginTop: 1 }}>{p.old}</div>
                </div>
                <div style={{ background: '#dcfce7', border: '1px solid rgba(34,197,94,.2)', color: '#15803d', fontSize: 10, fontWeight: 700, padding: '5px 10px', borderRadius: 6, cursor: 'pointer' }}>+ Add</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PANEL: COMMUNITY ─────────────────────────
function PanelCommunity() {
  const events = [
    { type: 'Workshop', typeC: '#15803d', title: 'Smart Irrigation Workshop', date: 'Apr 2', loc: 'Hisar, HR',   desc: 'Learn drip irrigation with FasalSetu sensors.' },
    { type: 'Quiz',     typeC: '#6d28d9', title: 'Smart Farming Quiz',        date: 'Apr 5', loc: 'Win ₹500',   desc: 'Test your agricultural knowledge. Win prizes!' },
    { type: 'Kit Drive',typeC: '#b45309', title: 'Free Kit Distribution',     date: 'Apr 10',loc: 'Rohtak, HR', desc: '50 free growing kits for rural school students.' },
    { type: 'School',   typeC: '#1d4ed8', title: 'AgriTech Awareness Drive',  date: 'Apr 15',loc: 'Panipat, HR',desc: 'Interactive FasalSetu demo for Class 8–10.' },
  ];
  return (
    <div className="fs-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {[
          { icon: '👨‍🌾', val: '500+', label: 'Farmers Reached',      accent: '#22c55e' },
          { icon: '🏫',   val: '12',   label: 'School Drives Done',   accent: '#c084fc' },
          { icon: '🎁',   val: '48',   label: 'Free Kits Distributed',accent: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="fs-scard">
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: s.accent }} />
            <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontFamily: "Playfair Display, Georgia, serif", fontSize: 26, fontWeight: 800, color: '#111827' }}>{s.val}</div>
            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 5 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className="fs-card">
        <div className="fs-card-head"><div style={{ fontFamily: "Playfair Display, Georgia, serif", fontSize: 12, fontWeight: 700, color: '#374151' }}>📅 Upcoming Events</div></div>
        <div className="fs-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {events.map(e => (
              <div key={e.title} className="fs-ev">
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', color: e.typeC }}>🛠 {e.type}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginTop: 4 }}>{e.title}</div>
                <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#9ca3af', marginTop: 5 }}><span>📅 {e.date}</span><span>📍 {e.loc}</span></div>
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 6, lineHeight: 1.5 }}>{e.desc}</div>
                <div style={{ display: 'inline-block', marginTop: 10, background: '#f9fafb', border: '1px solid #e5e7eb', color: '#374151', fontSize: 10, fontWeight: 600, padding: '5px 12px', borderRadius: 6, cursor: 'pointer' }}>Join Free →</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PANEL: SETTINGS ──────────────────────────
function PanelSettings({ currentLanguage, onLanguageChange, onLogout }: { currentLanguage: string; onLanguageChange: (l: string) => void; onLogout?: () => void }) {
  const [toggles, setToggles] = useState({ irrigation: true, weather: true, pest: false, market: false });
  const tog = (k: keyof typeof toggles) => setToggles(t => ({ ...t, [k]: !t[k] }));
  return (
    <div className="fs-panel" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <div className="fs-card">
        <div className="fs-card-head"><div style={{ fontFamily: "Playfair Display, Georgia, serif", fontSize: 12, fontWeight: 700, color: '#374151' }}>⚙ Preferences</div></div>
        <div className="fs-card-body">
          {[
            { label: 'Irrigation Alerts', sub: 'Moisture drop warnings', key: 'irrigation' as const },
            { label: 'Weather Alerts',    sub: 'Heatwave, rain, wind',   key: 'weather'    as const },
            { label: 'Pest Alerts',       sub: 'Seasonal threat warnings',key: 'pest'      as const },
            { label: 'Marketplace Deals', sub: 'AI recommended discounts',key: 'market'    as const },
          ].map(r => (
            <div key={r.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#111827' }}>{r.label}</div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{r.sub}</div>
              </div>
              <div className={`fs-toggle${toggles[r.key] ? ' on' : ''}`} onClick={() => tog(r.key)} />
            </div>
          ))}
          <div style={{ paddingTop: 14 }}>
            <button onClick={onLogout} style={{ width: '100%', background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Logout</button>
          </div>
        </div>
      </div>
      <div className="fs-card">
        <div className="fs-card-head"><div style={{ fontFamily: "Playfair Display, Georgia, serif", fontSize: 12, fontWeight: 700, color: '#374151' }}>🪴 Your Plan</div></div>
        <div className="fs-card-body">
          <div style={{ background: '#dcfce7', border: '1px solid rgba(34,197,94,.15)', borderRadius: 8, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.6px' }}>Current Plan</div>
            <div style={{ fontFamily: "Playfair Display, Georgia, serif", fontSize: 20, fontWeight: 800, color: '#111827', marginTop: 4 }}>Free Plan</div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>5 alerts/month · Basic sensors · Limited AI</div>
          </div>
          {[
            { name: 'Pro Plan',            desc: 'Unlimited AI · Full NPK history · Priority alerts', price: '₹299', unit: '/month', featured: false },
            { name: 'Starter Hardware Kit',desc: 'Sensors + Kit + 3 months Pro included',            price: '₹2,499',unit: ' one-time', featured: true },
          ].map(p => (
            <div key={p.name} style={{ border: `1px solid ${p.featured ? 'rgba(245,158,11,.2)' : '#e5e7eb'}`, background: p.featured ? 'rgba(245,158,11,.03)' : 'transparent', borderRadius: 8, padding: 14, marginBottom: 8, cursor: 'pointer' }}>
              <div style={{ fontFamily: "Playfair Display, Georgia, serif", fontSize: 12, fontWeight: 700, color: '#111827' }}>{p.name}</div>
              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{p.desc}</div>
              <div style={{ fontFamily: "Playfair Display, Georgia, serif", fontSize: 20, fontWeight: 800, color: p.featured ? '#f59e0b' : '#22c55e', marginTop: 8 }}>{p.price}<span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 400 }}>{p.unit}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
