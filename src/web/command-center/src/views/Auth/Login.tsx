import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ParticleCanvas } from './ParticleCanvas';

type Step = 'credentials' | 'mfa';

// Demo credentials — in production these would be validated server-side
const DEMO_EMAIL = 'admin@echojunction.io';
const DEMO_PASSWORD = 'Echo@2024';
const DEMO_MFA_CODE = '123456';

export function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mfaDigits, setMfaDigits] = useState(['', '', '', '', '', '']);

  function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
        setStep('mfa');
      } else {
        setError('Invalid email or password. Try admin@echojunction.io / Echo@2024');
      }
    }, 900);
  }

  function handleMfaInput(idx: number, val: string) {
    if (!/^\d*$/.test(val)) return;
    const next = [...mfaDigits];
    next[idx] = val.slice(-1);
    setMfaDigits(next);
    setMfaCode(next.join(''));
    if (val && idx < 5) {
      const nextInput = document.getElementById(`mfa-${idx + 1}`);
      (nextInput as HTMLInputElement)?.focus();
    }
  }

  function handleMfaKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !mfaDigits[idx] && idx > 0) {
      const prev = document.getElementById(`mfa-${idx - 1}`);
      (prev as HTMLInputElement)?.focus();
    }
  }

  function handleMfa(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const code = mfaDigits.join('');
    if (code.length < 6) { setError('Please enter the 6-digit code.'); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (code === DEMO_MFA_CODE) {
        sessionStorage.setItem('ej_auth', 'true');
        navigate('/');
      } else {
        setError('Invalid code. Use 123456 for demo.');
        setMfaDigits(['', '', '', '', '', '']);
        setMfaCode('');
      }
    }, 800);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
      position: 'relative',
    }}>
      <ParticleCanvas />
      {/* Logo */}
      <div style={{ marginBottom: 32, textAlign: 'center', cursor: 'pointer', position: 'relative', zIndex: 1 }} onClick={() => navigate('/')}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 6 }}>
          <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
            <defs>
              <linearGradient id="ll1" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1"/><stop offset="0.5" stopColor="#8b5cf6"/><stop offset="1" stopColor="#06b6d4"/>
              </linearGradient>
              <linearGradient id="ll2" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop stopColor="#a5b4fc"/><stop offset="1" stopColor="#67e8f9"/>
              </linearGradient>
            </defs>
            <path d="M24 3 L42 13.5 L42 34.5 L24 45 L6 34.5 L6 13.5 Z" fill="url(#ll1)" opacity="0.15" stroke="url(#ll1)" strokeWidth="1.5"/>
            <path d="M24 10 L36 17 L36 31 L24 38 L12 31 L12 17 Z" fill="url(#ll1)" opacity="0.2" stroke="url(#ll2)" strokeWidth="1"/>
            <circle cx="24" cy="24" r="5" fill="url(#ll1)"/>
            <circle cx="24" cy="24" r="3" fill="white" opacity="0.9"/>
            <circle cx="24" cy="11" r="2.5" fill="url(#ll1)"/>
            <circle cx="35" cy="17.5" r="2.5" fill="url(#ll1)"/>
            <circle cx="35" cy="30.5" r="2.5" fill="url(#ll1)"/>
            <circle cx="24" cy="37" r="2.5" fill="url(#ll1)"/>
            <circle cx="13" cy="30.5" r="2.5" fill="url(#ll1)"/>
            <circle cx="13" cy="17.5" r="2.5" fill="url(#ll1)"/>
            <line x1="24" y1="19" x2="24" y2="13.5" stroke="url(#ll2)" strokeWidth="1.2" opacity="0.7"/>
            <line x1="28.2" y1="21.5" x2="32.8" y2="19" stroke="url(#ll2)" strokeWidth="1.2" opacity="0.7"/>
            <line x1="28.2" y1="26.5" x2="32.8" y2="29" stroke="url(#ll2)" strokeWidth="1.2" opacity="0.7"/>
            <line x1="24" y1="29" x2="24" y2="34.5" stroke="url(#ll2)" strokeWidth="1.2" opacity="0.7"/>
            <line x1="19.8" y1="26.5" x2="15.2" y2="29" stroke="url(#ll2)" strokeWidth="1.2" opacity="0.7"/>
            <line x1="19.8" y1="21.5" x2="15.2" y2="19" stroke="url(#ll2)" strokeWidth="1.2" opacity="0.7"/>
          </svg>
          <div>
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em', color: '#1d1d1f' }}>Echo</span>
            <span style={{
              fontSize: 22, fontWeight: 300, letterSpacing: '0.08em',
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}> Junction</span>
          </div>
        </div>
        <p style={{ fontSize: 12, color: '#86868b', letterSpacing: '0.02em', margin: 0 }}>Command Center</p>
      </div>

      {/* Card */}
      <div style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
        borderRadius: 20,
        padding: '40px 44px',
        width: '100%',
        maxWidth: 420,
        boxShadow: '0 4px 40px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
        border: '1px solid rgba(255,255,255,0.9)',
        position: 'relative',
        zIndex: 1,
      }}>
        {step === 'credentials' ? (
          <>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', margin: '0 0 6px' }}>
                Sign in
              </h1>
              <p style={{ fontSize: 14, color: '#86868b', margin: 0, letterSpacing: '-0.01em' }}>
                Access your Echo Junction Command Center
              </p>
            </div>

            <form onSubmit={handleCredentials}>
              {/* Email */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#1d1d1f', marginBottom: 6, letterSpacing: '-0.01em' }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@echojunction.io"
                  autoComplete="email"
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 10,
                    border: '1px solid rgba(0,0,0,0.15)', background: '#fafafa',
                    fontSize: 14, color: '#1d1d1f', fontFamily: 'inherit',
                    outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#6366f1';
                    e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)';
                    e.target.style.background = 'white';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(0,0,0,0.15)';
                    e.target.style.boxShadow = 'none';
                    e.target.style.background = '#fafafa';
                  }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: '#1d1d1f', letterSpacing: '-0.01em' }}>
                    Password
                  </label>
                  <button type="button" style={{ background: 'none', border: 'none', fontSize: 12, color: '#6366f1', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{
                      width: '100%', padding: '11px 44px 11px 14px', borderRadius: 10,
                      border: '1px solid rgba(0,0,0,0.15)', background: '#fafafa',
                      fontSize: 14, color: '#1d1d1f', fontFamily: 'inherit',
                      outline: 'none', boxSizing: 'border-box',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6366f1';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)';
                      e.target.style.background = 'white';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(0,0,0,0.15)';
                      e.target.style.boxShadow = 'none';
                      e.target.style.background = '#fafafa';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#86868b', padding: 0,
                    }}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8, marginBottom: 16,
                  background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                  fontSize: 13, color: '#dc2626', letterSpacing: '-0.01em',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '12px', borderRadius: 10,
                  background: loading ? 'rgba(99,102,241,0.6)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white', border: 'none', fontSize: 15, fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  letterSpacing: '-0.01em', transition: 'all 0.15s ease',
                  boxShadow: '0 2px 12px rgba(99,102,241,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {loading ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    Verifying...
                  </>
                ) : 'Continue →'}
              </button>
            </form>

            {/* Security badge */}
            <div style={{
              marginTop: 24, padding: '10px 14px', borderRadius: 10,
              background: 'rgba(52,199,89,0.06)', border: '1px solid rgba(52,199,89,0.2)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34c759" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/>
                <polyline points="9 12 11 14 15 10"/>
              </svg>
              <span style={{ fontSize: 12, color: '#34c759', fontWeight: 500 }}>
                256-bit SSL encrypted · SOC 2 compliant
              </span>
            </div>
          </>
        ) : (
          <>
            {/* MFA Step */}
            <div style={{ marginBottom: 28 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, marginBottom: 16,
                background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="5" y="11" width="14" height="10" rx="2"/>
                  <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
                  <circle cx="12" cy="16" r="1" fill="#6366f1"/>
                </svg>
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', margin: '0 0 6px' }}>
                Two-factor authentication
              </h1>
              <p style={{ fontSize: 14, color: '#86868b', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.5 }}>
                Enter the 6-digit code from your authenticator app to verify your identity.
              </p>
            </div>

            <form onSubmit={handleMfa}>
              {/* 6-digit input */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
                {mfaDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`mfa-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleMfaInput(idx, e.target.value)}
                    onKeyDown={(e) => handleMfaKeyDown(idx, e)}
                    style={{
                      width: 48, height: 56, textAlign: 'center',
                      fontSize: 22, fontWeight: 700, letterSpacing: 0,
                      borderRadius: 10, border: digit ? '2px solid #6366f1' : '1px solid rgba(0,0,0,0.15)',
                      background: digit ? 'rgba(99,102,241,0.05)' : '#fafafa',
                      color: '#1d1d1f', fontFamily: 'inherit', outline: 'none',
                      transition: 'all 0.15s ease',
                      boxShadow: digit ? '0 0 0 3px rgba(99,102,241,0.1)' : 'none',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6366f1';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)';
                    }}
                    onBlur={(e) => {
                      if (!digit) {
                        e.target.style.borderColor = 'rgba(0,0,0,0.15)';
                        e.target.style.boxShadow = 'none';
                      }
                    }}
                  />
                ))}
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8, marginBottom: 16,
                  background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                  fontSize: 13, color: '#dc2626', letterSpacing: '-0.01em',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || mfaDigits.join('').length < 6}
                style={{
                  width: '100%', padding: '12px', borderRadius: 10,
                  background: mfaDigits.join('').length < 6
                    ? 'rgba(99,102,241,0.3)'
                    : loading ? 'rgba(99,102,241,0.6)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white', border: 'none', fontSize: 15, fontWeight: 600,
                  cursor: mfaDigits.join('').length < 6 ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', letterSpacing: '-0.01em',
                  boxShadow: mfaDigits.join('').length === 6 ? '0 2px 12px rgba(99,102,241,0.35)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.15s ease',
                }}
              >
                {loading ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    Verifying...
                  </>
                ) : 'Verify & Sign In'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('credentials'); setError(''); setMfaDigits(['','','','','','']); }}
                style={{
                  width: '100%', marginTop: 10, padding: '10px', borderRadius: 10,
                  background: 'transparent', border: '1px solid rgba(0,0,0,0.12)',
                  color: '#86868b', fontSize: 14, cursor: 'pointer',
                  fontFamily: 'inherit', letterSpacing: '-0.01em', transition: 'all 0.15s ease',
                }}
              >
                ← Back to sign in
              </button>
            </form>

            {/* Demo hint */}
            <div style={{
              marginTop: 20, padding: '10px 14px', borderRadius: 10,
              background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)',
              fontSize: 12, color: '#6366f1', letterSpacing: '-0.01em',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Demo code: <strong>123456</strong>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <p style={{ marginTop: 24, fontSize: 12, color: '#aeaeb2', letterSpacing: '-0.01em', position: 'relative', zIndex: 1 }}>
        © 2026 Echo Junction · Privacy · Terms
      </p>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
