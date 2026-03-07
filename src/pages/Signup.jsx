import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { C, FONTS, card, btnPrimary, inputBase, labelBase } from '../theme';

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

    if (!data.session) {
      setAwaitingConfirm(true);
    }
  }

  if (awaitingConfirm) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ ...card, width: '100%', maxWidth: '420px', padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📬</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 500, color: C.text, marginBottom: '0.5rem', fontFamily: FONTS.heading }}>Verify your email</h2>
          <p style={{ color: C.textSecondary, fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '0.75rem', fontWeight: 300 }}>
            We sent a confirmation link to{' '}
            <strong style={{ color: C.text, fontWeight: 400 }}>{email}</strong>.<br />
            Click it to activate your account, then come back to log in.
          </p>
          <Link
            to="/login"
            style={{ display: 'inline-block', marginTop: '0.5rem', color: C.accent, fontWeight: 400, textDecoration: 'none', fontSize: '0.875rem' }}
          >
            Go to login →
          </Link>
        </div>
      </div>
    );
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 500, color: C.text, marginBottom: '0.35rem', fontFamily: FONTS.heading }}>Create your account</h1>
          <p style={{ color: C.textSecondary, fontSize: '0.875rem', marginBottom: '1.75rem', fontWeight: 300 }}>
            Fill in your details to get started.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Name */}
            <div>
              <label style={labelBase}>Full Name</label>
              <input
                type="text"
                placeholder="Alex Johnson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputBase}
                onFocus={(e) => (e.target.style.borderColor = C.accent)}
                onBlur={(e) => (e.target.style.borderColor = C.border)}
              />
            </div>

            {/* Username */}
            <div>
              <label style={labelBase}>Username</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: C.textSecondary, fontSize: '0.875rem', pointerEvents: 'none' }}>
                  @
                </span>
                <input
                  type="text"
                  placeholder="alexjohnson"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  style={{ ...inputBase, paddingLeft: '2rem' }}
                  onFocus={(e) => (e.target.style.borderColor = C.accent)}
                  onBlur={(e) => (e.target.style.borderColor = C.border)}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={labelBase}>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputBase}
                onFocus={(e) => (e.target.style.borderColor = C.accent)}
                onBlur={(e) => (e.target.style.borderColor = C.border)}
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label style={labelBase}>Confirm Password</label>
              <input
                type="password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  ...inputBase,
                  borderColor: confirmPassword && confirmPassword !== password ? '#dc2626' : C.border,
                }}
                onFocus={(e) => (e.target.style.borderColor = confirmPassword !== password ? '#dc2626' : C.accent)}
                onBlur={(e) => (e.target.style.borderColor = confirmPassword && confirmPassword !== password ? '#dc2626' : C.border)}
              />
              {confirmPassword && confirmPassword !== password && (
                <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.3rem' }}>Passwords do not match.</p>
              )}
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
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', color: C.textSecondary, fontSize: '0.875rem', fontWeight: 300 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: C.accent, fontWeight: 400, textDecoration: 'none' }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
