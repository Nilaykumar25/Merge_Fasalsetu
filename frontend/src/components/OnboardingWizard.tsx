import { useState } from 'react';
import { addCropCycle } from '../lib/crop-db';

interface OnboardingWizardProps {
  onComplete: (data: OnboardData) => void;
  onSkip: () => void;
  onBack?: () => void;
  initialStep?: number;
  prefillName?: string;
}

export interface OnboardData {
  name: string;
  phone: string;
  language: 'en' | 'hi';
  cropType: string;
  customCrop: string;
  farmSize: string;
  farmUnit: 'acres' | 'hectares';
  soilType: string;
  phase: string;
  plantingDate: string;
  kitChoice: 'have' | 'want' | 'none';
}

const CROPS = ['Wheat', 'Rice', 'Maize', 'Mustard', 'Chickpea', 'Lentil', 'Cotton', 'Sugarcane', 'Tomato', 'Potato', 'Onion', 'Other'];
const SOILS = ['Black (Regur)', 'Red & Laterite', 'Alluvial', 'Sandy', 'Loamy', 'Clay'];
const PHASES = [
  { id: 'pre-planting', label: 'Pre-Planting', icon: '🌱', desc: 'Preparing soil & field' },
  { id: 'planting',     label: 'Planting',     icon: '🌾', desc: 'Sowing seeds' },
  { id: 'post-planting',label: 'Post-Planting',icon: '🪴', desc: 'Early crop care' },
  { id: 'growth',       label: 'Plant Growth', icon: '🌿', desc: 'Crop development' },
  { id: 'harvest',      label: 'Harvest',      icon: '🎉', desc: 'Ready to harvest' },
];

const STEP_LABELS = ['Your Profile', 'Farm Details', 'Your Kit'];

