import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useActiveWorkout } from '../context/ActiveWorkoutContext';
import { supabase } from '../supabase';
import { C, FONTS, card } from '../theme';

const TERRA = '#C2622A';
const SAGE  = '#6B8F71';

const PHASE_LABELS = {
  foundation: 'Foundation',
  deload:     'Deload',
  build:      'Build',
  peak:       'Peak',
  taper:      'Taper',
};

const PHASE_COLORS = {
  foundation: '#2563eb',
  deload:     '#6b7280',
  build:      '#16a34a',
  peak:       TERRA,
  taper:      '#9333ea',
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// Build ordered session map from cycle (non-rest days only)
function buildSessionMap(cycle) {
  const sessions = [];
  let num = 1;
  (cycle.weeks ?? []).forEach((week, weekIdx) => {
    (week.days ?? []).forEach((day, dayIdx) => {
      if (day.type !== 'rest') {
        sessions.push({
          sessionNum: num++,
          weekIdx,
          dayIdx,
          day,
          phase:   week.phase ?? 'foundation',
          weekNum: weekIdx + 1,
        });
      }
    });
  });
  return sessions;
}

// Sessions until the next phase change (shown as right-side label on progress bar)
function getNextMilestone(sessionMap, nextSession) {
  if (!nextSession || !sessionMap.length) return null;
  const currentPhase = nextSession.phase;
  for (const s of sessionMap) {
    if (s.sessionNum <= nextSession.sessionNum) continue;
    if (s.phase !== currentPhase) {
      const dist  = s.sessionNum - nextSession.sessionNum;
      const label = PHASE_LABELS[s.phase] ?? s.phase;
      if (dist === 1) return `${label} phase next session`;
      return `${label} phase in ${dist} sessions`;
    }
  }
  return null;
}

// Process workout_logs → streak (7 booleans) + lastWorkout summary
function processLogs(logs) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 7-day streak: oldest day first (index 0 = 6 days ago, index 6 = today)
  const streak = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    streak.push(logs.some((l) => l.logged_at?.startsWith(dateStr)));
  }

  if (!logs.length) return { streak, lastWorkout: null };

  const mostRecentDate = logs[0].logged_at?.split('T')[0];
  if (!mostRecentDate) return { streak, lastWorkout: null };

  const sessionLogs    = logs.filter((l) => l.logged_at?.startsWith(mostRecentDate));
  const dayType        = sessionLogs[0]?.day_type ?? '';
  const exerciseNames  = [...new Set(sessionLogs.map((l) => l.exercise_name))];
  let vol = 0, rpeSum = 0, rpeCount = 0;
  sessionLogs.forEach((l) => {
    if (l.weight_lbs && l.reps_completed) {
      vol += parseFloat(l.weight_lbs) * parseInt(l.reps_completed, 10);
    }
    if (l.rpe_actual) { rpeSum += parseFloat(l.rpe_actual); rpeCount++; }
  });

  return {
    streak,
    lastWorkout: {
      date:          mostRecentDate,
      dayType,
      exerciseCount: exerciseNames.length,
      totalVolume:   Math.round(vol),
      avgRPE:        rpeCount > 0 ? (rpeSum / rpeCount).toFixed(1) : null,
    },
  };
}

