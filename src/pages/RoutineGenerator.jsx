import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { generateSingleDayRoutine, getAlternativeExercises, getBlendConfig } from '../utils/routineGenerator';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { C, FONTS, card, btnPrimary, inputBase, labelBase, tagBase } from '../theme';

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

const COUNT_OPTIONS = ['recommended', 3, 4, 5, 6, 7, 8];

const TIME_LIMITS = [
  { value: 'no-limit', label: 'No limit' },
  { value: '30',       label: '30 min' },
  { value: '45',       label: '45 min' },
  { value: '60',       label: '60 min' },
  { value: '75',       label: '75 min' },
  { value: '90',       label: '90 min' },
];

const accent = C.accent;
const sage = '#6B8F71';

const difficultyBadge = {
  beginner:     { bg: '#EDF2EE', text: '#4A7C59' },
  intermediate: { bg: '#F2EFE8', text: '#7A6040' },
  advanced:     { bg: '#F2ECEC', text: '#8B4040' },
};

// ── Recommendation logic ──────────────────────────────────────────────────
const GOAL_BASE = { strength: 4.5, power: 4.5, hypertrophy: 5.5, endurance: 7 };

function calculateRecommended(goals, muscleGroups, timeLimit) {
  const mainGoals = goals.filter((g) => g !== 'mobility');
  let base;
  if (mainGoals.length === 0) {
    base = 4;
  } else {
    const sum = mainGoals.reduce((s, g) => s + (GOAL_BASE[g] ?? 5), 0);
    base = Math.round(sum / mainGoals.length);
  }
  const mgCount = muscleGroups.length;
  if (mgCount <= 2) base = Math.max(3, base - 1);
  else if (mgCount >= 5) base = Math.min(8, base + 1);
  base = Math.max(3, Math.min(8, base));
  if (timeLimit !== 'no-limit') {
    const blendConfig = getBlendConfig(goals);
    const maxEx = maxExercisesForLimit(parseInt(timeLimit), blendConfig, goals.includes('mobility'));
    base = Math.min(base, Math.max(1, maxEx));
  }
  return base;
}

function recommendationReason(goals, muscleGroups, timeLimit, count) {
  const mainGoals = goals.filter((g) => g !== 'mobility');
  const goalStr = mainGoals.length === 0
    ? 'Mobility'
    : mainGoals.map((g) => g.charAt(0).toUpperCase() + g.slice(1)).join(' + ');
  const mgStr = `${muscleGroups.length} muscle group${muscleGroups.length !== 1 ? 's' : ''}`;
  const timeStr = timeLimit !== 'no-limit' ? ` in ${timeLimit} min` : '';
  return `${count} exercises recommended for ${goalStr} across ${mgStr}${timeStr}`;
}

// ── Time estimation helpers ───────────────────────────────────────────────
const WARMUP_BUFFER_MIN = 3;
const COOLDOWN_BUFFER_MIN = 3;
const TRANSITION_MIN = 1; // between exercise slots

function parseAvgReps(repsStr) {
  const s = String(repsStr ?? '10');
  if (s.endsWith('s')) return 10;
  if (s.includes('-')) {
    const [lo, hi] = s.split('-').map(Number);
    return (lo + hi) / 2;
  }
  return Number(s) || 10;
}

function parseRestSec(restStr) {
  return parseInt(String(restStr ?? '60')) || 60;
}

// Select realistic sec-per-rep based on rest period:
//   ≥150s rest → strength/power (4 sec/rep, slow heavy reps)
//   ≥75s rest  → hypertrophy (3 sec/rep, controlled tempo)
//   <75s rest  → endurance (2 sec/rep, faster reps)
function secPerRepFromRest(restSec, isMobility) {
  if (isMobility) return 2;
  if (restSec >= 150) return 4;
  if (restSec >= 75) return 3;
  return 2;
}

