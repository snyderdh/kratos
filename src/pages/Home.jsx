import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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

function getTodayInCycle(cycle) {
  if (!cycle?.weeks?.length) return null;
  const createdAt = new Date(cycle.created_at);
  createdAt.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysSince = Math.floor((today - createdAt) / 86400000);
  const totalWeeks = cycle.cycle_length ?? cycle.weeks.length;
  if (daysSince < 0 || daysSince >= totalWeeks * 7) return null;
  const weekIdx = Math.floor(daysSince / 7);
  const dayIdx  = daysSince % 7;
  const week    = cycle.weeks[weekIdx];
  if (!week?.days) return null;
  return {
    weekIdx,
    dayIdx,
    weekNum:    weekIdx + 1,
    totalWeeks,
    day:        week.days[dayIdx] ?? null,
    phase:      week.phase ?? null,
    daysSince,
  };
}

function getPhaseName(phase, weekNum, totalWeeks) {
  if (phase && PHASE_LABELS[phase]) return PHASE_LABELS[phase];
  const pct = weekNum / totalWeeks;
  if (pct <= 0.25) return 'Foundation';
  if (pct <= 0.5)  return 'Build';
  if (pct <= 0.75) return 'Overload';
  return 'Peak';
}

function getNextMilestone(cycle, todayInfo) {
  if (!todayInfo?.phase || !cycle?.weeks) return null;
  const { weekIdx, daysSince } = todayInfo;
  const currentPhase = cycle.weeks[weekIdx]?.phase;
  if (!currentPhase) return null;
  for (let w = weekIdx + 1; w < cycle.weeks.length; w++) {
    const nextPhase = cycle.weeks[w]?.phase;
    if (nextPhase && nextPhase !== currentPhase) {
      const daysUntilWeekStart = 7 - (daysSince % 7);
      const totalDaysUntil     = daysUntilWeekStart + (w - weekIdx - 1) * 7;
      const label = PHASE_LABELS[nextPhase] ?? nextPhase;
      if (totalDaysUntil <= 1) return `${label} phase starts tomorrow`;
      if (totalDaysUntil <= 6) return `${label} week in ${totalDaysUntil} days`;
      const target = new Date();
      target.setDate(target.getDate() + totalDaysUntil);
      const dayName = target.toLocaleDateString('en-US', { weekday: 'long' });
      return `${label} phase starts ${dayName}`;
    }
  }
  return null;
}

