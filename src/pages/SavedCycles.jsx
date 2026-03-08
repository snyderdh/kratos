import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import CycleViewer from '../components/CycleViewer';
import KratosSplitViewer from '../components/KratosSplitViewer';
import { SPLITS } from '../utils/cycleGenerator';
import { C, FONTS, card, btnSecondary, tagBase } from '../theme';

function getSplitLabel(split) {
  return SPLITS[split]?.label ?? split ?? '—';
}

export default function SavedCycles() {
  const { user } = useAuth();
  const location = useLocation();
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCycle, setActiveCycle] = useState(null);
  const [loadingCycle, setLoadingCycle] = useState(null);
  const [autoDay, setAutoDay] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCycles();
    // Auto-load a specific cycle + day when navigating from the home dashboard
    const { autoLoad, autoDay: ad } = location.state ?? {};
    if (autoLoad) {
      if (ad) setAutoDay(ad);
      handleView(autoLoad);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchCycles() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('cycles')
      .select('*')
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
      const weeks = data.weeks ?? [];
      setActiveCycle({
        ...data,
        splitLabel: getSplitLabel(data.split),
        cycleLength: data.cycle_length ?? data.cycleLength ?? weeks.length,
        daysPerWeek: data.days_per_week ?? data.daysPerWeek ?? (weeks[0]?.days?.filter((d) => !d.isRest).length ?? 0),
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
          style={{ background: 'none', border: 'none', color: C.accent, fontWeight: 400, fontSize: '0.875rem', cursor: 'pointer', padding: 0, marginBottom: '1rem', fontFamily: FONTS.body }}
        >
          ← Back to Saved Cycles
        </button>
        <div style={{ ...card, padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 500, color: C.text, marginTop: 0, marginBottom: '0.25rem', fontFamily: FONTS.heading }}>{activeCycle.title}</h2>
          <p style={{ color: C.textSecondary, fontSize: '0.82rem', marginBottom: '1.25rem', fontWeight: 300 }}>
            Saved {new Date(activeCycle.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          {activeCycle.split === 'kratos_split'
            ? <KratosSplitViewer cycle={activeCycle} initialDay={autoDay} />
            : <CycleViewer cycle={activeCycle} />
          }
        </div>
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 500, color: C.text, margin: 0, fontFamily: FONTS.heading }}>Saved Cycles</h1>
          {!loading && (
            <p style={{ color: C.textSecondary, margin: '0.25rem 0 0', fontSize: '0.875rem', fontWeight: 300 }}>
              {cycles.length} cycle{cycles.length !== 1 ? 's' : ''} saved
            </p>
          )}
        </div>
      </div>

      {error && <p style={{ color: '#dc2626', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 300 }}>{error}</p>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: C.textSecondary, fontSize: '0.9rem', fontWeight: 300 }}>Loading…</div>
      ) : cycles.length === 0 ? (
        <div style={{ ...card, padding: '3rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
          <h3 style={{ color: C.text, fontWeight: 500, margin: '0 0 0.5rem', fontFamily: FONTS.heading }}>No saved cycles yet</h3>
          <p style={{ color: C.textSecondary, marginBottom: '1.5rem', fontWeight: 300 }}>Generate a training cycle and save it to see it here.</p>
          <a
            href="/cycle"
            style={{ ...{}, backgroundColor: C.accent, color: '#fff', padding: '0.65rem 1.25rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 400, fontSize: '0.9rem', display: 'inline-block', fontFamily: FONTS.body }}
          >
            Go to Cycle Generator →
          </a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {cycles.map((c) => (
            <div
              key={c.id}
              style={{ ...card, padding: '1.125rem 1.375rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 400, color: C.text, fontSize: '1rem' }}>{c.title}</span>
                  {c.is_public && (
                    <span style={{ ...tagBase, color: '#5A9E6F', borderColor: '#5A9E6F' }}>Public</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.45rem' }}>
                  <span style={{ ...tagBase }}>{getSplitLabel(c.split)}</span>
                  <span style={{ ...tagBase }}>{c.cycle_length ?? c.cycleLength ?? (c.weeks?.length ?? '?')} weeks</span>
                  <span style={{ ...tagBase }}>{c.days_per_week ?? c.daysPerWeek ?? (c.weeks?.[0]?.days?.filter((d) => !d.isRest).length ?? '?')}×/week</span>
                  {(c.goals ?? []).map((g) => (
                    <span key={g} style={{ ...tagBase, textTransform: 'capitalize' }}>{g}</span>
                  ))}
                </div>
                <div style={{ fontSize: '0.75rem', color: C.textSecondary, fontWeight: 300 }}>
                  Saved {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'center' }}>
                <button
                  onClick={() => handleView(c.id)}
                  disabled={loadingCycle === c.id}
                  style={{ ...btnSecondary, padding: '0.4rem 0.875rem', fontSize: '0.8rem', cursor: loadingCycle === c.id ? 'default' : 'pointer', opacity: loadingCycle === c.id ? 0.6 : 1 }}
                >
                  {loadingCycle === c.id ? 'Loading…' : 'View'}
                </button>
                <button
                  onClick={(e) => handleDelete(c.id, e)}
                  style={{ padding: '0.4rem 0.875rem', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: 'transparent', color: C.textSecondary, fontWeight: 300, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s', fontFamily: FONTS.body }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSecondary; }}
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
