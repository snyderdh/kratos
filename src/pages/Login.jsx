import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

const orange = '#FF6B2B';
const orangeHover = '#e55a1f';

const inputStyle = {
  width: '100%',
  padding: '0.7rem 0.85rem',
  backgroundColor: '#f9fafb',
  border: '1.5px solid #e5e7eb',
  borderRadius: '8px',
  color: '#111827',
  fontSize: '0.95rem',
  outline: 'none',
  transition: 'border-color 0.15s',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 700,
  color: '#374151',
  marginBottom: '0.4rem',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

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
    // On success, onAuthStateChange fires, session is set, Navigate kicks in
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span style={{ fontSize: '2rem', fontWeight: 900, color: '#111827', fontStyle: 'italic', letterSpacing: '-0.5px' }}>KRA</span>
          <span style={{ fontSize: '2rem', fontWeight: 900, color: orange, fontStyle: 'italic', letterSpacing: '-0.5px' }}>TOS</span>
          <p style={{ color: '#9ca3af', fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '0.25rem' }}>Athlete</p>
        </div>

        {/* Card */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #e5e7eb' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#111827', marginBottom: '0.35rem' }}>Welcome back</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
            Sign in to your account to continue.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Email */}
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = orange)}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
              />
            </div>

            {/* Password */}
            <div>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = orange)}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
              />
            </div>

            {error && (
              <p style={{ color: '#dc2626', fontSize: '0.875rem', backgroundColor: '#fee2e2', padding: '0.6rem 0.85rem', borderRadius: '6px', margin: 0 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.9rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: loading ? '#f3a07d' : orange,
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s',
                marginTop: '0.25rem',
              }}
              onMouseOver={(e) => { if (!loading) e.currentTarget.style.backgroundColor = orangeHover; }}
              onMouseOut={(e) => { if (!loading) e.currentTarget.style.backgroundColor = orange; }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', color: '#6b7280', fontSize: '0.875rem' }}>
          New here?{' '}
          <Link to="/signup" style={{ color: orange, fontWeight: 700, textDecoration: 'none' }}>
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
