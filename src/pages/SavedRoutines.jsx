import { useState, useEffect } from 'react';
import { C, FONTS, card, tagBase, labelBase } from '../theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';

const difficultyBadge = {
  beginner:     { bg: '#EDF2EE', text: '#4A7C59' },
  intermediate: { bg: '#F2EFE8', text: '#7A6040' },
  advanced:     { bg: '#F2ECEC', text: '#8B4040' },
};

const TERRA = '#C2622A';

function ShareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  );
}

function ShareSheet({ shareUrl, onClose }) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const title = 'Check out this workout routine';
  const body = `${title}: ${shareUrl}`;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...card,
          width: '100%',
          maxWidth: '480px',
          borderRadius: '16px 16px 0 0',
          padding: '1.5rem',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 500, fontSize: '1rem', color: C.text, fontFamily: FONTS.heading }}>Share Routine</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSecondary, fontSize: '1.25rem', lineHeight: 1 }}>×</button>
        </div>

        {/* URL preview */}
        <div style={{
          padding: '0.6rem 0.875rem', borderRadius: '8px', border: `1px solid ${C.border}`,
          backgroundColor: C.bg, fontSize: '0.72rem', color: C.textSecondary, fontWeight: 300,
          wordBreak: 'break-all', marginBottom: '1rem',
        }}>
          {shareUrl}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            onClick={copyLink}
            style={{
              padding: '0.75rem 1rem', borderRadius: '9px',
              border: `1px solid ${copied ? TERRA : C.border}`,
              backgroundColor: copied ? '#F5EDE6' : C.surface,
              color: copied ? TERRA : C.text,
              fontSize: '0.875rem', fontWeight: 400, cursor: 'pointer',
              transition: 'all 0.15s', textAlign: 'left',
              fontFamily: FONTS.body,
            }}
          >
            {copied ? '✓ Link copied!' : 'Copy Link'}
          </button>
          <a
            href={`sms:?&body=${encodeURIComponent(body)}`}
            style={{
              padding: '0.75rem 1rem', borderRadius: '9px',
              border: `1px solid ${C.border}`, backgroundColor: C.surface,
              color: C.text, fontSize: '0.875rem', fontWeight: 400,
              textDecoration: 'none', display: 'block',
            }}
          >
            Share via Text
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`}
            style={{
              padding: '0.75rem 1rem', borderRadius: '9px',
              border: `1px solid ${C.border}`, backgroundColor: C.surface,
              color: C.text, fontSize: '0.875rem', fontWeight: 400,
              textDecoration: 'none', display: 'block',
            }}
          >
            Share via Email
          </a>
        </div>
      </div>
    </div>
  );
}

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
  const { user } = useAuth();
  const [routines, setRoutines] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('kratos-saved-routines') || '[]');
      return raw.sort((a, b) => b.id - a.id);
    } catch {
      return [];
    }
  });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [shareSheet, setShareSheet] = useState(null); // { url } or null
  const [sharingId, setSharingId] = useState(null); // routine.id being processed

  useEffect(() => {
    localStorage.setItem('kratos-saved-routines', JSON.stringify(routines));
  }, [routines]);

  async function handleShare(routine) {
    if (!user) { alert('Sign in to share routines.'); return; }
    setSharingId(routine.id);
    let supabaseId = routine.supabaseId;
    if (!supabaseId) {
      const { data, error } = await supabase
        .from('routines')
        .insert({ user_id: user.id, title: `${routine.goal} Routine`, exercises: routine.exercises, is_public: true })
        .select('id').single();
      if (error || !data) { setSharingId(null); alert('Could not share. Try again.'); return; }
      supabaseId = data.id;
      setRoutines((prev) => prev.map((r) => r.id === routine.id ? { ...r, supabaseId, isPublic: true } : r));
    } else {
      await supabase.from('routines').update({ is_public: true }).eq('id', supabaseId);
    }
    setSharingId(null);
    setShareSheet({ url: `${window.location.origin}/routine/${supabaseId}` });
  }

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
    <>
    {shareSheet && <ShareSheet shareUrl={shareSheet.url} onClose={() => setShareSheet(null)} />}
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

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  onClick={() => handleShare(routine)}
                  disabled={sharingId === routine.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                    padding: '0.4rem 0.8rem', borderRadius: '6px',
                    border: `1px solid ${C.border}`, backgroundColor: 'transparent',
                    color: C.textSecondary, fontSize: '0.8rem', fontWeight: 300,
                    cursor: sharingId === routine.id ? 'default' : 'pointer',
                    transition: 'all 0.15s',
                    opacity: sharingId === routine.id ? 0.6 : 1,
                  }}
                  title="Share routine"
                >
                  <ShareIcon />
                  {sharingId === routine.id ? '…' : 'Share'}
                </button>
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
    </>
  );
}