export default function OnboardingWizard({ onComplete, onSkip, onBack, initialStep = 1, prefillName = '' }: OnboardingWizardProps) {
  const [step, setStep] = useState(initialStep);
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  const [form, setForm] = useState<OnboardData>({
    name: prefillName, phone: '', language: 'en',
    cropType: '', customCrop: '', farmSize: '', farmUnit: 'acres',
    soilType: '', phase: 'growth', plantingDate: '',
    kitChoice: 'none',
  });

  const set = (k: keyof OnboardData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const t = (en: string, hi: string) => lang === 'hi' ? hi : en;

  // ── Step validation ───────────────────────
  const step1Valid = form.name.trim().length >= 2 && form.phone.length === 10;
  const step2Valid = (form.cropType && form.cropType !== 'Other' || form.customCrop.trim()) && form.phase;
  const step3Valid = form.kitChoice !== 'none' || true; // optional

  // ── OTP flow — bypassed for now, auth to be integrated later ──
  const sendOtp = async () => {
    if (!step1Valid) return;
    setStep(2);
  };

  const verifyOtp = async () => {
    setOtpSent(false);
    setStep(2);
  };

  // ── Final submit ──────────────────────────
  const handleSubmit = async () => {
    setError(''); setLoading(true);
    try {
      const cropName = form.cropType === 'Other' ? form.customCrop : form.cropType;
      if (cropName && form.plantingDate) {
        await addCropCycle({
          crop_name: cropName,
          sowing_date: form.plantingDate,
          current_stage: form.phase,
        });
      }
      onComplete({ ...form, language: lang });
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  const cropName = form.cropType === 'Other' ? form.customCrop : form.cropType;

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 30% 0%, #dcfce7 0%, #f0fdf4 40%, #ffffff 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* Back to landing */}
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#6b7280', fontSize: 14, cursor: 'pointer', marginBottom: 20, padding: '4px 0' }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>←</span>
          {t('Back to home', 'होम पर वापस')}
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🌾</div>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 800, color: '#166534', marginBottom: 4 }}>Fasal Setu</div>
          <div style={{ fontSize: 14, color: '#6b7280' }}>{t('Smart farming, simplified', 'स्मार्ट खेती, सरल तरीके से')}</div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            {STEP_LABELS.map((label, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, marginBottom: 4, background: step > i + 1 ? '#16a34a' : step === i + 1 ? '#22c55e' : '#e5e7eb', color: step >= i + 1 ? '#fff' : '#9ca3af', transition: 'all 0.3s', boxShadow: step === i + 1 ? '0 0 0 4px rgba(34,197,94,0.2)' : 'none' }}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 11, color: step === i + 1 ? '#16a34a' : '#9ca3af', fontWeight: step === i + 1 ? 600 : 400 }}>{label}</span>
              </div>
            ))}
          </div>
          <div style={{ height: 4, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, #22c55e, #16a34a)', borderRadius: 4, width: `${((step - 1) / 2) * 100}%`, transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 24, padding: '32px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #f0fdf4' }}>

          {/* Lang toggle */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <button onClick={() => { setLang(l => l === 'en' ? 'hi' : 'en'); set('language', lang === 'en' ? 'hi' : 'en'); }} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, color: '#16a34a', cursor: 'pointer' }}>
              {lang === 'en' ? 'हिंदी' : 'English'}
            </button>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 12, padding: '10px 14px', fontSize: 13, marginBottom: 20 }}>{error}</div>
          )}

          {/* ── STEP 1: Profile ── */}
          {step === 1 && (
            <div>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 6 }}>{t('Tell us about yourself', 'अपने बारे में बताएं')}</h2>
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>{t('We\'ll personalise your experience', 'हम आपका अनुभव व्यक्तिगत बनाएंगे')}</p>

              <Field label={t('Your Name', 'आपका नाम')} icon="👤">
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder={t('e.g. Ramesh Kumar', 'जैसे रमेश कुमार')} style={inputStyle} />
              </Field>

              <Field label={t('Mobile Number', 'मोबाइल नंबर')} icon="📱">
                <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  <span style={{ background: '#f9fafb', border: '2px solid #e5e7eb', borderRight: 'none', borderRadius: '12px 0 0 12px', padding: '12px 14px', fontSize: 14, color: '#374151', fontWeight: 600 }}>+91</span>
                  <input value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit number" type="tel" style={{ ...inputStyle, borderRadius: '0 12px 12px 0', flex: 1 }} />
                </div>
              </Field>

              {!otpSent ? (
                <button onClick={sendOtp} disabled={!step1Valid || loading} style={{ ...btnPrimary, width: '100%', marginTop: 8, opacity: (!step1Valid || loading) ? 0.5 : 1 }}>
                  {loading ? t('Sending…', 'भेज रहे हैं…') : t('Send OTP →', 'OTP भेजें →')}
                </button>
              ) : (
                <>
                  <Field label={t('Enter OTP', 'OTP दर्ज करें')} icon="🔐">
                    <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" type="tel" style={{ ...inputStyle, textAlign: 'center', letterSpacing: 8, fontSize: 20 }} />
                  </Field>
                  <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>{t(`Code sent to +91 ${form.phone}`, `+91 ${form.phone} पर कोड भेजा`)}</p>
                  <button onClick={verifyOtp} disabled={otp.length !== 6 || loading} style={{ ...btnPrimary, width: '100%', opacity: (otp.length !== 6 || loading) ? 0.5 : 1 }}>
                    {loading ? t('Verifying…', 'जाँच रहे हैं…') : t('Verify & Continue →', 'सत्यापित करें →')}
                  </button>
                  <button onClick={() => setOtpSent(false)} style={{ ...btnGhost, width: '100%', marginTop: 8 }}>{t('← Change number', '← नंबर बदलें')}</button>
                </>
              )}

              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <button onClick={onSkip} style={{ fontSize: 13, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                  {t('Already registered? Skip →', 'पहले से पंजीकृत? छोड़ें →')}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Farm Details ── */}
          {step === 2 && (
            <div>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 6 }}>{t('Your Farm', 'आपका खेत')}</h2>
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>{t('Help us give you the right advice', 'सही सलाह के लिए जानकारी दें')}</p>

              {/* Crop type */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>🌾 {t('Crop Type', 'फसल का प्रकार')}</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {CROPS.map(c => (
                    <button key={c} onClick={() => set('cropType', c)} style={{ padding: '8px 4px', borderRadius: 10, border: `2px solid ${form.cropType === c ? '#22c55e' : '#e5e7eb'}`, background: form.cropType === c ? '#f0fdf4' : '#fff', color: form.cropType === c ? '#16a34a' : '#374151', fontSize: 13, fontWeight: form.cropType === c ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
                      {c}
                    </button>
                  ))}
                </div>
                {form.cropType === 'Other' && (
                  <input value={form.customCrop} onChange={e => set('customCrop', e.target.value)} placeholder={t('Enter crop name', 'फसल का नाम लिखें')} style={{ ...inputStyle, marginTop: 8 }} />
                )}
              </div>

              {/* Farm size */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>📐 {t('Farm Size (optional)', 'खेत का आकार (वैकल्पिक)')}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={form.farmSize} onChange={e => set('farmSize', e.target.value.replace(/\D/g, ''))} placeholder="e.g. 5" type="number" style={{ ...inputStyle, flex: 1 }} />
                  <select value={form.farmUnit} onChange={e => set('farmUnit', e.target.value)} style={{ ...inputStyle, width: 120 }}>
                    <option value="acres">Acres</option>
                    <option value="hectares">Hectares</option>
                  </select>
                </div>
              </div>

              {/* Soil type */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>🪨 {t('Soil Type (optional)', 'मिट्टी का प्रकार (वैकल्पिक)')}</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {SOILS.map(s => (
                    <button key={s} onClick={() => set('soilType', s)} style={{ padding: '8px 10px', borderRadius: 10, border: `2px solid ${form.soilType === s ? '#22c55e' : '#e5e7eb'}`, background: form.soilType === s ? '#f0fdf4' : '#fff', color: form.soilType === s ? '#16a34a' : '#374151', fontSize: 12, fontWeight: form.soilType === s ? 600 : 400, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Crop phase */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>📅 {t('Current Crop Phase', 'वर्तमान फसल चरण')}</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {PHASES.map(p => (
                    <button key={p.id} onClick={() => set('phase', p.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, border: `2px solid ${form.phase === p.id ? '#22c55e' : '#e5e7eb'}`, background: form.phase === p.id ? '#f0fdf4' : '#fff', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left' }}>
                      <span style={{ fontSize: 20 }}>{p.icon}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: form.phase === p.id ? '#16a34a' : '#111827' }}>{p.label}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{p.desc}</div>
                      </div>
                      {form.phase === p.id && <span style={{ marginLeft: 'auto', color: '#22c55e', fontSize: 16 }}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Planting date */}
              {form.phase !== 'pre-planting' && (
                <Field label={t('Date of Planting', 'बुवाई की तारीख')} icon="📆">
                  <input type="date" value={form.plantingDate} onChange={e => set('plantingDate', e.target.value)} max={new Date().toISOString().split('T')[0]} style={inputStyle} />
                </Field>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={() => setStep(1)} style={{ ...btnGhost, flex: 1 }}>← {t('Back', 'वापस')}</button>
                <button onClick={() => setStep(3)} disabled={!step2Valid} style={{ ...btnPrimary, flex: 2, opacity: !step2Valid ? 0.5 : 1 }}>
                  {t('Next →', 'अगला →')}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Kit + Confirm ── */}
          {step === 3 && (
            <div>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 6 }}>{t('IoT Sensor Kit', 'IoT सेंसर किट')}</h2>
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>{t('Do you have a Fasal Setu soil sensor?', 'क्या आपके पास फसल सेतु मिट्टी सेंसर है?')}</p>

              {[
                { id: 'have', icon: '📡', title: t('Yes, I have it', 'हाँ, मेरे पास है'), desc: t('Connect & start monitoring now', 'अभी कनेक्ट करें और निगरानी शुरू करें') },
                { id: 'want', icon: '🛒', title: t('I want to get one', 'मैं एक लेना चाहता हूँ'), desc: t('We\'ll help you order from our marketplace', 'हम मार्केटप्लेस से ऑर्डर में मदद करेंगे') },
                { id: 'none', icon: '📱', title: t('Not right now', 'अभी नहीं'), desc: t('Use AI features without a sensor', 'सेंसर के बिना AI सुविधाएं उपयोग करें') },
              ].map(opt => (
                <button key={opt.id} onClick={() => set('kitChoice', opt.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '14px 16px', borderRadius: 14, border: `2px solid ${form.kitChoice === opt.id ? '#22c55e' : '#e5e7eb'}`, background: form.kitChoice === opt.id ? '#f0fdf4' : '#fff', cursor: 'pointer', marginBottom: 10, transition: 'all 0.15s', textAlign: 'left' }}>
                  <span style={{ fontSize: 28, flexShrink: 0 }}>{opt.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: form.kitChoice === opt.id ? '#16a34a' : '#111827' }}>{opt.title}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{opt.desc}</div>
                  </div>
                  {form.kitChoice === opt.id && <span style={{ color: '#22c55e', fontSize: 18 }}>✓</span>}
                </button>
              ))}

              {/* Summary card */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '14px 16px', marginTop: 8, marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Summary</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 13, color: '#374151' }}>
                  <span style={{ color: '#6b7280' }}>Name</span><span style={{ fontWeight: 600 }}>{form.name}</span>
                  <span style={{ color: '#6b7280' }}>Phone</span><span style={{ fontWeight: 600 }}>+91 {form.phone}</span>
                  {cropName && <><span style={{ color: '#6b7280' }}>Crop</span><span style={{ fontWeight: 600 }}>{cropName}</span></>}
                  <span style={{ color: '#6b7280' }}>Phase</span><span style={{ fontWeight: 600 }}>{PHASES.find(p => p.id === form.phase)?.label}</span>
                  {form.farmSize && <><span style={{ color: '#6b7280' }}>Farm</span><span style={{ fontWeight: 600 }}>{form.farmSize} {form.farmUnit}</span></>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep(2)} style={{ ...btnGhost, flex: 1 }}>← {t('Back', 'वापस')}</button>
                <button onClick={handleSubmit} disabled={loading} style={{ ...btnPrimary, flex: 2, opacity: loading ? 0.7 : 1 }}>
                  {loading ? t('Setting up…', 'सेट हो रहा है…') : t('Start Farming 🌾', 'खेती शुरू करें 🌾')}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Trust strip */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 24, flexWrap: 'wrap' }}>
          {['🔒 Secure', '🌐 Hindi & English', '📡 IoT Ready'].map(item => (
            <span key={item} style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>{item}</span>
          ))}
        </div>

      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────
function Field({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={labelStyle}>{icon} {label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', background: '#f9fafb',
  border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 15,
  color: '#111827', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit', transition: 'border-color 0.15s',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8,
};

const btnPrimary: React.CSSProperties = {
  background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff',
  border: 'none', borderRadius: 12, padding: '13px 20px', fontSize: 15,
  fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
  fontFamily: 'inherit',
};

const btnGhost: React.CSSProperties = {
  background: '#f9fafb', color: '#374151', border: '2px solid #e5e7eb',
  borderRadius: 12, padding: '13px 20px', fontSize: 14,
  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
};
