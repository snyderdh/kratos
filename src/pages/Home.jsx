import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import {
  Dumbbell, Calendar, Flame, Bell, ChevronRight, X, Send, MessageSquare,
} from 'lucide-react';
import { C, FONTS, card, btnPrimary, inputBase } from '../theme';

const QUOTES = [
  "Strength doesn't come from what you can do. It comes from overcoming what you thought you couldn't.",
  "The only bad workout is the one that didn't happen.",
  "Push yourself because no one else is going to do it for you.",
  "Success starts with self-discipline.",
  "Your body can stand almost anything. It's your mind you have to convince.",
  "The pain you feel today will be the strength you feel tomorrow.",
  "Don't stop when you're tired. Stop when you're done.",
  "It never gets easier, you just get better.",
  "The clock is ticking. Are you becoming the person you want to be?",
  "Wake up with determination. Go to bed with satisfaction.",
  "Champions keep playing until they get it right.",
  "Every rep is a rep closer to your goals.",
  "Discipline is choosing between what you want now and what you want most.",
];

const ALL_MUSCLES = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];
const ALL_GOALS = ['strength', 'hypertrophy', 'endurance', 'power'];

const MUSCLE_LABELS = { chest: 'Chest', back: 'Back', legs: 'Legs', shoulders: 'Shoulders', arms: 'Arms', core: 'Core' };
const GOAL_LABELS = { strength: 'Strength', hypertrophy: 'Hypertrophy', endurance: 'Endurance', power: 'Power' };
const MUSCLE_COLORS = { chest: C.accent, back: '#4A7FA5', legs: '#5A9E6F', shoulders: '#7C6FAF', arms: '#C4924A', core: '#4A9BAD' };
const GOAL_COLORS = { strength: '#8B4040', hypertrophy: C.accent, endurance: '#5A9E6F', power: '#7C6FAF' };

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDailyQuote() {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.now() - start) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}