function estimateExerciseMinutes(ex) {
  const sets = Number(ex.sets) || 3;
  const restSec = parseRestSec(ex.rest);
  const spr = secPerRepFromRest(restSec, ex.isMobility);
  const workSec = sets * parseAvgReps(ex.reps) * spr;
  const totalRestSec = (sets - 1) * restSec;
  return (workSec + totalRestSec) / 60;
}

function estimateSupersetMinutes(exList) {
  const sets = Number(exList[0]?.sets) || 3;
  const restSec = parseRestSec(exList[0]?.rest);
  const spr = secPerRepFromRest(restSec, false);
  const workSec = exList.reduce((s, ex) => s + sets * parseAvgReps(ex.reps) * spr, 0);
  const totalRestSec = (sets - 1) * restSec;
  return (workSec + totalRestSec) / 60;
}

// Count distinct exercise "slots" (supersets count as 1 slot)
function countExerciseSlots(exercises) {
  let slots = 0;
  let i = 0;
  while (i < exercises.length) {
    const ex = exercises[i];
    if (ex.supersetGroup) {
      const label = ex.supersetGroup;
      while (i < exercises.length && exercises[i].supersetGroup === label) i++;
      slots++;
    } else {
      slots++;
      i++;
    }
  }
  return slots;
}

function estimateTotalMinutes(exercises) {
  let exerciseMin = 0;
  let slots = 0;
  let i = 0;
  while (i < exercises.length) {
    const ex = exercises[i];
    if (ex.supersetGroup) {
      const label = ex.supersetGroup;
      const group = [];
      while (i < exercises.length && exercises[i].supersetGroup === label) {
        group.push(exercises[i++]);
      }
      exerciseMin += estimateSupersetMinutes(group);
      slots++;
    } else {
      exerciseMin += estimateExerciseMinutes(ex);
      slots++;
      i++;
    }
  }
  const transitionMin = Math.max(0, slots - 1) * TRANSITION_MIN;
  return WARMUP_BUFFER_MIN + exerciseMin + transitionMin + COOLDOWN_BUFFER_MIN;
}

function maxExercisesForLimit(limitMin, blendConfig, hasMobility) {
  const sets = blendConfig.sets;
  const restSec = blendConfig.restSeconds;
  const spr = secPerRepFromRest(restSec, false);
  const workSec = sets * parseAvgReps(blendConfig.reps) * spr;
  const totalRestSec = (sets - 1) * restSec;
  // Per-exercise time + 1 min transition between each
  const minutesPerEx = (workSec + totalRestSec) / 60 + TRANSITION_MIN;
  const overhead = WARMUP_BUFFER_MIN + COOLDOWN_BUFFER_MIN + (hasMobility ? 4 : 0);
  return Math.max(1, Math.floor((limitMin - overhead) / minutesPerEx));
}

function isEdited(ex) {
  if (!ex._defaults) return false;
  return (
    String(ex.sets) !== String(ex._defaults.sets) ||
    ex.reps !== ex._defaults.reps ||
    ex.rest !== ex._defaults.rest
  );
}

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

function computeLabels(exercises) {
  let warmup = 0;
  let main = 0;
  return exercises.map((ex) => {
    if (ex.isMobility) return { label: `Warm-up #${++warmup}`, color: sage };
    return { label: `Exercise #${++main}`, color: accent };
  });
}

