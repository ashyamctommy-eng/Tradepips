import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { useLoginTrader, useRegisterTrader } from '@workspace/api-client-react';
import { setTraderSession } from '@/lib/session';

interface Props { onClose: () => void; onAuthenticated: () => void }
export default function TraderAuthDialog({ onClose, onAuthenticated }: Props) {
  const login = useLoginTrader();
  const register = useRegisterTrader();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const active = mode === 'login' ? login : register;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    active.mutate({ data: { email: email.trim(), password } }, {
      onSuccess: session => { setTraderSession(session.token); onAuthenticated(); onClose(); },
      onError: cause => setError(cause instanceof Error ? cause.message : 'Sign in failed. Check your details and try again.'),
    });
  };
  return <div className="auth-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="auth-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className="flex justify-between"><div><div className="section-kicker">SIMULATED ACCOUNT</div><h2 id="auth-title">{mode === 'login' ? 'Welcome back' : 'Create a practice account'}</h2></div><button className="small-btn" onClick={onClose} aria-label="Close sign in" data-testid="button-close-auth"><X size={15} /></button></div>
      <p className="disclaimer">Your account is for paper trading only. No real funds or broker access.</p>
      <form onSubmit={submit}><label className="field-label" htmlFor="auth-email">EMAIL ADDRESS</label><input id="auth-email" required type="email" autoComplete="email" className="trade-input" value={email} onChange={event => setEmail(event.target.value)} data-testid="input-auth-email" />
        <label className="field-label" htmlFor="auth-password">PASSWORD {mode === 'register' && '(10 characters minimum)'}</label><input id="auth-password" required minLength={mode === 'register' ? 10 : 1} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="trade-input" value={password} onChange={event => setPassword(event.target.value)} data-testid="input-auth-password" />
        {error && <p className="error-text" role="alert" data-testid="status-auth-error">{error}</p>}
        <button className="button-yellow" style={{ width: '100%', marginTop: 16 }} disabled={active.isPending} data-testid="button-auth-submit">{active.isPending ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create demo account'}</button>
      </form>
      <button className="small-btn" style={{ marginTop: 12 }} onClick={() => setMode(mode === 'login' ? 'register' : 'login')} data-testid="button-auth-switch">{mode === 'login' ? 'Create account' : 'Sign in instead'}</button>
    </section>
  </div>;
}
