import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  generateAdvancedRoutine,
  getAlternativeExercises,
  getBlendConfig,
} from '../utils/routineGenerator';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { C, FONTS, card, btnPrimary, inputBase, labelBase, tagBase } from '../theme';
import ExerciseInfoModal from '../components/ExerciseInfoModal';
import { Info } from 'lucide-react';

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

// Quick-select combos that expand to base muscle groups at generation time
const MUSCLE_COMBOS = [
  { value: 'upper',  label: 'Upper Body', expands: ['chest', 'back', 'shoulders', 'arms'] },
  { value: 'lower',  label: 'Lower Body', expands: ['legs'] },
  { value: 'push',   label: 'Push',       expands: ['chest', 'shoulders'] },
  { value: 'pull',   label: 'Pull',       expands: ['back', 'arms'] },
  { value: 'sharms', label: 'Sho + Arms', expands: ['shoulders', 'arms'] },
];

function expandMuscleGroups(groups) {
  const comboMap = MUSCLE_COMBOS.reduce((acc, c) => ({ ...acc, [c.value]: c.expands }), {});
  return [...new Set(groups.flatMap((m) => comboMap[m] ?? [m]))];
}

const TIME_LIMITS = [
  { value: 'no-limit', label: 'No limit' },
  { value: '30',       label: '30 min' },
  { value: '45',       label: '45 min' },
  { value: '60',       label: '60 min' },
  { value: '75',       label: '75 min' },
  { value: '90',       label: '90 min' },
];

const PHASE_COLORS = {
  warmup:      { border: '#d97706', bg: '#fffbeb', text: '#d97706' },
  primary:     { border: '#C2622A', bg: '#F5EDE6', text: '#C2622A' },
  secondary:   { border: '#2563eb', bg: '#eff6ff', text: '#2563eb' },
  accessory:   { border: '#16a34a', bg: '#f0fdf4', text: '#16a34a' },
  intensifier: { border: '#9333ea', bg: '#faf5ff', text: '#9333ea' },
  core:        { border: '#6b7280', bg: '#f9fafb', text: '#6b7280' },
};

const PHASE_SHORT_LABELS = {
  primary:     'Primary',
  secondary:   'Secondary',
  accessory:   'Accessory',
  intensifier: 'Intensifier',
  core:        'Core',
};

const SET_STRUCTURE_LABELS = {
  pyramid:   'PYRAMID',
  superset:  'SUPERSET',
  drop:      'DROP SET',
  straight:  'STRAIGHT',
};

const RPE_DESCRIPTIONS = {
  6:   'Light effort — could do 4+ more reps. Warm-up / technique work.',
  6.5: 'Moderate — could do 3-4 more reps. Sustainable for high reps.',
  7:   'Moderate-hard — could do 3 more reps. Solid working weight.',
  7.5: 'Hard — could do 2-3 more reps. Strong training stimulus.',
  8:   'Hard — could do 2 more reps. Good strength/hypertrophy range.',
  8.5: 'Very hard — could do 1-2 more reps. Near-maximal intensity.',
  9:   'Near-max — 1 rep in reserve. Limit sessions at this level.',
  9.5: 'Maximal — 1 rep left. Full recovery required before repeating.',
  10:  'True max — all-out effort. Use drop sets / finishers only.',
};

const accent = C.accent;

const difficultyBadge = {
  beginner:     { bg: '#EDF2EE', text: '#4A7C59' },
  intermediate: { bg: '#F2EFE8', text: '#7A6040' },
  advanced:     { bg: '#F2ECEC', text: '#8B4040' },
};