// ── Inline editable field ─────────────────────────────────────────────────
function EditableField({ value, onChange, type = 'text', width = '52px', fontSize = '1rem', fontWeight = 400, color = C.text }) {
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
        background: focused ? C.accentMuted : 'transparent',
        border: `1px solid ${focused ? accent : 'transparent'}`,
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
          ...card,
          boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexShrink: 0 }}>
          <div>
            <h3 style={{ fontWeight: 500, fontSize: '1rem', color: C.text, marginBottom: '0.2rem', fontFamily: FONTS.heading }}>Replace Exercise</h3>
            <p style={{ fontSize: '0.8rem', color: C.textSecondary, fontWeight: 300 }}>
              Replacing: <span style={{ fontWeight: 400, color: C.text }}>{exerciseName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSecondary, fontSize: '1.25rem', lineHeight: 1, padding: '0.1rem', flexShrink: 0 }}
            aria-label="Close"
          >×</button>
        </div>

        <div style={{ overflowY: 'auto', padding: '0.75rem' }}>
          {alternatives.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: C.textSecondary, fontSize: '0.875rem', fontWeight: 300 }}>
              No other exercises available for this muscle group and equipment selection.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {alternatives.map((alt) => {
                const diff = difficultyBadge[alt.difficulty] || difficultyBadge.beginner;
                return (
                  <button
                    key={alt.id}
                    onClick={() => onSelect(alt)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.85rem 1rem', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: C.bg, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.backgroundColor = C.accentMuted; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.backgroundColor = C.bg; }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 400, color: C.text, fontSize: '0.9rem', marginBottom: '0.3rem' }}>{alt.name}</div>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <span style={{ ...tagBase }}>{alt.equipment}</span>
                        <span style={{ ...tagBase, backgroundColor: diff.bg, borderColor: diff.bg, color: diff.text }}>{alt.difficulty}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 400, color: accent, flexShrink: 0 }}>Select →</span>
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
  const { state: navState } = useLocation();
  const [goals, setGoals] = useState(navState?.goals ?? ['hypertrophy']);
  const [equipment, setEquipment] = useState(['barbell', 'dumbbells']);
  const [muscleGroups, setMuscleGroups] = useState(navState?.muscleGroups ?? ['chest', 'back', 'legs', 'shoulders']);
  const [exerciseCount, setExerciseCount] = useState('recommended');
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

    const targetCount = exerciseCount === 'recommended'
      ? calculateRecommended(goals, muscleGroups, timeLimit)
      : exerciseCount;

    let effectiveCount = targetCount;
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
    const slots = countExerciseSlots(result.exercises);
    const transitionMin = Math.max(0, slots - 1) * TRANSITION_MIN;
    const totalMin = estimateTotalMinutes(result.exercises);
    const exerciseMin = Math.round(totalMin - WARMUP_BUFFER_MIN - COOLDOWN_BUFFER_MIN - transitionMin);
    const estimatedMin = Math.round(totalMin);
    setRoutine({
      ...result,
      exercises: tagDefaults(result.exercises),
      estimatedMin,
      breakdown: {
        warmup: WARMUP_BUFFER_MIN,
        exercise: Math.max(1, exerciseMin),
        transitions: transitionMin,
        cooldown: COOLDOWN_BUFFER_MIN,
      },
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

  // ── Exercise card renderer ────────────────────────────────────────────
  function renderCard(ex, flatIndex, numLabel, numColor, flat = false) {
    const diff = ex.difficulty ? difficultyBadge[ex.difficulty] : difficultyBadge.beginner;
    const edited = isEdited(ex);
    const isMob = ex.isMobility;
    const accentColor = isMob ? sage : accent;

    return (
      <div
        key={`${ex.id}-${flatIndex}`}
        style={{
          backgroundColor: C.surface,
          border: flat ? 'none' : `1px solid ${C.border}`,
          borderLeft: `4px solid ${accentColor}`,
          borderRadius: flat ? 0 : '10px',
          padding: '1rem 1.25rem',
          boxShadow: flat ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        {/* Top row: label + badges + replace button */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 400, color: numColor, textTransform: 'uppercase', letterSpacing: '1px' }}>
                {numLabel}
              </span>
              {isMob && (
                <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '0.65rem', fontWeight: 400, color: sage, backgroundColor: '#EDF2EE', border: `1px solid ${sage}`, borderRadius: '20px', padding: '1px 7px' }}>
                  Warm-up
                </span>
              )}
              {edited && !isMob && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem', fontWeight: 400, color: accent, backgroundColor: C.accentMuted, border: `1px solid ${accent}`, borderRadius: '20px', padding: '1px 7px', letterSpacing: '0.3px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: accent, display: 'inline-block', flexShrink: 0 }} />
                  edited
                </span>
              )}
            </div>
            <div style={{ fontWeight: 400, color: C.text, fontSize: '1rem', marginBottom: '0.4rem' }}>{ex.name}</div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={tagBase}>{ex.equipment}</span>
              <span style={tagBase}>{ex.muscleGroup}</span>
              {!isMob && <span style={{ ...tagBase, backgroundColor: diff.bg, borderColor: diff.bg, color: diff.text }}>{ex.difficulty}</span>}
            </div>
          </div>

          {!isMob && (
            <button
              onClick={() => handleOpenReplace(flatIndex)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.85rem', borderRadius: '6px', border: `1px solid ${C.border}`, backgroundColor: C.bg, color: C.textSecondary, fontSize: '0.8rem', fontWeight: 300, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0 }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; e.currentTarget.style.backgroundColor = C.accentMuted; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSecondary; e.currentTarget.style.backgroundColor = C.bg; }}
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
        <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.75rem', borderTop: `1px solid ${C.border}` }}>
          <div style={fieldWrap}>
            <EditableField type="number" value={ex.sets} onChange={(v) => updateExerciseField(flatIndex, 'sets', v)} color={accentColor} fontSize="1.15rem" />
            <div style={fieldLabel}>sets</div>
          </div>
          <div style={{ color: C.border, alignSelf: 'center', marginBottom: '0.85rem' }}>×</div>
          <div style={fieldWrap}>
            <EditableField value={ex.reps} onChange={(v) => updateExerciseField(flatIndex, 'reps', v)} width="64px" fontSize="1rem" />
            <div style={fieldLabel}>reps</div>
          </div>
          <div style={{ color: C.border, alignSelf: 'center', marginBottom: '0.85rem', fontSize: '0.75rem' }}>·</div>
          <div style={fieldWrap}>
            <EditableField value={ex.rest} onChange={(v) => updateExerciseField(flatIndex, 'rest', v)} width="56px" fontSize="0.9rem" color={C.textSecondary} fontWeight={300} />
            <div style={fieldLabel}>rest</div>
          </div>
          <div style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: '0.7rem', color: C.border, marginBottom: '0.85rem' }}>
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
          <h1 style={{ fontSize: '2rem', fontWeight: 500, color: C.text, marginBottom: '0.25rem', fontFamily: FONTS.heading }}>
            Routine Generator
          </h1>
          <p style={{ color: C.textSecondary, fontSize: '0.95rem', fontWeight: 300 }}>
            Build a personalized single-day workout based on your goals and equipment.
          </p>
        </div>

        {/* Form Card */}
        <div style={{ ...card, padding: '1.75rem', marginBottom: '2rem' }}>

          {/* Training Goals — multi-select */}
          <section style={{ marginBottom: '1.75rem' }}>
            <h2 style={sectionLabel}>
              Training Goals{' '}
              <span style={{ fontWeight: 300, color: C.textSecondary, textTransform: 'none', letterSpacing: 0, fontSize: '0.7rem' }}>
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
                      border: `1px solid ${active ? accent : C.border}`,
                      backgroundColor: active ? C.accentMuted : C.surface,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                      position: 'relative',
                    }}
                  >
                    {active && (
                      <span style={{ position: 'absolute', top: '8px', right: '8px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    )}
                    <div style={{ fontWeight: 400, color: active ? accent : C.text, fontSize: '0.95rem', marginBottom: '0.2rem', paddingRight: active ? '1.4rem' : 0 }}>
                      {g.label}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: C.textSecondary, lineHeight: 1.4, fontWeight: 300 }}>{g.desc}</div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Available Equipment */}
          <section style={{ marginBottom: '1.75rem' }}>
            <h2 style={sectionLabel}>Available Equipment</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
              {(() => {
                const allValues = EQUIPMENT.map((e) => e.value);
                const allActive = allValues.every((v) => equipment.includes(v));
                return (
                  <button
                    onClick={() => setEquipment(allActive ? [] : allValues)}
                    style={{ padding: '0.45rem 1rem', borderRadius: '20px', border: `1px solid ${allActive ? accent : C.border}`, backgroundColor: allActive ? C.accentMuted : C.bg, color: allActive ? accent : C.textSecondary, fontWeight: allActive ? 400 : 300, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s' }}
                  >
                    All
                  </button>
                );
              })()}
              {EQUIPMENT.map((eq) => {
                const active = equipment.includes(eq.value);
                return (
                  <button key={eq.value} onClick={() => toggleEquipment(eq.value)} style={{ padding: '0.45rem 1rem', borderRadius: '20px', border: `1px solid ${active ? accent : C.border}`, backgroundColor: active ? C.accentMuted : C.bg, color: active ? accent : C.textSecondary, fontWeight: active ? 400 : 300, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s' }}>
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
                  <button key={m.value} onClick={() => toggleMuscle(m.value)} style={{ padding: '0.45rem 1rem', borderRadius: '20px', border: `1px solid ${active ? accent : C.border}`, backgroundColor: active ? C.accentMuted : C.bg, color: active ? accent : C.textSecondary, fontWeight: active ? 400 : 300, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s' }}>
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
                const isRec = n === 'recommended';
                return (
                  <button
                    key={String(n)}
                    onClick={() => setExerciseCount(n)}
                    style={isRec ? {
                      height: '48px', padding: '0 1.1rem', borderRadius: '8px', whiteSpace: 'nowrap',
                      border: `1px ${active ? 'solid' : 'dashed'} ${accent}`,
                      backgroundColor: active ? accent : C.accentMuted,
                      color: active ? '#ffffff' : accent,
                      fontWeight: 400, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s',
                    } : {
                      width: '48px', height: '48px', borderRadius: '8px',
                      border: `1px solid ${active ? accent : C.border}`,
                      backgroundColor: active ? accent : C.bg,
                      color: active ? '#ffffff' : C.textSecondary,
                      fontWeight: 400, fontSize: '1rem', cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {isRec ? 'Recommended' : n}
                  </button>
                );
              })}
            </div>
            {exerciseCount === 'recommended' && (
              <p style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: C.textSecondary, lineHeight: 1.4, fontWeight: 300 }}>
                {recommendationReason(
                  goals, muscleGroups, timeLimit,
                  calculateRecommended(goals, muscleGroups, timeLimit)
                )}
              </p>
            )}
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
                    style={{ padding: '0.45rem 1rem', borderRadius: '20px', border: `1px solid ${active ? accent : C.border}`, backgroundColor: active ? C.accentMuted : C.bg, color: active ? accent : C.textSecondary, fontWeight: active ? 400 : 300, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s' }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </section>

          {error && <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem', fontWeight: 300 }}>{error}</p>}

          <button
            onClick={handleGenerate}
            style={{ ...btnPrimary, width: '100%', padding: '0.875rem', fontSize: '1rem' }}
            onMouseOver={(e) => (e.target.style.backgroundColor = C.accentHover)}
            onMouseOut={(e) => (e.target.style.backgroundColor = accent)}
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
                <h2 style={{ fontSize: '1.4rem', fontWeight: 500, color: C.text, fontFamily: FONTS.heading }}>
                  Your {routine.blendLabel} Routine
                </h2>
                <p style={{ color: C.textSecondary, fontSize: '0.875rem', marginTop: '0.2rem', fontWeight: 300 }}>
                  {routine.blendDescription}
                </p>
              </div>
              <span style={{ ...tagBase, color: accent, borderColor: accent, whiteSpace: 'nowrap' }}>
                {routine.blendLabel}
              </span>
            </div>

            {/* Estimated time + breakdown + adjustment note */}
            {(routine.estimatedMin > 0 || routine.adjustedTo) && (
              <div style={{ marginBottom: '1.25rem' }}>
                {routine.estimatedMin > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 400, fontSize: '0.95rem', color: accent, marginBottom: '0.45rem' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    ~{routine.estimatedMin} min total
                  </div>
                )}
                {routine.breakdown && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: routine.adjustedTo ? '0.5rem' : 0 }}>
                    <span style={{ ...tagBase }}>↑ {routine.breakdown.warmup}m warm-up</span>
                    <span style={{ ...tagBase }}>{routine.breakdown.exercise}m exercises</span>
                    {routine.breakdown.transitions > 0 && (
                      <span style={{ ...tagBase }}>{routine.breakdown.transitions}m transitions</span>
                    )}
                    <span style={{ ...tagBase }}>↓ {routine.breakdown.cooldown}m cool-down</span>
                  </div>
                )}
                {routine.adjustedTo && (
                  <span style={{ ...tagBase, fontWeight: 300 }}>
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

                return (
                  <div
                    key={`superset-${group.label}-${groupIdx}`}
                    style={{
                      border: `1px solid ${C.border}`,
                      borderRadius: '12px',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Superset header */}
                    <div style={{ backgroundColor: C.bg, padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: `1px solid ${C.border}` }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
                      </svg>
                      <span style={{ fontWeight: 400, fontSize: '0.75rem', color: accent, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                        Superset {group.label}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: C.textSecondary, fontWeight: 300 }}>· perform back-to-back with minimal rest</span>
                    </div>

                    {/* Exercises within the superset */}
                    <div style={{ backgroundColor: C.surface }}>
                      {group.items.map((item, itemIdx) => {
                        const lbl = labels[item.flatIndex];
                        return (
                          <div key={`${item.exercise.id}-${item.flatIndex}`}>
                            {itemIdx > 0 && (
                              <div style={{ borderTop: `1px dashed ${C.border}`, margin: '0 1.25rem' }} />
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
                backgroundColor: sharePublic ? C.accentMuted : C.bg,
                border: `1px solid ${sharePublic ? accent : C.border}`,
                borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none',
              }}
            >
              <div style={{ width: '38px', height: '22px', borderRadius: '11px', backgroundColor: sharePublic ? accent : C.border, transition: 'background-color 0.2s', position: 'relative', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: '3px', left: sharePublic ? '19px' : '3px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#ffffff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
              <div>
                <div style={{ fontWeight: 400, fontSize: '0.875rem', color: sharePublic ? accent : C.text, transition: 'color 0.15s' }}>
                  Share to Community
                </div>
                <div style={{ fontSize: '0.73rem', color: C.textSecondary, marginTop: '0.1rem', fontWeight: 300 }}>
                  {sharePublic ? 'Will be visible in the community feed' : 'Off — only saved to your routines'}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={handleGenerate}
                style={{ padding: '0.7rem 1.4rem', borderRadius: '8px', border: `1px solid ${accent}`, backgroundColor: 'transparent', color: accent, fontWeight: 400, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = C.accentMuted)}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                Regenerate
              </button>

              <button
                onClick={handleSave}
                style={{ ...btnPrimary, padding: '0.7rem 1.4rem' }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = C.accentHover)}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = accent)}
              >
                Save Routine
              </button>

              {saveSuccess && (
                <span style={{ color: C.accent, fontWeight: 400, fontSize: '0.875rem', backgroundColor: C.accentMuted, padding: '0.4rem 0.875rem', borderRadius: '6px', border: `1px solid ${C.accent}40` }}>
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
  fontSize: '0.65rem', fontWeight: 400, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: C.textSecondary, marginBottom: '0.75rem',
  display: 'block', fontFamily: '"DM Sans", system-ui, sans-serif',
};

const fieldWrap = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem',
};

const fieldLabel = {
  fontSize: '0.6rem', color: C.textSecondary, textTransform: 'uppercase',
  letterSpacing: '0.5px', fontWeight: 300,
};
