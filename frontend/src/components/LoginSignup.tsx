import React, { useState } from 'react';
import { Phone, ArrowRight, Leaf, BarChart3, CloudSun, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { signInWithGoogle } from '../lib/firebase';

interface LoginSignupProps {
  onLoginSuccess: (googleName?: string) => void;
}

const FEATURES = [
  { icon: <Leaf size={18} />,       text: 'AI-powered crop advisory in your language' },
  { icon: <BarChart3 size={18} />,  text: 'Real-time NPK & soil health analysis' },
  { icon: <CloudSun size={18} />,   text: 'Weather alerts & irrigation guidance' },
  { icon: <ShieldCheck size={18} />,text: 'Government scheme finder & mandi prices' },
];

export default function LoginSignup({ onLoginSuccess }: LoginSignupProps) {
  const [phone, setPhone]             = useState('');
  const [otp, setOtp]                 = useState('');
  const [showOtp, setShowOtp]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]             = useState('');

  const handleGoogle = async () => {
    setGoogleLoading(true); setError('');
    try {
      const user = await signInWithGoogle();
      onLoginSuccess(user.displayName ?? '');
    }
    catch (e: any) { setError(e.message || 'Google sign-in failed.'); }
    finally { setGoogleLoading(false); }
  };

  const handleSendOtp = async () => {
    if (phone.length !== 10) return;
    setLoading(true); setError('');
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: `+91${phone}`, options: { channel: 'sms' } });
      if (error) throw error;
      setShowOtp(true);
    } catch (e: any) { setError(e.message || 'Failed to send OTP.'); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setLoading(true); setError('');
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone: `+91${phone}`, token: otp, type: 'sms' });
      if (error) throw error;
      if (data.user) onLoginSuccess(); // phone → welcome screen
    } catch (e: any) { setError(e.message || 'Invalid OTP.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Left panel — branding ── */}
      <div style={{
        flex: '0 0 45%', background: 'linear-gradient(160deg, #14532d 0%, #166534 40%, #15803d 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 56px', position: 'relative', overflow: 'hidden',
      }}>
        {/* decorative circles */}
        <div style={{ position:'absolute', top:-80, right:-80, width:320, height:320, borderRadius:'50%', background:'rgba(255,255,255,.04)' }} />
        <div style={{ position:'absolute', bottom:-60, left:-60, width:240, height:240, borderRadius:'50%', background:'rgba(255,255,255,.04)' }} />

        {/* Logo mark */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:48 }}>
          <div style={{ width:44, height:44, background:'rgba(255,255,255,.15)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🌾</div>
          <span style={{ fontSize:22, fontWeight:800, color:'#fff', letterSpacing:'-.5px' }}>FasalSetu</span>
        </div>

        <h1 style={{ fontSize:36, fontWeight:800, color:'#fff', lineHeight:1.2, marginBottom:16, letterSpacing:'-.5px' }}>
          Smart farming<br />starts here.
        </h1>
        <p style={{ fontSize:16, color:'rgba(255,255,255,.7)', lineHeight:1.7, marginBottom:48, maxWidth:340 }}>
          AI-powered advisory for Indian farmers — soil health, crop disease, market prices & government schemes in one place.
        </p>

        {/* Feature list */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {FEATURES.map(f => (
            <div key={f.text} style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:34, height:34, borderRadius:8, background:'rgba(255,255,255,.12)', display:'flex', alignItems:'center', justifyContent:'center', color:'#86efac', flexShrink:0 }}>
                {f.icon}
              </div>
              <span style={{ fontSize:14, color:'rgba(255,255,255,.8)', lineHeight:1.4 }}>{f.text}</span>
            </div>
          ))}
        </div>

        {/* Bottom stat strip */}
        <div style={{ display:'flex', gap:32, marginTop:56 }}>
          {[['500+','Farmers'],['64','Govt Schemes'],['8','Languages']].map(([val, label]) => (
            <div key={label}>
              <div style={{ fontSize:22, fontWeight:800, color:'#fff' }}>{val}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.55)', marginTop:2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div style={{
        flex: 1, background: '#f8fdf9', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '40px 32px',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Header */}
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: '#14532d', marginBottom: 8, letterSpacing: '-.4px' }}>
              {showOtp ? 'Enter OTP' : 'Sign in'}
            </h2>
            <p style={{ fontSize: 14, color: '#6b7280' }}>
              {showOtp
                ? `We sent a 6-digit code to +91 ${phone}`
                : 'Welcome back! Sign in to your FasalSetu account.'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', color:'#b91c1c', padding:'10px 14px', borderRadius:10, fontSize:13, marginBottom:20 }}>
              {error}
            </div>
          )}

          {!showOtp ? (<>

            {/* Google button */}
            <button onClick={handleGoogle} disabled={googleLoading}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'13px 16px', background:'#fff', border:'1.5px solid #e5e7eb', borderRadius:12, cursor: googleLoading?'default':'pointer', fontSize:15, fontWeight:600, color:'#374151', boxShadow:'0 1px 4px rgba(0,0,0,.06)', transition:'all .2s', marginBottom:20, opacity: googleLoading?.6:1 }}>
              {googleLoading ? (
                <span style={{ color:'#9ca3af' }}>Signing in…</span>
              ) : (<>
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Continue with Google
              </>)}
            </button>

            {/* Divider */}
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
              <div style={{ flex:1, height:1, background:'#e5e7eb' }} />
              <span style={{ fontSize:12, color:'#9ca3af', fontWeight:500 }}>or continue with phone</span>
              <div style={{ flex:1, height:1, background:'#e5e7eb' }} />
            </div>

            {/* Phone input */}
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>Mobile Number</label>
              <div style={{ display:'flex', border:'1.5px solid #d1d5db', borderRadius:12, overflow:'hidden', background:'#fff', transition:'border-color .2s', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, padding:'0 14px', background:'#f9fafb', borderRight:'1.5px solid #e5e7eb', color:'#6b7280', fontSize:14, fontWeight:500, flexShrink:0 }}>
                  <Phone size={15} />
                  <span>+91</span>
                </div>
                <input
                  type="tel" maxLength={10} value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g,''))}
                  placeholder="Enter 10-digit number"
                  style={{ flex:1, padding:'13px 14px', border:'none', outline:'none', fontSize:15, color:'#111827', background:'transparent' }}
                />
              </div>
            </div>

            <button onClick={handleSendOtp} disabled={phone.length!==10||loading}
              style={{ width:'100%', padding:'13px', background: phone.length===10?'linear-gradient(135deg,#15803d,#16a34a)':'#e5e7eb', color: phone.length===10?'#fff':'#9ca3af', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor: phone.length===10?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow: phone.length===10?'0 4px 14px rgba(22,163,74,.3)':'none', transition:'all .2s' }}>
              {loading ? 'Sending…' : <><span>Send OTP</span><ArrowRight size={16} /></>}
            </button>

          </>) : (<>

            {/* OTP input */}
            <div style={{ marginBottom:16 }}>
              <input
                type="tel" maxLength={6} value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g,''))}
                placeholder="• • • • • •"
                style={{ width:'100%', padding:'16px', border:'1.5px solid #d1d5db', borderRadius:12, fontSize:28, fontWeight:700, textAlign:'center', letterSpacing:16, outline:'none', background:'#fff', color:'#111827', boxSizing:'border-box', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}
              />
            </div>

            <button onClick={handleVerifyOtp} disabled={otp.length!==6||loading}
              style={{ width:'100%', padding:'13px', background: otp.length===6?'linear-gradient(135deg,#15803d,#16a34a)':'#e5e7eb', color: otp.length===6?'#fff':'#9ca3af', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor: otp.length===6?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow: otp.length===6?'0 4px 14px rgba(22,163,74,.3)':'none', transition:'all .2s', marginBottom:12 }}>
              {loading ? 'Verifying…' : <><span>Verify & Continue</span><ArrowRight size={16} /></>}
            </button>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <button onClick={() => { setShowOtp(false); setOtp(''); }} style={{ fontSize:13, color:'#6b7280', background:'none', border:'none', cursor:'pointer' }}>
                ← Change number
              </button>
              <button onClick={handleSendOtp} style={{ fontSize:13, color:'#16a34a', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>
                Resend OTP
              </button>
            </div>

          </>)}

          {/* Footer */}
          <p style={{ fontSize:12, color:'#9ca3af', textAlign:'center', marginTop:32, lineHeight:1.6 }}>
            By continuing, you agree to FasalSetu's Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
