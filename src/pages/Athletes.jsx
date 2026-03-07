import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { C, FONTS, card, inputBase } from '../theme';

const AVATAR_COLORS = ['#C2622A', '#4A7FA5', '#5A9E6F', '#7C6FAF', '#C4924A', '#4A9BAD'];

function avatarColor(username) {
  return AVATAR_COLORS[(username?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}

function initials(name, username) {
  if (name?.trim()) {
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  }
  return (username?.[0] ?? '?').toUpperCase();
}

function formatJoinDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function Athletes() {
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('profiles')
        .select('id, name, username, created_at')
        .order('created_at', { ascending: false });

      if (err) {
        setError('Failed to load athletes.');
        console.error(err);
      } else {
        setAthletes(data ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = athletes.filter((a) => {
    const q = search.toLowerCase();
    return (
      (a.name?.toLowerCase().includes(q) ?? false) ||
      (a.username?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 500, color: C.text, marginBottom: '0.25rem', fontFamily: FONTS.heading }}>
          Athletes
        </h1>
        <p style={{ color: C.textSecondary, fontSize: '0.95rem', fontWeight: 300 }}>
          {loading ? 'Loading…' : `${athletes.length} athlete${athletes.length !== 1 ? 's' : ''} in the community`}
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.75rem' }}>
        <input
          type="text"
          placeholder="Search by name or username…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputBase, fontSize: '0.95rem' }}
          onFocus={(e) => (e.target.style.borderColor = C.accent)}
          onBlur={(e) => (e.target.style.borderColor = C.border)}
        />
      </div>

      {/* States */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{ width: '36px', height: '36px', border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accent}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '3rem', ...card }}>
          <p style={{ color: '#dc2626', fontSize: '0.9rem', fontWeight: 300 }}>{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', ...card }}>
          <p style={{ color: C.textSecondary, fontSize: '0.95rem', fontWeight: 300 }}>
            {search ? `No athletes matching "${search}".` : 'No athletes found.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {filtered.map((a) => {
            const color = avatarColor(a.username);
            return (
              <div
                key={a.id}
                style={{
                  ...card,
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  transition: 'transform 0.15s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: '52px', height: '52px', borderRadius: '50%',
                  backgroundColor: color, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 400, color: '#ffffff', fontSize: '1.1rem',
                  border: `2px solid ${C.border}`,
                }}>
                  {initials(a.name, a.username)}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 400, color: C.text, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.name || a.username || 'Unnamed Athlete'}
                  </div>
                  {a.username && (
                    <div style={{ fontSize: '0.8rem', color: C.textSecondary, fontWeight: 300, marginTop: '0.1rem' }}>
                      @{a.username}
                    </div>
                  )}
                  <div style={{ fontSize: '0.72rem', color: C.textSecondary, marginTop: '0.3rem', fontWeight: 300 }}>
                    Joined {formatJoinDate(a.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
