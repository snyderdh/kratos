import { useState, useEffect } from 'react';
import { generateSingleDayRoutine, getAlternativeExercises, getBlendConfig } from '../utils/routineGenerator';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

const GOALS = [
  { value: 'strength',    label: 'Strength',    desc: '5 sets × 3-5 reps | Heavy loads' },
  { value: 'hypertrophy', label: 'Hypertrophy', desc: '4 sets × 8-12 reps | Muscle growth' },
  { value: 'endurance',   label: 'Endurance',   desc: '3 sets × 15-20 reps | High volume' },
  { value: 'power',       label: 'Power',        desc: '5 sets × 3-5 reps | Explosive power' },
  { value: 'mobility',    label: 'Mobility',     desc: 'Warmup + flexibility | Add to any goal' },
];

const EQUIPMENT = [
  { value: 'barbell',     label: 'Barbell' },
  { value: 'dumbbells',   label: 'Dumbbells' },
  { value: 'bodyweight',  label: 'Bodyweight' },
  { value: 'cables',      label: 'Cables' },
  { value: 'machines',    label: 'Machines' },
  { value: 'kettlebells', label: 'Kettlebells' },
  { value: 'bands',       label: 'Resistance Bands' },
];

const MUSCLES = [
  { value: 'chest',     label: 'Chest' },
  { value: 'back',      label: 'Back' },
  { value: 'legs',      label: 'Legs' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'arms',      label: 'Arms' },
  { value: 'core',      label: 'Core' },
];

const COUNT_OPTIONS = [3, 4, 5, 6, 7, 8];

const TIME_LIMITS = [
  { value: 'no-limit', label: 'No limit' },
  { value: '30',       label: '30 min' },
  { value: '45',       label: '45 min' },
  { value: '60',       label: '60 min' },
  { value: '75',       label: '75 min' },
  { value: '90',       label: '90 min' },
];

const orange = '#FF6B2B';
const orangeHover = '#e55a1f';
const green = '#16a34a';

const difficultyBadge = {
  beginner:     { bg: '#dcfce7', text: '#16a34a' },
  intermediate: { bg: '#fef9c3', text: '#ca8a04' },
  advanced:     { bg: '#fee2e2', text: '#dc2626' },
};

// ── Time estimation helpers ───────────────────────────────────────────────
function parseAvgReps(repsStr) {
  const s = String(repsStr ?? '10');
  if (s.endsWith('s')) return 10; // duration-based (e.g. "30s")
  if (s.includes('-')) {
    const [lo, hi] = s.split('-').map(Number);
    return (lo + hi) / 2;
  }
  return Number(s) || 10;
}

function parseRestSec(restStr) {
  return parseInt(String(restStr ?? '60')) || 60;
}

function estimateExerciseMinutes(ex) {
  const sets = Number(ex.sets) || 3;
  const workSec = sets * parseAvgReps(ex.reps) * (ex.isMobility ? 2 : 3);
  const totalRestSec = (sets - 1) * parseRestSec(ex.rest);
  return (workSec + totalRestSec + 45) / 60; // 45s transition
}

function estimateSupersetMinutes(exList) {
  const sets = Number(exList[0]?.sets) || 3;
  const workSec = exList.reduce((s, ex) => s + sets * parseAvgReps(ex.reps) * 3, 0);
  const totalRestSec = (sets - 1) * parseRestSec(exList[0]?.rest);
  return (workSec + totalRestSec + 45) / 60;
}

function estimateTotalMinutes(exercises) {
  let total = 0;
  let i = 0;
  while (i < exercises.length) {
    const ex = exercises[i];
    if (ex.supersetGroup) {
      const label = ex.supersetGroup;
      const group = [];
      while (i < exercises.length && exercises[i].supersetGroup === label) {
        group.push(exercises[i++]);
      }
      total += estimateSupersetMinutes(group);
    } else {
      total += estimateExerciseMinutes(ex);
      i++;
    }
  }
  return total;
}

function maxExercisesForLimit(limitMin, blendConfig, hasMobility) {
  const sets = blendConfig.sets;
  const workSec = sets * parseAvgReps(blendConfig.reps) * 3;
  const totalRestSec = (sets - 1) * blendConfig.restSeconds;
  const minutesPerEx = (workSec + totalRestSec + 45) / 60;
  const mobilityReserve = hasMobility ? 4 : 0; // ~4 min for 2 warmup exercises
  return Math.max(1, Math.floor((limitMin - mobilityReserve) / minutesPerEx));
}

