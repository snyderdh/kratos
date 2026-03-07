import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import CycleViewer from '../components/CycleViewer';

const orange = '#FF6B2B';

export default function SavedCycles() {
  const { user } = useAuth();
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCycle, setActiveCycle] = useState(null);
  const [loadingCycle, setLoadingCycle] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCycles();
  }, []);

  async function fetchCycles() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('cycles')
      .select('id, title, split, split_label, cycle_length, days_per_week, goals, equipment, is_public, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setLoading(false);
    if (err) {
      setError('Failed to load cycles: ' + err.message);
    } else {
      setCycles(data ?? []);
    }
  }

  async function handleView(cycleId) {
    setLoadingCycle(cycleId);
    const { data, error: err } = await supabase
      .from('cycles')
      .select('*')
      .eq('id', cycleId)
      .single();
    setLoadingCycle(null);
    if (err) {
      setError('Failed to load cycle: ' + err.message);
    } else {
      // Normalize snake_case → camelCase fields for CycleViewer
      setActiveCycle({
        ...data,
        splitLabel: data.split_label,
        cycleLength: data.cycle_length,
        daysPerWeek: data.days_per_week,
      });
    }
  }

  async function handleDelete(cycleId, e) {
    e.stopPropagation();
    if (!window.confirm('Delete this cycle? This cannot be undone.')) return;
    const { error: err } = await supabase.from('cycles').delete().eq('id', cycleId);
    if (err) {
      setError('Failed to delete: ' + err.message);
    } else {
      setCycles((prev) => prev.filter((c) => c.id !== cycleId));
      if (activeCycle?.id === cycleId) setActiveCycle(null);
    }
  }

  // ── Active cycle detail view ─────────────────────────────────────────
  if (activeCycle) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
        <button
          onClick={() => setActiveCycle(null)}
          style={{ background: 'none', border: 'none', color: orange, fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', padding: 0, marginBottom: '1rem' }}
        >
          ← Back to Saved Cycles
        </button>
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', marginTop: 0, marginBottom: '0.25rem' }}>{activeCycle.title}</h2>
          <p style={{ color: '#6b7280', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
            Saved {new Date(activeCycle.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          <CycleViewer cycle={activeCycle} />
        </div>
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#111827', margin: 0 }}>Saved Cycles</h1>
          {!loading && (
            <p style={{ color: '#6b7280', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
              {cycles.length} cycle{cycles.length !== 1 ? 's' : ''} saved
            </p>
          )}
        </div>
      </div>

      {error && <p style={{ color: '#dc2626', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</p>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#9ca3af', fontSize: '0.9rem' }}>Loading…</div>
      ) : cycles.length === 0 ? (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '3rem 2rem', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
          <h3 style={{ color: '#374151', fontWeight: 700, marginBottom: '0.5rem', margin: '0 0 0.5rem' }}>No saved cycles yet</h3>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Generate a training cycle and save it to see it here.</p>
          <a
            href="/cycle"
            style={{ backgroundColor: orange, color: '#fff', padding: '0.65rem 1.25rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem', display: 'inline-block' }}
          >
            Go to Cycle Generator →
          </a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {cycles.map((c) => (
            <div
              key={c.id}
              style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.125rem 1.375rem', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 800, color: '#111827', fontSize: '1rem' }}>{c.title}</span>
                  {c.is_public && (
                    <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '0.12rem 0.5rem', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 700 }}>Public</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.45rem' }}>
                  <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600 }}>{c.split_label}</span>
                  <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600 }}>{c.cycle_length} weeks</span>
                  <span style={{ backgroundColor: '#fff7ed', color: orange, padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600 }}>{c.days_per_week}×/week</span>
                  {(c.goals ?? []).map((g) => (
                    <span key={g} style={{ backgroundColor: '#faf5ff', color: '#9333ea', padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600, textTransform: 'capitalize' }}>{g}</span>
                  ))}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  Saved {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'center' }}>
                <button
                  onClick={() => handleView(c.id)}
                  disabled={loadingCycle === c.id}
                  style={{ padding: '0.45rem 0.9rem', borderRadius: '6px', border: `1.5px solid ${orange}`, backgroundColor: 'transparent', color: orange, fontWeight: 700, fontSize: '0.8rem', cursor: loadingCycle === c.id ? 'default' : 'pointer', opacity: loadingCycle === c.id ? 0.6 : 1 }}
                >
                  {loadingCycle === c.id ? 'Loading…' : 'View'}
                </button>
                <button
                  onClick={(e) => handleDelete(c.id, e)}
                  style={{ padding: '0.45rem 0.9rem', borderRadius: '6px', border: '1.5px solid #fee2e2', backgroundColor: 'transparent', color: '#dc2626', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'background-color 0.15s' }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#fee2e2')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