export default function Home() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const name = profile?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Athlete';

  const { activeWorkout, isActive, loggedSetCount, endWorkout } = useActiveWorkout();
  const [elapsed,       setElapsed]      = useState(0);
  const [showAbandon,   setShowAbandon]  = useState(false);
  const [abandonBusy,   setAbandonBusy]  = useState(false);

  const [activeCycle,    setActiveCycle]    = useState(null);
  const [lastWorkout,    setLastWorkout]    = useState(null);
  const [streak,         setStreak]         = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [markingComplete, setMarkingComplete] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    Promise.all([
      supabase
        .from('cycles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('workout_logs')
        .select('logged_at, day_type, exercise_name, weight_lbs, reps_completed, rpe_actual')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(200),
    ]).then(([{ data: cycleData }, { data: logData }]) => {
      setActiveCycle(cycleData?.[0] ?? null);
      const { streak: s, lastWorkout: lw } = processLogs(logData ?? []);
      setStreak(s);
      setLastWorkout(lw);
      setLoading(false);
    });
  }, [user]);

  // Active workout elapsed timer
  useEffect(() => {
    if (!isActive || !activeWorkout?.startTime) { setElapsed(0); return; }
    setElapsed(Math.floor((Date.now() - activeWorkout.startTime) / 1000));
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - activeWorkout.startTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [isActive, activeWorkout?.startTime]);

  async function handleKeepLogs() {
    endWorkout();
    setShowAbandon(false);
  }

  async function handleDiscardEverything() {
    setAbandonBusy(true);
    if (user && activeWorkout?.startTime) {
      const since = new Date(activeWorkout.startTime).toISOString();
      await supabase.from('workout_logs').delete().eq('user_id', user.id).gte('logged_at', since);
    }
    endWorkout();
    setShowAbandon(false);
    setAbandonBusy(false);
  }

  async function handleMarkRecoverComplete() {
    if (!nextSession || !activeCycle || markingComplete) return;
    setMarkingComplete(true);
    const prev = new Set(activeCycle.completed_sessions ?? []);
    prev.add(nextSession.sessionNum);
    const arr = [...prev];
    await supabase.from('cycles').update({ completed_sessions: arr }).eq('id', activeCycle.id);
    setActiveCycle(c => ({ ...c, completed_sessions: arr }));
    setMarkingComplete(false);
  }

  function formatSec(s) {
    if (s >= 3600) {
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      return `${h}h ${m}m`;
    }
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  // Derived session state
  const sessionMap     = useMemo(() => activeCycle ? buildSessionMap(activeCycle) : [], [activeCycle]);
  const completedSet   = useMemo(() => new Set(activeCycle?.completed_sessions ?? []), [activeCycle]);
  const totalSessions  = sessionMap.length;
  const completedCount = completedSet.size;

  // Next incomplete session (first session not in completed set)
  const nextSession = useMemo(
    () => sessionMap.find((s) => !completedSet.has(s.sessionNum)) ?? null,
    [sessionMap, completedSet]
  );

  const nextMilestone  = useMemo(() => getNextMilestone(sessionMap, nextSession), [sessionMap, nextSession]);
  const cycleComplete  = activeCycle && !nextSession;
  const isRecover      = nextSession?.day?.type === 'recover';
  const isLiftDay      = nextSession?.day && !isRecover;
  const phaseName      = nextSession ? (PHASE_LABELS[nextSession.phase] ?? nextSession.phase) : null;
  const phaseColor     = nextSession?.phase ? (PHASE_COLORS[nextSession.phase] ?? C.accent) : C.accent;
  const progressPct    = totalSessions > 0 ? Math.min(100, Math.round((completedCount / totalSessions) * 100)) : 0;

  const dayTypeLabel = {
    push: 'Push', pull: 'Pull', legs: 'Legs', recover: 'Recover',
  }[nextSession?.day?.type] ?? (nextSession?.day?.type ?? '');

  function beginWorkout() {
    if (!nextSession) return;
    navigate('/kratos', {
      state: {
        tab: 'cycles',
        autoLoad: activeCycle.id,
        autoDay:  { weekIdx: nextSession.weekIdx, dayIdx: nextSession.dayIdx },
      },
    });
  }

  // ── Loading skeleton ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '3.5rem 1.5rem' }}>
        <div style={{ height: '2.75rem', width: '55%', borderRadius: '6px', backgroundColor: C.border, marginBottom: '2.5rem' }} />
        <div style={{ ...card, padding: '2rem', marginBottom: '1.25rem', opacity: 0.5 }}>
          <div style={{ height: '0.75rem', width: '25%', backgroundColor: C.border, borderRadius: '4px', marginBottom: '1rem' }} />
          <div style={{ height: '1.5rem', width: '55%', backgroundColor: C.border, borderRadius: '4px', marginBottom: '0.5rem' }} />
          <div style={{ height: '1rem', width: '35%', backgroundColor: C.border, borderRadius: '4px' }} />
        </div>
      </div>
    );
  }

  // ── Shared styles ─────────────────────────────────────────────────────
  const dayBadge = (color, bg, border) => ({
    display: 'inline-block',
    fontSize: '0.58rem',
    fontWeight: 600,
    color,
    backgroundColor: bg,
    border: `1px solid ${border}`,
    borderRadius: '999px',
    padding: '0.18rem 0.65rem',
    letterSpacing: '0.09em',
    textTransform: 'uppercase',
    marginBottom: '0.5rem',
  });

  const ctaBtn = (bg, fg, border) => ({
    marginTop: '1.75rem',
    width: '100%',
    padding: '0.9rem',
    backgroundColor: bg,
    color: fg,
    border: border ? `1.5px solid ${border}` : 'none',
    borderRadius: '10px',
    fontSize: '0.925rem',
    fontWeight: 500,
    fontFamily: FONTS.body,
    cursor: 'pointer',
    letterSpacing: '0.01em',
    transition: 'opacity 0.15s',
    display: 'block',
  });

  const editorialLabel = {
    fontSize: '0.58rem',
    fontWeight: 700,
    color: TERRA,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '0.4rem',
    fontFamily: FONTS.body,
  };

  const streakDaysActive = streak.filter(Boolean).length;

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '3.5rem 1.5rem' }}>

      {/* ── Active Workout Tile ───────────────────────────────────────── */}
      {isActive && activeWorkout && (
        <div style={{
          ...card,
          padding: '1rem 1.25rem',
          marginBottom: '1.75rem',
          borderLeft: `3px solid ${TERRA}`,
          cursor: 'pointer',
        }}
          onClick={() => navigate('/train')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.55rem', fontWeight: 700, color: TERRA, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.25rem', fontFamily: FONTS.body }}>
                Active Workout
              </div>
              <div style={{ fontWeight: 400, color: C.text, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.2rem' }}>
                {activeWorkout.title ?? 'Workout in Progress'}
              </div>
              <div style={{ fontSize: '0.7rem', color: C.textSecondary, fontWeight: 300 }}>
                {formatSec(elapsed)} · {loggedSetCount} set{loggedSetCount !== 1 ? 's' : ''} logged
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, marginLeft: '1rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: TERRA, animation: 'aw-pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 500, color: TERRA, fontFamily: FONTS.body }}>Resume →</span>
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowAbandon(true); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: C.textSecondary, fontWeight: 300, fontFamily: FONTS.body, padding: '0.1rem 0', textDecoration: 'underline', textDecorationColor: C.border }}
            >
              Abandon workout
            </button>
          </div>
        </div>
      )}

      {/* ── Abandon Sheet ─────────────────────────────────────────────── */}
      {showAbandon && (
        <div
          onClick={() => setShowAbandon(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9000, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: C.surface, borderRadius: '16px 16px 0 0', width: '100%', maxWidth: '560px', padding: '1.5rem 1.5rem 2rem', boxShadow: '0 -8px 48px rgba(0,0,0,0.18)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: C.border }} />
            </div>
            <h3 style={{ margin: '0 0 0.4rem', fontSize: '1rem', fontWeight: 500, color: C.text, fontFamily: FONTS.heading }}>Abandon Workout?</h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.82rem', color: C.textSecondary, fontWeight: 300, lineHeight: 1.55 }}>
              What would you like to do with the sets you've already logged?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                onClick={handleKeepLogs}
                style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: `1.5px solid ${C.border}`, backgroundColor: 'transparent', color: C.text, fontWeight: 400, fontSize: '0.875rem', cursor: 'pointer', fontFamily: FONTS.body }}
              >
                Keep what I've logged
              </button>
              <button
                onClick={handleDiscardEverything}
                disabled={abandonBusy}
                style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: 'none', backgroundColor: abandonBusy ? '#e5e7eb' : '#fef2f2', color: abandonBusy ? C.textSecondary : '#dc2626', fontWeight: 400, fontSize: '0.875rem', cursor: abandonBusy ? 'default' : 'pointer', fontFamily: FONTS.body }}
              >
                {abandonBusy ? 'Discarding…' : 'Discard everything'}
              </button>
              <button
                onClick={() => setShowAbandon(false)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', border: 'none', backgroundColor: 'transparent', color: C.textSecondary, fontWeight: 300, fontSize: '0.82rem', cursor: 'pointer', fontFamily: FONTS.body }}
              >
                Keep going
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes aw-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>

      {/* ── Greeting ─────────────────────────────────────────────────── */}
      <h1 style={{
        fontSize: 'clamp(2rem, 4.5vw, 2.75rem)',
        fontWeight: 400,
        fontFamily: FONTS.heading,
        fontStyle: 'italic',
        color: C.text,
        margin: '0 0 1.25rem',
        letterSpacing: '-0.3px',
        lineHeight: 1.15,
      }}>
        {getGreeting()}, {name}.
      </h1>

      {/* ── 7-day streak dots ─────────────────────────────────────────── */}
      {streak.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '2rem' }}>
          {streak.map((active, i) => (
            <div
              key={i}
              style={{
                width: '8px', height: '8px', borderRadius: '50%',
                backgroundColor: active ? TERRA : C.border,
                transition: 'background-color 0.2s',
              }}
            />
          ))}
          {streakDaysActive > 0 && (
            <span style={{ fontSize: '0.65rem', color: C.textSecondary, fontWeight: 300, marginLeft: '0.25rem' }}>
              {streakDaysActive} day{streakDaysActive !== 1 ? 's' : ''} trained this week
            </span>
          )}
        </div>
      )}

      {activeCycle ? (
        <>
          {/* ── Next Workout Card ──────────────────────────────────────── */}
          {(cycleComplete || nextSession) && <div style={editorialLabel}>Next Workout</div>}
          {cycleComplete ? (
            /* All sessions complete */
            <div style={{ ...card, padding: '2rem 2.25rem', marginBottom: '1.25rem' }}>
              <p style={{
                fontFamily: FONTS.heading, fontStyle: 'italic', fontSize: '1.35rem',
                fontWeight: 400, color: C.text, margin: '0 0 0.5rem',
              }}>
                Cycle complete.
              </p>
              <p style={{ color: C.textSecondary, fontWeight: 300, margin: '0 0 1.25rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
                Congratulations — you've finished all {totalSessions} sessions. Start a new block to keep progressing.
              </p>
              <button
                onClick={() => navigate('/kratos')}
                style={ctaBtn(TERRA, '#fff', null)}
                onMouseOver={(e) => { e.currentTarget.style.opacity = '0.87'; }}
                onMouseOut={(e)  => { e.currentTarget.style.opacity = '1'; }}
              >
                Begin New Cycle →
              </button>
            </div>

          ) : nextSession ? (
            /* Lifting or recover day */
            <div style={{
              ...card,
              padding: '2rem 2.25rem',
              marginBottom: '1.25rem',
              borderLeft: `3px solid ${isRecover ? SAGE : TERRA}`,
            }}>
              {/* Day type badge */}
              <span style={dayBadge(
                isRecover ? SAGE : TERRA,
                isRecover ? '#EEF4EF' : '#F5EDE6',
                isRecover ? `${SAGE}55` : `${TERRA}55`,
              )}>
                {dayTypeLabel}
              </span>

              {/* "Next Up" metadata */}
              <div style={{
                fontSize: '0.7rem',
                color: C.textSecondary,
                fontWeight: 300,
                letterSpacing: '0.04em',
                marginBottom: '0.5rem',
              }}>
                Next Up: {dayTypeLabel} · Week {nextSession.weekNum} · {phaseName}
              </div>

              {/* Exercise count / description */}
              <div style={{
                fontFamily: FONTS.heading,
                fontSize: 'clamp(1.35rem, 3vw, 1.65rem)',
                fontWeight: 400,
                color: C.text,
                lineHeight: 1.25,
              }}>
                {isLiftDay
                  ? `${nextSession.day.exercises?.length ?? 0} exercises${nextSession.day.estimatedMin || nextSession.day.totalEstimatedMin ? ` · ${nextSession.day.estimatedMin ?? nextSession.day.totalEstimatedMin} min` : ''}`
                  : 'Active recovery · Mobility & light cardio'
                }
              </div>

              {/* CTA */}
              {isLiftDay && (
                <button
                  onClick={beginWorkout}
                  style={ctaBtn(TERRA, '#fff', null)}
                  onMouseOver={(e) => { e.currentTarget.style.opacity = '0.87'; }}
                  onMouseOut={(e)  => { e.currentTarget.style.opacity = '1'; }}
                >
                  Begin Today's Workout →
                </button>
              )}
              {isRecover && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.75rem' }}>
                  <button
                    onClick={beginWorkout}
                    style={{ ...ctaBtn('transparent', SAGE, SAGE), marginTop: 0 }}
                    onMouseOver={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                    onMouseOut={(e)  => { e.currentTarget.style.opacity = '1'; }}
                  >
                    View Recovery Plan →
                  </button>
                  <button
                    onClick={handleMarkRecoverComplete}
                    disabled={markingComplete}
                    style={{ ...ctaBtn('transparent', '#16a34a', '#16a34a'), marginTop: 0, opacity: markingComplete ? 0.6 : 1 }}
                    onMouseOver={(e) => { if (!markingComplete) e.currentTarget.style.opacity = '0.7'; }}
                    onMouseOut={(e)  => { e.currentTarget.style.opacity = '1'; }}
                  >
                    {markingComplete ? 'Marking…' : '✓ Mark Recovery Complete'}
                  </button>
                </div>
              )}
            </div>

          ) : null}

          {/* ── Last Workout Card ──────────────────────────────────────── */}
          {lastWorkout && (
            <>
            <div style={editorialLabel}>Last Workout</div>
            <div style={{ ...card, padding: '1.125rem 1.5rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 400, color: C.text, fontSize: '0.9rem', marginBottom: '0.15rem', textTransform: 'capitalize' }}>
                    {lastWorkout.dayType || 'Workout'} Day
                  </div>
                  <div style={{ fontSize: '0.72rem', color: C.textSecondary, fontWeight: 300 }}>
                    {new Date(lastWorkout.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    {' · '}{lastWorkout.exerciseCount} exercise{lastWorkout.exerciseCount !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexShrink: 0 }}>
                  {lastWorkout.totalVolume > 0 && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 500, color: C.text, fontFamily: FONTS.heading }}>{lastWorkout.totalVolume.toLocaleString()}</div>
                      <div style={{ fontSize: '0.58rem', color: C.textSecondary, fontWeight: 300, textTransform: 'uppercase', letterSpacing: '0.06em' }}>lbs volume</div>
                    </div>
                  )}
                  {lastWorkout.avgRPE && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 500, color: C.text, fontFamily: FONTS.heading }}>{lastWorkout.avgRPE}</div>
                      <div style={{ fontSize: '0.58rem', color: C.textSecondary, fontWeight: 300, textTransform: 'uppercase', letterSpacing: '0.06em' }}>avg RPE</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            </>
          )}

          {/* ── Cycle Progress ────────────────────────────────────────── */}
          <div style={editorialLabel}>Current Cycle</div>
          <div
            onClick={() => navigate('/kratos', { state: { tab: 'cycles', autoLoad: activeCycle.id } })}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('/kratos', { state: { tab: 'cycles', autoLoad: activeCycle.id } }); }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = TERRA; }}
            onMouseOut={(e)  => { e.currentTarget.style.borderColor = C.border; }}
            style={{ ...card, padding: '1.375rem 1.75rem', cursor: 'pointer', transition: 'border-color 0.15s' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{
                  fontWeight: 400,
                  color: C.text,
                  fontSize: '0.875rem',
                  marginBottom: '0.2rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '340px',
                }}>
                  {activeCycle.title}
                </div>
                <div style={{ fontSize: '0.7rem', color: C.textSecondary, fontWeight: 300 }}>
                  {completedCount} of {totalSessions} sessions complete
                </div>
              </div>
              {phaseName && nextSession && (
                <span style={{
                  fontSize: '0.58rem',
                  fontWeight: 600,
                  color: phaseColor,
                  backgroundColor: `${phaseColor}15`,
                  border: `1px solid ${phaseColor}35`,
                  borderRadius: '999px',
                  padding: '0.2rem 0.625rem',
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  flexShrink: 0,
                  marginLeft: '0.75rem',
                }}>
                  {phaseName}
                </span>
              )}
            </div>

            {/* Session progress bar */}
            <div style={{ height: '2px', backgroundColor: C.border, borderRadius: '999px', overflow: 'hidden', marginBottom: '0.6rem' }}>
              <div style={{
                height: '100%',
                width: `${progressPct}%`,
                backgroundColor: TERRA,
                borderRadius: '999px',
                transition: 'width 0.7s ease',
              }} />
            </div>

            {/* Labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: C.textSecondary, fontWeight: 300, lineHeight: 1.4 }}>
              <span>{completedCount} / {totalSessions} sessions</span>
              {nextMilestone && <span style={{ textAlign: 'right' }}>{nextMilestone}</span>}
            </div>
          </div>
        </>

      ) : (
        /* ── State 2: No active cycle ────────────────────────────────── */
        <div style={{ ...card, padding: '2.5rem 2.25rem' }}>
          <p style={{
            fontFamily: FONTS.heading,
            fontStyle: 'italic',
            fontSize: '1.5rem',
            fontWeight: 400,
            color: C.text,
            margin: '0 0 0.5rem',
            lineHeight: 1.35,
          }}>
            Start your training.
          </p>
          <p style={{
            fontSize: '0.82rem',
            color: C.textSecondary,
            fontWeight: 300,
            margin: '0 0 2rem',
            lineHeight: 1.65,
          }}>
            Choose a structured training block to get started.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/kratos')}
              style={{
                flex: '1 1 140px',
                padding: '0.75rem 1rem',
                backgroundColor: TERRA,
                color: '#fff',
                border: 'none',
                borderRadius: '9px',
                fontSize: '0.875rem',
                fontWeight: 500,
                fontFamily: FONTS.body,
                cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
              onMouseOver={(e) => { e.currentTarget.style.opacity = '0.87'; }}
              onMouseOut={(e)  => { e.currentTarget.style.opacity = '1'; }}
            >
              Begin Kratos Split
            </button>
            <button
              onClick={() => navigate('/kratos', { state: { tab: 'generate' } })}
              style={{
                flex: '1 1 140px',
                padding: '0.75rem 1rem',
                backgroundColor: 'transparent',
                color: C.text,
                border: `1.5px solid ${C.border}`,
                borderRadius: '9px',
                fontSize: '0.875rem',
                fontWeight: 400,
                fontFamily: FONTS.body,
                cursor: 'pointer',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = C.text; }}
              onMouseOut={(e)  => { e.currentTarget.style.borderColor = C.border; }}
            >
              Build a Routine
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