function isEdited(ex) {
  if (!ex._defaults) return false;
  return (
    String(ex.sets) !== String(ex._defaults.sets) ||
    ex.reps !== ex._defaults.reps ||
    ex.rest !== ex._defaults.rest
  );
}

// Group flat exercise list into singles and superset groups (preserving flat indices)
function groupExercises(exercises) {
  const groups = [];
  let i = 0;
  while (i < exercises.length) {
    const ex = exercises[i];
    if (ex.supersetGroup) {
      const label = ex.supersetGroup;
      const items = [];
      while (i < exercises.length && exercises[i].supersetGroup === label) {
        items.push({ exercise: exercises[i], flatIndex: i });
        i++;
      }
      groups.push({ type: 'superset', label, items });
    } else {
      groups.push({ type: 'single', exercise: ex, flatIndex: i });
      i++;
    }
  }
  return groups;
}

// Compute per-exercise display labels (Warm-up #N vs Exercise #N)
function computeLabels(exercises) {
  let warmup = 0;
  let main = 0;
  return exercises.map((ex) => {
    if (ex.isMobility) return { label: `Warm-up #${++warmup}`, color: green };
    return { label: `Exercise #${++main}`, color: orange };
  });
}

// ── Inline editable field ─────────────────────────────────────────────────
function EditableField({ value, onChange, type = 'text', width = '52px', fontSize = '1rem', fontWeight = 700, color = '#111827' }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width,
        textAlign: 'center',
        fontWeight,
        fontSize,
        color,
        fontFamily: 'inherit',
        background: focused ? '#fff5f0' : 'transparent',
        border: `1.5px solid ${focused ? orange : 'transparent'}`,
        borderRadius: '6px',
        padding: '0.2rem 0.25rem',
        outline: 'none',
        transition: 'border-color 0.15s, background 0.15s',
        MozAppearance: 'textfield',
      }}
      min={type === 'number' ? 1 : undefined}
      max={type === 'number' ? 20 : undefined}
    />
  );
}

