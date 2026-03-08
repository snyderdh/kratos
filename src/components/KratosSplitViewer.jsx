import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import { C, FONTS } from '../theme';
import ExerciseInfoModal from './ExerciseInfoModal';
import { useAuth } from '../context/AuthContext';
import { useActiveWorkout } from '../context/ActiveWorkoutContext';
import { supabase } from '../supabase';

// ── Brand / phase constants ────────────────────────────────────────────
const TERRA = '#C2622A';
const SAGE  = '#6B8F71';
const MIST  = '#9E9189';

const PHASE_META = {
  foundation: { color: '#2563eb', bg: '#eff6ff', label: 'Foundation' },
  deload:     { color: '#6b7280', bg: '#f9fafb', label: 'Deload'     },
  build:      { color: '#16a34a', bg: '#f0fdf4', label: 'Build'      },
  peak:       { color: TERRA,     bg: '#F5EDE6', label: 'Peak'       },
  taper:      { color: '#9333ea', bg: '#faf5ff', label: 'Taper'      },
};

const DAY_META = {
  push:    { color: TERRA, bg: '#F5EDE6', label: 'Push',    isLift: true  },
  pull:    { color: TERRA, bg: '#F5EDE6', label: 'Pull',    isLift: true  },
  legs:    { color: TERRA, bg: '#F5EDE6', label: 'Legs',    isLift: true  },
  recover: { color: SAGE,  bg: '#EEF4EF', label: 'Recover', isLift: false },
  rest:    { color: MIST,  bg: '#F5F3F2', label: 'Rest',    isLift: false },
};

const PHASE_EX_COLORS = {
  primary:     { border: TERRA,     bg: '#F5EDE6', text: TERRA     },
  secondary:   { border: '#2563eb', bg: '#eff6ff', text: '#2563eb' },
  accessory:   { border: '#16a34a', bg: '#f0fdf4', text: '#16a34a' },
  intensifier: { border: '#9333ea', bg: '#faf5ff', text: '#9333ea' },
  core:        { border: '#6b7280', bg: '#f9fafb', text: '#6b7280' },
};

const PHASE_EX_LABELS = {
  primary:     { label: 'Primary Compound',   desc: 'Foundation of the session — max neural drive',         estPerEx: 20  },
  secondary:   { label: 'Secondary Compound', desc: 'Supplementary load, reinforce target muscles',         estPerEx: 13  },
  accessory:   { label: 'Accessories',        desc: 'Isolation work and volume accumulation',               estPerEx: 7   },
  intensifier: { label: 'Intensifier',        desc: 'Drop set finisher — controlled failure',               estPerEx: 5   },
  core:        { label: 'Core Finisher',      desc: 'Anti-extension and stabilization',                     estPerEx: 4.5 },
};

// ── Tracking type helpers ──────────────────────────────────────────────
// Mirrors the trackingType assigned in exercises.js
const TIME_EX_IDS     = new Set([36, 114, 130, 163, 167, 169, 170]);
const WEIGHTED_BW_IDS = new Set([10, 31, 93, 107, 108]);

function getTrackingType(ex) {
  if (!ex) return 'reps';
  if (TIME_EX_IDS.has(ex.id)) return 'time';
  if (WEIGHTED_BW_IDS.has(ex.id)) return 'weighted_bodyweight';
  if (ex.equipment === 'bodyweight') return 'bodyweight';
  return 'reps';
}

function formatPrescription(ex) {
  const tt   = getTrackingType(ex);
  const sets = ex.sets ?? 3;
  const reps = ex.reps ?? '—';
  if (tt === 'time')               return `${sets} × ${reps} hold`;
  if (tt === 'bodyweight')         return `${sets} × ${reps} reps (bodyweight)`;
  if (tt === 'weighted_bodyweight') return `${sets} × ${reps} reps (+ weight optional)`;
  return `${sets} × ${reps}`;
}

const DAYHEADERS = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

const REST_TIPS = [
  'Sleep 7–9 hours. Growth hormone peaks during deep sleep — not during training.',
  'Protein synthesis is highest 24–48h post-stimulus. Total daily protein matters most.',
  'Mild dehydration impairs muscle protein synthesis. Drink consistently throughout the day.',
  'Light walking maintains circulation without accumulating fatigue. Avoid prolonged sitting.',
];

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

// ── Mobile detection hook ──────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth <= 768);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth <= 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return mobile;
}

// ── Session map ────────────────────────────────────────────────────────
// Returns ordered array of non-rest sessions: {sessionNum, weekIdx, dayIdx, day, phase, weekNum}
function buildSessionMap(cycle) {
  const sessions = [];
  let num = 1;
  (cycle.weeks ?? []).forEach((week, weekIdx) => {
    (week.days ?? []).forEach((day, dayIdx) => {
      if (day.type !== 'rest') {
        sessions.push({ sessionNum: num++, weekIdx, dayIdx, day, phase: week.phase ?? 'foundation', weekNum: weekIdx + 1 });
      }
    });
  });
  return sessions;
}

