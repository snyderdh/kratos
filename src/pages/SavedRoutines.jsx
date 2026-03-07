import { useState, useEffect } from 'react';

const orange = '#FF6B2B';

const difficultyBadge = {
  beginner: { bg: '#dcfce7', text: '#16a34a' },
  intermediate: { bg: '#fef9c3', text: '#ca8a04' },
  advanced: { bg: '#fee2e2', text: '#dc2626' },
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
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#111827', letterSpacing: '-0.5px', marginBottom: '0.25rem' }}>
            Saved Routines
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
            Your saved workout routines.
          </p>
        </div>
        {routines.length > 0 && (
          <span style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '20px',
            backgroundColor: '#fff5f0',
            color: orange,
            fontWeight: 700,
            fontSize: '0.85rem',
            border: `1px solid ${orange}`,
          }}>
            {routines.length} saved
          </span>
        )}
      </div>

      {routines.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <p style={{ color: '#111827', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>No saved routines yet</p>
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Generate a routine and hit "Save Routine" to see it here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {routines.map((routine) => (
            <div
              key={routine.id}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
              }}
            >
              {/* Card header */}
              <div style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                backgroundColor: '#f9fafb',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    backgroundColor: '#fff5f0',
                    color: orange,
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    border: `1px solid ${orange}`,
                  }}>
                    {routine.goal}
                  </span>
                  <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                    {formatDate(routine.savedAt)} at {formatTime(routine.savedAt)}
                  </span>
                  <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
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
                    border: `1px solid ${deleteConfirm === routine.id ? '#dc2626' : '#e5e7eb'}`,
                    backgroundColor: deleteConfirm === routine.id ? '#fee2e2' : 'transparent',
                    color: deleteConfirm === routine.id ? '#dc2626' : '#9ca3af',
                    fontSize: '0.8rem',
                    fontWeight: 600,
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
                        backgroundColor: '#f9fafb',
                        gap: '1rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: orange, marginRight: '0.5rem' }}>
                          #{i + 1}
                        </span>
                        <span style={{ fontWeight: 700, color: '#111827', fontSize: '0.9rem' }}>{ex.name}</span>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                          <span style={{
                            padding: '1px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700,
                            textTransform: 'uppercase', backgroundColor: '#f3f4f6', color: '#6b7280',
                          }}>
                            {ex.equipment}
                          </span>
                          <span style={{
                            padding: '1px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700,
                            textTransform: 'uppercase', backgroundColor: '#f3f4f6', color: '#6b7280',
                          }}>
                            {ex.muscleGroup}
                          </span>
                          <span style={{
                            padding: '1px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700,
                            textTransform: 'uppercase', backgroundColor: diff.bg, color: diff.text,
                          }}>
                            {ex.difficulty}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '1.25rem', flexShrink: 0 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1rem', fontWeight: 900, color: orange }}>{ex.sets}</div>
                          <div style={{ fontSize: '0.6rem', color: '#9ca3af', textTransform: 'uppercase' }}>sets</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827' }}>{ex.reps}</div>
                          <div style={{ fontSize: '0.6rem', color: '#9ca3af', textTransform: 'uppercase' }}>reps</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6b7280' }}>{ex.rest}</div>
                          <div style={{ fontSize: '0.6rem', color: '#9ca3af', textTransform: 'uppercase' }}>rest</div>
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
