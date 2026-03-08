import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { C, FONTS } from '../theme';

const TERRA = '#C2622A';

const SECTIONS = [
  { key: 'setup',           label: 'Starting Position' },
  { key: 'execution',       label: 'Execution'         },
  { key: 'coaching_cues',   label: 'Coaching Cues'     },
  { key: 'common_mistakes', label: 'Common Mistakes'   },
  { key: 'muscles_worked',  label: 'Muscles Worked'    },
];

// Module-level cache — persists for the entire browser session across modal opens/closes
const sessionCache = {};

export default function ExerciseInfoModal({ exerciseName, onClose }) {
  const [info, setInfo]       = useState(sessionCache[exerciseName] ?? undefined);
  const [loading, setLoading] = useState(sessionCache[exerciseName] === undefined);

  // Fetch from Supabase (skip if already cached)
  useEffect(() => {
    if (sessionCache[exerciseName] !== undefined) {
      setInfo(sessionCache[exerciseName]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabase
      .from('exercise_info')
      .select('setup, execution, coaching_cues, common_mistakes, muscles_worked')
      .eq('exercise_name', exerciseName)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        sessionCache[exerciseName] = data; // null if not found
        setInfo(data);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [exerciseName]);

  // Escape key to close
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        zIndex: 1000,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: '640px',
          backgroundColor: C.bg,
          borderRadius: '16px 16px 0 0',
          maxHeight: '85vh', overflowY: 'auto',
          padding: '1.5rem 1.5rem 3rem',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.14)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.58rem', fontWeight: 700, color: TERRA, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', fontFamily: FONTS.body }}>
              Exercise Guide
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 400, color: C.text, margin: 0, fontFamily: FONTS.heading, lineHeight: 1.3 }}>
              {exerciseName}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSecondary, fontSize: '1.5rem', lineHeight: 1, padding: '0.1rem 0.4rem', flexShrink: 0 }}
          >
            ×
          </button>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {[75, 50, 60, 45, 35].map((w, i) => (
              <div key={i}>
                <div style={{ height: '0.55rem', width: '28%', backgroundColor: C.border, borderRadius: '4px', marginBottom: '0.5rem', opacity: 0.6 }} />
                <div style={{ height: '0.8rem', width: `${w}%`, backgroundColor: C.border, borderRadius: '4px', opacity: 0.4 }} />
              </div>
            ))}
          </div>
        )}

        {/* Not found */}
        {!loading && !info && (
          <div style={{ textAlign: 'center', padding: '2.5rem 0', color: C.textSecondary }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 300, marginBottom: '0.25rem', color: C.text }}>Info coming soon</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 300, lineHeight: 1.6 }}>
              Coaching notes for this exercise haven't been generated yet.
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && info && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.375rem' }}>
            {SECTIONS.map(({ key, label }) =>
              info[key] ? (
                <div key={key}>
                  <div style={{
                    fontSize: '0.6rem', fontWeight: 700, color: TERRA,
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    marginBottom: '0.4rem', fontFamily: FONTS.body,
                  }}>
                    {label}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: C.text, fontWeight: 300, lineHeight: 1.7 }}>
                    {info[key]}
                  </div>
                </div>
              ) : null
            )}
          </div>
        )}
      </div>
    </div>
  );
}
