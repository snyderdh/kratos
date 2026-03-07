import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { C, FONTS, card, btnPrimary, inputBase, labelBase } from '../theme';

function friendlyError(msg = '') {
  if (msg.toLowerCase().includes('invalid login credentials'))
    return 'Incorrect email or password.';
  if (msg.toLowerCase().includes('email not confirmed'))
    return 'Please verify your email before logging in.';
  return msg;
}

export default function Login() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (session) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email.trim()) return setError('Please enter your email.');
    if (!password) return setError('Please enter your password.');

    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (authError) {
      setError(friendlyError(authError.message));
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span style={{ fontSize: '2rem', fontWeight: 500, color: C.text, fontStyle: 'italic', letterSpacing: '-0.5px', fontFamily: FONTS.heading }}>KRATOS</span>
          <p style={{ color: C.textSecondary, fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '0.25rem', fontFamily: FONTS.body, fontWeight: 300 }}>Athlete</p>
        </div>

        {/* Card */}
        <div style={{ ...card, padding: '2.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 500, color: C.text, marginBottom: '0.35rem', fontFamily: FONTS.heading }}>Welcome back</h1>
          <p style={{ color: C.textSecondary, fontSize: '0.875rem', marginBottom: '1.75rem', fontWeight: 300 }}>
            Sign in to your account to continue.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Email */}
            <div>
              <label style={labelBase}>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                style={inputBase}
                onFocus={(e) => (e.target.style.borderColor = C.accent)}
                onBlur={(e) => (e.target.style.borderColor = C.border)}
              />
            </div>

            {/* Password */}
            <div>
              <label style={labelBase}>Password</label>
              <input
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputBase}
                onFocus={(e) => (e.target.style.borderColor = C.accent)}
                onBlur={(e) => (e.target.style.borderColor = C.border)}
              />
            </div>

            {error && (
              <p style={{ color: C.accent, fontSize: '0.875rem', backgroundColor: C.accentMuted, padding: '0.6rem 0.85rem', borderRadius: '6px', margin: 0, border: `1px solid ${C.accent}40` }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                ...btnPrimary,
                width: '100%',
                padding: '0.9rem',
                fontSize: '0.95rem',
                backgroundColor: loading ? '#d4896a' : C.accent,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '0.25rem',
              }}
              onMouseOver={(e) => { if (!loading) e.currentTarget.style.backgroundColor = C.accentHover; }}
              onMouseOut={(e) => { if (!loading) e.currentTarget.style.backgroundColor = C.accent; }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', color: C.textSecondary, fontSize: '0.875rem', fontWeight: 300 }}>
          New here?{' '}
          <Link to="/signup" style={{ color: C.accent, fontWeight: 400, textDecoration: 'none' }}>
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
