import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { C, FONTS, card, tagBase } from '../theme';

const TERRA = '#C2622A';

const difficultyBadge = {
  beginner:     { bg: '#EDF2EE', text: '#4A7C59' },
  intermediate: { bg: '#F2EFE8', text: '#7A6040' },
  advanced:     { bg: '#F2ECEC', text: '#8B4040' },
};

export default function PublicRoutine() {
  const { id } = useParams();
  const [routine, setRoutine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    supabase
      .from('routines')
      .select('*')
      .eq('id', id)
      .eq('is_public', true)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true);
        else setRoutine(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '3rem 1.5rem', textAlign: 'center', color: C.textSecondary, fontFamily: FONTS.body }}>
        Loading routine…
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '3rem 1.5rem', textAlign: 'center', fontFamily: FONTS.body }}>
        <p style={{ color: C.text, fontWeight: 400, marginBottom: '0.5rem' }}>Routine not found</p>
        <p style={{ color: C.textSecondary, fontWeight: 300, fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          This routine may have been deleted or made private.
        </p>
        <Link to="/" style={{ color: TERRA, fontSize: '0.875rem' }}>Back to Kratos →</Link>
      </div>
    );
  }

  const exercises = routine.exercises || [];

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '2.5rem 1.5rem', backgroundColor: C.bg, minHeight: '100vh', fontFamily: FONTS.body }}>
      {/* Branding */}
      <div style={{ marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.58rem', fontWeight: 700, color: TERRA, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Kratos Training
        </span>
      </div>

      {/* Title */}
      <h1 style={{
        fontSize: 'clamp(1.5rem, 4vw, 2rem)',
        fontWeight: 400, fontStyle: 'italic',
        fontFamily: FONTS.heading,
        color: C.text, margin: '0 0 0.25rem',
      }}>
        {routine.title}
      </h1>
      <p style={{ color: C.textSecondary, fontSize: '0.78rem', fontWeight: 300, marginBottom: '2rem' }}>
        {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} · Shared routine
      </p>

      {/* Exercise list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        {exercises.map((ex, i) => {
          const diff = difficultyBadge[ex.difficulty] || difficultyBadge.beginner;
          return (
            <div key={i} style={{ ...card, padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 400, color: C.text, fontSize: '0.95rem', marginBottom: '0.3rem' }}>
                    <span style={{ color: TERRA, fontSize: '0.72rem', marginRight: '0.4rem' }}>#{i + 1}</span>
                    {ex.name}
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {ex.equipment && <span style={{ ...tagBase }}>{ex.equipment}</span>}
                    {ex.muscleGroup && <span style={{ ...tagBase }}>{ex.muscleGroup}</span>}
                    {ex.difficulty && <span style={{ ...tagBase, backgroundColor: diff.bg, borderColor: diff.bg, color: diff.text }}>{ex.difficulty}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1.25rem', flexShrink: 0, alignItems: 'flex-start' }}>
                  {ex.sets && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 500, color: TERRA, fontFamily: FONTS.heading }}>{ex.sets}</div>
                      <div style={{ fontSize: '0.55rem', color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 300 }}>sets</div>
                    </div>
                  )}
                  {ex.reps && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 500, color: C.text, fontFamily: FONTS.heading }}>{ex.reps}</div>
                      <div style={{ fontSize: '0.55rem', color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 300 }}>reps</div>
                    </div>
                  )}
                  {ex.rest && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 400, color: C.textSecondary, fontFamily: FONTS.heading }}>{ex.rest}</div>
                      <div style={{ fontSize: '0.55rem', color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 300 }}>rest</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '1.5rem', textAlign: 'center' }}>
        <p style={{ color: C.textSecondary, fontSize: '0.78rem', fontWeight: 300, marginBottom: '0.875rem' }}>
          Built with Kratos Training Platform
        </p>
        <Link
          to="/"
          style={{
            display: 'inline-block', padding: '0.7rem 1.75rem',
            backgroundColor: TERRA, color: '#fff',
            borderRadius: '9px', textDecoration: 'none',
            fontSize: '0.875rem', fontWeight: 500,
          }}
        >
          Start Training →
        </Link>
      </div>
    </div>
  );
}
