import { useState, useEffect } from 'react';
import { C, FONTS } from '../theme';

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

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
function CalendarGrid({ cycle, completedDays, onDayClick, mobileWeek, setMobileWeek, isMobile }) {
  const weeksToRender = isMobile ? [{ week: cycle.weeks[mobileWeek], weekIdx: mobileWeek }]
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
          {/* Day header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '56px repeat(7, 1fr)', gap: '3px', marginBottom: '4px' }}>
            <div />
            {WEEKDAYS.map((d) => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.62rem', fontWeight: 400, color: C.textSecondary, padding: '2px 0' }}>{d}</div>
            ))}
          </div>

          {/* Week rows */}
          {weeksToRender.map(({ week, weekIdx }) => {
            const pm = PHASE_META[week.phase] ?? PHASE_META.foundation;
            const isDeload = week.phase === 'deload';
            return (
              <div key={week.weekNumber} style={{ display: 'grid', gridTemplateColumns: '56px repeat(7, 1fr)', gap: '3px', marginBottom: '3px' }}>
                {/* Week label */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3px 5px', backgroundColor: pm.bg, borderRadius: '6px', borderLeft: `3px solid ${pm.color}` }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 500, color: pm.color, lineHeight: 1.2 }}>W{week.weekNumber}</div>
                  <div style={{ fontSize: '0.54rem', color: pm.color, opacity: 0.75, lineHeight: 1.2 }}>{pm.label}</div>
                </div>

                {/* Day cells */}
                {week.days.map((day, dayIdx) => {
                  const dKey = `${weekIdx}:${dayIdx}`;
                  const isCompleted = !!completedDays[dKey];
                  const meta = DAY_META[day.type] ?? DAY_META.rest;
                  const isRest = day.type === 'rest';
                  const isRecover = day.type === 'recover';
                  const isLift = ['push', 'pull', 'legs'].includes(day.type);

                  return (
                    <button
                      key={dayIdx}
                      onClick={() => onDayClick(weekIdx, dayIdx)}
                      title={`${day.label} — Week ${week.weekNumber}`}
                      style={{
                        position: 'relative',
                        padding: '5px 2px 4px',
                        borderRadius: '6px',
                        border: `1.5px solid ${isRest ? C.border : (isCompleted ? '#86efac' : meta.color + '38')}`,
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
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = isRest ? C.accent + '50' : meta.color; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = isRest ? C.border : (isCompleted ? '#86efac' : meta.color + '38'); }}
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
  const [showCue, setShowCue] = useState(false);
  const pc = PHASE_EX_COLORS[ex.phaseId] ?? PHASE_EX_COLORS.accessory;
  const isPrimary     = ex.phaseId === 'primary';
  const isIntensifier = ex.phaseId === 'intensifier';

  return (
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
            {ex.sets} × {ex.reps}
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
  );
}

// ── Modal content: lifting day ─────────────────────────────────────────
function LiftingDayContent({ day, phaseMeta, isDeload }) {
  const exercises = day.exercises ?? [];

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

// ── Day modal ──────────────────────────────────────────────────────────
function DayModal({ cycle, weekIdx, dayIdx, completedDays, onToggleComplete, onClose }) {
  const week = cycle.weeks[weekIdx];
  const day  = week?.days[dayIdx];
  if (!day) return null;

  const pm        = PHASE_META[week.phase]   ?? PHASE_META.foundation;
  const meta      = DAY_META[day.type]       ?? DAY_META.rest;
  const isDeload  = week.phase === 'deload';
  const isCompleted = !!completedDays[`${weekIdx}:${dayIdx}`];
  const isLift    = ['push', 'pull', 'legs'].includes(day.type);
  const isRecover = day.type === 'recover';
  const isRest    = day.type === 'rest';
  const weekday   = WEEKDAYS[dayIdx] ?? '';

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
        <div style={{ padding: '0.75rem 1.25rem 0.875rem', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
          {isLift    && <LiftingDayContent day={day} phaseMeta={pm} isDeload={isDeload} />}
          {isRecover && <RecoveryDayContent day={day} />}
          {isRest    && <RestDayContent nextDay={nextDay} />}
        </div>

        {/* Footer: Mark as Complete */}
        <div style={{ padding: '0.75rem 1.25rem', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <button
            onClick={onToggleComplete}
            style={{
              width: '100%', padding: '0.75rem',
              borderRadius: '10px',
              border: `1.5px solid ${isCompleted ? '#16a34a' : C.accent}`,
              backgroundColor: isCompleted ? '#f0fdf4' : C.accent,
              color: isCompleted ? '#16a34a' : '#fff',
              fontWeight: 400, fontSize: '0.9rem', cursor: 'pointer',
              transition: 'all 0.2s', fontFamily: FONTS.body,
            }}
          >
            {isCompleted ? '✓ Marked Complete' : 'Mark as Complete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────
export default function KratosSplitViewer({ cycle }) {
  const storageKey  = `kratos_complete_${cycle.id}`;
  const isMobile    = useIsMobile();

  const [completedDays, setCompletedDays] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); }
    catch { return {}; }
  });

  const [modalWeekIdx, setModalWeekIdx] = useState(null);
  const [modalDayIdx,  setModalDayIdx]  = useState(null);
  const [mobileWeek,   setMobileWeek]   = useState(0);

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
    const key = `${modalWeekIdx}:${modalDayIdx}`;
    setCompletedDays((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (!next[key]) delete next[key];
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
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
      />
      {modalWeekIdx !== null && (
        <DayModal
          cycle={cycle}
          weekIdx={modalWeekIdx}
          dayIdx={modalDayIdx}
          completedDays={completedDays}
          onToggleComplete={handleToggleComplete}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