function isEdited(ex) {
  if (!ex._defaults) return false;
  return (
    String(ex.sets) !== String(ex._defaults.sets) ||
    ex.reps !== ex._defaults.reps ||
    ex.rest !== ex._defaults.rest
  );
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
  const { user, profile } = useAuth();
  const { state: navState } = useLocation();
  const [goals, setGoals] = useState(navState?.goals ?? ['hypertrophy']);
  const [equipment, setEquipment] = useState(['barbell', 'dumbbells']);
  const [muscleGroups, setMuscleGroups] = useState(navState?.muscleGroups ?? ['chest', 'back', 'legs', 'shoulders']);
  const [routine, setRoutine] = useState(null);
  const [error, setError] = useState('');
  const [sharePublic, setSharePublic] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [replaceModal, setReplaceModal] = useState(null);
  const [timeLimit, setTimeLimit] = useState('no-limit');
  const [showWhyPanel, setShowWhyPanel] = useState(false);
  const [openRPE, setOpenRPE] = useState(null);
  const [infoExercise, setInfoExercise] = useState(null);

  // Recovery state
  const [recoveryState, setRecoveryState] = useState(null);
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  function toggleGoal(val) {
    setGoals((prev) => prev.includes(val) ? prev.filter((g) => g !== val) : [...prev, val]);
  }
  function toggleEquipment(val) {
    setEquipment((prev) => prev.includes(val) ? prev.filter((e) => e !== val) : [...prev, val]);
  }
  function toggleMuscle(val) {
    setMuscleGroups((prev) => prev.includes(val) ? prev.filter((m) => m !== val) : [...prev, val]);
    setRecoveryState((prev) => prev ? { ...prev, conflictMuscles: [] } : null);
  }

  async function loadRecovery() {
    if (!user) return null;
    setRecoveryLoading(true);
    try {
      const { data } = await supabase
        .from('routines')
        .select('exercises, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      const now = Date.now();
      const musclesInRecovery = new Set();
      const excludedExerciseIds = new Set();

      (data || []).forEach((row) => {
        const hoursAgo = (now - new Date(row.created_at)) / 3600000;
        (row.exercises || []).forEach((ex) => {
          if (hoursAgo < 48) musclesInRecovery.add(ex.muscleGroup);
          if (hoursAgo < 72) excludedExerciseIds.add(String(ex.id));
        });
      });

      const result = {
        musclesInRecovery: [...musclesInRecovery],
        excludedExerciseIds: [...excludedExerciseIds],
        conflictMuscles: [],
      };
      setRecoveryState(result);
      return result;
    } finally {
      setRecoveryLoading(false);
    }
  }

  async function handleGenerate(override = false) {
    if (goals.length === 0) return setError('Select at least one training goal.');
    if (goals.length === 1 && goals[0] === 'mobility') {
      return setError('Add a training goal alongside Mobility (e.g. Strength, Hypertrophy).');
    }
    if (equipment.length === 0) return setError('Select at least one equipment type.');
    if (muscleGroups.length === 0) return setError('Select at least one muscle group.');
    setError('');
    setSaveSuccess(false);
    setShowWhyPanel(false);
    setOpenRPE(null);

    let recovery = recoveryState;
    if (!recovery && user) {
      recovery = await loadRecovery();
    }

    const expandedMuscles = expandMuscleGroups(muscleGroups);

    const conflictMuscles = !override && recovery
      ? (recovery.musclesInRecovery || []).filter((m) => expandedMuscles.includes(m))
      : [];

    if (conflictMuscles.length > 0) {
      setRecoveryState((prev) => ({ ...(prev || {}), conflictMuscles }));
      return;
    }

    if (recovery) {
      setRecoveryState((prev) => ({ ...(prev || {}), conflictMuscles: [] }));
    }

    const excludedIds = override ? [] : (recovery?.excludedExerciseIds || []);
    const philosophy = profile?.training_philosophy || 'general_fitness';
    const durationLimit = timeLimit !== 'no-limit' ? parseInt(timeLimit) : null;

    const result = generateAdvancedRoutine({
      goals,
      equipment,
      muscleGroups: expandedMuscles,
      philosophy,
      durationLimit,
      excludedExerciseIds: excludedIds,
    });

    const taggedExercises = result.exercises.map((ex, idx) => ({
      ...ex,
      _flatIdx: idx,
      _defaults: { sets: ex.sets, reps: ex.reps, rest: ex.rest },
    }));

    setRoutine({ ...result, exercises: taggedExercises });

    setTimeout(() => {
      document.getElementById('routine-output')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  function updateExerciseField(flatIdx, field, value) {
    setRoutine((prev) => {
      const updated = prev.exercises.map((ex) =>
        ex._flatIdx === flatIdx ? { ...ex, [field]: value } : ex
      );
      return { ...prev, exercises: updated };
    });
  }

  function handleOpenReplace(flatIdx) {
    const ex = routine.exercises.find((e) => e._flatIdx === flatIdx);
    const excludeIds = routine.exercises.map((e) => e.id);
    const alternatives = getAlternativeExercises({ exercise: ex, equipment, excludeIds, goals });
    setReplaceModal({ flatIdx, alternatives, exerciseName: ex.name });
  }

  function handleSelectReplacement(alternative) {
    const { flatIdx } = replaceModal;
    setRoutine((prev) => {
      const updated = prev.exercises.map((ex) => {
        if (ex._flatIdx !== flatIdx) return ex;
        return {
          ...alternative,
          phaseId: ex.phaseId,
          _flatIdx: ex._flatIdx,
          supersetGroup: ex.supersetGroup ?? null,
          supersetLabel: ex.supersetLabel ?? null,
          _defaults: { sets: alternative.sets, reps: alternative.reps, rest: alternative.rest },
        };
      });
      return { ...prev, exercises: updated };
    });
    setReplaceModal(null);
  }

  async function handleSave() {
    if (!routine) return;
    const cleanExercises = routine.exercises.map(({ _defaults, _flatIdx, warmupSets, ...ex }) => ex);

    const saved = (() => {
      try { return JSON.parse(localStorage.getItem('kratos-saved-routines') || '[]'); }
      catch { return []; }
    })();
    const entry = { id: Date.now(), goal: routine.blendLabel, savedAt: new Date().toISOString(), exercises: cleanExercises };
    localStorage.setItem('kratos-saved-routines', JSON.stringify([entry, ...saved]));

    if (user) {
      const { data: dbData, error: dbErr } = await supabase.from('routines').insert({
        user_id: user.id,
        title: `${routine.blendLabel} Routine`,
        exercises: cleanExercises,
        is_public: sharePublic || false,
      }).select('id').single();
      if (dbErr) {
        console.error('Failed to save to Supabase:', dbErr);
      } else if (dbData) {
        try {
          const stored = JSON.parse(localStorage.getItem('kratos-saved-routines') || '[]');
          const idx = stored.findIndex((r) => r.id === entry.id);
          if (idx >= 0) {
            stored[idx].supabaseId = dbData.id;
            stored[idx].isPublic = sharePublic;
            localStorage.setItem('kratos-saved-routines', JSON.stringify(stored));
          }
        } catch {}
      }
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  }

  // ── Exercise Card ─────────────────────────────────────────────────────
  function renderExerciseCard(ex, flat = false) {
    const flatIdx = ex._flatIdx;
    const phaseColor = PHASE_COLORS[ex.phaseId] || PHASE_COLORS.accessory;
    const diff = ex.difficulty ? difficultyBadge[ex.difficulty] : difficultyBadge.beginner;
    const edited = isEdited(ex);
    const rpeOpen = openRPE === flatIdx;
    const isDropSet = ex.setStructure === 'drop';
    const structureLabel = SET_STRUCTURE_LABELS[ex.setStructure] || '';
    const displayName = ex.supersetLabel ? `${ex.supersetLabel} · ${ex.name}` : ex.name;

    return (
      <div
        key={`${ex.id}-${flatIdx}`}
        style={{
          backgroundColor: C.surface,
          border: flat ? 'none' : `1px solid ${C.border}`,
          borderLeft: `4px solid ${phaseColor.border}`,
          borderRadius: flat ? 0 : '10px',
          padding: '1rem 1.25rem',
          boxShadow: flat ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        {/* Top row: badges + action buttons */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Phase badge row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.62rem', fontWeight: 500, color: phaseColor.text,
                backgroundColor: phaseColor.bg,
                border: `1px solid ${phaseColor.border}30`,
                borderRadius: '20px', padding: '1px 7px',
                textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                {PHASE_SHORT_LABELS[ex.phaseId] || ex.phaseId}
              </span>
              {structureLabel && (
                <span style={{
                  fontSize: '0.6rem', fontWeight: 500, color: phaseColor.text,
                  border: `1px solid ${phaseColor.border}50`,
                  borderRadius: '4px', padding: '1px 6px',
                  letterSpacing: '0.5px',
                }}>
                  {structureLabel}
                </span>
              )}
              {edited && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.62rem', fontWeight: 400, color: accent, backgroundColor: C.accentMuted, border: `1px solid ${accent}`, borderRadius: '20px', padding: '1px 7px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: accent, display: 'inline-block' }} />
                  edited
                </span>
              )}
            </div>
            <div style={{ fontWeight: 400, color: C.text, fontSize: '1rem', marginBottom: '0.4rem' }}>{displayName}</div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={tagBase}>{ex.equipment}</span>
              <span style={tagBase}>{ex.muscleGroup}</span>
              {ex.difficulty && <span style={{ ...tagBase, backgroundColor: diff.bg, borderColor: diff.bg, color: diff.text }}>{ex.difficulty}</span>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            {/* Info button */}
            <button
              onClick={() => setInfoExercise(ex.name)}
              title="Exercise guide"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '6px', border: `1px solid ${C.border}`, backgroundColor: C.bg, color: C.textSecondary, cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0 }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; e.currentTarget.style.backgroundColor = C.accentMuted; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSecondary; e.currentTarget.style.backgroundColor = C.bg; }}
            >
              <Info size={14} strokeWidth={1.75} />
            </button>
            {/* RPE button */}
            {ex.targetRPE != null && (
              <button
                onClick={() => setOpenRPE(rpeOpen ? null : flatIdx)}
                title="RPE & movement cue"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '6px',
                  border: `1px solid ${rpeOpen ? phaseColor.border : C.border}`,
                  backgroundColor: rpeOpen ? phaseColor.bg : C.bg,
                  color: rpeOpen ? phaseColor.text : C.textSecondary,
                  fontSize: '0.72rem', fontWeight: rpeOpen ? 500 : 300, cursor: 'pointer',
                  transition: 'all 0.15s', flexShrink: 0, gap: '0.2rem',
                  whiteSpace: 'nowrap',
                }}
              >
                RPE {ex.targetRPE} ⓘ
              </button>
            )}
            {/* Replace button */}
            {!isDropSet && (
              <button
                onClick={() => handleOpenReplace(flatIdx)}
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
        </div>

        {/* Warm-up sets (Phase 2 only) */}
        {ex.warmupSets && ex.warmupSets.length > 0 && (
          <div style={{
            marginBottom: '0.75rem',
            padding: '0.6rem 0.875rem',
            backgroundColor: C.bg,
            borderRadius: '6px',
            border: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 500, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem' }}>
              Warm-up Sets (build to working weight)
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {ex.warmupSets.map((ws, i) => (
                <span key={i} style={{ fontSize: '0.75rem', color: C.textSecondary, fontWeight: 300 }}>
                  {ws.pct}% × {ws.reps}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Drop set note (Phase 5 only) */}
        {isDropSet && ex.dropSetNote && (
          <div style={{
            marginBottom: '0.75rem',
            padding: '0.5rem 0.875rem',
            backgroundColor: '#faf5ff',
            borderRadius: '6px',
            border: '1px solid #9333ea30',
            fontSize: '0.78rem', color: '#9333ea', fontWeight: 300, fontStyle: 'italic',
          }}>
            {ex.dropSetNote}
          </div>
        )}

        {/* Editable sets / reps / rest */}
        <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.75rem', borderTop: `1px solid ${C.border}` }}>
          <div style={fieldWrap}>
            <EditableField type="number" value={ex.sets} onChange={(v) => updateExerciseField(flatIdx, 'sets', v)} color={phaseColor.text} fontSize="1.15rem" />
            <div style={fieldLabel}>sets</div>
          </div>
          <div style={{ color: C.border, alignSelf: 'center', marginBottom: '0.85rem' }}>×</div>
          <div style={fieldWrap}>
            <EditableField value={ex.reps} onChange={(v) => updateExerciseField(flatIdx, 'reps', v)} width="64px" fontSize="1rem" />
            <div style={fieldLabel}>reps</div>
          </div>
          <div style={{ color: C.border, alignSelf: 'center', marginBottom: '0.85rem', fontSize: '0.75rem' }}>·</div>
          <div style={fieldWrap}>
            <EditableField value={ex.rest} onChange={(v) => updateExerciseField(flatIdx, 'rest', v)} width="56px" fontSize="0.9rem" color={C.textSecondary} fontWeight={300} />
            <div style={fieldLabel}>rest</div>
          </div>
          <div style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: '0.7rem', color: C.border, marginBottom: '0.85rem' }}>
            click to edit
          </div>
        </div>

        {/* RPE inline panel */}
        {rpeOpen && ex.targetRPE != null && (
          <div style={{
            marginTop: '0.75rem',
            padding: '0.85rem 1rem',
            backgroundColor: phaseColor.bg,
            borderRadius: '8px',
            border: `1px solid ${phaseColor.border}30`,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 500, color: phaseColor.text }}>RPE {ex.targetRPE}</span>
              <span style={{ fontSize: '0.72rem', color: C.textSecondary, fontWeight: 300 }}>
                {RPE_DESCRIPTIONS[ex.targetRPE] || 'Leave appropriate reps in reserve.'}
              </span>
            </div>
            {ex.movementCue && (
              <div style={{ fontSize: '0.72rem', color: C.textSecondary, fontWeight: 300, lineHeight: 1.5, borderTop: `1px solid ${C.border}`, paddingTop: '0.4rem', marginTop: '0.1rem' }}>
                <span style={{ fontWeight: 400, color: C.text }}>Cue: </span>{ex.movementCue}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Phase group renderer ──────────────────────────────────────────────
  function renderPhaseGroup(phaseId, phaseExercises) {
    const phaseMeta = routine.phases.find((p) => p.phaseId === phaseId);
    const phaseColor = PHASE_COLORS[phaseId] || PHASE_COLORS.accessory;
    if (!phaseMeta || phaseExercises.length === 0) return null;

    // Group into superset pairs or individual exercises
    const groups = [];
    let i = 0;
    while (i < phaseExercises.length) {
      const ex = phaseExercises[i];
      if (ex.supersetGroup) {
        const label = ex.supersetGroup;
        const items = [];
        while (i < phaseExercises.length && phaseExercises[i].supersetGroup === label) {
          items.push(phaseExercises[i++]);
        }
        groups.push({ type: 'superset', label, items });
      } else {
        groups.push({ type: 'single', exercise: ex });
        i++;
      }
    }

    return (
      <div key={phaseId} style={{ marginBottom: '1.5rem' }}>
        {/* Phase header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.65rem 1rem',
          backgroundColor: phaseColor.bg,
          border: `1px solid ${phaseColor.border}30`,
          borderLeft: `3px solid ${phaseColor.border}`,
          borderRadius: '8px',
          marginBottom: '0.75rem',
          flexWrap: 'wrap', gap: '0.5rem',
        }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: '0.8rem', color: phaseColor.text, letterSpacing: '0.3px' }}>
              {phaseMeta.phaseLabel}
            </div>
            <div style={{ fontSize: '0.72rem', color: C.textSecondary, fontWeight: 300, marginTop: '0.1rem' }}>
              {phaseMeta.description}
            </div>
          </div>
          <span style={{
            fontSize: '0.72rem', fontWeight: 400, color: phaseColor.text,
            backgroundColor: `${phaseColor.border}15`,
            border: `1px solid ${phaseColor.border}30`,
            borderRadius: '20px', padding: '2px 10px', whiteSpace: 'nowrap',
          }}>
            ~{phaseMeta.estimatedMin} min
          </span>
        </div>

        {/* Exercises in this phase */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {groups.map((group, gi) => {
            if (group.type === 'single') {
              return renderExerciseCard(group.exercise);
            }
            return (
              <div
                key={`superset-${group.label}-${gi}`}
                style={{ border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden' }}
              >
                <div style={{ backgroundColor: C.bg, padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: `1px solid ${C.border}` }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={phaseColor.border} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
                  </svg>
                  <span style={{ fontWeight: 400, fontSize: '0.75rem', color: phaseColor.text, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                    Superset {group.label}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: C.textSecondary, fontWeight: 300 }}>· perform back-to-back with minimal rest</span>
                </div>
                <div style={{ backgroundColor: C.surface }}>
                  {group.items.map((item, itemIdx) => (
                    <div key={`${item.id}-${item._flatIdx}`}>
                      {itemIdx > 0 && <div style={{ borderTop: `1px dashed ${C.border}`, margin: '0 1.25rem' }} />}
                      {renderExerciseCard(item, true)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const conflictMuscles = recoveryState?.conflictMuscles || [];

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
      {infoExercise && (
        <ExerciseInfoModal exerciseName={infoExercise} onClose={() => setInfoExercise(null)} />
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

          {/* Training Goals */}
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.5rem' }}>
              {MUSCLES.map((m) => {
                const active = muscleGroups.includes(m.value);
                return (
                  <button key={m.value} onClick={() => toggleMuscle(m.value)} style={{ padding: '0.45rem 1rem', borderRadius: '20px', border: `1px solid ${active ? accent : C.border}`, backgroundColor: active ? C.accentMuted : C.bg, color: active ? accent : C.textSecondary, fontWeight: active ? 400 : 300, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                    {m.label}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: '0.6rem', fontWeight: 400, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0.5rem 0 0.4rem' }}>
              Quick select
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {MUSCLE_COMBOS.map((combo) => {
                const isActive = combo.expands.length > 0 && combo.expands.every((m) => muscleGroups.includes(m)) && muscleGroups.length === combo.expands.length;
                return (
                  <button
                    key={combo.value}
                    onClick={() => setMuscleGroups(combo.expands)}
                    style={{
                      padding: '0.35rem 0.85rem',
                      borderRadius: '20px',
                      border: `1px solid ${isActive ? accent : C.border}`,
                      backgroundColor: isActive ? C.accentMuted : C.bg,
                      color: isActive ? accent : C.textSecondary,
                      fontWeight: isActive ? 400 : 300,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {combo.label}
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
                    style={{ padding: '0.45rem 1rem', borderRadius: '20px', border: `1px solid ${active ? accent : C.border}`, backgroundColor: active ? C.accentMuted : C.bg, color: active ? accent : C.textSecondary, fontWeight: active ? 400 : 300, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s' }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Training philosophy note */}
          {profile?.training_philosophy && (
            <div style={{
              marginBottom: '1rem',
              padding: '0.6rem 0.875rem',
              backgroundColor: C.accentMuted,
              borderRadius: '8px',
              border: `1px solid ${accent}30`,
              fontSize: '0.78rem', color: accent, fontWeight: 300,
            }}>
              Philosophy: <span style={{ fontWeight: 400, textTransform: 'capitalize' }}>
                {profile.training_philosophy.replace('_', ' ')}
              </span> · change in <a href="/settings" style={{ color: accent }}>Settings</a>
            </div>
          )}

          {error && <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem', fontWeight: 300 }}>{error}</p>}

          {/* Recovery warning */}
          {conflictMuscles.length > 0 && (
            <div style={{
              marginBottom: '1rem',
              padding: '0.875rem 1rem',
              backgroundColor: '#fef9ee',
              borderRadius: '8px',
              border: '1px solid #d97706',
              display: 'flex', flexDirection: 'column', gap: '0.5rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 400, fontSize: '0.85rem', color: '#92400e', marginBottom: '0.15rem' }}>
                    Recovery Warning
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#92400e', fontWeight: 300, lineHeight: 1.5 }}>
                    <strong>{conflictMuscles.join(', ')}</strong> {conflictMuscles.length === 1 ? 'was' : 'were'} trained within the last 48 hours.
                    Recommend resting these muscles or choosing different groups.
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleGenerate(true)}
                  disabled={recoveryLoading}
                  style={{
                    padding: '0.45rem 1rem', borderRadius: '6px',
                    border: '1px solid #d97706', backgroundColor: '#d97706',
                    color: '#fff', fontWeight: 400, fontSize: '0.8rem', cursor: 'pointer',
                  }}
                >
                  Generate Anyway
                </button>
                <button
                  onClick={() => setRecoveryState((prev) => ({ ...prev, conflictMuscles: [] }))}
                  style={{
                    padding: '0.45rem 1rem', borderRadius: '6px',
                    border: '1px solid #d97706', backgroundColor: 'transparent',
                    color: '#92400e', fontWeight: 300, fontSize: '0.8rem', cursor: 'pointer',
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => handleGenerate(false)}
            disabled={recoveryLoading}
            style={{
              ...btnPrimary,
              width: '100%',
              padding: '0.875rem',
              fontSize: '1rem',
              opacity: recoveryLoading ? 0.7 : 1,
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = C.accentHover)}
            onMouseOut={(e) => (e.target.style.backgroundColor = accent)}
          >
            {recoveryLoading ? 'Checking recovery…' : 'Generate Routine'}
          </button>
        </div>

        {/* ── Routine Output ── */}
        {routine && (
          <div id="routine-output">
            {/* Header */}
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
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

            {/* "Why this routine?" collapsible panel */}
            <div style={{ marginBottom: '1rem' }}>
              <button
                onClick={() => setShowWhyPanel((v) => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  border: `1px solid ${showWhyPanel ? accent : C.border}`,
                  backgroundColor: showWhyPanel ? C.accentMuted : C.bg,
                  color: showWhyPanel ? accent : C.textSecondary,
                  fontSize: '0.8rem', fontWeight: showWhyPanel ? 400 : 300,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseOver={(e) => { if (!showWhyPanel) { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; e.currentTarget.style.backgroundColor = C.accentMuted; } }}
                onMouseOut={(e) => { if (!showWhyPanel) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSecondary; e.currentTarget.style.backgroundColor = C.bg; } }}
              >
                <span style={{ fontSize: '0.85rem' }}>ⓘ</span>
                Why this routine?
                <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{showWhyPanel ? '▲' : '▼'}</span>
              </button>
              {showWhyPanel && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '1rem 1.1rem',
                  backgroundColor: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  color: C.textSecondary,
                  fontWeight: 300,
                  lineHeight: 1.65,
                }}>
                  {routine.explanation}
                </div>
              )}
            </div>

            {/* Time estimate + set reduction note */}
            {routine.totalEstimatedMin > 0 && (
              <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 400, fontSize: '0.95rem', color: accent }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  ~{routine.totalEstimatedMin} min total
                </div>
                {routine.setReductionNote && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.35rem 0.75rem',
                    backgroundColor: C.accentMuted,
                    border: `1px solid ${accent}40`,
                    borderRadius: '6px',
                    fontSize: '0.75rem', color: accent, fontWeight: 300,
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {routine.setReductionNote}
                  </div>
                )}
              </div>
            )}

            {/* Phase-based exercise list */}
            {routine.phases.map((phase) => {
              const phaseExercises = routine.exercises.filter((ex) => ex.phaseId === phase.phaseId);
              return renderPhaseGroup(phase.phaseId, phaseExercises);
            })}

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
                onClick={() => handleGenerate(false)}
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