// ── Replace modal ─────────────────────────────────────────────────────────
function ReplaceModal({ exerciseName, alternatives, onSelect, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.35)',
        zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexShrink: 0 }}>
          <div>
            <h3 style={{ fontWeight: 900, fontSize: '1rem', color: '#111827', marginBottom: '0.2rem' }}>Replace Exercise</h3>
            <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              Replacing: <span style={{ fontWeight: 700, color: '#374151' }}>{exerciseName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '1.25rem', lineHeight: 1, padding: '0.1rem', flexShrink: 0 }}
            aria-label="Close"
          >×</button>
        </div>

        <div style={{ overflowY: 'auto', padding: '0.75rem' }}>
          {alternatives.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
              No other exercises available for this muscle group and equipment selection.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {alternatives.map((alt) => {
                const diff = difficultyBadge[alt.difficulty];
                return (
                  <button
                    key={alt.id}
                    onClick={() => onSelect(alt)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.85rem 1rem', borderRadius: '8px', border: '1.5px solid #e5e7eb', backgroundColor: '#f9fafb', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = orange; e.currentTarget.style.backgroundColor = '#fff5f0'; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.9rem', marginBottom: '0.3rem' }}>{alt.name}</div>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <span style={{ padding: '1px 7px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', backgroundColor: '#f3f4f6', color: '#6b7280' }}>{alt.equipment}</span>
                        <span style={{ padding: '1px 7px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', backgroundColor: diff.bg, color: diff.text }}>{alt.difficulty}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: orange, flexShrink: 0 }}>Select →</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function RoutineGenerator() {
  const { user } = useAuth();
  const [goals, setGoals] = useState(['hypertrophy']);
  const [equipment, setEquipment] = useState(['barbell', 'dumbbells']);
  const [muscleGroups, setMuscleGroups] = useState(['chest', 'back', 'legs', 'shoulders']);
  const [exerciseCount, setExerciseCount] = useState(5);
  const [routine, setRoutine] = useState(null);
  const [error, setError] = useState('');
  const [sharePublic, setSharePublic] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [replaceModal, setReplaceModal] = useState(null);
  const [timeLimit, setTimeLimit] = useState('no-limit');

  function toggleGoal(val) {
    setGoals((prev) => prev.includes(val) ? prev.filter((g) => g !== val) : [...prev, val]);
  }
  function toggleEquipment(val) {
    setEquipment((prev) => prev.includes(val) ? prev.filter((e) => e !== val) : [...prev, val]);
  }
  function toggleMuscle(val) {
    setMuscleGroups((prev) => prev.includes(val) ? prev.filter((m) => m !== val) : [...prev, val]);
  }

  function tagDefaults(exercises) {
    return exercises.map((ex) => ({
      ...ex,
      _defaults: { sets: ex.sets, reps: ex.reps, rest: ex.rest },
    }));
  }

  function handleGenerate() {
    if (goals.length === 0) return setError('Select at least one training goal.');
    if (goals.length === 1 && goals[0] === 'mobility') {
      return setError('Add a training goal alongside Mobility (e.g. Strength, Hypertrophy).');
    }
    if (equipment.length === 0) return setError('Select at least one equipment type.');
    if (muscleGroups.length === 0) return setError('Select at least one muscle group.');
    setError('');
    setSaveSuccess(false);

    // Determine effective count — shrink if needed to fit time limit
    let effectiveCount = exerciseCount;
    let wasAdjusted = false;
    if (timeLimit !== 'no-limit') {
      const limitMin = parseInt(timeLimit);
      const blendConfig = getBlendConfig(goals);
      const maxEx = maxExercisesForLimit(limitMin, blendConfig, goals.includes('mobility'));
      if (maxEx < effectiveCount) {
        effectiveCount = maxEx;
        wasAdjusted = true;
      }
    }

    const result = generateSingleDayRoutine({ goals, equipment, muscleGroups, exerciseCount: effectiveCount });
    const estimatedMin = Math.round(estimateTotalMinutes(result.exercises));
    setRoutine({
      ...result,
      exercises: tagDefaults(result.exercises),
      estimatedMin,
      adjustedFrom: wasAdjusted ? exerciseCount : null,
      adjustedTo: wasAdjusted ? effectiveCount : null,
      timeLimitMin: timeLimit !== 'no-limit' ? parseInt(timeLimit) : null,
    });
    setTimeout(() => {
      document.getElementById('routine-output')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  function updateExerciseField(index, field, value) {
    setRoutine((prev) => {
      const updated = [...prev.exercises];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, exercises: updated };
    });
  }

  function handleOpenReplace(index) {
    const ex = routine.exercises[index];
    const excludeIds = routine.exercises.map((e) => e.id);
    const alternatives = getAlternativeExercises({ exercise: ex, equipment, excludeIds, goals });
    setReplaceModal({ index, alternatives, exerciseName: ex.name });
  }

  function handleSelectReplacement(alternative) {
    const { index } = replaceModal;
    setRoutine((prev) => {
      const updated = [...prev.exercises];
      const original = updated[index];
      updated[index] = {
        ...alternative,
        supersetGroup: original.supersetGroup ?? null,
        _defaults: { sets: alternative.sets, reps: alternative.reps, rest: alternative.rest },
      };
      return { ...prev, exercises: updated };
    });
    setReplaceModal(null);
  }

  async function handleSave() {
    if (!routine) return;
    const exercises = routine.exercises.map(({ _defaults, ...ex }) => ex);

    const saved = (() => {
      try { return JSON.parse(localStorage.getItem('kratos-saved-routines') || '[]'); }
      catch { return []; }
    })();
    const entry = { id: Date.now(), goal: routine.blendLabel, savedAt: new Date().toISOString(), exercises };
    localStorage.setItem('kratos-saved-routines', JSON.stringify([entry, ...saved]));

    if (sharePublic && user) {
      const { error: dbErr } = await supabase.from('routines').insert({
        user_id: user.id,
        title: `${routine.blendLabel} Routine`,
        exercises,
        is_public: true,
      });
      if (dbErr) console.error('Failed to share to community:', dbErr);
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  }

  // ── Exercise card renderer (closure over state handlers) ─────────────
  function renderCard(ex, flatIndex, numLabel, numColor, flat = false) {
    const diff = ex.difficulty ? difficultyBadge[ex.difficulty] : difficultyBadge.beginner;
    const edited = isEdited(ex);
    const isMob = ex.isMobility;
    const accentColor = isMob ? green : orange;

    return (
      <div
        key={`${ex.id}-${flatIndex}`}
        style={{
          backgroundColor: '#ffffff',
          border: flat ? 'none' : '1px solid #e5e7eb',
          borderLeft: `4px solid ${accentColor}`,
          borderRadius: flat ? 0 : '10px',
          padding: '1rem 1.25rem',
          boxShadow: flat ? 'none' : '0 2px 12px rgba(0,0,0,0.07)',
        }}
      >
        {/* Top row: label + badges + replace button */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: numColor, textTransform: 'uppercase', letterSpacing: '1px' }}>
                {numLabel}
              </span>
              {isMob && (
                <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '0.65rem', fontWeight: 700, color: green, backgroundColor: '#dcfce7', border: `1px solid ${green}`, borderRadius: '20px', padding: '1px 7px' }}>
                  Warm-up
                </span>
              )}
              {edited && !isMob && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem', fontWeight: 700, color: orange, backgroundColor: '#fff5f0', border: `1px solid ${orange}`, borderRadius: '20px', padding: '1px 7px', letterSpacing: '0.3px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: orange, display: 'inline-block', flexShrink: 0 }} />
                  edited
                </span>
              )}
            </div>
            <div style={{ fontWeight: 700, color: '#111827', fontSize: '1rem', marginBottom: '0.4rem' }}>{ex.name}</div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={tagStyle}>{ex.equipment}</span>
              <span style={tagStyle}>{ex.muscleGroup}</span>
              {!isMob && <span style={{ ...tagStyle, backgroundColor: diff.bg, color: diff.text }}>{ex.difficulty}</span>}
            </div>
          </div>

          {/* Replace button — only for non-mobility exercises */}
          {!isMob && (
            <button
              onClick={() => handleOpenReplace(flatIndex)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.85rem', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', color: '#6b7280', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0 }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = orange; e.currentTarget.style.color = orange; e.currentTarget.style.backgroundColor = '#fff5f0'; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.backgroundColor = '#f9fafb'; }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4v6h6"/><path d="M23 20v-6h-6"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
              Replace
            </button>
          )}
        </div>

        {/* Editable sets / reps / rest */}
        <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #f3f4f6' }}>
          <div style={fieldWrap}>
            <EditableField type="number" value={ex.sets} onChange={(v) => updateExerciseField(flatIndex, 'sets', v)} color={accentColor} fontSize="1.15rem" />
            <div style={fieldLabel}>sets</div>
          </div>
          <div style={{ color: '#d1d5db', alignSelf: 'center', marginBottom: '0.85rem' }}>×</div>
          <div style={fieldWrap}>
            <EditableField value={ex.reps} onChange={(v) => updateExerciseField(flatIndex, 'reps', v)} width="64px" fontSize="1rem" />
            <div style={fieldLabel}>reps</div>
          </div>
          <div style={{ color: '#d1d5db', alignSelf: 'center', marginBottom: '0.85rem', fontSize: '0.75rem' }}>·</div>
          <div style={fieldWrap}>
            <EditableField value={ex.rest} onChange={(v) => updateExerciseField(flatIndex, 'rest', v)} width="56px" fontSize="0.9rem" color="#6b7280" fontWeight={600} />
            <div style={fieldLabel}>rest</div>
          </div>
          <div style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: '0.7rem', color: '#d1d5db', marginBottom: '0.85rem' }}>
            click to edit
          </div>
        </div>
      </div>
    );
  }

  const labels = routine ? computeLabels(routine.exercises) : [];

  return (
    <>
      {replaceModal && (
        <ReplaceModal
          exerciseName={replaceModal.exerciseName}
          alternatives={replaceModal.alternatives}
          onSelect={handleSelectReplacement}
          onClose={() => setReplaceModal(null)}
        />
      )}

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#111827', letterSpacing: '-0.5px', marginBottom: '0.25rem' }}>
            Routine Generator
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
            Build a personalized single-day workout based on your goals and equipment.
          </p>
        </div>

        {/* Form Card */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.75rem', marginBottom: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>

          {/* Training Goals — multi-select */}
          <section style={{ marginBottom: '1.75rem' }}>
            <h2 style={sectionLabel}>
              Training Goals{' '}
              <span style={{ fontWeight: 400, color: '#9ca3af', textTransform: 'none', letterSpacing: 0, fontSize: '0.7rem' }}>
                · select one or more
              </span>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '0.75rem' }}>
              {GOALS.map((g) => {
                const active = goals.includes(g.value);
                return (
                  <button
                    key={g.value}
                    onClick={() => toggleGoal(g.value)}
                    style={{
                      padding: '1rem',
                      borderRadius: '8px',
                      border: `2px solid ${active ? orange : '#e5e7eb'}`,
                      backgroundColor: active ? '#fff5f0' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                      position: 'relative',
                    }}
                  >
                    {active && (
                      <span style={{ position: 'absolute', top: '8px', right: '8px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: orange, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    )}
                    <div style={{ fontWeight: 700, color: active ? orange : '#111827', fontSize: '0.95rem', marginBottom: '0.2rem', paddingRight: active ? '1.4rem' : 0 }}>
                      {g.label}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: '#6b7280', lineHeight: 1.4 }}>{g.desc}</div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Available Equipment */}
          <section style={{ marginBottom: '1.75rem' }}>
            <h2 style={sectionLabel}>Available Equipment</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
              {EQUIPMENT.map((eq) => {
                const active = equipment.includes(eq.value);
                return (
                  <button key={eq.value} onClick={() => toggleEquipment(eq.value)} style={{ padding: '0.45rem 1rem', borderRadius: '20px', border: `2px solid ${active ? orange : '#e5e7eb'}`, backgroundColor: active ? '#fff5f0' : '#f9fafb', color: active ? orange : '#374151', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                    {eq.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Target Muscle Groups */}
          <section style={{ marginBottom: '1.75rem' }}>
            <h2 style={sectionLabel}>Target Muscle Groups</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
              {MUSCLES.map((m) => {
                const active = muscleGroups.includes(m.value);
                return (
                  <button key={m.value} onClick={() => toggleMuscle(m.value)} style={{ padding: '0.45rem 1rem', borderRadius: '20px', border: `2px solid ${active ? orange : '#e5e7eb'}`, backgroundColor: active ? '#fff5f0' : '#f9fafb', color: active ? orange : '#374151', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                    {m.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Number of Exercises */}
          <section style={{ marginBottom: '1.75rem' }}>
            <h2 style={sectionLabel}>Number of Exercises</h2>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {COUNT_OPTIONS.map((n) => {
                const active = exerciseCount === n;
                return (
                  <button key={n} onClick={() => setExerciseCount(n)} style={{ width: '48px', height: '48px', borderRadius: '8px', border: `2px solid ${active ? orange : '#e5e7eb'}`, backgroundColor: active ? orange : '#f9fafb', color: active ? '#ffffff' : '#374151', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                    {n}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Time Limit */}
          <section style={{ marginBottom: '1.75rem' }}>
            <h2 style={sectionLabel}>Time Limit</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
              {TIME_LIMITS.map((opt) => {
                const active = timeLimit === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTimeLimit(opt.value)}
                    style={{ padding: '0.45rem 1rem', borderRadius: '20px', border: `2px solid ${active ? orange : '#e5e7eb'}`, backgroundColor: active ? '#fff5f0' : '#f9fafb', color: active ? orange : '#374151', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s' }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </section>

          {error && <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>}

          <button
            onClick={handleGenerate}
            style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: 'none', backgroundColor: orange, color: '#ffffff', fontWeight: 800, fontSize: '1rem', letterSpacing: '0.5px', cursor: 'pointer', transition: 'background-color 0.15s' }}
            onMouseOver={(e) => (e.target.style.backgroundColor = orangeHover)}
            onMouseOut={(e) => (e.target.style.backgroundColor = orange)}
          >
            Generate Routine
          </button>
        </div>

        {/* ── Routine Output ── */}
        {routine && (
          <div id="routine-output">
            {/* Header */}
            <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#111827' }}>
                  Your {routine.blendLabel} Routine
                </h2>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.2rem' }}>
                  {routine.blendDescription}
                </p>
              </div>
              <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', backgroundColor: '#fff5f0', color: orange, fontWeight: 700, fontSize: '0.8rem', border: `1px solid ${orange}`, whiteSpace: 'nowrap' }}>
                {routine.blendLabel}
              </span>
            </div>

            {/* Estimated time + adjustment note */}
            {(routine.estimatedMin > 0 || routine.adjustedTo) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                {routine.estimatedMin > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.95rem', color: orange }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Estimated time: {routine.estimatedMin} min
                  </span>
                )}
                {routine.adjustedTo && (
                  <span style={{ fontSize: '0.78rem', color: '#6b7280', backgroundColor: '#f3f4f6', padding: '3px 10px', borderRadius: '20px', border: '1px solid #e5e7eb' }}>
                    Adjusted to {routine.adjustedTo} exercises to fit your {routine.timeLimitMin} min limit
                  </span>
                )}
              </div>
            )}

            {/* Exercise list — grouped by supersets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {groupExercises(routine.exercises).map((group, groupIdx) => {
                if (group.type === 'single') {
                  const lbl = labels[group.flatIndex];
                  return renderCard(group.exercise, group.flatIndex, lbl.label, lbl.color);
                }

                // Superset group wrapper
                return (
                  <div
                    key={`superset-${group.label}-${groupIdx}`}
                    style={{
                      border: `2px solid ${orange}`,
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: '0 2px 16px rgba(255,107,43,0.1)',
                    }}
                  >
                    {/* Superset header */}
                    <div style={{ backgroundColor: '#fff5f0', padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid rgba(255,107,43,0.15)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={orange} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
                      </svg>
                      <span style={{ fontWeight: 800, fontSize: '0.75rem', color: orange, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                        Superset {group.label}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>· perform back-to-back with minimal rest</span>
                    </div>

                    {/* Exercises within the superset */}
                    <div style={{ backgroundColor: '#ffffff' }}>
                      {group.items.map((item, itemIdx) => {
                        const lbl = labels[item.flatIndex];
                        return (
                          <div key={`${item.exercise.id}-${item.flatIndex}`}>
                            {itemIdx > 0 && (
                              <div style={{ borderTop: '1.5px dashed #e5e7eb', margin: '0 1.25rem' }} />
                            )}
                            {renderCard(item.exercise, item.flatIndex, lbl.label, lbl.color, true)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Share to Community toggle */}
            <div
              onClick={() => setSharePublic((v) => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.85rem',
                padding: '0.85rem 1rem', marginBottom: '1rem',
                backgroundColor: sharePublic ? '#fff5f0' : '#f9fafb',
                border: `1.5px solid ${sharePublic ? orange : '#e5e7eb'}`,
                borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none',
              }}
            >
              <div style={{ width: '38px', height: '22px', borderRadius: '11px', backgroundColor: sharePublic ? orange : '#d1d5db', transition: 'background-color 0.2s', position: 'relative', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: '3px', left: sharePublic ? '19px' : '3px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#ffffff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: sharePublic ? orange : '#374151', transition: 'color 0.15s' }}>
                  Share to Community
                </div>
                <div style={{ fontSize: '0.73rem', color: '#9ca3af', marginTop: '0.1rem' }}>
                  {sharePublic ? 'Will be visible in the community feed' : 'Off — only saved to your routines'}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={handleGenerate}
                style={{ padding: '0.7rem 1.4rem', borderRadius: '8px', border: `2px solid ${orange}`, backgroundColor: 'transparent', color: orange, fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#fff5f0')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                Regenerate
              </button>

              <button
                onClick={handleSave}
                style={{ padding: '0.7rem 1.4rem', borderRadius: '8px', border: 'none', backgroundColor: orange, color: '#ffffff', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', transition: 'background-color 0.15s' }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = orangeHover)}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = orange)}
              >
                Save Routine
              </button>

              {saveSuccess && (
                <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.875rem' }}>
                  {sharePublic ? '✓ Saved & shared to Community!' : '✓ Routine saved!'}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Shared micro-styles ───────────────────────────────────────────────────
const sectionLabel = {
  fontSize: '0.75rem', fontWeight: 700, letterSpacing: '2px',
  textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.75rem',
  display: 'block',
};

const tagStyle = {
  padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem',
  fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
  backgroundColor: '#f3f4f6', color: '#6b7280',
};

const fieldWrap = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem',
};

const fieldLabel = {
  fontSize: '0.6rem', color: '#9ca3af', textTransform: 'uppercase',
  letterSpacing: '0.5px', fontWeight: 700,
};
