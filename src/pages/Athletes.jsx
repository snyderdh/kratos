import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const orange = '#FF6B2B';
const AVATAR_COLORS = ['#FF6B2B', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4'];

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
        <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#111827', letterSpacing: '-0.5px', marginBottom: '0.25rem' }}>
          Athletes
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
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
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            backgroundColor: '#ffffff',
            border: '1.5px solid #e5e7eb',
            borderRadius: '10px',
            color: '#111827',
            fontSize: '0.95rem',
            outline: 'none',
            boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => (e.target.style.borderColor = orange)}
          onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
        />
      </div>

      {/* States */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid #e5e7eb', borderTop: `3px solid ${orange}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
          <p style={{ color: '#dc2626', fontSize: '0.9rem' }}>{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
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
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.11)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)';
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: '52px', height: '52px', borderRadius: '50%',
                  backgroundColor: color, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, color: '#ffffff', fontSize: '1.1rem',
                  boxShadow: `0 0 0 3px ${color}22`,
                }}>
                  {initials(a.name, a.username)}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.name || a.username || 'Unnamed Athlete'}
                  </div>
                  {a.username && (
                    <div style={{ fontSize: '0.8rem', color: orange, fontWeight: 600, marginTop: '0.1rem' }}>
                      @{a.username}
                    </div>
                  )}
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.3rem' }}>
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