export default function Home() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const name = profile?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Athlete';

  const [activeCycle, setActiveCycle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from('cycles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        setActiveCycle(data?.[0] ?? null);
        setLoading(false);
      });
  }, [user]);

  const todayInfo     = useMemo(() => getTodayInCycle(activeCycle), [activeCycle]);
  const nextMilestone = useMemo(() => getNextMilestone(activeCycle, todayInfo), [activeCycle, todayInfo]);

  const isRest    = todayInfo?.day?.type === 'rest';
  const isRecover = todayInfo?.day?.type === 'recover';
  const isLiftDay = todayInfo?.day && !isRest && !isRecover;

  const phaseName  = todayInfo ? getPhaseName(todayInfo.phase, todayInfo.weekNum, todayInfo.totalWeeks) : null;
  const phaseColor = todayInfo?.phase ? (PHASE_COLORS[todayInfo.phase] ?? C.accent) : C.accent;

  // progressPct: percentage of weeks started (not completed weeks - 1) so it reflects current position
  const progressPct = todayInfo
    ? Math.min(100, Math.round(((todayInfo.weekNum - 1) / todayInfo.totalWeeks) * 100))
    : 0;

  const dayTypeLabel = {
    push: 'Push', pull: 'Pull', legs: 'Legs', recover: 'Recover', rest: 'Rest',
  }[todayInfo?.day?.type] ?? (todayInfo?.day?.type ?? '');

  function beginWorkout() {
    navigate('/saved-cycles', {
      state: {
        autoLoad: activeCycle.id,
        autoDay:  { weekIdx: todayInfo.weekIdx, dayIdx: todayInfo.dayIdx },
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
    marginBottom: '0.875rem',
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

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '3.5rem 1.5rem' }}>

      {/* ── Greeting ─────────────────────────────────────────────────── */}
      <h1 style={{
        fontSize: 'clamp(2rem, 4.5vw, 2.75rem)',
        fontWeight: 400,
        fontFamily: FONTS.heading,
        fontStyle: 'italic',
        color: C.text,
        margin: '0 0 2.5rem',
        letterSpacing: '-0.3px',
        lineHeight: 1.15,
      }}>
        {getGreeting()}, {name}.
      </h1>

      {activeCycle ? (
        <>
          {/* ── Today's Workout Card ─────────────────────────────────── */}
          {isRest ? (
            /* Rest day — no CTA */
            <div style={{
              ...card,
              padding: '2rem 2.25rem',
              marginBottom: '1.25rem',
              borderLeft: `3px solid #c4bfbb`,
            }}>
              <span style={dayBadge('#9E9189', '#F5F3F2', '#e0dbd7')}>Rest</span>
              <p style={{
                fontFamily: FONTS.heading,
                fontSize: '1.35rem',
                fontWeight: 400,
                color: C.text,
                margin: '0 0 0.4rem',
                lineHeight: 1.35,
              }}>
                Rest Day — Recovery is training too.
              </p>
              <p style={{ fontSize: '0.78rem', color: C.textSecondary, fontWeight: 300, margin: 0 }}>
                Week {todayInfo.weekNum} · {phaseName} Phase
              </p>
            </div>

          ) : todayInfo ? (
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

              {/* Week · Phase */}
              <div style={{
                fontSize: '0.7rem',
                color: C.textSecondary,
                fontWeight: 300,
                letterSpacing: '0.04em',
                marginBottom: '0.5rem',
              }}>
                Week {todayInfo.weekNum} · {phaseName} Phase
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
                  ? `${todayInfo.day.exercises?.length ?? 0} exercises${todayInfo.day.totalEstimatedMin ? ` · ${todayInfo.day.totalEstimatedMin} min` : ''}`
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
                <button
                  onClick={beginWorkout}
                  style={ctaBtn('transparent', SAGE, SAGE)}
                  onMouseOver={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                  onMouseOut={(e)  => { e.currentTarget.style.opacity = '1'; }}
                >
                  View Recovery Plan →
                </button>
              )}
            </div>

          ) : (
            /* Cycle exists but today is outside it */
            <div style={{ ...card, padding: '2rem 2.25rem', marginBottom: '1.25rem' }}>
              <p style={{ color: C.textSecondary, fontWeight: 300, margin: '0 0 1.25rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
                Your current cycle has completed. Start a new training block to continue.
              </p>
              <button
                onClick={() => navigate('/kratos-split')}
                style={ctaBtn(TERRA, '#fff', null)}
                onMouseOver={(e) => { e.currentTarget.style.opacity = '0.87'; }}
                onMouseOut={(e)  => { e.currentTarget.style.opacity = '1'; }}
              >
                Begin New Cycle →
              </button>
            </div>
          )}

          {/* ── Cycle Progress ────────────────────────────────────────── */}
          <div
            onClick={() => navigate('/saved-cycles', { state: { autoLoad: activeCycle.id } })}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('/saved-cycles', { state: { autoLoad: activeCycle.id } }); }}
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
                  {todayInfo
                    ? `Week ${todayInfo.weekNum} of ${todayInfo.totalWeeks}`
                    : `${activeCycle.cycle_length ?? activeCycle.weeks?.length ?? '?'} weeks`
                  }
                </div>
              </div>
              {phaseName && (
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

            {/* Thin terracotta progress bar */}
            <div style={{
              height: '2px',
              backgroundColor: C.border,
              borderRadius: '999px',
              overflow: 'hidden',
              marginBottom: '0.6rem',
            }}>
              <div style={{
                height: '100%',
                width: `${progressPct}%`,
                backgroundColor: TERRA,
                borderRadius: '999px',
                transition: 'width 0.7s ease',
              }} />
            </div>

            {/* Labels */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.65rem',
              color: C.textSecondary,
              fontWeight: 300,
              lineHeight: 1.4,
            }}>
              <span>{progressPct}% complete</span>
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
              onClick={() => navigate('/kratos-split')}
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
              onClick={() => navigate('/cycle')}
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
