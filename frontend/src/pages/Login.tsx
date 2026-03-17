import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogin, useMfaChallenge, useMfaEnroll, useMfaVerify } from '../api/hooks';
import { ShieldAlert, QrCode } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const login = useLogin();
  const mfaChallenge = useMfaChallenge();
  const mfaEnroll = useMfaEnroll();
  const mfaVerify = useMfaVerify();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  type Step = 'credentials' | 'mfa_challenge' | 'mfa_enroll';
  const [step, setStep] = useState<Step>('credentials');
  const [totpCode, setTotpCode] = useState('');
  const [enrollData, setEnrollData] = useState<{ qr_code_data_url: string; otpauth_url: string } | null>(null);

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const data = await login.mutateAsync({ username, password });
      if (data.mfa_required && data.enrolled) {
        setStep('mfa_challenge');
      } else if (data.mfa_required && !data.enrolled) {
        // Start enrollment — server already stored a new TOTP secret for the user
        const enrollment = await mfaEnroll.mutateAsync();
        setEnrollData(enrollment);
        setStep('mfa_enroll');
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invalid credentials';
      setError(msg);
    }
  }

  async function handleChallengeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await mfaChallenge.mutateAsync({ token: totpCode });
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invalid MFA code';
      setError(msg);
      setTotpCode('');
    }
  }

  async function handleEnrollVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await mfaVerify.mutateAsync({ token: totpCode });
      // Enrollment confirmed — now challenge (user needs to prove they can generate codes)
      setTotpCode('');
      setEnrollData(null);
      setStep('mfa_challenge');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invalid TOTP code';
      setError(msg);
      setTotpCode('');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg-base)' }}>
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <ShieldAlert size={40} className="text-sky-400" />
          </div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Security Incident Dashboard
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {step === 'credentials' && 'Sign in to continue'}
            {step === 'mfa_challenge' && 'Enter your authenticator code'}
            {step === 'mfa_enroll' && 'Set up two-factor authentication'}
          </p>
        </div>

        {/* ── Step 1: Username + Password ───────────────────────────── */}
        {step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="card p-6 space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
                className="input w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="input w-full"
              />
            </div>
            <button
              type="submit"
              disabled={login.isPending || mfaEnroll.isPending}
              className="btn-primary w-full"
            >
              {(login.isPending || mfaEnroll.isPending) ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        )}

        {/* ── Step 2a: MFA Challenge ────────────────────────────────── */}
        {step === 'mfa_challenge' && (
          <form onSubmit={handleChallengeSubmit} className="card p-6 space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}
            <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
              Open your authenticator app (Google Authenticator, Authy, etc.) and enter the 6-digit code.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                Authenticator Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                pattern="\d{6}"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
                placeholder="000000"
                className="input w-full text-center text-lg font-mono tracking-widest"
              />
            </div>
            <button
              type="submit"
              disabled={mfaChallenge.isPending || totpCode.length !== 6}
              className="btn-primary w-full"
            >
              {mfaChallenge.isPending ? 'Verifying...' : 'Verify'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('credentials'); setTotpCode(''); setError(''); }}
              className="w-full text-xs text-center"
              style={{ color: 'var(--color-text-faint)' }}
            >
              ← Back to login
            </button>
          </form>
        )}

        {/* ── Step 2b: MFA Enrollment ───────────────────────────────── */}
        {step === 'mfa_enroll' && (
          <form onSubmit={handleEnrollVerify} className="card p-6 space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-sm text-amber-400">
              Your administrator requires two-factor authentication. Scan the QR code below to enroll.
            </div>

            {enrollData ? (
              <div className="flex flex-col items-center gap-3">
                <div className="bg-white p-2 rounded-lg">
                  <img src={enrollData.qr_code_data_url} alt="TOTP QR Code" className="w-40 h-40" />
                </div>
                <details className="w-full text-xs">
                  <summary className="cursor-pointer" style={{ color: 'var(--color-text-faint)' }}>
                    <QrCode size={12} className="inline mr-1" />
                    Can't scan? Show manual key
                  </summary>
                  <code
                    className="block mt-2 p-2 rounded text-xs break-all"
                    style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}
                  >
                    {enrollData.otpauth_url}
                  </code>
                </details>
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
                Generating QR code…
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                Confirm with a 6-digit code from your app
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                pattern="\d{6}"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
                placeholder="000000"
                className="input w-full text-center text-lg font-mono tracking-widest"
              />
            </div>
            <button
              type="submit"
              disabled={mfaVerify.isPending || totpCode.length !== 6}
              className="btn-primary w-full"
            >
              {mfaVerify.isPending ? 'Confirming...' : 'Confirm Enrollment'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
