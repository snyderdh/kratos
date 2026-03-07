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

function friendlyError(msg = '') {
  if (msg.toLowerCase().includes('user already registered') ||
      msg.toLowerCase().includes('already been registered'))
    return 'An account with this email already exists. Try logging in.';
  if (msg.toLowerCase().includes('password should be at least'))
    return 'Password must be at least 6 characters.';
  return msg;
}

export default function Signup() {
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const [error, setError] = useState('');

  if (session) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError('Please enter your name.');
    if (!username.trim()) return setError('Please enter a username.');
    if (!/^[a-z0-9_]+$/.test(username))
      return setError('Username can only contain lowercase letters, numbers, and underscores.');
    if (!email.trim()) return setError('Please enter your email.');
    if (!password) return setError('Please enter a password.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');

    setLoading(true);

    // Stash profile data — AuthContext picks this up on SIGNED_IN
    localStorage.setItem('kratos-pending-profile', JSON.stringify({
      name: name.trim(),
      username: username.trim(),
    }));

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (authError) {
      localStorage.removeItem('kratos-pending-profile');
      setError(friendlyError(authError.message));
      return;
    }

    // If no session yet, Supabase requires email confirmation
    if (!data.session) {
      setAwaitingConfirm(true);
    }
    // If session is returned immediately, AuthContext's onAuthStateChange
    // will fire SIGNED_IN, save the profile, and Navigate to / kicks in.
  }

  if (awaitingConfirm) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#ffffff', borderRadius: '16px', padding: '2.5rem 2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', textAlign: 'center', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📬</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#111827', marginBottom: '0.5rem' }}>Verify your email</h2>
          <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
            We sent a confirmation link to{' '}
            <strong style={{ color: '#111827' }}>{email}</strong>.<br />
            Click it to activate your account, then come back to log in.
          </p>
          <Link
            to="/login"
            style={{ display: 'inline-block', marginTop: '0.5rem', color: orange, fontWeight: 700, textDecoration: 'none', fontSize: '0.875rem' }}
          >
            Go to login →
          </Link>
        </div>
      </div>
    );
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#111827', marginBottom: '0.35rem' }}>Create your account</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
            Fill in your details to get started.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Name */}
            <div>
              <label style={labelStyle}>Full Name</label>
              <input
                type="text"
                placeholder="Alex Johnson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = orange)}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
              />
            </div>

            {/* Username */}
            <div>
              <label style={labelStyle}>Username</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '0.95rem', pointerEvents: 'none' }}>
                  @
                </span>
                <input
                  type="text"
                  placeholder="alexjohnson"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  style={{ ...inputStyle, paddingLeft: '2rem' }}
                  onFocus={(e) => (e.target.style.borderColor = orange)}
                  onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = orange)}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label style={labelStyle}>Confirm Password</label>
              <input
                type="password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  ...inputStyle,
                  borderColor: confirmPassword && confirmPassword !== password ? '#dc2626' : '#e5e7eb',
                }}
                onFocus={(e) => (e.target.style.borderColor = confirmPassword !== password ? '#dc2626' : orange)}
                onBlur={(e) => (e.target.style.borderColor = confirmPassword && confirmPassword !== password ? '#dc2626' : '#e5e7eb')}
              />
              {confirmPassword && confirmPassword !== password && (
                <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.3rem' }}>Passwords do not match.</p>
              )}
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
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', color: '#6b7280', fontSize: '0.875rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: orange, fontWeight: 700, textDecoration: 'none' }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 700,
  color: '#374151',
  marginBottom: '0.4rem',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};
