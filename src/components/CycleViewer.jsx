import { useState } from 'react';
import { DAY_TYPE_META, PHASE_META } from '../utils/cycleGenerator';
import { C, FONTS, tagBase } from '../theme';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SESSION_LIMITS = [
  { value: null, label: 'No limit' },
  { value: 30,   label: '30 min' },
  { value: 45,   label: '45 min' },
  { value: 60,   label: '60 min' },
  { value: 75,   label: '75 min' },
  { value: 90,   label: '90 min' },
];

// ── Day detail modal ───────────────────────────────────────────────────
function DayModal({ week, day, weekIdx, dayIdx, onClose, onRegenerateDay }) {
  const [isRegenerating, setIsRegenerating] = useState(false);

  const meta = DAY_TYPE_META[day.dayType] ?? DAY_TYPE_META.rest;
  const phaseMeta = PHASE_META[week.phase] ?? PHASE_META.foundation;

  function handleSessionChange(newSessionMins) {
    if (!onRegenerateDay || isRegenerating) return;
    if (newSessionMins === day.sessionMins) return; // no change
    setIsRegenerating(true);
    onRegenerateDay(weekIdx, dayIdx, newSessionMins);
    // Regeneration is synchronous, so clear spinner on next tick
    setTimeout(() => setIsRegenerating(false), 0);
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: C.surface, borderRadius: '12px', width: '100%', maxWidth: '580px', maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
      >
        {/* Header */}
        <div style={{ padding: '1.125rem 1.5rem', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ backgroundColor: meta.bg, color: meta.color, padding: '0.2rem 0.7rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 500 }}>{day.dayLabel}</span>
              <span style={{ backgroundColor: phaseMeta.bg, color: phaseMeta.color, padding: '0.2rem 0.7rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 500 }}>
                Week {week.weekNum} · {phaseMeta.label}
              </span>
              {day.estimatedMinutes > 0 && (
                <span style={{ fontSize: '0.8rem', color: C.textSecondary }}>~{day.estimatedMinutes} min</span>
              )}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', color: C.textSecondary, lineHeight: 1, padding: '0 0.25rem', marginLeft: '0.5rem', flexShrink: 0 }}>×</button>
          </div>

          {/* Session length override */}
          {onRegenerateDay && (
            <div>
              <div style={{ fontSize: '0.65rem', color: C.textSecondary, fontWeight: 400, marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: FONTS.body }}>Session Length</div>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {SESSION_LIMITS.map(({ value, label }) => {
                  const active = day.sessionMins === value;
                  return (
                    <button
                      key={String(value)}
                      onClick={() => handleSessionChange(value)}
                      disabled={isRegenerating}
                      style={{
                        padding: '0.3rem 0.75rem',
                        borderRadius: '20px',
                        border: `1px solid ${active ? C.accent : C.border}`,
                        backgroundColor: active ? C.accentMuted : C.surface,
                        color: active ? C.accent : C.textSecondary,
                        fontWeight: active ? 400 : 300,
                        fontSize: '0.78rem',
                        cursor: active || isRegenerating ? 'default' : 'pointer',
                        opacity: isRegenerating && !active ? 0.5 : 1,
                        transition: 'all 0.15s',
                        minHeight: '32px',
                        fontFamily: FONTS.body,
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {isRegenerating && (
                <div style={{ fontSize: '0.7rem', color: C.textSecondary, marginTop: '0.35rem', fontWeight: 300 }}>Regenerating exercises…</div>
              )}
            </div>
          )}
        </div>

        {/* Exercise list */}
        <div style={{ overflowY: 'auto', padding: '0.875rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {day.exercises.length === 0 ? (
            <p style={{ color: C.textSecondary, fontStyle: 'italic', textAlign: 'center', padding: '1.5rem 0', fontWeight: 300 }}>Rest day — recover well!</p>
          ) : (
            day.exercises.map((ex, i) => (
              <div
                key={i}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0.9rem', backgroundColor: C.bg, borderRadius: '8px', border: `1px solid ${C.border}` }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', minWidth: 0 }}>
                  <span style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: ex.isMobility ? '#EDF2EE' : C.accentMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 500, color: ex.isMobility ? '#4A7C59' : C.accent, flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 400, color: C.text, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</div>
                    <div style={{ fontSize: '0.7rem', color: C.textSecondary, marginTop: '0.1rem', textTransform: 'capitalize', fontWeight: 300 }}>{ex.muscleGroup} · {ex.equipment}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '0.75rem' }}>
                  <div style={{ fontWeight: 500, color: C.text, fontSize: '0.875rem', fontFamily: FONTS.heading }}>{ex.sets} × {ex.reps}</div>
                  <div style={{ fontSize: '0.7rem', color: C.textSecondary, fontWeight: 300 }}>{ex.rest} rest</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Calendar grid view ─────────────────────────────────────────────────
function CalendarGrid({ cycle, onDayClick }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: '580px' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '76px repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
          <div />
          {DAY_LABELS.map((d) => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 400, color: C.textSecondary, padding: '4px 0' }}>{d}</div>
          ))}
        </div>

        {/* Weeks */}
        {cycle.weeks.map((week, weekIdx) => {
          const phaseMeta = PHASE_META[week.phase] ?? PHASE_META.foundation;
          return (
            <div key={week.weekNum} style={{ display: 'grid', gridTemplateColumns: '76px repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
              {/* Week label */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '4px 8px', backgroundColor: phaseMeta.bg, borderRadius: '6px', borderLeft: `3px solid ${phaseMeta.color}` }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 500, color: phaseMeta.color }}>W{week.weekNum}</div>
                <div style={{ fontSize: '0.62rem', color: phaseMeta.color, opacity: 0.85, lineHeight: 1.2, fontWeight: 300 }}>{phaseMeta.label}</div>
              </div>

              {/* Day cells */}
              {week.days.map((day, dayIdx) => {
                const meta = DAY_TYPE_META[day.dayType] ?? DAY_TYPE_META.rest;
                return (
                  <button
                    key={day.dayNum}
                    onClick={() => !day.isRest && onDayClick(weekIdx, dayIdx)}
                    disabled={day.isRest}
                    title={day.isRest ? 'Rest' : `${day.dayLabel} — ${day.estimatedMinutes}min`}
                    style={{
                      padding: '5px 3px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: day.isRest ? C.bg : meta.bg,
                      color: day.isRest ? C.border : meta.color,
                      fontWeight: 500,
                      fontSize: '0.68rem',
                      cursor: day.isRest ? 'default' : 'pointer',
                      textAlign: 'center',
                      transition: 'opacity 0.15s',
                      lineHeight: 1.3,
                    }}
                    onMouseOver={(e) => { if (!day.isRest) e.currentTarget.style.opacity = '0.7'; }}
                    onMouseOut={(e) => { e.currentTarget.style.opacity = '1'; }}
                  >
                    <div>{day.isRest ? '—' : day.dayLabel}</div>
                    {!day.isRest && day.estimatedMinutes > 0 && (
                      <div style={{ fontSize: '0.58rem', fontWeight: 400, opacity: 0.8, marginTop: '2px' }}>{day.estimatedMinutes}m</div>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Timeline / week-by-week view ───────────────────────────────────────
function TimelineView({ cycle, onDayClick }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {cycle.weeks.map((week, weekIdx) => {
        const phaseMeta = PHASE_META[week.phase] ?? PHASE_META.foundation;
        const trainingDays = week.days.filter((d) => !d.isRest);
        const isDeload = week.phase === 'deload';

        return (
          <div
            key={week.weekNum}
            style={{ backgroundColor: C.surface, borderRadius: '10px', border: `1px solid ${C.border}`, overflow: 'hidden' }}
          >
            {/* Week header */}
            <div style={{ padding: '0.65rem 1rem', backgroundColor: phaseMeta.bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 500, color: phaseMeta.color, fontSize: '0.9rem' }}>Week {week.weekNum}</span>
                <span style={{ backgroundColor: phaseMeta.color, color: '#fff', padding: '0.12rem 0.5rem', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 400 }}>{phaseMeta.label}</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: C.textSecondary, fontWeight: 300 }}>{trainingDays.length} training day{trainingDays.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Training day rows */}
            <div style={{ padding: '0.625rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {trainingDays.length === 0 ? (
                <p style={{ color: C.textSecondary, fontSize: '0.8rem', fontStyle: 'italic', padding: '0.25rem 0.375rem', margin: 0, fontWeight: 300 }}>Full rest week</p>
              ) : (
                trainingDays.map((day) => {
                  const dayIdx = week.days.indexOf(day);
                  const meta = DAY_TYPE_META[day.dayType] ?? DAY_TYPE_META.rest;
                  const preview = day.exercises.filter((e) => !e.isMobility).slice(0, 3).map((e) => e.name).join(' · ');
                  const mainCount = day.exercises.filter((e) => !e.isMobility).length;
                  const extra = mainCount > 3 ? ` +${mainCount - 3} more` : '';

                  return (
                    <button
                      key={day.dayNum}
                      onClick={() => onDayClick(weekIdx, dayIdx)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.6rem 0.75rem', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: C.bg, cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s', minHeight: '44px' }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = meta.bg; e.currentTarget.style.borderColor = meta.color + '50'; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = C.bg; e.currentTarget.style.borderColor = C.border; }}
                    >
                      <span style={{ backgroundColor: meta.bg, color: meta.color, padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 500, flexShrink: 0, minWidth: '62px', textAlign: 'center' }}>{day.dayLabel}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.78rem', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 300 }}>
                          {preview}{extra}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, gap: '0.1rem' }}>
                        {day.estimatedMinutes > 0 && (
                          <div style={{ fontSize: '0.72rem', color: C.textSecondary, fontWeight: 300 }}>~{day.estimatedMinutes}m</div>
                        )}
                        {day.sessionMins && (
                          <div style={{ fontSize: '0.62rem', color: C.accent, fontWeight: 400 }}>{day.sessionMins}min cap</div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Shared CycleViewer ─────────────────────────────────────────────────
// onRegenerateDay?: (weekIdx, dayIdx, newSessionMins) => void
export default function CycleViewer({ cycle, onRegenerateDay }) {
  const [view, setView] = useState('calendar');
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(null);
  const [selectedDayIdx, setSelectedDayIdx] = useState(null);

  // Derive modal data from cycle state — auto-updates after regeneration
  const selectedWeek = selectedWeekIdx !== null ? cycle.weeks[selectedWeekIdx] : null;
  const selectedDay = selectedWeek?.days[selectedDayIdx] ?? null;

  function handleDayClick(weekIdx, dayIdx) {
    setSelectedWeekIdx(weekIdx);
    setSelectedDayIdx(dayIdx);
  }

  function handleCloseModal() {
    setSelectedWeekIdx(null);
    setSelectedDayIdx(null);
  }

  return (
    <div>
      {/* View toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {[{ v: 'calendar', label: 'Calendar Grid' }, { v: 'timeline', label: 'Week Timeline' }].map(({ v, label }) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{ padding: '0.4rem 0.875rem', borderRadius: '20px', border: `1px solid ${view === v ? C.accent : C.border}`, backgroundColor: view === v ? C.accentMuted : C.surface, color: view === v ? C.accent : C.textSecondary, fontSize: '0.82rem', fontWeight: view === v ? 400 : 300, cursor: 'pointer', transition: 'all 0.15s', fontFamily: FONTS.body, minHeight: '36px' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Summary badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
        <span style={{ ...tagBase }}>{cycle.splitLabel}</span>
        <span style={{ ...tagBase }}>{cycle.cycleLength} weeks</span>
        <span style={{ ...tagBase, color: C.accent, borderColor: C.accent }}>{cycle.daysPerWeek}×/week</span>
        {(cycle.goals ?? []).map((g) => (
          <span key={g} style={{ ...tagBase, textTransform: 'capitalize' }}>{g}</span>
        ))}
        {cycle.sessionMins && (
          <span style={{ ...tagBase }}>{cycle.sessionMins}min sessions</span>
        )}
      </div>

      {onRegenerateDay && (
        <p style={{ fontSize: '0.78rem', color: C.textSecondary, marginBottom: '0.75rem', fontWeight: 300 }}>
          Click any training day to view exercises and adjust its session length.
        </p>
      )}

      {view === 'calendar' ? (
        <CalendarGrid cycle={cycle} onDayClick={handleDayClick} />
      ) : (
        <TimelineView cycle={cycle} onDayClick={handleDayClick} />
      )}

      {selectedDay && selectedWeek && (
        <DayModal
          week={selectedWeek}
          day={selectedDay}
          weekIdx={selectedWeekIdx}
          dayIdx={selectedDayIdx}
          onClose={handleCloseModal}
          onRegenerateDay={onRegenerateDay}
        />
      )}
    </div>
  );
}
