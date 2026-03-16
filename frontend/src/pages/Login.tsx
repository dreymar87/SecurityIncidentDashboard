import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogin } from '../api/hooks';
import { ShieldAlert } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const login = useLogin();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await login.mutateAsync({ username, password });
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invalid credentials';
      setError(msg);
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
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
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
            disabled={login.isPending}
            className="btn-primary w-full"
          >
            {login.isPending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
