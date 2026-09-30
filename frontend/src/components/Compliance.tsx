import React from 'react';
/**
 * Compliance.tsx — Pesticide Safety & Audit Panel
 * Powered by compliance/guardrail.py + banned_pesticides.json
 * Backend: POST localhost:8000/compliance/check
 *          GET  localhost:8000/compliance/lists
 *          GET  localhost:8000/audit-log
 */
import { useState, useEffect } from 'react';
import { Search, Loader2, ShieldCheck, ShieldAlert, ShieldX, ClipboardList } from 'lucide-react';

const API = (import.meta as any).env?.VITE_SOIL_NPK_API_URL ?? 'http://localhost:8000';

// ── Static fallback data (mirrors banned_pesticides.json) ─────────────────
const BANNED_STATIC = [
  'Endosulfan','Monocrotophos','Methyl Parathion','Phosphamidon',
  'Triazophos','Chlorpyrifos','Dichlorvos','Aluminium Phosphide',
  'Methomyl','Carbofuran','Aldrin','Dieldrin','DDT',
];
const RESTRICTED_STATIC: Record<string,string> = {
  'Glyphosate':   'Not permitted on food crops without state approval',
  'Atrazine':     'Restricted to maize and sugarcane only',
  '2,4-D':        'Do not apply within 100m of water bodies',
  'Cypermethrin': 'Do not apply during flowering — toxic to pollinators',
};

interface CheckResult {
  status: 'BANNED'|'RESTRICTED'|'LICENSE_REQUIRED'|'SAFE';
  pesticide: string;
  message: string;
  alternatives: string;
}
interface AuditEntry {
  timestamp: string;
  agent: string;
  violations: string[];
  warnings: string[];
  blocked: boolean;
}

const STATUS_CONFIG = {
  BANNED:           { icon: <ShieldX size={20}/>,     bg:'#fee2e2', border:'#fca5a5', color:'#b91c1c', label:'BANNED'           },
  RESTRICTED:       { icon: <ShieldAlert size={20}/>,  bg:'#fef3c7', border:'#fcd34d', color:'#b45309', label:'RESTRICTED'       },
  LICENSE_REQUIRED: { icon: <ShieldAlert size={20}/>,  bg:'#dbeafe', border:'#93c5fd', color:'#1d4ed8', label:'LICENSE REQUIRED' },
  SAFE:             { icon: <ShieldCheck size={20}/>,  bg:'#dcfce7', border:'#86efac', color:'#15803d', label:'SAFE'             },
};

