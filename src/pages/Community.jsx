import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { C, FONTS, card, btnPrimary, inputBase, tagBase } from '../theme';
import Athletes from './Athletes';

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
const AVATAR_COLORS = ['#C2622A', '#4A7FA5', '#5A9E6F', '#7C6FAF', '#C4924A', '#4A9BAD'];

function Avatar({ username, size = 36 }) {
  const letter = (username || '?')[0].toUpperCase();
  const color = AVATAR_COLORS[(username?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', backgroundColor: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 400, color: '#fff', fontSize: size * 0.42, flexShrink: 0,
    }}>
      {letter}
    </div>
  );
}

// ── Action button ──────────────────────────────────────────────────────────
function ActionBtn({ onClick, active, danger, children }) {
  const [hovered, setHovered] = useState(false);
  const activeColor = danger ? '#ef4444' : C.accent;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.3rem',
        padding: '0.4rem 0.65rem', borderRadius: '6px', border: 'none',
        backgroundColor: hovered || active ? C.accentMuted : 'transparent',
        color: active ? activeColor : C.textSecondary,
        cursor: 'pointer', fontSize: '0.8rem', fontWeight: 300,
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
  const [comments, setComments] = useState(null);
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
    <div style={{ ...card, overflow: 'hidden' }}>

      {/* Header: avatar + username + goal + time */}
      <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: `1px solid ${C.border}` }}>
        <Avatar username={username} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 400, color: C.text, fontSize: '0.9rem' }}>{username}</span>
            <span style={{ ...tagBase, color: C.accent, borderColor: C.accent }}>
              {goalLabel}
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: C.textSecondary, marginTop: '0.1rem', fontWeight: 300 }}>{timeAgo(routine.created_at)}</div>
        </div>
      </div>

      {/* Body: title + muscle chips + exercise list */}
      <div style={{ padding: '1rem 1.25rem' }}>
        <h3 style={{ fontWeight: 500, fontSize: '1.05rem', color: C.text, marginBottom: '0.55rem', fontFamily: FONTS.heading }}>
          {routine.title}
        </h3>

        {muscleGroups.length > 0 && (
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
            {muscleGroups.map((m) => (
              <span key={m} style={{ ...tagBase, textTransform: 'capitalize' }}>
                {m}
              </span>
            ))}
          </div>
        )}

        {/* Toggle exercise list */}
        <button
          onClick={() => setExercisesOpen((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', color: C.textSecondary, fontSize: '0.82rem', fontWeight: 300, cursor: 'pointer', padding: '0.25rem 0', marginBottom: exercisesOpen ? '0.75rem' : 0 }}
        >
          <ChevronIcon open={exercisesOpen} />
          {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
        </button>

        {exercisesOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {exercises.map((ex, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderRadius: '6px', backgroundColor: C.bg, gap: '0.75rem' }}>
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 400, color: C.accent, marginRight: '0.4rem' }}>#{i + 1}</span>
                  <span style={{ fontWeight: 400, color: C.text, fontSize: '0.875rem' }}>{ex.name}</span>
                </div>
                <span style={{ color: C.textSecondary, fontSize: '0.78rem', whiteSpace: 'nowrap', flexShrink: 0, fontWeight: 300 }}>
                  {ex.sets} × {ex.reps} · {ex.rest}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div style={{ padding: '0.6rem 1rem', borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '0.1rem', flexWrap: 'wrap' }}>
        <ActionBtn onClick={onLike} active={liked} danger>
          <HeartIcon filled={liked} />
          <span style={{ color: liked ? '#ef4444' : C.textSecondary, minWidth: '12px' }}>{likeCount > 0 ? likeCount : ''}</span>
        </ActionBtn>

        <ActionBtn onClick={openComments} active={commentsOpen}>
          <CommentIcon />
          <span style={{ color: C.textSecondary, minWidth: '12px' }}>{commentCount > 0 ? commentCount : ''}</span>
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
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#5A9E6F', fontWeight: 400, flexShrink: 0 }}>
            ✓ {toast}
          </span>
        )}
      </div>

      {/* Comment section */}
      {commentsOpen && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '1rem 1.25rem', backgroundColor: C.bg }}>
          {comments === null ? (
            <p style={{ color: C.textSecondary, fontSize: '0.8rem', marginBottom: '0.75rem', fontWeight: 300 }}>Loading…</p>
          ) : comments.length === 0 ? (
            <p style={{ color: C.textSecondary, fontSize: '0.8rem', marginBottom: '0.75rem', fontWeight: 300 }}>No comments yet — be the first!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1rem' }}>
              {comments.map((c) => (
                <div key={c.id} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  <Avatar username={c.profiles?.username} size={28} />
                  <div style={{ flex: 1, backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 400, fontSize: '0.78rem', color: C.text }}>{c.profiles?.name?.split(' ')[0] || (c.profiles?.username ? `@${c.profiles.username}` : 'Unknown')}</span>
                      <span style={{ fontSize: '0.68rem', color: C.textSecondary, fontWeight: 300 }}>{timeAgo(c.created_at)}</span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: C.text, lineHeight: 1.45, margin: 0, fontWeight: 300 }}>{c.content}</p>
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
              style={{ ...inputBase, flex: 1 }}
              onFocus={(e) => (e.target.style.borderColor = C.accent)}
              onBlur={(e) => (e.target.style.borderColor = C.border)}
            />
            <button
              onClick={postComment}
              disabled={posting || !commentDraft.trim()}
              style={{ ...btnPrimary, backgroundColor: commentDraft.trim() ? C.accent : C.border, color: commentDraft.trim() ? '#fff' : C.textSecondary, cursor: commentDraft.trim() ? 'pointer' : 'default', flexShrink: 0, padding: '0.6rem 1rem' }}
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
const TERRA = '#C2622A';

export default function Community() {
  const { user } = useAuth();
  const [tab, setTab] = useState('feed');
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
    <div>
      {/* Page header + tabs */}
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem 1rem 0' }}>
        <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 500, color: C.text, marginBottom: '0.25rem', fontFamily: FONTS.heading }}>
              Community
            </h1>
            <p style={{ color: C.textSecondary, fontSize: '0.95rem', fontWeight: 300 }}>
              Routines and athletes.
            </p>
          </div>
          {tab === 'feed' && (
            <button
              onClick={loadFeed}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: C.surface, color: C.text, fontWeight: 300, fontSize: '0.8rem', cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseOver={(e) => (e.currentTarget.style.borderColor = C.accent)}
              onMouseOut={(e) => (e.currentTarget.style.borderColor = C.border)}
            >
              Refresh
            </button>
          )}
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, marginBottom: '1.5rem' }}>
          {[['feed', 'Feed'], ['athletes', 'Athletes']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setTab(val)}
              style={{
                padding: '0.625rem 1.25rem', border: 'none',
                borderBottom: `2px solid ${tab === val ? TERRA : 'transparent'}`,
                backgroundColor: 'transparent',
                color: tab === val ? TERRA : C.textSecondary,
                fontWeight: tab === val ? 400 : 300,
                fontSize: '0.875rem', cursor: 'pointer',
                transition: 'all 0.15s', fontFamily: FONTS.body,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed tab */}
      {tab === 'feed' && (
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 1rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <div style={{ width: '36px', height: '36px', border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accent}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '3rem', ...card }}>
              <p style={{ color: '#dc2626', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>
              <button onClick={loadFeed} style={{ color: C.accent, fontWeight: 400, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>
                Try again
              </button>
            </div>
          ) : routines.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', ...card }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏋️</div>
              <p style={{ color: C.text, fontSize: '1.05rem', fontWeight: 500, marginBottom: '0.5rem', fontFamily: FONTS.heading }}>No shared routines yet</p>
              <p style={{ color: C.textSecondary, fontSize: '0.875rem', fontWeight: 300 }}>
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
      )}

      {/* Athletes tab */}
      {tab === 'athletes' && <Athletes />}
    </div>
  );
}
