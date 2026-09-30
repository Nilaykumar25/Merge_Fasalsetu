import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { C, radius, shadow } from '../tokens';
import { Btn, Badge } from '../components/ui';

type AuthMode = 'signin' | 'signup' | 'onboard';

interface SignupForm {
  email: string;
  password: string;
  name: string;
  phone: string;
  state: string;
  district: string;
  village: string;
  total_area_acres: number;
}

export default function Auth({ navigate }: { navigate: (s: string) => void }) {
  const { signIn, signUp, signInWithGoogle, farmer, isAuthenticated } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sign in form
  const [signinEmail, setSigninEmail] = useState('');
  const [signinPassword, setSigninPassword] = useState('');

  // Sign up form
  const [signupForm, setSignupForm] = useState<SignupForm>({
    email: '',
    password: '',
    name: '',
    phone: '',
    state: '',
    district: '',
    village: '',
    total_area_acres: 0,
  });

  // Auto-navigate to dashboard if already authenticated
  if (isAuthenticated && farmer) {
    setTimeout(() => navigate('dashboard'), 100);
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.bg }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.sageDeep, marginBottom: 12 }}>Welcome back, {farmer.name}!</div>
          <div style={{ fontSize: 14, color: C.ink }}>Redirecting to dashboard...</div>
        </div>
      </div>
    );
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signIn(signinEmail, signinPassword);
      navigate('dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signUp(signupForm.email, signupForm.password, {
        name: signupForm.name,
        phone: signupForm.phone,
        state: signupForm.state,
        district: signupForm.district,
        village: signupForm.village,
        total_area_acres: signupForm.total_area_acres,
      });
      setMode('signin');
      setSigninEmail(signupForm.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: C.bg,
        color: C.ink,
        fontFamily: 'var(--font-body)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 450,
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: radius.lg,
              background: `linear-gradient(135deg, ${C.sage} 0%, ${C.sageMid} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              color: '#fff',
              fontWeight: 700,
              margin: '0 auto 16px',
            }}
          >
            ◈
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, marginBottom: 8 }}>
            AnnaVriddhi
          </div>
          <div style={{ fontSize: 13, color: C.inkMuted, marginBottom: 4 }}>Farm Revenue Copilot</div>
          <div style={{ fontSize: 11, color: C.line }}>Real-time crop intelligence for Indian farmers</div>
        </div>

        {/* Form Container */}
        <div
          style={{
            background: C.surface,
            borderRadius: radius.xl,
            border: `1px solid ${C.line}`,
            boxShadow: shadow.card,
            padding: 32,
          }}
        >
          {/* Sign In Mode */}
          {mode === 'signin' && (
            <>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Sign In</div>
                <div style={{ fontSize: 13, color: C.inkMuted }}>
                  Access your farm dashboard
                </div>
              </div>

              <form onSubmit={handleSignIn} style={{ marginBottom: 20 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: C.ink }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={signinEmail}
                    onChange={(e) => setSigninEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: radius.md,
                      border: `1px solid ${C.line}`,
                      fontSize: 13,
                      fontFamily: 'var(--font-body)',
                      boxSizing: 'border-box',
                    }}
                    placeholder="you@example.com"
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: C.ink }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={signinPassword}
                    onChange={(e) => setSigninPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: radius.md,
                      border: `1px solid ${C.line}`,
                      fontSize: 13,
                      fontFamily: 'var(--font-body)',
                      boxSizing: 'border-box',
                    }}
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <div
                    style={{
                      background: `${C.rust}15`,
                      color: C.rust,
                      padding: '10px 12px',
                      borderRadius: radius.md,
                      fontSize: 12,
                      marginBottom: 16,
                    }}
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: radius.md,
                    border: 'none',
                    background: C.sage,
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <div style={{ textAlign: 'center', fontSize: 13 }}>
                Don't have an account?{' '}
                <button
                  onClick={() => setMode('signup')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: C.sage,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontFamily: 'var(--font-body)',
                    textDecoration: 'underline',
                  }}
                >
                  Create one
                </button>
              </div>

              {/* Social Sign In */}
              <div style={{ marginTop: 24, paddingTop: 24, borderTop: `1px solid ${C.line}` }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.inkMuted, textAlign: 'center', marginBottom: 16, letterSpacing: '0.05em' }}>
                  OR CONTINUE WITH
                </div>
                <button
                  onClick={async () => {
                    setLoading(true);
                    setError(null);
                    try {
                      await signInWithGoogle();
                      // Navigation will happen automatically via AppContent useEffect
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Google sign in failed');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    padding: '12px 16px',
                    borderRadius: radius.md,
                    border: `1.5px solid ${C.line}`,
                    background: C.surface,
                    color: C.ink,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                    fontFamily: 'var(--font-body)',
                    transition: 'all 0.15s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      (e.currentTarget as HTMLElement).style.background = C.bg;
                      (e.currentTarget as HTMLElement).style.borderColor = C.lineStrong;
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 4px rgba(0,0,0,0.08)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = C.surface;
                    (e.currentTarget as HTMLElement).style.borderColor = C.line;
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </div>
            </>
          )}

          {/* Sign Up Mode */}
          {mode === 'signup' && (
            <>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Create Account</div>
                <div style={{ fontSize: 13, color: C.inkMuted }}>
                  Join AnnaVriddhi today
                </div>
              </div>

              <form onSubmit={handleSignUp} style={{ marginBottom: 20 }}>
                {/* Basic Info */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: C.ink }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={signupForm.name}
                    onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: radius.md,
                      border: `1px solid ${C.line}`,
                      fontSize: 13,
                      fontFamily: 'var(--font-body)',
                      boxSizing: 'border-box',
                    }}
                    placeholder="Ramesh Kumar"
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: C.ink }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: radius.md,
                      border: `1px solid ${C.line}`,
                      fontSize: 13,
                      fontFamily: 'var(--font-body)',
                      boxSizing: 'border-box',
                    }}
                    placeholder="ramesh@farm.com"
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: C.ink }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: radius.md,
                      border: `1px solid ${C.line}`,
                      fontSize: 13,
                      fontFamily: 'var(--font-body)',
                      boxSizing: 'border-box',
                    }}
                    placeholder="••••••••"
                  />
                </div>

                {/* Location Info */}
                <div style={{ marginBottom: 4, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.inkMuted }}>
                  Location
                </div>

                <div style={{ marginBottom: 16 }}>
                  <input
                    type="text"
                    value={signupForm.state}
                    onChange={(e) => setSignupForm({ ...signupForm, state: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: radius.md,
                      border: `1px solid ${C.line}`,
                      fontSize: 13,
                      fontFamily: 'var(--font-body)',
                      boxSizing: 'border-box',
                    }}
                    placeholder="State (e.g., Maharashtra)"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <input
                    type="text"
                    value={signupForm.district}
                    onChange={(e) => setSignupForm({ ...signupForm, district: e.target.value })}
                    style={{
                      padding: '10px 12px',
                      borderRadius: radius.md,
                      border: `1px solid ${C.line}`,
                      fontSize: 13,
                      fontFamily: 'var(--font-body)',
                      boxSizing: 'border-box',
                    }}
                    placeholder="District"
                  />
                  <input
                    type="text"
                    value={signupForm.village}
                    onChange={(e) => setSignupForm({ ...signupForm, village: e.target.value })}
                    style={{
                      padding: '10px 12px',
                      borderRadius: radius.md,
                      border: `1px solid ${C.line}`,
                      fontSize: 13,
                      fontFamily: 'var(--font-body)',
                      boxSizing: 'border-box',
                    }}
                    placeholder="Village"
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <input
                    type="number"
                    value={signupForm.total_area_acres || ''}
                    onChange={(e) => setSignupForm({ ...signupForm, total_area_acres: parseFloat(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: radius.md,
                      border: `1px solid ${C.line}`,
                      fontSize: 13,
                      fontFamily: 'var(--font-body)',
                      boxSizing: 'border-box',
                    }}
                    placeholder="Total farm area (acres)"
                  />
                </div>

                {error && (
                  <div
                    style={{
                      background: `${C.rust}15`,
                      color: C.rust,
                      padding: '10px 12px',
                      borderRadius: radius.md,
                      fontSize: 12,
                      marginBottom: 16,
                    }}
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: radius.md,
                    border: 'none',
                    background: C.sage,
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>

              <div style={{ textAlign: 'center', fontSize: 13 }}>
                Already have an account?{' '}
                <button
                  onClick={() => setMode('signin')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: C.sage,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontFamily: 'var(--font-body)',
                    textDecoration: 'underline',
                  }}
                >
                  Sign in
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 24,
            textAlign: 'center',
            fontSize: 11,
            color: C.inkMuted,
          }}
        >
          By signing up, you agree to our Terms of Service and Privacy Policy
        </div>
      </div>
    </div>
  );
}
