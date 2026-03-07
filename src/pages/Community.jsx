import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

const orange = '#FF6B2B';

// ── Utility ────────────────────────────────────────────────────────────────
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Icons ──────────────────────────────────────────────────────────────────
function HeartIcon({ filled }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? '#ef4444' : 'none'} stroke={filled ? '#ef4444' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#FF6B2B', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4'];

function Avatar({ username, size = 36 }) {
  const letter = (username || '?')[0].toUpperCase();
  const color = AVATAR_COLORS[(username?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', backgroundColor: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, color: '#fff', fontSize: size * 0.42, flexShrink: 0,
    }}>
      {letter}
    </div>
  );
}

// ── Action button ──────────────────────────────────────────────────────────
function ActionBtn({ onClick, active, danger, children }) {
  const [hovered, setHovered] = useState(false);
  const activeColor = danger ? '#ef4444' : orange;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.3rem',
        padding: '0.4rem 0.65rem', borderRadius: '6px', border: 'none',
        backgroundColor: hovered || active ? '#f3f4f6' : 'transparent',
        color: active ? activeColor : '#6b7280',
        cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
        transition: 'all 0.1s',
      }}
    >
      {children}
    </button>
  );
}

// ── Feed Card ──────────────────────────────────────────────────────────────
function FeedCard({ routine, userId, liked, likeCount, onLike }) {
  const [exercisesOpen, setExercisesOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState(null); // null = not yet loaded
  const [commentCount, setCommentCount] = useState(routine._commentCount ?? 0);
  const [commentDraft, setCommentDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [toast, setToast] = useState('');

  const exercises = Array.isArray(routine.exercises) ? routine.exercises : [];
  const muscleGroups = [...new Set(exercises.map((ex) => ex.muscleGroup).filter(Boolean))];
  const username = routine.profiles?.name?.split(' ')[0] || (routine.profiles?.username ? `@${routine.profiles.username}` : 'Unknown');
  const goalLabel = routine.title?.split(' ')[0] || 'Workout';

  async function openComments() {
    const opening = !commentsOpen;
    setCommentsOpen(opening);
    if (opening && comments === null) {
      const { data } = await supabase
        .from('comments')
        .select('*, profiles(username, name)')
        .eq('routine_id', routine.id)
        .order('created_at', { ascending: true });
      setComments(data ?? []);
      setCommentCount(data?.length ?? 0);
    }
  }

  async function postComment() {
    const content = commentDraft.trim();
    if (!content || !userId) return;
    setPosting(true);
    const { error } = await supabase.from('comments').insert({
      user_id: userId,
      routine_id: routine.id,
      content,
    });
    if (!error) {
      setCommentDraft('');
      setCommentCount((n) => n + 1);
      const { data } = await supabase
        .from('comments')
        .select('*, profiles(username)')
        .eq('routine_id', routine.id)
        .order('created_at', { ascending: true });
      setComments(data ?? []);
    }
    setPosting(false);
  }

  function handleSave() {
    try {
      const saved = JSON.parse(localStorage.getItem('kratos-saved-routines') || '[]');
      const entry = { id: Date.now(), goal: goalLabel, savedAt: new Date().toISOString(), exercises };
      localStorage.setItem('kratos-saved-routines', JSON.stringify([entry, ...saved]));
      showToast('Saved to your routines!');
    } catch {
      showToast('Failed to save.');
    }
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => showToast('Link copied!'));
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  return (
    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', overflow: 'hidden' }}>

      {/* Header: avatar + username + goal + time */}
      <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid #f3f4f6' }}>
        <Avatar username={username} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: '#111827', fontSize: '0.9rem' }}>{username}</span>
            <span style={{ padding: '1px 8px', borderRadius: '20px', backgroundColor: '#fff5f0', color: orange, fontWeight: 700, fontSize: '0.68rem', border: `1px solid ${orange}` }}>
              {goalLabel}
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.1rem' }}>{timeAgo(routine.created_at)}</div>
        </div>
      </div>

      {/* Body: title + muscle chips + exercise list */}
      <div style={{ padding: '1rem 1.25rem' }}>
        <h3 style={{ fontWeight: 800, fontSize: '1.05rem', color: '#111827', marginBottom: '0.55rem' }}>
          {routine.title}
        </h3>

        {muscleGroups.length > 0 && (
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
            {muscleGroups.map((m) => (
              <span key={m} style={{ padding: '2px 9px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700, textTransform: 'capitalize', backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                {m}
              </span>
            ))}
          </div>
        )}

        {/* Toggle exercise list */}
        <button
          onClick={() => setExercisesOpen((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', color: '#6b7280', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', padding: '0.25rem 0', marginBottom: exercisesOpen ? '0.75rem' : 0 }}
        >
          <ChevronIcon open={exercisesOpen} />
          {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
        </button>

        {exercisesOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {exercises.map((ex, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderRadius: '6px', backgroundColor: '#f9fafb', gap: '0.75rem' }}>
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: orange, marginRight: '0.4rem' }}>#{i + 1}</span>
                  <span style={{ fontWeight: 600, color: '#111827', fontSize: '0.875rem' }}>{ex.name}</span>
                </div>
                <span style={{ color: '#6b7280', fontSize: '0.78rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {ex.sets} × {ex.reps} · {ex.rest}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div style={{ padding: '0.6rem 1rem', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '0.1rem', flexWrap: 'wrap' }}>
        <ActionBtn onClick={onLike} active={liked} danger>
          <HeartIcon filled={liked} />
          <span style={{ color: liked ? '#ef4444' : '#9ca3af', minWidth: '12px' }}>{likeCount > 0 ? likeCount : ''}</span>
        </ActionBtn>

        <ActionBtn onClick={openComments} active={commentsOpen}>
          <CommentIcon />
          <span style={{ color: '#9ca3af', minWidth: '12px' }}>{commentCount > 0 ? commentCount : ''}</span>
        </ActionBtn>

        <ActionBtn onClick={handleSave}>
          <BookmarkIcon />
          Save
        </ActionBtn>

        <ActionBtn onClick={handleShare}>
          <ShareIcon />
          Share
        </ActionBtn>

        {toast && (
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, flexShrink: 0 }}>
            ✓ {toast}
          </span>
        )}
      </div>

      {/* Comment section */}
      {commentsOpen && (
        <div style={{ borderTop: '1px solid #e5e7eb', padding: '1rem 1.25rem', backgroundColor: '#fafafa' }}>
          {/* Comment list */}
          {comments === null ? (
            <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '0.75rem' }}>Loading…</p>
          ) : comments.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '0.75rem' }}>No comments yet — be the first!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1rem' }}>
              {comments.map((c) => (
                <div key={c.id} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  <Avatar username={c.profiles?.username} size={28} />
                  <div style={{ flex: 1, backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#374151' }}>{c.profiles?.name?.split(' ')[0] || (c.profiles?.username ? `@${c.profiles.username}` : 'Unknown')}</span>
                      <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>{timeAgo(c.created_at)}</span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: '#374151', lineHeight: 1.45, margin: 0 }}>{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comment input */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="Add a comment…"
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') postComment(); }}
              style={{ flex: 1, padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', backgroundColor: '#ffffff', fontSize: '0.875rem', color: '#111827', outline: 'none', transition: 'border-color 0.15s' }}
              onFocus={(e) => (e.target.style.borderColor = orange)}
              onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
            />
            <button
              onClick={postComment}
              disabled={posting || !commentDraft.trim()}
              style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: commentDraft.trim() ? orange : '#e5e7eb', color: commentDraft.trim() ? '#ffffff' : '#9ca3af', fontWeight: 700, fontSize: '0.8rem', cursor: commentDraft.trim() ? 'pointer' : 'default', transition: 'all 0.15s', flexShrink: 0 }}
            >
              {posting ? '…' : 'Post'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Community() {
  const { user } = useAuth();
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [likeCounts, setLikeCounts] = useState({});
  const [userLikes, setUserLikes] = useState(new Set());

  useEffect(() => { loadFeed(); }, []);

  async function loadFeed() {
    setLoading(true);
    setError('');

    const { data, error: err } = await supabase
      .from('routines')
      .select('*, profiles(username, name), likes(user_id), comments(id)')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (err) {
      setError('Failed to load community routines.');
      console.error(err);
      setLoading(false);
      return;
    }

    const counts = {};
    const liked = new Set();
    for (const r of data ?? []) {
      counts[r.id] = r.likes?.length ?? 0;
      r._commentCount = r.comments?.length ?? 0;
      if (r.likes?.some((l) => l.user_id === user?.id)) liked.add(r.id);
    }

    setRoutines(data ?? []);
    setLikeCounts(counts);
    setUserLikes(liked);
    setLoading(false);
  }

  async function toggleLike(routineId) {
    if (!user) return;
    const isLiked = userLikes.has(routineId);

    // Optimistic update
    setUserLikes((prev) => {
      const s = new Set(prev);
      isLiked ? s.delete(routineId) : s.add(routineId);
      return s;
    });
    setLikeCounts((prev) => ({
      ...prev,
      [routineId]: Math.max(0, (prev[routineId] ?? 0) + (isLiked ? -1 : 1)),
    }));

    if (isLiked) {
      await supabase.from('likes').delete().match({ user_id: user.id, routine_id: routineId });
    } else {
      await supabase.from('likes').insert({ user_id: user.id, routine_id: routineId });
    }
  }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Page header */}
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#111827', letterSpacing: '-0.5px', marginBottom: '0.25rem' }}>
            Community
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
            Routines shared by athletes like you.
          </p>
        </div>
        <button
          onClick={loadFeed}
          style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', backgroundColor: '#ffffff', color: '#374151', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', transition: 'border-color 0.15s' }}
          onMouseOver={(e) => (e.currentTarget.style.borderColor = orange)}
          onMouseOut={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
        >
          Refresh
        </button>
      </div>

      {/* States */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid #e5e7eb', borderTop: `3px solid ${orange}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
          <p style={{ color: '#dc2626', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>
          <button onClick={loadFeed} style={{ color: orange, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>
            Try again
          </button>
        </div>
      ) : routines.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏋️</div>
          <p style={{ color: '#111827', fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem' }}>No shared routines yet</p>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Generate a routine and toggle <strong>Share to Community</strong> when saving — yours could be first!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {routines.map((r) => (
            <FeedCard
              key={r.id}
              routine={r}
              userId={user?.id}
              liked={userLikes.has(r.id)}
              likeCount={likeCounts[r.id] ?? 0}
              onLike={() => toggleLike(r.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
