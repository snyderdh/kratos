import { useState, useEffect } from 'react';
import { C, FONTS, card, tagBase, labelBase } from '../theme';

const difficultyBadge = {
  beginner:     { bg: '#EDF2EE', text: '#4A7C59' },
  intermediate: { bg: '#F2EFE8', text: '#7A6040' },
  advanced:     { bg: '#F2ECEC', text: '#8B4040' },
};

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  );
}

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function SavedRoutines() {
  const [routines, setRoutines] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('kratos-saved-routines') || '[]');
      return raw.sort((a, b) => b.id - a.id);
    } catch {
      return [];
    }
  });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    localStorage.setItem('kratos-saved-routines', JSON.stringify(routines));
  }, [routines]);

  function handleDelete(id) {
    if (deleteConfirm === id) {
      setRoutines((prev) => prev.filter((r) => r.id !== id));
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 500, color: C.text, marginBottom: '0.25rem', fontFamily: FONTS.heading }}>
            Saved Routines
          </h1>
          <p style={{ color: C.textSecondary, fontSize: '0.95rem', fontWeight: 300 }}>
            Your saved workout routines.
          </p>
        </div>
        {routines.length > 0 && (
          <span style={{
            ...tagBase,
            padding: '4px 12px',
            borderRadius: '20px',
            color: C.accent,
            borderColor: C.accent,
          }}>
            {routines.length} saved
          </span>
        )}
      </div>

      {routines.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <p style={{ color: C.text, fontSize: '1.1rem', fontWeight: 500, marginBottom: '0.5rem', fontFamily: FONTS.heading }}>No saved routines yet</p>
          <p style={{ color: C.textSecondary, fontSize: '0.9rem', fontWeight: 300 }}>Generate a routine and hit "Save Routine" to see it here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {routines.map((routine) => (
            <div key={routine.id} style={{ ...card, overflow: 'hidden' }}>
              {/* Card header */}
              <div style={{
                padding: '1rem 1.25rem',
                borderBottom: `1px solid ${C.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                backgroundColor: C.bg,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{
                    ...tagBase,
                    padding: '3px 10px',
                    borderRadius: '20px',
                    color: C.accent,
                    borderColor: C.accent,
                  }}>
                    {routine.goal}
                  </span>
                  <span style={{ color: C.textSecondary, fontSize: '0.85rem', fontWeight: 300 }}>
                    {formatDate(routine.savedAt)} at {formatTime(routine.savedAt)}
                  </span>
                  <span style={{ color: C.textSecondary, fontSize: '0.8rem', fontWeight: 300 }}>
                    {routine.exercises.length} exercises
                  </span>
                </div>

                <button
                  onClick={() => handleDelete(routine.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    border: `1px solid ${deleteConfirm === routine.id ? '#dc2626' : C.border}`,
                    backgroundColor: deleteConfirm === routine.id ? '#fee2e2' : 'transparent',
                    color: deleteConfirm === routine.id ? '#dc2626' : C.textSecondary,
                    fontSize: '0.8rem',
                    fontWeight: 300,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  title="Delete routine"
                >
                  <TrashIcon />
                  {deleteConfirm === routine.id ? 'Confirm delete' : 'Delete'}
                </button>
              </div>

              {/* Exercise list */}
              <div style={{ padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {routine.exercises.map((ex, i) => {
                  const diff = difficultyBadge[ex.difficulty] || difficultyBadge.beginner;
                  return (
                    <div
                      key={`${ex.id}-${i}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.75rem',
                        borderRadius: '8px',
                        backgroundColor: C.bg,
                        gap: '1rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 400, color: C.accent, marginRight: '0.5rem' }}>
                          #{i + 1}
                        </span>
                        <span style={{ fontWeight: 400, color: C.text, fontSize: '0.9rem' }}>{ex.name}</span>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                          <span style={{ ...tagBase }}>
                            {ex.equipment}
                          </span>
                          <span style={{ ...tagBase }}>
                            {ex.muscleGroup}
                          </span>
                          <span style={{ ...tagBase, backgroundColor: diff.bg, borderColor: diff.bg, color: diff.text }}>
                            {ex.difficulty}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '1.25rem', flexShrink: 0 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 500, color: C.accent, fontFamily: FONTS.heading }}>{ex.sets}</div>
                          <div style={{ ...labelBase, marginBottom: 0 }}>sets</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 500, color: C.text, fontFamily: FONTS.heading }}>{ex.reps}</div>
                          <div style={{ ...labelBase, marginBottom: 0 }}>reps</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1rem', fontWeight: 500, color: C.textSecondary, fontFamily: FONTS.heading }}>{ex.rest}</div>
                          <div style={{ ...labelBase, marginBottom: 0 }}>rest</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