// ── Progress bar ───────────────────────────────────────────────────────
function ProgressBar({ cycle, completedDays }) {
  const totalTraining = cycle.weeks.reduce((acc, w) =>
    acc + w.days.filter((d) => d.type !== 'rest').length, 0);
  const completedCount = Object.values(completedDays).filter(Boolean).length;
  const pct = totalTraining > 0 ? Math.round((completedCount / totalTraining) * 100) : 0;

  // First week with any incomplete training day = current week
  let currentWeekNum = cycle.weeks.length;
  for (let w = 0; w < cycle.weeks.length; w++) {
    const hasIncomplete = cycle.weeks[w].days.some((d, di) =>
      d.type !== 'rest' && !completedDays[`${w}:${di}`]
    );
    if (hasIncomplete) { currentWeekNum = w + 1; break; }
  }

  const phase = cycle.weeks[currentWeekNum - 1]?.phase ?? 'foundation';
  const pm = PHASE_META[phase] ?? PHASE_META.foundation;

  return (
    <div style={{ marginBottom: '1.25rem', padding: '0.875rem 1.125rem', backgroundColor: C.surface, borderRadius: '10px', border: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 400, color: C.text, fontSize: '0.875rem' }}>Week {currentWeekNum} of {cycle.weeks.length}</span>
          <span style={{ padding: '0.15rem 0.55rem', borderRadius: '999px', backgroundColor: pm.bg, color: pm.color, fontSize: '0.7rem', fontWeight: 400 }}>
            {pm.label} Phase
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', color: C.textSecondary, fontWeight: 300 }}>
          {completedCount} / {totalTraining} sessions complete
        </span>
      </div>
      <div style={{ height: '5px', backgroundColor: C.border, borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: TERRA, borderRadius: '3px', transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

// ── Calendar grid ──────────────────────────────────────────────────────
function CalendarGrid({ cycle, completedDays, onDayClick, mobileWeek, setMobileWeek, isMobile, currentWeekIdx, nextSession, weekRowRefs, onJumpToNext }) {
  // A week is "current" when it contains the next incomplete session
  const isInRange = currentWeekIdx >= 0 && currentWeekIdx < cycle.weeks.length;
  const weeksToRender = isMobile
    ? [{ week: cycle.weeks[mobileWeek], weekIdx: mobileWeek }]
    : cycle.weeks.map((w, i) => ({ week: w, weekIdx: i }));

  return (
    <div>
      {/* Mobile week navigator */}
      {isMobile && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <button
            onClick={() => setMobileWeek((w) => Math.max(0, w - 1))}
            disabled={mobileWeek === 0}
            style={{ padding: '0.4rem 0.875rem', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: C.surface, color: C.text, fontWeight: 300, fontSize: '0.82rem', cursor: mobileWeek === 0 ? 'default' : 'pointer', opacity: mobileWeek === 0 ? 0.35 : 1, fontFamily: FONTS.body }}
          >
            ← Prev
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.875rem', color: C.text, fontWeight: 400 }}>Week {mobileWeek + 1} of {cycle.weeks.length}</div>
            <div style={{ fontSize: '0.7rem', color: PHASE_META[cycle.weeks[mobileWeek]?.phase]?.color ?? C.textSecondary, fontWeight: 300 }}>
              {PHASE_META[cycle.weeks[mobileWeek]?.phase]?.label ?? ''} Phase
            </div>
          </div>
          <button
            onClick={() => setMobileWeek((w) => Math.min(cycle.weeks.length - 1, w + 1))}
            disabled={mobileWeek === cycle.weeks.length - 1}
            style={{ padding: '0.4rem 0.875rem', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: C.surface, color: C.text, fontWeight: 300, fontSize: '0.82rem', cursor: mobileWeek === cycle.weeks.length - 1 ? 'default' : 'pointer', opacity: mobileWeek === cycle.weeks.length - 1 ? 0.35 : 1, fontFamily: FONTS.body }}
          >
            Next →
          </button>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: isMobile ? 'unset' : '620px' }}>
          {/* Day header row + Jump to Next button */}
          <div style={{ display: 'grid', gridTemplateColumns: '68px repeat(7, 1fr)', gap: '3px', marginBottom: '4px', alignItems: 'center' }}>
            {/* Jump to Next in the label column */}
            {isInRange && !isMobile ? (
              <button
                onClick={onJumpToNext}
                title="Jump to next session"
                style={{ padding: '0.2rem 0.3rem', borderRadius: '6px', border: `1px solid ${TERRA}`, backgroundColor: 'transparent', color: TERRA, fontSize: '0.52rem', fontWeight: 500, cursor: 'pointer', letterSpacing: '0.04em', fontFamily: FONTS.body, lineHeight: 1.3, textAlign: 'center' }}
              >
                ↓ Next
              </button>
            ) : <div />}
            {DAYHEADERS.map((d) => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.62rem', fontWeight: 400, color: C.textSecondary, padding: '2px 0' }}>{d}</div>
            ))}
          </div>

          {/* Week rows */}
          {weeksToRender.map(({ week, weekIdx }) => {
            const pm             = PHASE_META[week.phase] ?? PHASE_META.foundation;
            const isDeload       = week.phase === 'deload';
            const isCurrentWeek  = weekIdx === currentWeekIdx && isInRange;

            // Per-week progress
            const weekSessions   = week.days.filter((d) => d.type !== 'rest').length;
            const weekCompleted  = week.days.filter((d, di) =>
              d.type !== 'rest' && !!completedDays[`${weekIdx}:${di}`]
            ).length;
            const weekAllDone    = weekCompleted === weekSessions && weekSessions > 0;
            const weekPct        = weekSessions > 0 ? Math.round((weekCompleted / weekSessions) * 100) : 0;

            const labelColor     = isCurrentWeek ? TERRA : pm.color;
            const labelBg        = isCurrentWeek ? '#F5EDE6' : pm.bg;
            const labelBorder    = isCurrentWeek ? TERRA : pm.color;

            return (
              <div
                key={week.weekNumber}
                ref={(el) => { if (weekRowRefs) weekRowRefs.current[weekIdx] = el; }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '68px repeat(7, 1fr)',
                  gap: '3px',
                  marginBottom: '3px',
                  borderRadius: isCurrentWeek ? '8px' : '0',
                  outline: isCurrentWeek ? `1.5px solid ${TERRA}30` : 'none',
                  backgroundColor: isCurrentWeek ? `${TERRA}06` : 'transparent',
                  padding: isCurrentWeek ? '2px' : '0',
                }}
              >
                {/* Week label */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '3px', padding: '4px 5px', backgroundColor: labelBg, borderRadius: '6px', borderLeft: `3px solid ${labelBorder}` }}>
                  {/* Week number + THIS WEEK badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: isCurrentWeek ? 700 : 500, color: labelColor, lineHeight: 1 }}>
                      W{week.weekNumber}
                    </span>
                    {isCurrentWeek && (
                      <span style={{ fontSize: '0.42rem', fontWeight: 700, color: '#fff', backgroundColor: TERRA, padding: '0.08rem 0.28rem', borderRadius: '2px', lineHeight: 1.5, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                        NOW
                      </span>
                    )}
                  </div>

                  {/* Phase label (hidden for current week to save space) */}
                  {!isCurrentWeek && (
                    <div style={{ fontSize: '0.5rem', color: pm.color, opacity: 0.75, lineHeight: 1 }}>{pm.label}</div>
                  )}

                  {/* Mini progress bar */}
                  {weekAllDone ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: '#fff', fontSize: '7px', fontWeight: 700, lineHeight: 1 }}>✓</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ height: '3px', backgroundColor: isCurrentWeek ? `${TERRA}30` : `${pm.color}25`, borderRadius: '2px', overflow: 'hidden', marginBottom: '2px' }}>
                        <div style={{ height: '100%', width: `${weekPct}%`, backgroundColor: weekPct > 0 ? TERRA : 'transparent', borderRadius: '2px', transition: 'width 0.3s ease' }} />
                      </div>
                      <div style={{ fontSize: '0.45rem', color: weekCompleted > 0 ? labelColor : C.textSecondary, fontWeight: weekCompleted > 0 ? 500 : 300, lineHeight: 1 }}>
                        {weekCompleted}/{weekSessions}
                      </div>
                    </div>
                  )}
                </div>

                {/* Day cells */}
                {week.days.map((day, dayIdx) => {
                  const dKey        = `${weekIdx}:${dayIdx}`;
                  const isCompleted = !!completedDays[dKey];
                  const isNextSess  = nextSession?.weekIdx === weekIdx && nextSession?.dayIdx === dayIdx;
                  const meta        = DAY_META[day.type] ?? DAY_META.rest;
                  const isRest      = day.type === 'rest';
                  const isRecover   = day.type === 'recover';
                  const isLift      = ['push', 'pull', 'legs'].includes(day.type);

                  const cellBorder = isRest
                    ? C.border
                    : isCompleted
                      ? '#86efac'
                      : isNextSess
                        ? TERRA
                        : meta.color + '38';

                  return (
                    <button
                      key={dayIdx}
                      onClick={() => onDayClick(weekIdx, dayIdx)}
                      title={`${day.label} — Week ${week.weekNumber}`}
                      style={{
                        position: 'relative',
                        padding: '5px 2px 4px',
                        borderRadius: '6px',
                        border: `1.5px solid ${cellBorder}`,
                        backgroundColor: isCompleted ? '#f0fdf4' : (isRest ? C.bg : meta.bg),
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.13s',
                        minHeight: '60px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        overflow: 'hidden',
                        boxShadow: isNextSess ? `0 0 0 2px ${TERRA}30` : (isCurrentWeek ? '0 2px 8px rgba(194,98,42,0.14)' : 'none'),
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = isRest ? C.accent + '50' : meta.color; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = cellBorder; }}
                    >
                      {/* Completed checkmark */}
                      {isCompleted && (
                        <div style={{ position: 'absolute', top: '3px', right: '3px', width: '13px', height: '13px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ color: '#fff', fontSize: '7px', lineHeight: 1, fontWeight: 700 }}>✓</span>
                        </div>
                      )}

                      {/* Day type */}
                      <div style={{ fontSize: '0.63rem', fontWeight: 500, color: isRest ? MIST : (isCompleted ? '#16a34a' : meta.color), lineHeight: 1 }}>
                        {day.label}
                      </div>

                      {/* Sub-info */}
                      {!isRest && (
                        <div style={{ fontSize: '0.54rem', color: C.textSecondary, fontWeight: 300, lineHeight: 1.3, textAlign: 'center', padding: '0 1px' }}>
                          {isLift
                            ? `${day.exercises?.length ?? 0} ex`
                            : isRecover
                              ? `${cap(day.cardioBlock?.modality ?? 'Cardio')} ${day.cardioBlock?.durationMin ?? 30}m`
                              : null
                          }
                        </div>
                      )}

                      {/* Deload badge */}
                      {isDeload && !isRest && (
                        <div style={{ fontSize: '0.48rem', padding: '0.05rem 0.3rem', borderRadius: '999px', backgroundColor: '#f9fafb', color: '#6b7280', border: '1px solid #d1d5db', lineHeight: 1.4, whiteSpace: 'nowrap' }}>
                          Deload
                        </div>
                      )}

                      {/* NEXT badge — only on the specific next session */}
                      {isNextSess && !isCompleted && (
                        <div style={{ fontSize: '0.44rem', padding: '0.06rem 0.3rem', borderRadius: '999px', backgroundColor: TERRA, color: '#fff', fontWeight: 700, lineHeight: 1.4, letterSpacing: '0.04em' }}>
                          NEXT
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Warm-up sets sub-section ───────────────────────────────────────────
function WarmUpSets({ warmupSets }) {
  const rows = warmupSets?.length
    ? warmupSets.map((ws) => [`${ws.pct}%`, `${ws.reps} reps`])
    : [['40%', '5 reps'], ['60%', '3 reps'], ['80%', '2 reps']];

  return (
    <div style={{ marginTop: '0.5rem', padding: '0.45rem 0.75rem', backgroundColor: '#f9fafb', borderRadius: '6px', border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: '0.58rem', color: C.textSecondary, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>Warm-up Sets</div>
      {rows.map(([pct, reps]) => (
        <div key={pct} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: C.textSecondary, fontWeight: 300, padding: '0.1rem 0' }}>
          <span>{pct} of working weight</span>
          <span>{reps}</span>
        </div>
      ))}
    </div>
  );
}

// ── Exercise card ──────────────────────────────────────────────────────
function ExerciseCard({ ex, num }) {
  const [showCue,  setShowCue]  = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const pc = PHASE_EX_COLORS[ex.phaseId] ?? PHASE_EX_COLORS.accessory;
  const isPrimary     = ex.phaseId === 'primary';
  const isIntensifier = ex.phaseId === 'intensifier';

  return (
    <>
    <div style={{ borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: C.bg, overflow: 'hidden' }}>
      <div style={{ padding: '0.65rem 0.875rem' }}>
        {/* Top row: number + name + badges */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.375rem' }}>
          <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: pc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 600, color: pc.text, flexShrink: 0, marginTop: '2px' }}>
            {num}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.15rem' }}>
              <span style={{ fontWeight: 400, color: C.text, fontSize: '0.875rem' }}>
                {ex.supersetLabel ? <span style={{ color: pc.text, fontWeight: 500 }}>{ex.supersetLabel} – </span> : null}
                {ex.name}
              </span>
              <button
                onClick={() => setShowInfo(true)}
                title="Exercise guide"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSecondary, padding: '0', display: 'flex', alignItems: 'center', lineHeight: 1, flexShrink: 0 }}
              >
                <Info size={13} strokeWidth={1.75} />
              </button>
              {/* Phase badge */}
              <span style={{ fontSize: '0.58rem', padding: '0.1rem 0.4rem', borderRadius: '999px', border: `1px solid ${pc.border}50`, backgroundColor: pc.bg, color: pc.text, fontWeight: 500, letterSpacing: '0.03em', flexShrink: 0 }}>
                {PHASE_EX_LABELS[ex.phaseId]?.label ?? ex.phaseId}
              </span>
              {ex.setStructure === 'pyramid' && (
                <span style={{ fontSize: '0.55rem', padding: '0.08rem 0.35rem', borderRadius: '999px', backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 500, border: '1px solid #fcd34d' }}>PYRAMID</span>
              )}
              {ex.setStructure === 'superset' && (
                <span style={{ fontSize: '0.55rem', padding: '0.08rem 0.35rem', borderRadius: '999px', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: 500, border: '1px solid #93c5fd' }}>SUPERSET</span>
              )}
              {isIntensifier && (
                <span style={{ fontSize: '0.55rem', padding: '0.08rem 0.35rem', borderRadius: '999px', backgroundColor: '#faf5ff', color: '#9333ea', fontWeight: 500, border: '1px solid #c4b5fd' }}>DROP SET</span>
              )}
            </div>
            <div style={{ fontSize: '0.68rem', color: C.textSecondary, fontWeight: 300 }}>
              {cap(ex.muscleGroup)} · {cap(ex.equipment)}
            </div>
          </div>
        </div>

        {/* Sets / reps / rest / RPE row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', paddingLeft: '1.5rem' }}>
          <span style={{ fontWeight: 500, color: C.text, fontSize: '0.9rem', fontFamily: FONTS.heading }}>
            {formatPrescription(ex)}
          </span>
          <span style={{ fontSize: '0.72rem', color: C.textSecondary, fontWeight: 300 }}>{ex.rest} rest</span>
          {ex.targetRPE && (
            <button
              onClick={() => setShowCue((v) => !v)}
              style={{ fontSize: '0.68rem', color: C.accent, background: 'none', border: `1px solid ${C.accent}45`, borderRadius: '999px', padding: '0.1rem 0.5rem', cursor: 'pointer', fontFamily: FONTS.body, fontWeight: 400 }}
            >
              RPE {ex.targetRPE} {showCue ? '▲' : 'ⓘ'}
            </button>
          )}
        </div>

        {/* RPE / cue panel */}
        {showCue && ex.movementCue && (
          <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: '#F5EDE6', borderRadius: '6px', border: `1px solid ${TERRA}25`, marginLeft: '1.5rem' }}>
            <div style={{ fontSize: '0.6rem', color: TERRA, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>Movement Cue</div>
            <div style={{ fontSize: '0.78rem', color: C.text, fontWeight: 300, lineHeight: 1.55 }}>{ex.movementCue}</div>
          </div>
        )}

        {/* Drop set note */}
        {(isIntensifier || ex.dropSetNote) && (
          <div style={{ marginTop: '0.45rem', padding: '0.35rem 0.65rem', backgroundColor: '#faf5ff', borderRadius: '6px', border: '1px solid #c4b5fd', fontSize: '0.72rem', color: '#9333ea', fontWeight: 300, marginLeft: '1.5rem' }}>
            {ex.dropSetNote ?? 'Drop 20% after last rep → continue to failure'}
          </div>
        )}
      </div>

      {/* Warm-up sets (primary only) */}
      {isPrimary && <WarmUpSets warmupSets={ex.warmupSets} />}
    </div>
    {showInfo && <ExerciseInfoModal exerciseName={ex.name} onClose={() => setShowInfo(false)} />}
    </>
  );
}

// ── Modal content: lifting day ─────────────────────────────────────────
function LiftingDayContent({ day, phaseMeta, isDeload }) {
  const exercises = day.exercises ?? [];
  const ca = day.compoundAlt;

  // Collect unique phaseIds in insertion order
  const phaseOrder = [];
  const seen = new Set();
  exercises.forEach((ex) => {
    if (!seen.has(ex.phaseId)) { seen.add(ex.phaseId); phaseOrder.push(ex.phaseId); }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {isDeload && (
        <div style={{ padding: '0.625rem 0.875rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', borderLeft: '3px solid #6b7280' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>Deload Week</div>
          <div style={{ fontSize: '0.78rem', color: C.textSecondary, fontWeight: 300, lineHeight: 1.55 }}>Volume reduced ~40%. Keep the same loads — cut sets. Execution quality is the priority.</div>
        </div>
      )}

      {/* Compound rotation note */}
      {ca && !ca.sameCompound && (
        <div style={{ padding: '0.625rem 0.875rem', backgroundColor: '#F5EDE6', borderRadius: '8px', border: `1px solid ${TERRA}30`, display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
          <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: TERRA, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
            <span style={{ color: '#fff', fontSize: '0.55rem', fontWeight: 700 }}>↔</span>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 500, color: TERRA, marginBottom: '0.15rem' }}>
              Primary this week: {ca.currentName}
            </div>
            <div style={{ fontSize: '0.68rem', color: C.textSecondary, fontWeight: 300 }}>
              Alternating with <strong style={{ color: C.text, fontWeight: 400 }}>{ca.altName}</strong> — next swap Week {ca.nextSwapWeek + 1}
            </div>
          </div>
        </div>
      )}

      {day.explanation && (
        <div style={{ padding: '0.625rem 0.875rem', backgroundColor: phaseMeta.bg, borderRadius: '8px', border: `1px solid ${phaseMeta.color}25` }}>
          <div style={{ fontSize: '0.78rem', color: C.text, fontWeight: 300, lineHeight: 1.65 }}>{day.explanation}</div>
        </div>
      )}

      {phaseOrder.map((phaseId) => {
        const phExs = exercises.filter((e) => e.phaseId === phaseId);
        const ph = PHASE_EX_LABELS[phaseId] ?? { label: phaseId, desc: '', estPerEx: 7 };
        const pc = PHASE_EX_COLORS[phaseId] ?? PHASE_EX_COLORS.accessory;
        const estMin = Math.round(ph.estPerEx * phExs.length);

        return (
          <div key={phaseId}>
            {/* Phase divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ height: '1px', flex: 1, backgroundColor: C.border }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 500, color: pc.text, padding: '0.12rem 0.5rem', borderRadius: '999px', backgroundColor: pc.bg, border: `1px solid ${pc.border}30` }}>
                  {ph.label}
                </span>
                <span style={{ fontSize: '0.6rem', color: C.textSecondary, fontWeight: 300 }}>~{estMin}m</span>
              </div>
              <div style={{ height: '1px', flex: 1, backgroundColor: C.border }} />
            </div>
            {ph.desc && (
              <div style={{ fontSize: '0.7rem', color: C.textSecondary, fontWeight: 300, fontStyle: 'italic', marginBottom: '0.4rem' }}>{ph.desc}</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {phExs.map((ex, i) => (
                <ExerciseCard key={i} ex={ex} num={exercises.indexOf(ex) + 1} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Accessory rotation note — shown once after accessory phase */}
      {day.accessoryNote && exercises.some((e) => e.phaseId === 'accessory') && (
        <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '0.7rem', color: '#16a34a', fontWeight: 300 }}>
          {day.accessoryNote}
        </div>
      )}

      {exercises.length === 0 && (
        <p style={{ textAlign: 'center', color: C.textSecondary, fontStyle: 'italic', fontWeight: 300, padding: '1rem 0' }}>No exercises generated.</p>
      )}
    </div>
  );
}

// ── Modal content: recovery day ────────────────────────────────────────
function RecoveryDayContent({ day }) {
  const cb = day.cardioBlock ?? {};
  const stretches = day.stretches ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Cardio block */}
      <div>
        <div style={{ fontSize: '0.65rem', fontWeight: 600, color: SAGE, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '0.625rem' }}>Cardio Block</div>
        <div style={{ padding: '0.875rem 1rem', backgroundColor: '#EEF4EF', border: `1px solid ${SAGE}35`, borderRadius: '10px', borderLeft: `3px solid ${SAGE}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.375rem' }}>
            <span style={{ fontWeight: 400, color: C.text, fontSize: '1rem', textTransform: 'capitalize' }}>{cb.modality ?? 'Cardio'}</span>
            <span style={{ fontWeight: 500, color: SAGE, fontSize: '1rem', fontFamily: FONTS.heading }}>{cb.durationMin ?? 30} min</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: C.textSecondary, fontWeight: 300, lineHeight: 1.55, marginBottom: '0.625rem' }}>
            {cb.intensity ?? 'Zone 2 (60–70% max HR, conversational pace)'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {[['Target Zone', 'Zone 2'], ['Max HR', '60–70%'], ['Effort', 'Conversational']].map(([label, val]) => (
              <div key={label} style={{ padding: '0.25rem 0.625rem', backgroundColor: '#fff', borderRadius: '6px', border: `1px solid ${SAGE}25` }}>
                <div style={{ fontSize: '0.54rem', color: SAGE, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
                <div style={{ fontSize: '0.72rem', color: C.text, fontWeight: 400 }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stretch sequence */}
      {stretches.length > 0 && (
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: SAGE, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '0.625rem' }}>Mobility Sequence</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {stretches.map((s, i) => (
              <div key={i} style={{ padding: '0.625rem 0.875rem', backgroundColor: C.bg, borderRadius: '8px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#EEF4EF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 600, color: SAGE, flexShrink: 0 }}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.1rem' }}>
                    <span style={{ fontWeight: 400, color: C.text, fontSize: '0.85rem' }}>{s.name}</span>
                    <span style={{ fontSize: '0.7rem', color: SAGE, fontWeight: 400, flexShrink: 0 }}>{s.duration}</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: C.textSecondary, fontWeight: 300, fontStyle: 'italic' }}>{s.cue}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Modal content: rest day ────────────────────────────────────────────
function RestDayContent({ nextDay }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ padding: '0.875rem 1rem', backgroundColor: '#F5F3F2', border: `1px solid ${MIST}25`, borderRadius: '10px', borderLeft: `3px solid ${MIST}` }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 400, color: C.text, marginBottom: '0.25rem' }}>Complete Rest</div>
        <div style={{ fontSize: '0.8rem', color: C.textSecondary, fontWeight: 300, lineHeight: 1.65 }}>
          No training. No active recovery. Supercompensation occurs in the 48–72h post-stimulus window — protect it.
        </div>
      </div>

      <div>
        <div style={{ fontSize: '0.65rem', fontWeight: 600, color: MIST, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '0.5rem' }}>Recovery Priorities</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {REST_TIPS.map((tip, i) => (
            <div key={i} style={{ padding: '0.6rem 0.875rem', backgroundColor: C.bg, borderRadius: '8px', border: `1px solid ${C.border}`, display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#F5F3F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', color: MIST, fontWeight: 600, flexShrink: 0 }}>
                {i + 1}
              </div>
              <div style={{ fontSize: '0.78rem', color: C.textSecondary, fontWeight: 300, lineHeight: 1.55 }}>{tip}</div>
            </div>
          ))}
        </div>
      </div>

      {nextDay && (
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '0.4rem' }}>Up Next</div>
          <div style={{ padding: '0.75rem 1rem', backgroundColor: DAY_META[nextDay.type]?.bg ?? C.bg, border: `1px solid ${DAY_META[nextDay.type]?.color ?? C.border}30`, borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 400, color: DAY_META[nextDay.type]?.color ?? C.text, fontSize: '0.875rem' }}>{nextDay.label} Day</span>
            {nextDay.exercises?.length > 0 && (
              <span style={{ fontSize: '0.75rem', color: C.textSecondary, fontWeight: 300 }}>{nextDay.exercises.length} exercises</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Workout logging components ─────────────────────────────────────────

function SuggestionBanner({ suggestion }) {
  if (!suggestion) return null;
  const isTimeSug = suggestion.type === 'time';
  const isBWSug   = suggestion.type === 'bodyweight';
  const body = isTimeSug
    ? (<>Last session: <strong style={{ fontWeight: 500 }}>{suggestion.lastDuration} sec</strong>{' — try '}<strong style={{ fontWeight: 500 }}>{suggestion.suggestDuration} sec</strong> today</>)
    : isBWSug
    ? (<>Last session: <strong style={{ fontWeight: 500 }}>× {suggestion.lastReps} reps</strong>{suggestion.suggestReps ? <> — try <strong style={{ fontWeight: 500 }}>{suggestion.suggestReps} reps</strong> today</> : null}</>)
    : (<>Last session: <strong style={{ fontWeight: 500 }}>{suggestion.lastWeight} lbs × {suggestion.lastReps}</strong>{' — try '}<strong style={{ fontWeight: 500 }}>{suggestion.suggestWeight} lbs</strong> today</>);
  return (
    <div style={{ padding: '0.45rem 0.75rem', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe', fontSize: '0.72rem', color: '#2563eb', fontWeight: 300, marginBottom: '0.5rem' }}>
      {body}
    </div>
  );
}

function ExerciseLogOneAtATime({ ex, exIdx, numSets, savedSets, activeSetIdx, suggestion, saving, onCompleteSet }) {
  const pc = PHASE_EX_COLORS[ex.phaseId] ?? PHASE_EX_COLORS.accessory;
  const tt = getTrackingType(ex);

  const [weight,   setWeight]   = useState(() => suggestion?.suggestWeight ? String(suggestion.suggestWeight) : '');
  const [reps,     setReps]     = useState('');
  const [duration, setDuration] = useState('');
  const [rpe,      setRpe]      = useState('');
  const [error,    setError]    = useState('');
  const [showInfo, setShowInfo] = useState(false);

  const isDone     = activeSetIdx >= numSets;
  const currentSet = activeSetIdx + 1;
  const isLastSet  = currentSet === numSets;

  // Determine if the user has filled enough to save
  const hasValues = tt === 'time'
    ? duration.trim() !== ''
    : tt === 'bodyweight'
    ? reps.trim() !== ''
    : reps.trim() !== ''; // weighted_bodyweight and reps — weight optional for bodyweight

  useEffect(() => {
    if (suggestion?.suggestWeight && !weight) setWeight(String(suggestion.suggestWeight));
  }, [suggestion]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleComplete() {
    if (saving) return;
    if (tt === 'time' && !duration.trim()) {
      setError('Enter a duration to log this set.');
      return;
    }
    if (tt !== 'time' && !reps.trim()) {
      setError('Enter reps to log this set.');
      return;
    }
    setError('');
    const ok = await onCompleteSet(exIdx, activeSetIdx, { weight, reps, duration, rpe });
    if (ok === false) {
      setError('Save failed — check your connection or create the workout_logs table in Supabase.');
    } else {
      setReps('');
      setDuration('');
      setRpe('');
    }
  }

  // 1rem = 16px prevents iOS Safari auto-zoom on input focus
  const inputStyle = { width: '100%', padding: '0.5rem', borderRadius: '8px', border: `1.5px solid ${C.border}`, backgroundColor: C.surface, color: C.text, fontSize: '1rem', fontWeight: 400, fontFamily: FONTS.body, boxSizing: 'border-box', outline: 'none' };

  // Build input fields based on tracking type
  const fields = tt === 'time'
    ? [
        { label: 'Duration (sec)', val: duration, set: setDuration, ph: '45', mode: 'numeric' },
        { label: 'Actual RPE',     val: rpe,      set: setRpe,      ph: '7',  mode: 'decimal' },
      ]
    : tt === 'bodyweight'
    ? [
        { label: 'Reps Done',  val: reps, set: setReps, ph: '12', mode: 'numeric' },
        { label: 'Actual RPE', val: rpe,  set: setRpe,  ph: '7',  mode: 'decimal' },
      ]
    : tt === 'weighted_bodyweight'
    ? [
        { label: 'Added wt (lbs)', val: weight,   set: setWeight,   ph: '0',  mode: 'decimal' },
        { label: 'Reps Done',      val: reps,     set: setReps,     ph: '8',  mode: 'numeric' },
        { label: 'Actual RPE',     val: rpe,      set: setRpe,      ph: '7',  mode: 'decimal' },
      ]
    : [
        { label: 'Weight (lbs)', val: weight, set: setWeight, ph: '135', mode: 'decimal' },
        { label: 'Reps Done',    val: reps,   set: setReps,   ph: '8',   mode: 'numeric' },
        { label: 'Actual RPE',   val: rpe,    set: setRpe,    ph: '7',   mode: 'decimal' },
      ];

  function formatSavedSet(s) {
    if (tt === 'time')               return `${s.duration_seconds ?? '—'} sec${s.rpe_actual ? ` — RPE ${s.rpe_actual}` : ''}`;
    if (tt === 'bodyweight')         return `× ${s.reps_completed ?? '—'} reps (BW)${s.rpe_actual ? ` — RPE ${s.rpe_actual}` : ''}`;
    if (tt === 'weighted_bodyweight') return `+${s.weight_lbs ?? 0} lbs × ${s.reps_completed ?? '—'} reps${s.rpe_actual ? ` — RPE ${s.rpe_actual}` : ''}`;
    return `${s.weight_lbs ?? '—'} lbs × ${s.reps_completed ?? '—'} reps${s.rpe_actual ? ` — RPE ${s.rpe_actual}` : ''}`;
  }

  return (
    <>
    <div style={{ borderRadius: '10px', border: `1px solid ${isDone ? '#86efac' : C.border}`, backgroundColor: isDone ? '#f0fdf4' : C.bg, overflow: 'visible', marginBottom: '0.5rem' }}>
      <div style={{ padding: '0.625rem 0.875rem', borderBottom: `1px solid ${isDone ? '#bbf7d0' : C.border}`, borderRadius: isDone ? '10px 10px 0 0' : undefined, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontWeight: 400, color: isDone ? '#16a34a' : C.text, fontSize: '0.875rem' }}>{ex.name}</span>
            <button onClick={() => setShowInfo(true)} title="Exercise guide" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSecondary, padding: '0', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <Info size={13} strokeWidth={1.75} />
            </button>
          </div>
          <div style={{ fontSize: '0.68rem', color: C.textSecondary, fontWeight: 300 }}>{formatPrescription(ex)} · Target RPE {ex.targetRPE ?? '—'}</div>
        </div>
        {isDone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>✓</span>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 400 }}>Done</span>
          </div>
        )}
      </div>

      {savedSets.length > 0 && (
        <div style={{ padding: '0.35rem 0.875rem 0' }}>
          {savedSets.map((s) => (
            <div key={s.set_number} style={{ fontSize: '0.72rem', color: C.textSecondary, fontWeight: 300, padding: '0.18rem 0', borderBottom: `1px dashed ${C.border}` }}>
              <span style={{ color: pc.text, fontWeight: 500, marginRight: '0.35rem' }}>Set {s.set_number}:</span>
              {formatSavedSet(s)}
            </div>
          ))}
        </div>
      )}

      {!isDone && (
        <div style={{ padding: '0.625rem 0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 500, color: TERRA, backgroundColor: '#F5EDE6', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>
              Set {currentSet} of {numSets}
            </span>
            <span style={{ fontSize: '0.65rem', color: C.textSecondary, fontWeight: 300 }}>Prescribed: {ex.reps}</span>
          </div>
          <SuggestionBanner suggestion={suggestion} />
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${fields.length}, 1fr)`, gap: '0.5rem', marginBottom: '0.625rem' }}>
            {fields.map(({ label, val, set, ph, mode }) => (
              <div key={label}>
                <label style={{ fontSize: '0.58rem', color: C.textSecondary, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.25rem' }}>{label}</label>
                <input
                  type="text"
                  inputMode={mode}
                  value={val}
                  onChange={(e) => { set(e.target.value); setError(''); }}
                  placeholder={ph}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
          {error && (
            <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 300, marginBottom: '0.5rem', padding: '0.4rem 0.625rem', backgroundColor: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}
          <button
            onClick={handleComplete}
            style={{
              width: '100%', padding: '0.65rem', borderRadius: '8px', border: 'none',
              backgroundColor: saving ? '#e5e7eb' : hasValues ? TERRA : '#d1d5db',
              color: saving ? C.textSecondary : hasValues ? '#fff' : '#6b7280',
              fontWeight: 400, fontSize: '0.875rem',
              cursor: saving ? 'default' : 'pointer',
              transition: 'all 0.15s', fontFamily: FONTS.body,
              pointerEvents: saving ? 'none' : 'auto',
            }}
          >
            {saving ? 'Saving…' : isLastSet ? 'Complete Last Set ✓' : `Complete Set ${currentSet} →`}
          </button>
        </div>
      )}
    </div>
    {showInfo && <ExerciseInfoModal exerciseName={ex.name} onClose={() => setShowInfo(false)} />}
    </>
  );
}

function ExerciseLogAllAtOnce({ ex, exIdx, numSets, savedSets, suggestion, saving, onSaveAll }) {
  const pc = PHASE_EX_COLORS[ex.phaseId] ?? PHASE_EX_COLORS.accessory;
  const tt = getTrackingType(ex);
  const isAllSaved = savedSets.length >= numSets;
  const [error,    setError]    = useState('');
  const [showInfo, setShowInfo] = useState(false);

  const makeRow = () => tt === 'time'
    ? { duration: '', rpe: String(ex.targetRPE ?? 7) }
    : tt === 'bodyweight'
    ? { reps: '', rpe: String(ex.targetRPE ?? 7) }
    : tt === 'weighted_bodyweight'
    ? { weight: '', reps: '', rpe: String(ex.targetRPE ?? 7) }
    : { weight: suggestion?.suggestWeight ? String(suggestion.suggestWeight) : '', reps: '', rpe: String(ex.targetRPE ?? 7) };

  const [rows, setRows] = useState(() => Array.from({ length: numSets }, makeRow));

  useEffect(() => {
    if (suggestion?.suggestWeight && tt === 'reps') {
      setRows((prev) => prev.map((r) => ({ ...r, weight: r.weight || String(suggestion.suggestWeight) })));
    }
  }, [suggestion]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateRow(i, field, val) {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
    setError('');
  }

  const hasAnyValue = rows.some((r) =>
    tt === 'time' ? r.duration?.trim() !== '' : r.reps?.trim() !== ''
  );

  // 1rem = 16px prevents iOS Safari auto-zoom on input focus
  const inputStyle = { width: '100%', padding: '0.4rem 0.45rem', borderRadius: '6px', border: `1.5px solid ${C.border}`, backgroundColor: C.surface, color: C.text, fontSize: '1rem', fontWeight: 400, fontFamily: FONTS.body, boxSizing: 'border-box', outline: 'none' };

  // Column config per tracking type
  const cols = tt === 'time'
    ? [{ header: 'Duration (sec)', field: 'duration', mode: 'numeric', ph: '45' },
       { header: 'RPE',            field: 'rpe',      mode: 'decimal', ph: '7'  }]
    : tt === 'bodyweight'
    ? [{ header: 'Reps',  field: 'reps', mode: 'numeric', ph: '12' },
       { header: 'RPE',   field: 'rpe',  mode: 'decimal', ph: '7'  }]
    : tt === 'weighted_bodyweight'
    ? [{ header: 'Added wt (lbs)', field: 'weight', mode: 'decimal', ph: '0'  },
       { header: 'Reps',           field: 'reps',   mode: 'numeric', ph: '8'  },
       { header: 'RPE',            field: 'rpe',    mode: 'decimal', ph: '7'  }]
    : [{ header: 'Weight (lbs)', field: 'weight', mode: 'decimal', ph: '135' },
       { header: 'Reps',         field: 'reps',   mode: 'numeric', ph: '8'   },
       { header: 'RPE',          field: 'rpe',    mode: 'decimal', ph: '7'   }];

  const gridCols = `28px ${cols.map(() => '1fr').join(' ')}`;

  function formatSavedSet(s) {
    if (tt === 'time')               return `${s.duration_seconds ?? '—'} sec${s.rpe_actual ? ` — RPE ${s.rpe_actual}` : ''}`;
    if (tt === 'bodyweight')         return `× ${s.reps_completed ?? '—'} reps (BW)${s.rpe_actual ? ` — RPE ${s.rpe_actual}` : ''}`;
    if (tt === 'weighted_bodyweight') return `+${s.weight_lbs ?? 0} lbs × ${s.reps_completed ?? '—'} reps${s.rpe_actual ? ` — RPE ${s.rpe_actual}` : ''}`;
    return `${s.weight_lbs ?? '—'} lbs × ${s.reps_completed ?? '—'} reps${s.rpe_actual ? ` — RPE ${s.rpe_actual}` : ''}`;
  }

  async function handleSave() {
    if (saving) return;
    if (!hasAnyValue) {
      setError(tt === 'time' ? 'Enter at least one duration.' : 'Enter at least one rep count.');
      return;
    }
    setError('');
    const ok = await onSaveAll(exIdx, rows);
    if (ok === false) {
      setError('Save failed — check your connection or create the workout_logs table in Supabase.');
    }
  }

  return (
    <>
    <div style={{ borderRadius: '10px', border: `1px solid ${isAllSaved ? '#86efac' : C.border}`, backgroundColor: isAllSaved ? '#f0fdf4' : C.bg, overflow: 'visible', marginBottom: '0.5rem' }}>
      <div style={{ padding: '0.625rem 0.875rem', borderBottom: `1px solid ${isAllSaved ? '#bbf7d0' : C.border}`, borderRadius: '10px 10px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontWeight: 400, color: isAllSaved ? '#16a34a' : C.text, fontSize: '0.875rem' }}>{ex.name}</span>
            <button onClick={() => setShowInfo(true)} title="Exercise guide" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSecondary, padding: '0', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <Info size={13} strokeWidth={1.75} />
            </button>
          </div>
          <div style={{ fontSize: '0.68rem', color: C.textSecondary, fontWeight: 300 }}>{formatPrescription(ex)} · Target RPE {ex.targetRPE ?? '—'}</div>
        </div>
        {isAllSaved && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>✓</span>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 400 }}>Saved</span>
          </div>
        )}
      </div>

      {isAllSaved ? (
        <div style={{ padding: '0.35rem 0.875rem' }}>
          {savedSets.map((s) => (
            <div key={s.set_number} style={{ fontSize: '0.72rem', color: C.textSecondary, fontWeight: 300, padding: '0.18rem 0', borderBottom: `1px dashed ${C.border}` }}>
              <span style={{ color: pc.text, fontWeight: 500, marginRight: '0.35rem' }}>Set {s.set_number}:</span>
              {formatSavedSet(s)}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '0.625rem 0.875rem' }}>
          <SuggestionBanner suggestion={suggestion} />
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '0.375rem', marginBottom: '0.3rem' }}>
            {['Set', ...cols.map((c) => c.header)].map((h) => (
              <div key={h} style={{ fontSize: '0.58rem', color: C.textSecondary, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.625rem' }}>
            {rows.map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '0.375rem', alignItems: 'center' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 500, color: TERRA, textAlign: 'center' }}>{i + 1}</div>
                {cols.map(({ field, mode, ph }) => (
                  <input
                    key={field}
                    type="text"
                    inputMode={mode}
                    value={row[field] ?? ''}
                    onChange={(e) => updateRow(i, field, e.target.value)}
                    placeholder={ph}
                    style={inputStyle}
                  />
                ))}
              </div>
            ))}
          </div>
          {error && (
            <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 300, marginBottom: '0.5rem', padding: '0.4rem 0.625rem', backgroundColor: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}
          <button
            onClick={handleSave}
            style={{
              width: '100%', padding: '0.65rem', borderRadius: '8px', border: 'none',
              backgroundColor: saving ? '#e5e7eb' : hasAnyValue ? TERRA : '#d1d5db',
              color: saving ? C.textSecondary : hasAnyValue ? '#fff' : '#6b7280',
              fontWeight: 400, fontSize: '0.875rem',
              cursor: saving ? 'default' : 'pointer',
              transition: 'all 0.15s', fontFamily: FONTS.body,
              pointerEvents: saving ? 'none' : 'auto',
            }}
          >
            {saving ? 'Saving…' : 'Save Exercise ✓'}
          </button>
        </div>
      )}
    </div>
    {showInfo && <ExerciseInfoModal exerciseName={ex.name} onClose={() => setShowInfo(false)} />}
    </>
  );
}

function CompletionSummary({ summary }) {
  return (
    <div style={{ marginTop: '0.75rem', padding: '1rem 1.125rem', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1.5px solid #86efac' }}>
      <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '0.75rem' }}>Workout Complete</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
        {[
          { label: 'Total Volume', value: `${summary.totalVolume.toLocaleString()} lbs` },
          { label: 'Avg RPE',      value: summary.avgRPE },
          { label: 'Exercises',    value: String(summary.exercisesLogged) },
        ].map(({ label, value }) => (
          <div key={label} style={{ textAlign: 'center', padding: '0.5rem 0.25rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 500, color: '#16a34a', fontFamily: FONTS.heading, lineHeight: 1.2 }}>{value}</div>
            <div style={{ fontSize: '0.56rem', color: '#6b7280', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.2rem' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LogModeContent({ day, cycle, weekIdx, user, logStyle, setLogStyle, onAllLogged }) {
  const exercises = day.exercises ?? [];

  const [logData,     setLogData]     = useState(() => Object.fromEntries(exercises.map((_, i) => [i, { sets: [] }])));
  const [activeSets,  setActiveSets]  = useState(() => Object.fromEntries(exercises.map((_, i) => [i, 0])));
  const [suggestions, setSuggestions] = useState({});
  const [savingIdx,   setSavingIdx]   = useState(null);
  const [summary,     setSummary]     = useState(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function fetchAll() {
      const results = {};
      await Promise.all(exercises.map(async (ex, idx) => {
        const tt = getTrackingType(ex);
        const { data } = await supabase
          .from('workout_logs')
          .select('weight_lbs, reps_completed, duration_seconds')
          .eq('user_id', user.id)
          .eq('exercise_name', ex.name)
          .order('logged_at', { ascending: false })
          .limit(2);
        if (!data || data.length < 2) return;
        const last = data[0];
        if (tt === 'time' && last.duration_seconds) {
          results[idx] = { type: 'time', lastDuration: last.duration_seconds, suggestDuration: last.duration_seconds + 5 };
        } else if (tt === 'bodyweight' && last.reps_completed) {
          results[idx] = { type: 'bodyweight', lastReps: last.reps_completed, suggestReps: last.reps_completed + 2 };
        } else if (last.weight_lbs) {
          const w = parseFloat(last.weight_lbs);
          results[idx] = { type: 'reps', lastWeight: last.weight_lbs, lastReps: last.reps_completed, suggestWeight: Math.round((w + 5) * 2) / 2 };
        }
      }));
      if (!cancelled) setSuggestions(results);
    }
    fetchAll();
    return () => { cancelled = true; };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  function buildPayload(ex, setNumber, data) {
    const tt = getTrackingType(ex);
    const base = {
      user_id:       user.id,
      cycle_id:      cycle.id,
      week_number:   weekIdx + 1,
      day_type:      day.type,
      exercise_name: ex.name,
      set_number:    setNumber,
      rpe_actual:    data.rpe !== '' ? parseFloat(data.rpe) : null,
    };
    if (tt === 'time') {
      return { ...base, duration_seconds: data.duration !== '' ? parseInt(data.duration, 10) : null };
    }
    if (tt === 'bodyweight') {
      return { ...base, reps_completed: data.reps !== '' ? parseInt(data.reps, 10) : null, is_bodyweight: true };
    }
    if (tt === 'weighted_bodyweight') {
      return { ...base, weight_lbs: data.weight !== '' ? parseFloat(data.weight) : null, reps_completed: data.reps !== '' ? parseInt(data.reps, 10) : null, is_bodyweight: true };
    }
    return { ...base, weight_lbs: data.weight !== '' ? parseFloat(data.weight) : null, reps_completed: data.reps !== '' ? parseInt(data.reps, 10) : null };
  }

  function buildSavedSetRecord(ex, setNumber, data) {
    const tt = getTrackingType(ex);
    const base = { set_number: setNumber, rpe_actual: data.rpe, saved: true };
    if (tt === 'time') return { ...base, duration_seconds: data.duration };
    if (tt === 'bodyweight') return { ...base, reps_completed: data.reps };
    return { ...base, weight_lbs: data.weight, reps_completed: data.reps };
  }

  async function handleCompleteSet(exIdx, setIdx, data) {
    setSavingIdx(exIdx);
    const ex = exercises[exIdx];
    const payload = buildPayload(ex, setIdx + 1, data);
    const { error } = await supabase.from('workout_logs').insert(payload);
    setSavingIdx(null);
    if (error) return false;
    const record = buildSavedSetRecord(ex, setIdx + 1, data);
    setLogData((prev) => ({ ...prev, [exIdx]: { sets: [...(prev[exIdx]?.sets ?? []), record] } }));
    setActiveSets((prev) => ({ ...prev, [exIdx]: setIdx + 1 }));
    return true;
  }

  async function handleSaveAll(exIdx, rows) {
    setSavingIdx(exIdx);
    const ex = exercises[exIdx];
    const inserts = rows.map((row, i) => buildPayload(ex, i + 1, row));
    const { error } = await supabase.from('workout_logs').insert(inserts);
    setSavingIdx(null);
    if (error) return false;
    const records = rows.map((row, i) => buildSavedSetRecord(ex, i + 1, row));
    setLogData((prev) => ({ ...prev, [exIdx]: { sets: records } }));
    setActiveSets((prev) => ({ ...prev, [exIdx]: exercises[exIdx]?.sets ?? 3 }));
    return true;
  }

  const allLogged = exercises.length > 0 && exercises.every((ex, idx) =>
    (logData[idx]?.sets?.filter((s) => s.saved).length ?? 0) >= (ex.sets ?? 3)
  );

  useEffect(() => {
    if (!allLogged || summary) return;
    let vol = 0, rpeSum = 0, rpeCount = 0;
    exercises.forEach((ex, idx) => {
      const tt = getTrackingType(ex);
      (logData[idx]?.sets ?? []).forEach((s) => {
        // Only count volume for weighted exercises
        if (tt === 'reps' && s.weight_lbs && s.reps_completed) {
          vol += parseFloat(s.weight_lbs) * parseInt(s.reps_completed, 10);
        }
        if (s.rpe_actual && s.rpe_actual !== '') { rpeSum += parseFloat(s.rpe_actual); rpeCount++; }
      });
    });
    const computed = { totalVolume: Math.round(vol), avgRPE: rpeCount > 0 ? (rpeSum / rpeCount).toFixed(1) : '—', exercisesLogged: exercises.length };
    setSummary(computed);
    onAllLogged(computed);
  }, [allLogged]); // eslint-disable-line react-hooks/exhaustive-deps

  const tabBase = { flex: 1, padding: '0.45rem 0.5rem', borderRadius: '6px', border: 'none', fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.15s', fontFamily: FONTS.body };

  return (
    <div>
      {/* Style toggle */}
      <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1rem', padding: '0.2rem', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
        {[{ value: 'one_at_a_time', label: 'One set at a time' }, { value: 'all_at_once', label: 'All sets at once' }].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setLogStyle(value)}
            style={{ ...tabBase, backgroundColor: logStyle === value ? '#fff' : 'transparent', color: logStyle === value ? C.text : C.textSecondary, fontWeight: logStyle === value ? 400 : 300, boxShadow: logStyle === value ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Exercise cards */}
      {exercises.map((ex, idx) => {
        const numSets   = ex.sets ?? 3;
        const savedSets = logData[idx]?.sets?.filter((s) => s.saved) ?? [];
        const isSaving  = savingIdx === idx;
        return logStyle === 'one_at_a_time' ? (
          <ExerciseLogOneAtATime
            key={idx} ex={ex} exIdx={idx} numSets={numSets}
            savedSets={savedSets} activeSetIdx={activeSets[idx] ?? 0}
            suggestion={suggestions[idx] ?? null} saving={isSaving}
            onCompleteSet={handleCompleteSet}
          />
        ) : (
          <ExerciseLogAllAtOnce
            key={idx} ex={ex} exIdx={idx} numSets={numSets}
            savedSets={savedSets} suggestion={suggestions[idx] ?? null}
            saving={isSaving} onSaveAll={handleSaveAll}
          />
        );
      })}

      {allLogged && summary && <CompletionSummary summary={summary} />}
    </div>
  );
}

// ── Day modal ──────────────────────────────────────────────────────────
function DayModal({ cycle, weekIdx, dayIdx, completedDays, onToggleComplete, onClose, sessionMap }) {
  const week = cycle.weeks[weekIdx];
  const day  = week?.days[dayIdx];
  if (!day) return null;

  const navigate = useNavigate();
  const { startWorkout } = useActiveWorkout();

  const pm        = PHASE_META[week.phase]   ?? PHASE_META.foundation;
  const meta      = DAY_META[day.type]       ?? DAY_META.rest;
  const isDeload  = week.phase === 'deload';
  const isCompleted = !!completedDays[`${weekIdx}:${dayIdx}`];
  const isLift    = ['push', 'pull', 'legs'].includes(day.type);
  const isRecover = day.type === 'recover';
  const isRest    = day.type === 'rest';
  const weekday   = DAYHEADERS[dayIdx] ?? '';

  function handleStartWorkout() {
    const sessionEntry = sessionMap?.find(s => s.weekIdx === weekIdx && s.dayIdx === dayIdx);
    const exercises = (day.exercises ?? []).map(ex => ({
      uid: crypto.randomUUID(),
      ex: {
        id: ex.id ?? null,
        name: ex.name,
        muscleGroup: ex.muscleGroup ?? '',
        equipment: ex.equipment ?? '',
        trackingType: getTrackingType(ex),
      },
      targetSets: ex.sets ?? 3,
      logData: { sets: [] },
      activeSets: 0,
      supersetGroup: null,
      supersetLabel: null,
    }));
    startWorkout({
      title: `${day.label} · Week ${week.weekNumber}`,
      source: 'kratos_split',
      activeExercises: exercises,
      cycleId: cycle.id,
      weekNumber: weekIdx + 1,
      dayType: day.type,
      weekIdx,
      dayIdx,
      sessionNum: sessionEntry?.sessionNum ?? null,
    });
    onClose();
    navigate('/train');
  }

  // Next non-rest day for rest day preview
  let nextDay = null;
  if (isRest) {
    const flatIdx = weekIdx * 7 + dayIdx;
    const allDays = cycle.weeks.flatMap((w) => w.days);
    for (let i = flatIdx + 1; i < allDays.length; i++) {
      if (allDays[i].type !== 'rest') { nextDay = allDays[i]; break; }
    }
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.48)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: C.surface,
          borderRadius: '16px 16px 0 0',
          width: '100%',
          maxWidth: '620px',
          maxHeight: '88vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -8px 48px rgba(0,0,0,0.18)',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.5rem', flexShrink: 0 }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: C.border }} />
        </div>

        {/* Header */}
        <div style={{ padding: '0.75rem 1.25rem 0', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                <span style={{ backgroundColor: meta.bg, color: meta.color, padding: '0.2rem 0.7rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 500 }}>
                  {day.label}
                </span>
                <span style={{ backgroundColor: pm.bg, color: pm.color, padding: '0.2rem 0.7rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 400 }}>
                  Week {week.weekNumber} · {pm.label}
                </span>
                {isDeload && (
                  <span style={{ backgroundColor: '#f9fafb', color: '#6b7280', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 500, border: '1px solid #e5e7eb' }}>Deload</span>
                )}
              </div>
              <div style={{ fontSize: '0.72rem', color: C.textSecondary, fontWeight: 300 }}>
                {weekday}{day.estimatedMin > 0 ? ` · ~${day.estimatedMin} min` : ''}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: C.textSecondary, lineHeight: 1, padding: '0 0.25rem', flexShrink: 0 }}>×</button>
          </div>

        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: 'auto', padding: '1.125rem 1.25rem', flex: 1 }}>
          {isLift
            ? <LiftingDayContent day={day} phaseMeta={pm} isDeload={isDeload} />
            : isRecover
              ? <RecoveryDayContent day={day} />
              : <RestDayContent nextDay={nextDay} />
          }
        </div>

        {/* Footer */}
        <div style={{ padding: '0.75rem 1.25rem', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          {isLift ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                onClick={handleStartWorkout}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: 'none', backgroundColor: TERRA, color: '#fff', fontWeight: 400, fontSize: '0.9rem', cursor: 'pointer', transition: 'opacity 0.15s', fontFamily: FONTS.body }}
                onMouseOver={(e) => { e.currentTarget.style.opacity = '0.87'; }}
                onMouseOut={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                Start Workout →
              </button>
              <button
                onClick={onToggleComplete}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: `1.5px solid ${isCompleted ? '#16a34a' : C.border}`, backgroundColor: isCompleted ? '#f0fdf4' : 'transparent', color: isCompleted ? '#16a34a' : C.textSecondary, fontWeight: 300, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s', fontFamily: FONTS.body }}
              >
                {isCompleted ? '✓ Marked Complete' : 'Mark as Complete'}
              </button>
            </div>
          ) : !isRest ? (
            <button
              onClick={onToggleComplete}
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '10px',
                border: `1.5px solid ${isCompleted ? '#16a34a' : C.accent}`,
                backgroundColor: isCompleted ? '#f0fdf4' : C.accent,
                color: isCompleted ? '#16a34a' : '#fff',
                fontWeight: 400, fontSize: '0.9rem', cursor: 'pointer',
                transition: 'all 0.2s', fontFamily: FONTS.body,
              }}
            >
              {isCompleted ? '✓ Marked Complete' : 'Mark as Complete'}
            </button>
          ) : (
            <button
              onClick={onClose}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: `1px solid ${C.border}`, backgroundColor: 'transparent', color: C.textSecondary, fontWeight: 300, fontSize: '0.875rem', cursor: 'pointer', fontFamily: FONTS.body }}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────
export default function KratosSplitViewer({ cycle, initialDay }) {
  const isMobile    = useIsMobile();
  const weekRowRefs = useRef({});

  // Session-based completion tracking (Supabase-backed)
  const sessionMap = useMemo(() => buildSessionMap(cycle), [cycle]);
  const [completedSessions, setCompletedSessions] = useState(
    () => new Set(cycle.completed_sessions ?? [])
  );
  const completedDays = useMemo(() => {
    const result = {};
    sessionMap.forEach(({ sessionNum, weekIdx, dayIdx }) => {
      if (completedSessions.has(sessionNum)) result[`${weekIdx}:${dayIdx}`] = true;
    });
    return result;
  }, [sessionMap, completedSessions]);

  const [modalWeekIdx, setModalWeekIdx] = useState(initialDay?.weekIdx ?? null);
  const [modalDayIdx,  setModalDayIdx]  = useState(initialDay?.dayIdx  ?? null);

  // ── Session-based current position ────────────────────────────────
  // "Current" = the next incomplete session, not a calendar date.
  const nextIncompleteSession = sessionMap.find(s => !completedSessions.has(s.sessionNum)) ?? null;
  const currentWeekIdx        = nextIncompleteSession?.weekIdx ?? -1;

  // Mobile: start on the current week instead of week 0
  const [mobileWeek, setMobileWeek] = useState(() => Math.max(0, currentWeekIdx));

  function scrollToNextSession() {
    if (currentWeekIdx < 0) return;
    weekRowRefs.current[currentWeekIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function handleDayClick(weekIdx, dayIdx) {
    setModalWeekIdx(weekIdx);
    setModalDayIdx(dayIdx);
  }

  function handleCloseModal() {
    setModalWeekIdx(null);
    setModalDayIdx(null);
  }

  function handleToggleComplete() {
    if (modalWeekIdx === null) return;
    const session = sessionMap.find(s => s.weekIdx === modalWeekIdx && s.dayIdx === modalDayIdx);
    if (!session) return; // rest day — no session to track
    setCompletedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(session.sessionNum)) next.delete(session.sessionNum);
      else next.add(session.sessionNum);
      supabase.from('cycles').update({ completed_sessions: [...next] }).eq('id', cycle.id).then(() => {});
      return next;
    });
  }

  return (
    <div>
      <ProgressBar cycle={cycle} completedDays={completedDays} />
      <CalendarGrid
        cycle={cycle}
        completedDays={completedDays}
        onDayClick={handleDayClick}
        mobileWeek={mobileWeek}
        setMobileWeek={setMobileWeek}
        isMobile={isMobile}
        currentWeekIdx={currentWeekIdx}
        nextSession={nextIncompleteSession}
        weekRowRefs={weekRowRefs}
        onJumpToNext={scrollToNextSession}
      />
      {modalWeekIdx !== null && (
        <DayModal
          cycle={cycle}
          weekIdx={modalWeekIdx}
          dayIdx={modalDayIdx}
          completedDays={completedDays}
          onToggleComplete={handleToggleComplete}
          onClose={handleCloseModal}
          sessionMap={sessionMap}
        />
      )}
    </div>
  );
}