function calcStreak(routines) {
  if (!routines.length) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = new Set(
    routines.map((r) => {
      const d = new Date(r.savedAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );
  let streak = 0;
  let checkDay = today.getTime();
  if (!days.has(checkDay)) checkDay -= 86400000;
  while (days.has(checkDay)) {
    streak++;
    checkDay -= 86400000;
  }
  return streak;
}

function getUntrainedMuscles(routines) {
  const cutoff = Date.now() - 7 * 86400000;
  const trained = new Set();
  routines
    .filter((r) => new Date(r.savedAt).getTime() > cutoff)
    .forEach((r) => (r.exercises || []).forEach((ex) => ex.muscleGroup && trained.add(ex.muscleGroup.toLowerCase())));
  return ALL_MUSCLES.filter((m) => !trained.has(m));
}

function getUnusedGoals(routines) {
  const cutoff = Date.now() - 7 * 86400000;
  const used = new Set();
  routines
    .filter((r) => new Date(r.savedAt).getTime() > cutoff)
    .forEach((r) => {
      const goals = Array.isArray(r.goal) ? r.goal : r.goal ? [r.goal] : [];
      goals.forEach((g) => used.add(g.toLowerCase()));
    });
  return ALL_GOALS.filter((g) => !used.has(g));
}

function getTodayInCycle(cycle) {
  if (!cycle?.weeks?.length) return null;
  const createdAt = new Date(cycle.created_at);
  createdAt.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysSince = Math.floor((today - createdAt) / 86400000);
  if (daysSince < 0 || daysSince >= cycle.cycle_length * 7) return null;
  const weekIdx = Math.floor(daysSince / 7);
  const dayOfWeek = daysSince % 7;
  const week = cycle.weeks[weekIdx];
  if (!week?.days) return null;
  return {
    weekIdx,
    weekNum: weekIdx + 1,
    totalWeeks: cycle.cycle_length,
    day: week.days[dayOfWeek] ?? null,
  };
}

function getPhaseLabel(weekNum, totalWeeks) {
  const pct = weekNum / totalWeeks;
  if (pct <= 0.33) return 'Foundation Phase';
  if (pct <= 0.66) return 'Build Phase';
  if (pct <= 0.9) return 'Overload Phase';
  return 'Deload Phase';
}

function relTime(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Home() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const name = profile?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Athlete';

  const [routines, setRoutines] = useState([]);
  const [activeCycle, setActiveCycle] = useState(null);
  const [cycleCount, setCycleCount] = useState(0);
  const [likesReceived, setLikesReceived] = useState(0);
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [announcementError, setAnnouncementError] = useState('');
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('kratos-dismissed-notifs') || '[]')); }
    catch { return new Set(); }
  });

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('kratos-saved-routines') || '[]');
      setRoutines(Array.isArray(saved) ? saved : []);
    } catch { setRoutines([]); }
  }, []);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data: cycles } = await supabase
        .from('cycles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (cycles?.length) setActiveCycle(cycles[0]);

      const { count: cCount } = await supabase
        .from('cycles')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setCycleCount(cCount ?? 0);

      const { data: myRoutines } = await supabase
        .from('routines')
        .select('id')
        .eq('user_id', user.id);
      if (myRoutines?.length) {
        const ids = myRoutines.map((r) => r.id);
        const { count: lCount } = await supabase
          .from('likes')
          .select('id', { count: 'exact', head: true })
          .in('routine_id', ids);
        setLikesReceived(lCount ?? 0);
      }

      const { data: anns } = await supabase
        .from('announcements')
        .select('*, profiles(name, username)')
        .order('created_at', { ascending: false })
        .limit(10);
      setAnnouncements(anns ?? []);
    }
    load();
  }, [user]);

  const streak = useMemo(() => calcStreak(routines), [routines]);
  const untrainedMuscles = useMemo(() => getUntrainedMuscles(routines), [routines]);
  const unusedGoals = useMemo(() => getUnusedGoals(routines), [routines]);
  const todayInfo = useMemo(() => getTodayInCycle(activeCycle), [activeCycle]);

  const notifications = useMemo(() => {
    const notifs = [];
    if (activeCycle && todayInfo) {
      const { weekNum, totalWeeks, day } = todayInfo;
      if (weekNum / totalWeeks > 0.9) {
        notifs.push({ id: `deload-${activeCycle.id}`, text: 'Deload week coming up — reduce intensity and prioritize recovery.', icon: '🔄' });
      }
      if (day?.type && day.type !== 'rest') {
        notifs.push({ id: `today-${activeCycle.id}-${todayInfo.weekIdx}`, text: `Today is a ${day.label || day.type} day in your active cycle.`, icon: '💪' });
      }
    }
    if (streak >= 3) {
      notifs.push({ id: `streak-${streak}`, text: `${streak}-day streak! Consider scheduling a rest day soon.`, icon: '🔥' });
    }
    return notifs.filter((n) => !dismissed.has(n.id));
  }, [activeCycle, todayInfo, streak, dismissed]);

  function dismissNotif(id) {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    localStorage.setItem('kratos-dismissed-notifs', JSON.stringify([...next]));
  }

  async function postAnnouncement() {
    if (!newAnnouncement.trim() || postingAnnouncement) return;
    setAnnouncementError('');
    setPostingAnnouncement(true);
    const { data, error: err } = await supabase
      .from('announcements')
      .insert({ user_id: user.id, content: newAnnouncement.trim() })
      .select('*, profiles(name, username)')
      .single();
    setPostingAnnouncement(false);
    if (err) {
      console.error('Announcements insert error:', JSON.stringify(err, null, 2));
      setAnnouncementError('Could not post. Run the announcements SQL in your Supabase dashboard first.');
    } else {
      setAnnouncements((prev) => [data, ...prev].slice(0, 10));
      setNewAnnouncement('');
    }
  }

  const isRestToday = todayInfo?.day?.type === 'rest';
  const hasTrainingToday = todayInfo?.day && !isRestToday;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* ── 1. Welcome Header ──────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 500, color: C.text, margin: '0 0 0.3rem', fontFamily: FONTS.heading }}>
              {getGreeting()}, {name}.
            </h1>
            <p style={{ color: C.textSecondary, fontSize: '0.875rem', margin: 0, maxWidth: '540px', lineHeight: 1.55, fontStyle: 'italic', fontWeight: 300 }}>
              "{getDailyQuote()}"
            </p>
          </div>
          {streak > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: C.accentMuted, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '0.6rem 1rem', flexShrink: 0 }}>
              <Flame size={18} color={C.accent} />
              <span style={{ fontWeight: 500, color: C.accent, fontSize: '1.1rem', lineHeight: 1, fontFamily: FONTS.heading }}>{streak}</span>
              <span style={{ color: C.textSecondary, fontSize: '0.8rem', fontWeight: 300 }}>day streak</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Stats ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Routines Saved', value: routines.length, color: C.accent, to: '/saved' },
          { label: 'Cycles Saved', value: cycleCount, color: '#4A7FA5', to: '/saved-cycles' },
          { label: 'Likes Received', value: likesReceived, color: '#5A9E6F', to: '/community' },
        ].map(({ label, value, color, to }) => (
          <Link
            key={label}
            to={to}
            style={{ textDecoration: 'none', ...card, padding: '0.875rem 1rem', textAlign: 'center' }}
          >
            <div style={{ fontSize: '1.75rem', fontWeight: 500, color, lineHeight: 1, fontFamily: FONTS.heading }}>{value}</div>
            <div style={{ fontSize: '0.72rem', color: C.textSecondary, fontWeight: 300, marginTop: '0.25rem' }}>{label}</div>
          </Link>
        ))}
      </div>

      {/* ── 2 & 3. Today's Training + Active Cycle ─────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: activeCycle ? '1fr 1fr' : '1fr', gap: '1rem', marginBottom: '1.5rem' }}>

        {/* Today's Training */}
        <div style={{ ...card, padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
            <Dumbbell size={16} color={C.accent} />
            <span style={{ fontWeight: 400, color: C.text, fontSize: '0.875rem' }}>Today's Training</span>
          </div>

          {hasTrainingToday ? (
            <>
              <div style={{ fontWeight: 500, fontSize: '1.05rem', color: C.text, marginBottom: '0.2rem', fontFamily: FONTS.heading }}>
                {todayInfo.day.label || todayInfo.day.type}
              </div>
              <div style={{ fontSize: '0.78rem', color: C.textSecondary, marginBottom: '0.875rem', fontWeight: 300 }}>
                {todayInfo.day.exercises?.length ?? 0} exercises
                {todayInfo.day.sessionMins ? ` · ${todayInfo.day.sessionMins} min` : ''}
                {' · '}Week {todayInfo.weekNum}
              </div>
              <Link
                to="/saved-cycles"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', backgroundColor: C.accent, color: '#fff', borderRadius: '7px', padding: '0.45rem 0.875rem', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 400 }}
              >
                View Workout <ChevronRight size={14} />
              </Link>
            </>
          ) : isRestToday ? (
            <>
              <div style={{ fontWeight: 400, fontSize: '1rem', color: C.text, marginBottom: '0.2rem' }}>Rest Day</div>
              <div style={{ fontSize: '0.78rem', color: C.textSecondary, marginBottom: '0.875rem', fontWeight: 300 }}>
                Recovery is part of the program. Stay hydrated and get good sleep.
              </div>
              <Link
                to="/generate"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', border: `1px solid ${C.accent}`, color: C.accent, borderRadius: '7px', padding: '0.4rem 0.875rem', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 400, backgroundColor: 'transparent' }}
              >
                Optional light session
              </Link>
            </>
          ) : (
            <>
              <div style={{ fontSize: '0.82rem', color: C.textSecondary, marginBottom: '0.875rem', lineHeight: 1.55, fontWeight: 300 }}>
                No active cycle running. Generate a quick routine or kick off a new training block.
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Link
                  to="/generate"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', backgroundColor: C.accent, color: '#fff', borderRadius: '7px', padding: '0.45rem 0.875rem', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 400 }}
                >
                  Quick Routine
                </Link>
                <Link
                  to="/cycle"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', border: `1px solid ${C.accent}`, color: C.accent, borderRadius: '7px', padding: '0.4rem 0.875rem', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 400, backgroundColor: 'transparent' }}
                >
                  Start a Cycle
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Active Cycle Progress */}
        {activeCycle && (
          <div style={{ ...card, padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
              <Calendar size={16} color="#4A7FA5" />
              <span style={{ fontWeight: 400, color: C.text, fontSize: '0.875rem' }}>Active Cycle</span>
            </div>
            <div style={{ fontWeight: 500, fontSize: '0.95rem', color: C.text, marginBottom: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: FONTS.heading }}>
              {activeCycle.title}
            </div>
            {todayInfo ? (
              <>
                <div style={{ fontSize: '0.75rem', color: '#4A7FA5', fontWeight: 400, marginBottom: '0.875rem' }}>
                  {getPhaseLabel(todayInfo.weekNum, todayInfo.totalWeeks)}
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: C.textSecondary, marginBottom: '0.3rem', fontWeight: 300 }}>
                    <span>Week {todayInfo.weekNum} of {todayInfo.totalWeeks}</span>
                    <span>{Math.round((todayInfo.weekNum / todayInfo.totalWeeks) * 100)}%</span>
                  </div>
                  <div style={{ height: '4px', backgroundColor: C.border, borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(todayInfo.weekNum / todayInfo.totalWeeks) * 100}%`, backgroundColor: '#4A7FA5', borderRadius: '999px' }} />
                  </div>
                </div>
                <Link
                  to="/saved-cycles"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#4A7FA5', fontSize: '0.78rem', fontWeight: 400, textDecoration: 'none' }}
                >
                  View full cycle <ChevronRight size={13} />
                </Link>
              </>
            ) : (
              <>
                <div style={{ fontSize: '0.78rem', color: C.textSecondary, marginBottom: '0.75rem', fontWeight: 300 }}>
                  {activeCycle.cycle_length}-week · {activeCycle.split_label}
                </div>
                <Link
                  to="/saved-cycles"
                  style={{ color: '#4A7FA5', fontSize: '0.78rem', fontWeight: 400, textDecoration: 'none' }}
                >
                  View cycle →
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── 4. Recommendations ─────────────────────────────────────────── */}
      {(untrainedMuscles.length > 0 || unusedGoals.length > 0) && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 500, color: C.text, margin: '0 0 0.75rem', fontFamily: FONTS.heading }}>
            Recommendations
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '0.75rem' }}>
            {untrainedMuscles.slice(0, 3).map((muscle) => {
              const color = MUSCLE_COLORS[muscle] || C.accent;
              return (
                <div key={muscle} style={{ ...card, padding: '1rem' }}>
                  <div style={{ fontSize: '0.65rem', color: C.textSecondary, fontWeight: 300, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>Undertrained</div>
                  <div style={{ fontWeight: 500, color: C.text, fontSize: '0.9rem', marginBottom: '0.3rem', fontFamily: FONTS.heading }}>{MUSCLE_LABELS[muscle]}</div>
                  <div style={{ fontSize: '0.72rem', color: C.textSecondary, marginBottom: '0.75rem', fontWeight: 300 }}>Not hit in 7 days</div>
                  <button
                    onClick={() => navigate('/generate', { state: { muscleGroups: [muscle] } })}
                    style={{ width: '100%', padding: '0.4rem', backgroundColor: color + '18', border: `1px solid ${color}40`, borderRadius: '6px', color, fontWeight: 400, fontSize: '0.78rem', cursor: 'pointer' }}
                  >
                    Train {MUSCLE_LABELS[muscle]}
                  </button>
                </div>
              );
            })}
            {unusedGoals.slice(0, 2).map((goal) => {
              const color = GOAL_COLORS[goal] || C.accent;
              return (
                <div key={goal} style={{ ...card, padding: '1rem' }}>
                  <div style={{ fontSize: '0.65rem', color: C.textSecondary, fontWeight: 300, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>Try Something New</div>
                  <div style={{ fontWeight: 500, color: C.text, fontSize: '0.9rem', marginBottom: '0.3rem', fontFamily: FONTS.heading }}>{GOAL_LABELS[goal]}</div>
                  <div style={{ fontSize: '0.72rem', color: C.textSecondary, marginBottom: '0.75rem', fontWeight: 300 }}>Not used recently</div>
                  <button
                    onClick={() => navigate('/generate', { state: { goals: [goal] } })}
                    style={{ width: '100%', padding: '0.4rem', backgroundColor: color + '18', border: `1px solid ${color}40`, borderRadius: '6px', color, fontWeight: 400, fontSize: '0.78rem', cursor: 'pointer' }}
                  >
                    {GOAL_LABELS[goal]} Session
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 5. Notifications ────────────────────────────────────────────── */}
      {notifications.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.625rem' }}>
            <Bell size={14} color={C.textSecondary} />
            <span style={{ fontSize: '0.875rem', fontWeight: 400, color: C.text }}>Reminders</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {notifications.map((n) => (
              <div
                key={n.id}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...card, padding: '0.625rem 0.875rem', gap: '0.5rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <span style={{ fontSize: '1rem' }}>{n.icon}</span>
                  <span style={{ fontSize: '0.82rem', color: C.text, fontWeight: 300 }}>{n.text}</span>
                </div>
                <button
                  onClick={() => dismissNotif(n.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem', flexShrink: 0, color: C.textSecondary, display: 'flex' }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 6. Community Announcements ──────────────────────────────────── */}
      <div style={{ ...card, padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <MessageSquare size={16} color={C.textSecondary} />
          <span style={{ fontWeight: 400, color: C.text, fontSize: '0.875rem' }}>Community Announcements</span>
        </div>

        {/* Post form */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="text"
            value={newAnnouncement}
            onChange={(e) => setNewAnnouncement(e.target.value.slice(0, 280))}
            onKeyDown={(e) => { if (e.key === 'Enter') postAnnouncement(); }}
            placeholder="Share something with the community…"
            style={{ ...inputBase, flex: 1 }}
            onFocus={(e) => (e.target.style.borderColor = C.accent)}
            onBlur={(e) => (e.target.style.borderColor = C.border)}
          />
          <button
            onClick={postAnnouncement}
            disabled={postingAnnouncement || !newAnnouncement.trim()}
            style={{ ...btnPrimary, padding: '0.5rem 0.75rem', opacity: postingAnnouncement || !newAnnouncement.trim() ? 0.45 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <Send size={16} color="#fff" />
          </button>
        </div>
        {announcementError && (
          <p style={{ color: C.accent, fontSize: '0.8rem', margin: '0 0 0.75rem' }}>{announcementError}</p>
        )}

        {/* Announcement list */}
        {announcements.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.textSecondary, fontSize: '0.82rem', padding: '1.25rem 0', fontWeight: 300 }}>
            No announcements yet. Be the first to post!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {announcements.map((ann) => (
              <div key={ann.id} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 400, color: '#fff', flexShrink: 0 }}>
                  {(ann.profiles?.name || ann.profiles?.username || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 400, fontSize: '0.82rem', color: C.text }}>{ann.profiles?.name?.split(' ')[0] || ann.profiles?.username || 'Athlete'}</span>
                    <span style={{ fontSize: '0.7rem', color: C.textSecondary, fontWeight: 300 }}>{relTime(ann.created_at)}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: C.text, marginTop: '0.1rem', wordBreak: 'break-word', lineHeight: 1.5, fontWeight: 300 }}>
                    {ann.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