export default function Compliance() {
  const [query, setQuery]       = useState('');
  const [result, setResult]     = useState<CheckResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [lists, setLists]       = useState<{ banned: string[]; restricted: Record<string,string>; license_required?: string[] } | null>(null);
  const [audit, setAudit]       = useState<AuditEntry[]>([]);
  const [tab, setTab]           = useState<'check'|'lists'|'audit'>('check');

  // Load lists + audit on mount
  useEffect(() => {
    fetch(`${API}/compliance/lists`)
      .then(r => r.json()).then(setLists)
      .catch(() => setLists({ banned: BANNED_STATIC, restricted: RESTRICTED_STATIC }));
    fetch(`${API}/audit-log?last_n=20`)
      .then(r => r.json()).then(d => setAudit(d.entries ?? []))
      .catch(() => {});
  }, []);

  const check = async (name = query.trim()) => {
    if (!name) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`${API}/compliance/check`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pesticide_name: name }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      setResult(await res.json());
    } catch (e: any) {
      // Offline fallback — check against static lists
      const n = name.toLowerCase();
      const banned = BANNED_STATIC.map(b => b.toLowerCase());
      const restricted = Object.fromEntries(Object.entries(RESTRICTED_STATIC).map(([k,v]) => [k.toLowerCase(),v]));
      if (banned.includes(n)) {
        setResult({ status:'BANNED', pesticide:name, message:`'${name}' is BANNED under the Insecticides Act 1968.`, alternatives:'Use neem oil, Trichoderma, or consult your local KVK.' });
      } else if (restricted[n]) {
        setResult({ status:'RESTRICTED', pesticide:name, message:restricted[n], alternatives:'Use with caution and follow state guidelines.' });
      } else {
        setResult({ status:'SAFE', pesticide:name, message:`'${name}' is not on the banned or restricted list.`, alternatives:'' });
      }
    } finally { setLoading(false); }
  };

  const activeLists = {
    banned:           (lists?.banned           ?? BANNED_STATIC),
    restricted:       (lists?.restricted       ?? RESTRICTED_STATIC),
    license_required: (lists?.license_required ?? []),
  };

  return (
    <div className="fs-panel" style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#1e3a5f,#1d4ed8)', borderRadius:12, padding:'16px 20px', display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ fontSize:36 }}>🛡️</div>
        <div>
          <div style={{ fontFamily:'Playfair Display,Georgia,serif', fontSize:16, fontWeight:700, color:'#fff' }}>Pesticide Compliance Checker</div>
          <div style={{ fontSize:12, color:'#93c5fd', marginTop:3 }}>Powered by Insecticides Act 1968 · guardrail.py · banned_pesticides.json</div>
        </div>
        <div style={{ marginLeft:'auto', background:'rgba(255,255,255,.12)', borderRadius:20, padding:'4px 12px', fontSize:11, fontWeight:600, color:'#bfdbfe' }}>
          {activeLists.banned.length} banned · {Object.keys(activeLists.restricted).length} restricted
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'#f3f4f6', borderRadius:10, padding:4 }}>
        {([['check','🔍 Check Pesticide'],['lists','📋 Banned List'],['audit','📊 Audit Log']] as const).map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex:1, padding:'8px 0', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background: tab===id?'#fff':'transparent', color: tab===id?'#1d4ed8':'#6b7280', boxShadow: tab===id?'0 1px 4px rgba(0,0,0,.1)':'none', transition:'all .15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Check ── */}
      {tab === 'check' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className="fs-card">
            <div className="fs-card-head">
              <div style={{ fontFamily:'Playfair Display,Georgia,serif', fontSize:12, fontWeight:700, color:'#374151' }}>🔍 Check a Pesticide</div>
            </div>
            <div className="fs-card-body" style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'flex', gap:8 }}>
                <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key==='Enter' && check()}
                  placeholder="Enter pesticide name (e.g. Endosulfan, Glyphosate…)"
                  style={{ flex:1, padding:'10px 14px', border:'1.5px solid #e5e7eb', borderRadius:8, fontSize:13, color:'#111827', background:'#fff', outline:'none' }} />
                <button onClick={() => check()} disabled={!query.trim()||loading}
                  style={{ padding:'10px 20px', borderRadius:8, background: query.trim()?'linear-gradient(135deg,#1e3a5f,#1d4ed8)':'#e5e7eb', color: query.trim()?'#fff':'#9ca3af', border:'none', cursor: query.trim()?'pointer':'default', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                  {loading ? <Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/> : <Search size={14}/>}
                  {loading ? 'Checking…' : 'Check'}
                </button>
              </div>

              {/* Quick check chips */}
              <div>
                <div style={{ fontSize:10, color:'#9ca3af', fontWeight:600, marginBottom:6 }}>QUICK CHECK</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {['Endosulfan','Chlorpyrifos','Glyphosate','Neem Oil','Carbofuran','Atrazine'].map(p => (
                    <button key={p} onClick={() => { setQuery(p); check(p); }}
                      style={{ fontSize:11, padding:'4px 10px', borderRadius:20, background:'#f0f9ff', border:'1px solid #bae6fd', color:'#0369a1', cursor:'pointer', fontWeight:500 }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Result */}
          {result && (() => {
            const cfg = STATUS_CONFIG[result.status];
            return (
              <div style={{ background:cfg.bg, border:`1.5px solid ${cfg.border}`, borderRadius:12, overflow:'hidden' }}>
                <div style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ color:cfg.color }}>{cfg.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:cfg.color }}>{result.pesticide} — {cfg.label}</div>
                    <div style={{ fontSize:12, color:'#374151', marginTop:3, lineHeight:1.6 }}>{result.message}</div>
                  </div>
                </div>
                {result.alternatives && (
                  <div style={{ padding:'10px 18px', borderTop:`1px solid ${cfg.border}`, background:'rgba(255,255,255,.5)', fontSize:12, color:'#374151', lineHeight:1.6 }}>
                    <span style={{ fontWeight:700, color:'#15803d' }}>✅ Safe Alternative: </span>{result.alternatives}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Tab: Lists ── */}
      {tab === 'lists' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          {/* Banned */}
          <div className="fs-card">
            <div className="fs-card-head">
              <div style={{ fontFamily:'Playfair Display,Georgia,serif', fontSize:12, fontWeight:700, color:'#b91c1c' }}>🚫 Banned Pesticides</div>
              <span style={{ fontSize:10, background:'#fee2e2', color:'#b91c1c', padding:'2px 8px', borderRadius:20, fontWeight:600 }}>{activeLists.banned.length} substances</span>
            </div>
            <div className="fs-card-body" style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {activeLists.banned.map(p => (
                <div key={p} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 10px', background:'#fff5f5', border:'1px solid #fecaca', borderRadius:8 }}>
                  <span style={{ fontSize:12, fontWeight:600, color:'#991b1b' }}>{p}</span>
                  <span style={{ fontSize:9, fontWeight:700, background:'#fee2e2', color:'#b91c1c', padding:'2px 7px', borderRadius:20 }}>BANNED</span>
                </div>
              ))}
              <div style={{ fontSize:10, color:'#9ca3af', marginTop:4, lineHeight:1.6 }}>
                Source: Insecticides Act 1968 · Ministry of Agriculture, Govt. of India
              </div>
            </div>
          </div>

          {/* Restricted */}
          <div className="fs-card">
            <div className="fs-card-head">
              <div style={{ fontFamily:'Playfair Display,Georgia,serif', fontSize:12, fontWeight:700, color:'#b45309' }}>⚠️ Restricted Use</div>
              <span style={{ fontSize:10, background:'#fef3c7', color:'#b45309', padding:'2px 8px', borderRadius:20, fontWeight:600 }}>{Object.keys(activeLists.restricted).length} substances</span>
            </div>
            <div className="fs-card-body" style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {Object.entries(activeLists.restricted).map(([name, rule]) => (
                <div key={name} style={{ padding:'10px 12px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#92400e', marginBottom:3 }}>{name}</div>
                  <div style={{ fontSize:11, color:'#78350f', lineHeight:1.5 }}>{rule}</div>
                </div>
              ))}
              {activeLists.license_required && activeLists.license_required.length > 0 && (
                <>
                  <div style={{ fontSize:10, fontWeight:700, color:'#1d4ed8', marginTop:4 }}>🔑 LICENSE REQUIRED</div>
                  {activeLists.license_required.map(p => (
                    <div key={p} style={{ padding:'8px 10px', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, fontSize:12, fontWeight:600, color:'#1e40af' }}>{p}</div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Audit Log ── */}
      {tab === 'audit' && (
        <div className="fs-card">
          <div className="fs-card-head">
            <div style={{ fontFamily:'Playfair Display,Georgia,serif', fontSize:12, fontWeight:700, color:'#374151' }}>
              <ClipboardList size={14} style={{ display:'inline', marginRight:6 }} />
              Compliance Audit Log
            </div>
            <span style={{ fontSize:10, color:'#9ca3af' }}>Last {audit.length} entries</span>
          </div>
          <div className="fs-card-body">
            {audit.length === 0 ? (
              <div style={{ textAlign:'center', padding:32, color:'#9ca3af', fontSize:13 }}>
                No audit entries yet. Start the backend and use the AI Advisor to generate logs.
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {audit.length === 0 ? (
                  <div style={{ padding:'20px', textAlign:'center', color:'#9ca3af', fontSize:13 }}>
                    No audit entries yet. Compliance checks will appear here.
                  </div>
                ) : (
                  [...audit].reverse().map((e, i) => {
                    const violations = e.violations || [];
                    const warnings = e.warnings || [];
                    return (
                      <div key={i} style={{ padding:'10px 14px', borderRadius:8, background: e.blocked?'#fff5f5':warnings.length?'#fffbeb':'#f0fdf4', border:`1px solid ${e.blocked?'#fecaca':warnings.length?'#fde68a':'#bbf7d0'}` }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                          <span style={{ fontSize:11, fontWeight:700, color: e.blocked?'#b91c1c':warnings.length?'#b45309':'#15803d' }}>
                            {e.blocked ? '🚫 BLOCKED' : warnings.length ? '⚠️ WARNING' : '✅ PASSED'}
                          </span>
                          <span style={{ fontSize:10, color:'#9ca3af' }}>{e.timestamp} · {e.agent}</span>
                        </div>
                        {violations.map((v,j) => <div key={j} style={{ fontSize:11, color:'#b91c1c', lineHeight:1.5 }}>{v}</div>)}
                        {warnings.map((w,j) => <div key={j} style={{ fontSize:11, color:'#b45309', lineHeight:1.5 }}>{w}</div>)}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
