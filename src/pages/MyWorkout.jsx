// Required Supabase SQL (run manually):
// ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS superset_group text;
// ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS distance_meters numeric;
// ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS calories integer;

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight } from 'lucide-react';
import { C, FONTS, card } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useActiveWorkout } from '../context/ActiveWorkoutContext';
import { supabase } from '../supabase';
import { exercises as ALL_EXERCISES } from '../data/exercises';
import RoutineGenerator from './RoutineGenerator';
import KratosSplitViewer from '../components/KratosSplitViewer';

const TERRA = '#C2622A';
const SAGE  = '#6B8F71';

// ── Tracking type helpers ──────────────────────────────────────────────
const TIME_EX_IDS     = new Set([36, 114, 130, 163, 167, 169, 170]);
const WEIGHTED_BW_IDS = new Set([10, 31, 93, 107, 108]);

function getTrackingType(ex) {
  if (!ex) return 'reps';
  // Explicit trackingType on exercise takes priority (handles cardio types + bodyweight variants)
  const explicit = ex.trackingType;
  if (explicit && explicit !== 'reps') return explicit;
  // Legacy ID-based detection
  if (ex.id && TIME_EX_IDS.has(ex.id))     return 'time';
  if (ex.id && WEIGHTED_BW_IDS.has(ex.id)) return 'weighted_bodyweight';
  if (ex.equipment === 'bodyweight')         return 'bodyweight';
  return 'reps';
}

function formatElapsed(seconds) {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getDefaultTitle() {
  const now = new Date();
  const month = now.toLocaleString('default', { month: 'short' });
  const day = now.getDate();
  return `${month} ${day} · Workout`;
}

const MUSCLE_GROUPS = ['All', 'chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'cardio'];

// Day type → eligible muscle groups for exercise swaps
const SWAP_MUSCLE_GROUPS = {
  push:    ['chest', 'shoulders', 'arms'],
  pull:    ['back', 'arms', 'shoulders'],
  legs:    ['legs'],
  recover: ['cardio'],
};

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

// Build ordered session map (non-rest sessions only)
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

// ── Superset helpers ───────────────────────────────────────────────────
function groupItems(items) {
  const groups = [];
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.uid)) continue;
    if (item.supersetGroup) {
      const paired = items.filter(x => x.supersetGroup === item.supersetGroup);
      paired.forEach(x => seen.add(x.uid));
      groups.push({ type: 'superset', group: item.supersetGroup, items: paired });
    } else {
      seen.add(item.uid);
      groups.push({ type: 'single', item });
    }
  }
  return groups;
}

function nextSupersetGroup(items) {
  const used = new Set(items.filter(i => i.supersetGroup).map(i => i.supersetGroup));
  for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    if (!used.has(c)) return c;
  }
  return 'A';
}

// ── WorkoutHeader ──────────────────────────────────────────────────────
function WorkoutHeader({ title, setTitle, startTime, onFinish }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(Math.floor((Date.now() - startTime) / 1000));
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  return (
    <div style={{
      padding: '0.875rem 1.25rem',
      borderBottom: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      backgroundColor: C.surface, flexShrink: 0,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            fontSize: '1.05rem', fontWeight: 500, color: C.text,
            background: 'none', border: 'none', outline: 'none',
            fontFamily: FONTS.heading, width: '100%', padding: 0,
          }}
        />
        <div style={{ fontSize: '0.7rem', color: C.textSecondary, fontWeight: 300, marginTop: '0.1rem' }}>
          {formatElapsed(elapsed)} elapsed
        </div>
      </div>
      <button
        onClick={onFinish}
        style={{
          padding: '0.5rem 0.875rem', borderRadius: '8px', border: 'none',
          backgroundColor: TERRA, color: '#fff',
          fontWeight: 400, fontSize: '0.8rem', cursor: 'pointer',
          fontFamily: FONTS.body, flexShrink: 0, whiteSpace: 'nowrap',
        }}
      >
        Finish Workout
      </button>
    </div>
  );
}

// ── OneAtATimeLogger ───────────────────────────────────────────────────
function OneAtATimeLogger({ tt, targetSets, savedSets, activeSets, suggestion, saving, onCompleteSet, onDeleteSet }) {
  const isDone     = activeSets >= targetSets;
  const currentSet = activeSets + 1;

  const [weight,   setWeight]   = useState(() => suggestion?.suggestWeight ? String(suggestion.suggestWeight) : '');
  const [reps,     setReps]     = useState('');
  const [duration, setDuration] = useState('');
  const [rpe,      setRpe]      = useState('');
  const [distance, setDistance] = useState('');
  const [calories, setCalories] = useState('');
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (suggestion?.suggestWeight && !weight) setWeight(String(suggestion.suggestWeight));
  }, [suggestion]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasValues =
    tt === 'time'                ? duration.trim() !== ''
    : tt === 'bodyweight'        ? reps.trim() !== ''
    : tt === 'cardio_time'       ? duration.trim() !== ''
    : tt === 'cardio_distance'   ? distance.trim() !== ''
    : tt === 'cardio_distance_time' ? (distance.trim() !== '' || duration.trim() !== '')
    : tt === 'cardio_time_calories' ? (duration.trim() !== '' || calories.trim() !== '')
    : tt === 'cardio_time_reps'  ? (duration.trim() !== '' || reps.trim() !== '')
    : reps.trim() !== '';

  async function handleComplete() {
    if (saving) return;
    if (!hasValues) { setError('Enter at least one value to log this set.'); return; }
    setError('');
    const ok = await onCompleteSet(activeSets, { weight, reps, duration, rpe, distance, calories });
    if (ok === false) {
      setError('Save failed — check your connection.');
    } else {
      setReps(''); setDuration(''); setRpe(''); setDistance(''); setCalories('');
    }
  }

  const inputStyle = {
    width: '100%', padding: '0.5rem', borderRadius: '8px',
    border: `1.5px solid ${C.border}`, backgroundColor: C.surface,
    color: C.text, fontSize: '1rem', fontWeight: 400,
    fontFamily: FONTS.body, boxSizing: 'border-box', outline: 'none',
  };

  const fields =
    tt === 'time'
      ? [{ label: 'Duration (sec)', val: duration, set: setDuration, ph: '45',  mode: 'numeric' },
         { label: 'RPE',            val: rpe,      set: setRpe,      ph: '7',   mode: 'decimal' }]
    : tt === 'bodyweight'
      ? [{ label: 'Reps',           val: reps,  set: setReps, ph: '12', mode: 'numeric' },
         { label: 'RPE',            val: rpe,   set: setRpe,  ph: '7',  mode: 'decimal' }]
    : tt === 'weighted_bodyweight'
      ? [{ label: 'Added wt (lbs)', val: weight,   set: setWeight,   ph: '0',  mode: 'decimal' },
         { label: 'Reps',           val: reps,     set: setReps,     ph: '8',  mode: 'numeric' },
         { label: 'RPE',            val: rpe,      set: setRpe,      ph: '7',  mode: 'decimal' }]
    : tt === 'cardio_time'
      ? [{ label: 'Duration (sec)', val: duration, set: setDuration, ph: '30', mode: 'numeric' }]
    : tt === 'cardio_distance'
      ? [{ label: 'Distance (m)', val: distance, set: setDistance, ph: '400', mode: 'numeric' }]
    : tt === 'cardio_distance_time'
      ? [{ label: 'Distance (m)',   val: distance, set: setDistance, ph: '400', mode: 'numeric' },
         { label: 'Duration (sec)', val: duration, set: setDuration, ph: '90',  mode: 'numeric' }]
    : tt === 'cardio_time_calories'
      ? [{ label: 'Duration (sec)', val: duration, set: setDuration, ph: '60', mode: 'numeric' },
         { label: 'Calories',       val: calories, set: setCalories, ph: '15', mode: 'numeric' }]
    : tt === 'cardio_time_reps'
      ? [{ label: 'Duration (sec)', val: duration, set: setDuration, ph: '60', mode: 'numeric' },
         { label: 'Reps',           val: reps,     set: setReps,     ph: '50', mode: 'numeric' }]
    : /* reps default */
      [{ label: 'Weight (lbs)',   val: weight, set: setWeight, ph: '135', mode: 'decimal' },
       { label: 'Reps',           val: reps,   set: setReps,   ph: '8',   mode: 'numeric' },
       { label: 'RPE',            val: rpe,    set: setRpe,    ph: '7',   mode: 'decimal' }];

  function formatSavedSet(s) {
    if (tt === 'time')               return `${s.duration_seconds ?? '—'}s${s.rpe_actual ? ` — RPE ${s.rpe_actual}` : ''}`;
    if (tt === 'bodyweight')         return `× ${s.reps_completed ?? '—'} reps${s.rpe_actual ? ` — RPE ${s.rpe_actual}` : ''}`;
    if (tt === 'weighted_bodyweight') return `+${s.weight_lbs ?? 0} lbs × ${s.reps_completed ?? '—'}${s.rpe_actual ? ` — RPE ${s.rpe_actual}` : ''}`;
    if (tt === 'cardio_time')        return `${s.duration_seconds ?? '—'}s`;
    if (tt === 'cardio_distance')    return `${s.distance_meters ?? '—'}m`;
    if (tt === 'cardio_distance_time') return `${s.distance_meters ?? '—'}m in ${s.duration_seconds ?? '—'}s`;
    if (tt === 'cardio_time_calories') return `${s.duration_seconds ?? '—'}s · ${s.calories ?? '—'} cal`;
    if (tt === 'cardio_time_reps')   return `${s.duration_seconds ?? '—'}s / ×${s.reps_completed ?? '—'}`;
    return `${s.weight_lbs ?? '—'} lbs × ${s.reps_completed ?? '—'}${s.rpe_actual ? ` — RPE ${s.rpe_actual}` : ''}`;
  }

  return (
    <div>
      {savedSets.length > 0 && (
        <div style={{ marginBottom: '0.5rem' }}>
          {savedSets.map((s, i) => (
            <div key={i} style={{ fontSize: '0.72rem', color: C.textSecondary, fontWeight: 300, padding: '0.15rem 0', borderBottom: `1px dashed ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                <span style={{ color: TERRA, fontWeight: 500, marginRight: '0.35rem' }}>Set {s.set_number}:</span>
                {formatSavedSet(s)}
              </span>
              <button onClick={() => onDeleteSet(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSecondary, fontSize: '0.85rem', lineHeight: 1, padding: '0 0.15rem', marginLeft: '0.35rem' }}>×</button>
            </div>
          ))}
        </div>
      )}
      {isDone ? (
        <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 400, padding: '0.3rem 0' }}>
          All {targetSets} sets logged ✓
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 500, color: TERRA, backgroundColor: '#F5EDE6', padding: '0.12rem 0.45rem', borderRadius: '999px' }}>
              Set {currentSet} of {targetSets}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${fields.length}, 1fr)`, gap: '0.4rem', marginBottom: '0.5rem' }}>
            {fields.map(({ label, val, set, ph, mode }) => (
              <div key={label}>
                <label style={{ fontSize: '0.55rem', color: C.textSecondary, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.2rem' }}>
                  {label}
                </label>
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
            <div style={{ fontSize: '0.7rem', color: '#dc2626', marginBottom: '0.4rem', padding: '0.35rem 0.6rem', backgroundColor: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}
          <button
            onClick={handleComplete}
            style={{
              width: '100%', padding: '0.6rem', borderRadius: '8px', border: 'none',
              backgroundColor: saving ? '#e5e7eb' : hasValues ? TERRA : '#d1d5db',
              color: saving ? C.textSecondary : hasValues ? '#fff' : '#6b7280',
              fontWeight: 400, fontSize: '0.875rem',
              cursor: saving ? 'default' : 'pointer',
              transition: 'all 0.15s', fontFamily: FONTS.body,
            }}
          >
            {saving ? 'Saving…' : currentSet === targetSets ? 'Complete Last Set ✓' : `Complete Set ${currentSet} →`}
          </button>
        </div>
      )}
    </div>
  );
}

// ── AllAtOnceLogger ────────────────────────────────────────────────────
function AllAtOnceLogger({ tt, targetSets, savedSets, suggestion, saving, onSaveAll, onDeleteSet }) {
  const isAllSaved = savedSets.length >= targetSets;
  const [error, setError] = useState('');

  const makeRow = () => {
    if (tt === 'cardio_time')           return { duration: '' };
    if (tt === 'cardio_distance')       return { distance: '' };
    if (tt === 'cardio_distance_time')  return { distance: '', duration: '' };
    if (tt === 'cardio_time_calories')  return { duration: '', calories: '' };
    if (tt === 'cardio_time_reps')      return { duration: '', reps: '' };
    if (tt === 'time')                  return { duration: '', rpe: '' };
    if (tt === 'bodyweight')            return { reps: '', rpe: '' };
    if (tt === 'weighted_bodyweight')   return { weight: '', reps: '', rpe: '' };
    return { weight: suggestion?.suggestWeight ? String(suggestion.suggestWeight) : '', reps: '', rpe: '' };
  };

  const [rows, setRows] = useState(() => Array.from({ length: targetSets }, makeRow));

  // Sync rows length when targetSets changes
  useEffect(() => {
    setRows((prev) => {
      if (prev.length === targetSets) return prev;
      if (prev.length < targetSets) {
        return [...prev, ...Array.from({ length: targetSets - prev.length }, makeRow)];
      }
      return prev.slice(0, targetSets);
    });
  }, [targetSets]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (suggestion?.suggestWeight && tt === 'reps') {
      setRows((prev) => prev.map((r) => ({ ...r, weight: r.weight || String(suggestion.suggestWeight) })));
    }
  }, [suggestion]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateRow(i, field, val) {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
    setError('');
  }

  const hasAnyValue = rows.some(r => {
    if (tt === 'cardio_time' || tt === 'time') return r.duration?.trim() !== '';
    if (tt === 'cardio_distance') return r.distance?.trim() !== '';
    if (tt === 'cardio_distance_time') return r.distance?.trim() !== '' || r.duration?.trim() !== '';
    if (tt === 'cardio_time_calories') return r.duration?.trim() !== '' || r.calories?.trim() !== '';
    if (tt === 'cardio_time_reps') return r.duration?.trim() !== '' || r.reps?.trim() !== '';
    return r.reps?.trim() !== '';
  });

  const cols =
    tt === 'time'
      ? [{ header: 'Duration (sec)', field: 'duration', mode: 'numeric', ph: '45' },
         { header: 'RPE',            field: 'rpe',      mode: 'decimal', ph: '7'  }]
    : tt === 'bodyweight'
      ? [{ header: 'Reps', field: 'reps', mode: 'numeric', ph: '12' },
         { header: 'RPE',  field: 'rpe',  mode: 'decimal', ph: '7'  }]
    : tt === 'weighted_bodyweight'
      ? [{ header: 'Added wt (lbs)', field: 'weight', mode: 'decimal', ph: '0' },
         { header: 'Reps',           field: 'reps',   mode: 'numeric', ph: '8' },
         { header: 'RPE',            field: 'rpe',    mode: 'decimal', ph: '7' }]
    : tt === 'cardio_time'
      ? [{ header: 'Duration (sec)', field: 'duration', mode: 'numeric', ph: '30' }]
    : tt === 'cardio_distance'
      ? [{ header: 'Distance (m)', field: 'distance', mode: 'numeric', ph: '400' }]
    : tt === 'cardio_distance_time'
      ? [{ header: 'Distance (m)',   field: 'distance', mode: 'numeric', ph: '400' },
         { header: 'Duration (sec)', field: 'duration', mode: 'numeric', ph: '90'  }]
    : tt === 'cardio_time_calories'
      ? [{ header: 'Duration (sec)', field: 'duration', mode: 'numeric', ph: '60' },
         { header: 'Calories',       field: 'calories', mode: 'numeric', ph: '15' }]
    : tt === 'cardio_time_reps'
      ? [{ header: 'Duration (sec)', field: 'duration', mode: 'numeric', ph: '60' },
         { header: 'Reps',           field: 'reps',     mode: 'numeric', ph: '50' }]
    : /* reps default */
      [{ header: 'Weight (lbs)', field: 'weight', mode: 'decimal', ph: '135' },
       { header: 'Reps',         field: 'reps',   mode: 'numeric', ph: '8'   },
       { header: 'RPE',          field: 'rpe',    mode: 'decimal', ph: '7'   }];

  const gridCols = `28px ${cols.map(() => '1fr').join(' ')}`;

  const inputStyle = {
    width: '100%', padding: '0.4rem 0.45rem', borderRadius: '6px',
    border: `1.5px solid ${C.border}`, backgroundColor: C.surface,
    color: C.text, fontSize: '1rem', fontWeight: 400,
    fontFamily: FONTS.body, boxSizing: 'border-box', outline: 'none',
  };

  function formatSavedSet(s) {
    if (tt === 'time')               return `${s.duration_seconds ?? '—'}s${s.rpe_actual ? ` — RPE ${s.rpe_actual}` : ''}`;
    if (tt === 'bodyweight')         return `× ${s.reps_completed ?? '—'} reps${s.rpe_actual ? ` — RPE ${s.rpe_actual}` : ''}`;
    if (tt === 'weighted_bodyweight') return `+${s.weight_lbs ?? 0} lbs × ${s.reps_completed ?? '—'}${s.rpe_actual ? ` — RPE ${s.rpe_actual}` : ''}`;
    if (tt === 'cardio_time')        return `${s.duration_seconds ?? '—'}s`;
    if (tt === 'cardio_distance')    return `${s.distance_meters ?? '—'}m`;
    if (tt === 'cardio_distance_time') return `${s.distance_meters ?? '—'}m in ${s.duration_seconds ?? '—'}s`;
    if (tt === 'cardio_time_calories') return `${s.duration_seconds ?? '—'}s · ${s.calories ?? '—'} cal`;
    if (tt === 'cardio_time_reps')   return `${s.duration_seconds ?? '—'}s / ×${s.reps_completed ?? '—'}`;
    return `${s.weight_lbs ?? '—'} lbs × ${s.reps_completed ?? '—'}${s.rpe_actual ? ` — RPE ${s.rpe_actual}` : ''}`;
  }

  async function handleSave() {
    if (saving) return;
    if (!hasAnyValue) {
      setError(tt === 'time' ? 'Enter at least one duration.' : 'Enter at least one value.');
      return;
    }
    setError('');
    const ok = await onSaveAll(rows);
    if (ok === false) setError('Save failed — check your connection.');
  }

  return (
    <div>
      {isAllSaved ? (
        <div>
          {savedSets.map((s, i) => (
            <div key={i} style={{ fontSize: '0.72rem', color: C.textSecondary, fontWeight: 300, padding: '0.15rem 0', borderBottom: `1px dashed ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                <span style={{ color: TERRA, fontWeight: 500, marginRight: '0.35rem' }}>Set {s.set_number}:</span>
                {formatSavedSet(s)}
              </span>
              <button onClick={() => onDeleteSet(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSecondary, fontSize: '0.85rem', lineHeight: 1, padding: '0 0.15rem', marginLeft: '0.35rem' }}>×</button>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '0.3rem', marginBottom: '0.25rem' }}>
            {['#', ...cols.map((c) => c.header)].map((h) => (
              <div key={h} style={{ fontSize: '0.55rem', color: C.textSecondary, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.5rem' }}>
            {rows.map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '0.3rem', alignItems: 'center' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 500, color: TERRA, textAlign: 'center' }}>{i + 1}</div>
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
            <div style={{ fontSize: '0.7rem', color: '#dc2626', marginBottom: '0.4rem', padding: '0.35rem 0.6rem', backgroundColor: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}
          <button
            onClick={handleSave}
            style={{
              width: '100%', padding: '0.6rem', borderRadius: '8px', border: 'none',
              backgroundColor: saving ? '#e5e7eb' : hasAnyValue ? TERRA : '#d1d5db',
              color: saving ? C.textSecondary : hasAnyValue ? '#fff' : '#6b7280',
              fontWeight: 400, fontSize: '0.875rem',
              cursor: saving ? 'default' : 'pointer',
              transition: 'all 0.15s', fontFamily: FONTS.body,
            }}
          >
            {saving ? 'Saving…' : 'Save Exercise ✓'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── ActiveExerciseCard ─────────────────────────────────────────────────
function ActiveExerciseCard({ item, onRemove, onCompleteSet, onSaveAll, onAddSet, onDeleteSet, onCreateSuperset, savingUid, onSwap, dayType, isKratosSplit }) {
  const { uid, ex, targetSets, logData, activeSets } = item;
  const tt        = getTrackingType(ex);
  const savedSets = logData.sets ?? [];
  const [logStyle, setLogStyle] = useState('one_at_a_time');
  const [suggestion, setSuggestion] = useState(null);
  const [showSupersetPanel, setShowSupersetPanel] = useState(false);
  const [showSwapPanel, setShowSwapPanel] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !ex.name) return;
    let cancelled = false;
    async function fetchSuggestion() {
      const { data } = await supabase
        .from('workout_logs')
        .select('weight_lbs, reps_completed, duration_seconds')
        .eq('user_id', user.id)
        .eq('exercise_name', ex.name)
        .order('logged_at', { ascending: false })
        .limit(2);
      if (cancelled || !data || data.length < 2) return;
      const last = data[0];
      if (tt === 'time' && last.duration_seconds) {
        setSuggestion({ type: 'time', lastDuration: last.duration_seconds, suggestDuration: last.duration_seconds + 5 });
      } else if (tt === 'bodyweight' && last.reps_completed) {
        setSuggestion({ type: 'bodyweight', lastReps: last.reps_completed, suggestReps: last.reps_completed + 2 });
      } else if (last.weight_lbs) {
        const w = parseFloat(last.weight_lbs);
        setSuggestion({ type: 'reps', lastWeight: last.weight_lbs, lastReps: last.reps_completed, suggestWeight: Math.round((w + 5) * 2) / 2 });
      }
    }
    fetchSuggestion();
    return () => { cancelled = true; };
  }, [user, ex.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const tabBase = { padding: '0.3rem 0.55rem', borderRadius: '5px', border: 'none', fontSize: '0.7rem', cursor: 'pointer', transition: 'all 0.13s', fontFamily: FONTS.body };

  return (
    <div style={{ borderRadius: '10px', border: `1px solid ${C.border}`, backgroundColor: C.surface, overflow: 'hidden', marginBottom: '0.75rem' }}>
      {/* Header row */}
      <div style={{ padding: '0.65rem 0.875rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {item.supersetLabel && (
          <span style={{ fontSize: '0.6rem', fontWeight: 600, color: TERRA, backgroundColor: '#F5EDE6', padding: '0.1rem 0.4rem', borderRadius: '999px' }}>
            {item.supersetLabel}
          </span>
        )}
        <span style={{ fontWeight: 400, color: C.text, fontSize: '0.9rem', flex: 1, minWidth: 0 }}>{ex.name}</span>
        {ex.muscleGroup && (
          <span style={{ fontSize: '0.58rem', padding: '0.1rem 0.4rem', borderRadius: '999px', backgroundColor: '#F5EDE6', color: TERRA, fontWeight: 400, textTransform: 'capitalize', flexShrink: 0 }}>
            {ex.muscleGroup}
          </span>
        )}
        {item.swapped && (
          <span style={{ fontSize: '0.54rem', padding: '0.08rem 0.4rem', borderRadius: '999px', backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontWeight: 500, flexShrink: 0 }}>
            Swapped
          </span>
        )}
        {isKratosSplit && (
          <button
            onClick={() => setShowSwapPanel(true)}
            title="Swap exercise"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSecondary, padding: '0 0.1rem', flexShrink: 0, display: 'flex', alignItems: 'center', lineHeight: 1 }}
          >
            <ArrowLeftRight size={14} strokeWidth={1.75} />
          </button>
        )}
        <button
          onClick={() => onRemove(uid)}
          title="Remove exercise"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSecondary, fontSize: '1.25rem', lineHeight: 1, padding: '0 0.1rem', flexShrink: 0 }}
        >
          ×
        </button>
      </div>

      {/* Suggestion banner */}
      {suggestion && (
        <div style={{ padding: '0.35rem 0.875rem', backgroundColor: '#eff6ff', borderBottom: `1px solid #bfdbfe`, fontSize: '0.72rem', color: '#2563eb', fontWeight: 300 }}>
          {suggestion.type === 'time'
            ? <>Last time: <strong style={{ fontWeight: 500 }}>{suggestion.lastDuration}s</strong> — try <strong style={{ fontWeight: 500 }}>{suggestion.suggestDuration}s</strong></>
            : suggestion.type === 'bodyweight'
            ? <>Last time: <strong style={{ fontWeight: 500 }}>× {suggestion.lastReps} reps</strong>{suggestion.suggestReps ? <> — try <strong style={{ fontWeight: 500 }}>{suggestion.suggestReps} reps</strong></> : null}</>
            : <>Last time: <strong style={{ fontWeight: 500 }}>{suggestion.lastWeight} lbs × {suggestion.lastReps}</strong> — try <strong style={{ fontWeight: 500 }}>{suggestion.suggestWeight} lbs</strong></>
          }
        </div>
      )}

      {/* Log content */}
      <div style={{ padding: '0.625rem 0.875rem' }}>
        {logStyle === 'one_at_a_time' ? (
          <OneAtATimeLogger
            tt={tt}
            targetSets={targetSets}
            savedSets={savedSets}
            activeSets={activeSets}
            suggestion={suggestion}
            saving={savingUid === uid}
            onCompleteSet={(setIdx, data) => onCompleteSet(uid, setIdx, data)}
            onDeleteSet={(setRecord) => onDeleteSet(uid, setRecord)}
          />
        ) : (
          <AllAtOnceLogger
            tt={tt}
            targetSets={targetSets}
            savedSets={savedSets}
            suggestion={suggestion}
            saving={savingUid === uid}
            onSaveAll={(rows) => onSaveAll(uid, rows)}
            onDeleteSet={(setRecord) => onDeleteSet(uid, setRecord)}
          />
        )}

        {/* Footer: log style toggle + Add Set + Superset */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.625rem', gap: '0.5rem' }}>
          <div style={{ display: 'flex', backgroundColor: '#f3f4f6', borderRadius: '6px', padding: '0.15rem', gap: '0.15rem' }}>
            {[['one_at_a_time', 'One at a time'], ['all_at_once', 'All at once']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setLogStyle(val)}
                style={{
                  ...tabBase,
                  backgroundColor: logStyle === val ? '#fff' : 'transparent',
                  color: logStyle === val ? C.text : C.textSecondary,
                  fontWeight: logStyle === val ? 400 : 300,
                  boxShadow: logStyle === val ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <button
              onClick={() => onAddSet(uid)}
              style={{
                padding: '0.3rem 0.7rem', borderRadius: '6px',
                border: `1px solid ${C.border}`, backgroundColor: 'transparent',
                color: C.textSecondary, fontSize: '0.72rem', cursor: 'pointer',
                fontFamily: FONTS.body, fontWeight: 300,
              }}
            >
              + Add Set
            </button>
            {!item.supersetGroup && (
              <button
                onClick={() => setShowSupersetPanel(true)}
                style={{ padding: '0.3rem 0.7rem', borderRadius: '6px', border: `1px solid ${C.border}`, backgroundColor: 'transparent', color: C.textSecondary, fontSize: '0.72rem', cursor: 'pointer', fontFamily: FONTS.body, fontWeight: 300 }}
              >
                + Superset
              </button>
            )}
          </div>
        </div>
      </div>

      {showSupersetPanel && (
        <AddExercisePanel
          onAdd={(exData) => { onCreateSuperset(item.uid, exData); setShowSupersetPanel(false); }}
          onClose={() => setShowSupersetPanel(false)}
          panelTitle="Add Superset Partner"
        />
      )}
      {showSwapPanel && (
        <SwapExercisePanel
          dayType={dayType}
          excludeName={ex.name}
          onSwap={(newExData) => { onSwap(uid, newExData); setShowSwapPanel(false); }}
          onClose={() => setShowSwapPanel(false)}
        />
      )}
    </div>
  );
}

// ── AddExercisePanel ───────────────────────────────────────────────────
function AddExercisePanel({ onAdd, onClose, panelTitle = 'Add Exercise' }) {
  const [search, setSearch]             = useState('');
  const [muscleFilter, setMuscleFilter] = useState('All');
  const [customName, setCustomName]     = useState('');
  const [customMuscle, setCustomMuscle] = useState('chest');
  const [customTracking, setCustomTracking] = useState('reps');
  const searchRef = useRef(null);
  const isMobile  = window.innerWidth <= 768;

  useEffect(() => {
    searchRef.current?.focus();
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const filtered = ALL_EXERCISES.filter((ex) => {
    const matchesMuscle  = muscleFilter === 'All' || ex.muscleGroup === muscleFilter;
    const q = search.toLowerCase();
    const matchesSearch  = !q || ex.name.toLowerCase().includes(q) || ex.muscleGroup.toLowerCase().includes(q);
    return matchesMuscle && matchesSearch;
  });

  function handleAddExercise(ex) {
    onAdd({ id: ex.id, name: ex.name, muscleGroup: ex.muscleGroup, equipment: ex.equipment, trackingType: getTrackingType(ex) });
    onClose();
  }

  function handleAddCustom() {
    if (!customName.trim()) return;
    onAdd({ id: null, name: customName.trim(), muscleGroup: customMuscle, equipment: 'custom', trackingType: customTracking });
    onClose();
  }

  const panelStyle = isMobile
    ? { bottom: 0, left: 0, right: 0, borderRadius: '16px 16px 0 0', maxHeight: '75vh' }
    : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '520px', maxWidth: '90vw', maxHeight: '80vh', borderRadius: '12px' };

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 300 }}
      />
      <div style={{
        position: 'fixed', zIndex: 301,
        backgroundColor: C.surface,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.15)',
        ...panelStyle,
      }}>
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.5rem', flexShrink: 0 }}>
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: C.border }} />
          </div>
        )}

        {/* Header */}
        <div style={{ padding: '0.875rem 1.125rem 0.625rem', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
            <span style={{ fontWeight: 500, color: C.text, fontSize: '1rem' }}>{panelTitle}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: C.textSecondary, lineHeight: 1, padding: 0 }}>×</button>
          </div>
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exercises…"
            style={{
              width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px',
              border: `1.5px solid ${C.border}`, backgroundColor: C.bg,
              color: C.text, fontSize: '0.875rem', fontFamily: FONTS.body,
              boxSizing: 'border-box', outline: 'none',
            }}
          />
        </div>

        {/* Muscle group chips */}
        <div style={{ padding: '0.5rem 1.125rem', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: '0.3rem', flexWrap: 'wrap', flexShrink: 0 }}>
          {MUSCLE_GROUPS.map((mg) => (
            <button
              key={mg}
              onClick={() => setMuscleFilter(mg)}
              style={{
                padding: '0.2rem 0.6rem', borderRadius: '999px',
                border: `1px solid ${muscleFilter === mg ? TERRA : C.border}`,
                backgroundColor: muscleFilter === mg ? '#F5EDE6' : 'transparent',
                color: muscleFilter === mg ? TERRA : C.textSecondary,
                fontSize: '0.7rem', fontWeight: muscleFilter === mg ? 400 : 300,
                cursor: 'pointer', fontFamily: FONTS.body, textTransform: 'capitalize',
              }}
            >
              {mg}
            </button>
          ))}
        </div>

        {/* Scrollable list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.map((ex) => (
            <button
              key={ex.id}
              onClick={() => handleAddExercise(ex)}
              style={{
                width: '100%', padding: '0.6rem 1.125rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                border: 'none', borderBottom: `1px solid ${C.border}`,
                backgroundColor: 'transparent', cursor: 'pointer',
                textAlign: 'left', transition: 'background-color 0.1s',
                fontFamily: FONTS.body,
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = C.bg; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span style={{ flex: 1, fontSize: '0.875rem', color: C.text, fontWeight: 300 }}>{ex.name}</span>
              <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem', borderRadius: '999px', backgroundColor: C.bg, color: C.textSecondary, border: `1px solid ${C.border}`, textTransform: 'capitalize', flexShrink: 0 }}>{ex.equipment}</span>
              <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem', borderRadius: '999px', backgroundColor: '#F5EDE6', color: TERRA, textTransform: 'capitalize', flexShrink: 0 }}>{ex.muscleGroup}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: C.textSecondary, fontSize: '0.82rem', fontWeight: 300 }}>
              No exercises found
            </div>
          )}

          {/* Custom exercise section */}
          <div style={{ padding: '0.875rem 1.125rem', borderTop: `2px solid ${C.border}` }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 600, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.625rem' }}>
              Custom Exercise
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Exercise name…"
                style={{
                  padding: '0.5rem', borderRadius: '8px',
                  border: `1.5px solid ${C.border}`, backgroundColor: C.bg,
                  color: C.text, fontSize: '0.875rem', fontFamily: FONTS.body, outline: 'none',
                }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                <select
                  value={customMuscle}
                  onChange={(e) => setCustomMuscle(e.target.value)}
                  style={{ padding: '0.45rem', borderRadius: '8px', border: `1.5px solid ${C.border}`, backgroundColor: C.bg, color: C.text, fontSize: '0.82rem', fontFamily: FONTS.body, outline: 'none' }}
                >
                  {['chest','back','shoulders','arms','legs','core','cardio','full body'].map((m) => (
                    <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                  ))}
                </select>
                <select
                  value={customTracking}
                  onChange={(e) => setCustomTracking(e.target.value)}
                  style={{ padding: '0.45rem', borderRadius: '8px', border: `1.5px solid ${C.border}`, backgroundColor: C.bg, color: C.text, fontSize: '0.82rem', fontFamily: FONTS.body, outline: 'none' }}
                >
                  <option value="reps">Reps + Weight</option>
                  <option value="bodyweight">Bodyweight Reps</option>
                  <option value="weighted_bodyweight">BW + Added Weight</option>
                  <option value="time">Time (seconds)</option>
                </select>
              </div>
              <button
                onClick={handleAddCustom}
                disabled={!customName.trim()}
                style={{
                  padding: '0.5rem', borderRadius: '8px', border: 'none',
                  backgroundColor: customName.trim() ? TERRA : '#d1d5db',
                  color: customName.trim() ? '#fff' : '#6b7280',
                  fontWeight: 400, fontSize: '0.82rem',
                  cursor: customName.trim() ? 'pointer' : 'default',
                  fontFamily: FONTS.body, transition: 'all 0.15s',
                }}
              >
                Add Custom Exercise
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── SwapExercisePanel ──────────────────────────────────────────────────
function SwapExercisePanel({ dayType, excludeName, onSwap, onClose }) {
  const [search, setSearch] = useState('');
  const searchRef = useRef(null);
  const isMobile  = window.innerWidth <= 768;

  useEffect(() => {
    searchRef.current?.focus();
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const allowedGroups = SWAP_MUSCLE_GROUPS[dayType] ?? [];

  const filtered = ALL_EXERCISES.filter((ex) => {
    if (ex.name === excludeName) return false;
    if (allowedGroups.length && !allowedGroups.includes(ex.muscleGroup)) return false;
    const q = search.toLowerCase();
    return !q || ex.name.toLowerCase().includes(q) || ex.muscleGroup.toLowerCase().includes(q);
  });

  const panelStyle = isMobile
    ? { bottom: 0, left: 0, right: 0, borderRadius: '16px 16px 0 0', maxHeight: '75vh' }
    : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '520px', maxWidth: '90vw', maxHeight: '80vh', borderRadius: '12px' };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 300 }} />
      <div style={{
        position: 'fixed', zIndex: 301,
        backgroundColor: C.surface,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.15)',
        ...panelStyle,
      }}>
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.5rem', flexShrink: 0 }}>
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: C.border }} />
          </div>
        )}

        {/* Header */}
        <div style={{ padding: '0.875rem 1.125rem 0.625rem', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
            <span style={{ fontWeight: 500, color: C.text, fontSize: '1rem' }}>Swap Exercise</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: C.textSecondary, lineHeight: 1, padding: 0 }}>×</button>
          </div>
          {allowedGroups.length > 0 && (
            <div style={{ fontSize: '0.68rem', color: C.textSecondary, fontWeight: 300, marginBottom: '0.625rem', textTransform: 'capitalize' }}>
              {cap(dayType)} day · {allowedGroups.join(', ')}
            </div>
          )}
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exercises…"
            style={{
              width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px',
              border: `1.5px solid ${C.border}`, backgroundColor: C.bg,
              color: C.text, fontSize: '0.875rem', fontFamily: FONTS.body,
              boxSizing: 'border-box', outline: 'none',
            }}
          />
        </div>

        {/* Scrollable list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.map((ex) => (
            <button
              key={ex.id}
              onClick={() => {
                onSwap({ id: ex.id, name: ex.name, muscleGroup: ex.muscleGroup, equipment: ex.equipment, trackingType: getTrackingType(ex) });
                onClose();
              }}
              style={{
                width: '100%', padding: '0.6rem 1.125rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                border: 'none', borderBottom: `1px solid ${C.border}`,
                backgroundColor: 'transparent', cursor: 'pointer',
                textAlign: 'left', transition: 'background-color 0.1s',
                fontFamily: FONTS.body,
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = C.bg; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span style={{ flex: 1, fontSize: '0.875rem', color: C.text, fontWeight: 300 }}>{ex.name}</span>
              <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem', borderRadius: '999px', backgroundColor: C.bg, color: C.textSecondary, border: `1px solid ${C.border}`, textTransform: 'capitalize', flexShrink: 0 }}>{ex.equipment}</span>
              <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem', borderRadius: '999px', backgroundColor: '#F5EDE6', color: TERRA, textTransform: 'capitalize', flexShrink: 0 }}>{ex.muscleGroup}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: C.textSecondary, fontSize: '0.82rem', fontWeight: 300 }}>
              No exercises found
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── FinishModal ────────────────────────────────────────────────────────
function FinishModal({ activeExercises, startTime, workoutTitle, onSaveExit, onDeleteExit, onKeepGoing }) {
  const { user }  = useAuth();
  const [title, setTitle]           = useState(workoutTitle);
  const [saveRoutine, setSaveRoutine] = useState(false);
  const [routineName, setRoutineName] = useState(workoutTitle);
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);

  const duration     = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
  const exerciseCount = activeExercises.length;
  const totalSets    = activeExercises.reduce((acc, item) => acc + (item.logData.sets?.length ?? 0), 0);
  const totalVolume  = activeExercises.reduce((acc, item) => {
    const tt = item.ex.trackingType;
    if (tt !== 'reps' && tt !== 'weighted_bodyweight') return acc;
    return acc + (item.logData.sets ?? []).reduce((s, set) => {
      const w = parseFloat(set.weight_lbs ?? 0);
      const r = parseInt(set.reps_completed ?? 0, 10);
      return s + (isNaN(w) || isNaN(r) ? 0 : w * r);
    }, 0);
  }, 0);

  const stats = [
    { label: 'Duration',   value: formatElapsed(duration) },
    { label: 'Exercises',  value: String(exerciseCount)   },
    { label: 'Total Sets', value: String(totalSets)       },
    { label: 'Volume',     value: totalVolume > 0 ? `${Math.round(totalVolume).toLocaleString()} lbs` : '—' },
  ];

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onKeepGoing(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onKeepGoing]);

  async function handleSaveExit() {
    if (saving || deleting) return;
    setSaving(true);
    try {
      if (saveRoutine && routineName.trim() && user) {
        const exData = activeExercises.map((item) => ({
          id:          item.ex.id,
          name:        item.ex.name,
          muscleGroup: item.ex.muscleGroup,
          equipment:   item.ex.equipment,
          trackingType: item.ex.trackingType,
          defaultSets:  item.targetSets,
        }));
        const finishPayload = { user_id: user.id, title: routineName.trim(), exercises: exData };
        console.log('[custom_routines] finish insert payload:', JSON.stringify(finishPayload, null, 2));
        const { error: finishErr } = await supabase.from('custom_routines').insert(finishPayload);
        if (finishErr) {
          console.error('[custom_routines] finish insert error:', {
            message: finishErr.message,
            code:    finishErr.code,
            details: finishErr.details,
            hint:    finishErr.hint,
          });
        }
      }
    } finally {
      setSaving(false);
      onSaveExit();
    }
  }

  async function handleDeleteExit() {
    if (saving || deleting) return;
    setDeleting(true);
    try {
      if (user && startTime) {
        const since = new Date(startTime).toISOString();
        await supabase.from('workout_logs').delete().eq('user_id', user.id).gte('logged_at', since);
      }
    } finally {
      setDeleting(false);
      onDeleteExit();
    }
  }

  return (
    <>
      <div
        onClick={onKeepGoing}
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 400 }}
      />
      <div style={{
        position: 'fixed', zIndex: 401,
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '480px', maxWidth: '92vw',
        backgroundColor: C.surface,
        borderRadius: '14px',
        padding: '1.5rem',
        boxShadow: '0 8px 48px rgba(0,0,0,0.22)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <span style={{ fontWeight: 500, fontSize: '1.1rem', color: C.text, fontFamily: FONTS.heading }}>Finish Workout</span>
          <button onClick={onKeepGoing} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: C.textSecondary, lineHeight: 1, padding: 0 }}>×</button>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {stats.map(({ label, value }) => (
            <div key={label} style={{ padding: '0.75rem', backgroundColor: C.bg, borderRadius: '8px', border: `1px solid ${C.border}`, textAlign: 'center' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 500, color: C.text, fontFamily: FONTS.heading, lineHeight: 1.2 }}>{value}</div>
              <div style={{ fontSize: '0.58rem', color: C.textSecondary, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '0.2rem' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Editable title */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.62rem', color: C.textSecondary, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.3rem' }}>
            Workout Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px',
              border: `1.5px solid ${C.border}`, backgroundColor: C.bg,
              color: C.text, fontSize: '0.9rem', fontFamily: FONTS.body,
              boxSizing: 'border-box', outline: 'none',
            }}
          />
        </div>

        {/* Save as routine */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={saveRoutine}
              onChange={(e) => setSaveRoutine(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: TERRA }}
            />
            <span style={{ fontSize: '0.875rem', color: C.text, fontWeight: 300 }}>Save as routine template</span>
          </label>
          {saveRoutine && (
            <input
              value={routineName}
              onChange={(e) => setRoutineName(e.target.value)}
              placeholder="Routine name…"
              style={{
                marginTop: '0.5rem', width: '100%', padding: '0.5rem 0.75rem',
                borderRadius: '8px', border: `1.5px solid ${C.border}`,
                backgroundColor: C.bg, color: C.text,
                fontSize: '0.875rem', fontFamily: FONTS.body,
                boxSizing: 'border-box', outline: 'none',
              }}
            />
          )}
        </div>

        <button
          onClick={handleSaveExit}
          disabled={saving || deleting}
          style={{
            width: '100%', padding: '0.75rem', borderRadius: '10px', border: 'none',
            backgroundColor: saving || deleting ? '#e5e7eb' : TERRA,
            color: saving || deleting ? C.textSecondary : '#fff',
            fontWeight: 400, fontSize: '0.9rem',
            cursor: saving || deleting ? 'default' : 'pointer',
            fontFamily: FONTS.body, marginBottom: '0.5rem',
            transition: 'all 0.15s',
          }}
        >
          {saving ? 'Saving…' : 'Save & Exit'}
        </button>
        <button
          onClick={onKeepGoing}
          disabled={saving || deleting}
          style={{
            width: '100%', padding: '0.6rem', border: 'none', background: 'none',
            color: C.textSecondary, fontSize: '0.82rem', cursor: saving || deleting ? 'default' : 'pointer', fontFamily: FONTS.body,
          }}
        >
          Keep Going
        </button>
        <button
          onClick={handleDeleteExit}
          disabled={saving || deleting}
          style={{
            width: '100%', padding: '0.5rem', border: 'none', background: 'none',
            color: deleting ? C.textSecondary : '#dc2626',
            fontSize: '0.78rem', fontWeight: 300,
            cursor: saving || deleting ? 'default' : 'pointer',
            fontFamily: FONTS.body,
          }}
        >
          {deleting ? 'Deleting…' : 'Delete workout & exit'}
        </button>
      </div>
    </>
  );
}

// ── SavedRoutinesTab ───────────────────────────────────────────────────
function SavedRoutinesTab({ onLoadRoutine }) {
  const { user }  = useAuth();
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchRoutines() {
      const { data } = await supabase
        .from('custom_routines')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setRoutines(data ?? []);
      setLoading(false);
    }
    fetchRoutines();
  }, [user]);

  async function handleDelete(id) {
    if (!window.confirm('Delete this routine?')) return;
    await supabase.from('custom_routines').delete().eq('id', id);
    setRoutines((prev) => prev.filter((r) => r.id !== id));
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '2rem', color: C.textSecondary, fontSize: '0.875rem', fontWeight: 300 }}>Loading…</div>
  );

  if (routines.length === 0) return (
    <div style={{ textAlign: 'center', padding: '2rem 1.25rem', color: C.textSecondary }}>
      <div style={{ fontSize: '0.875rem', fontWeight: 300, marginBottom: '0.375rem' }}>No saved routines yet.</div>
      <div style={{ fontSize: '0.75rem', fontWeight: 300 }}>Finish a workout and check "Save as routine template".</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      {routines.map((r) => (
        <div key={r.id} style={{ padding: '0.875rem 1rem', backgroundColor: C.surface, borderRadius: '10px', border: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 400, color: C.text, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{r.title}</div>
              <div style={{ fontSize: '0.72rem', color: C.textSecondary, fontWeight: 300 }}>
                {r.exercises?.length ?? 0} exercises
                {r.last_used_at ? ` · Last used ${new Date(r.last_used_at).toLocaleDateString()}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
              <button
                onClick={() => onLoadRoutine(r)}
                style={{
                  padding: '0.35rem 0.875rem', borderRadius: '6px',
                  border: `1px solid ${TERRA}`, backgroundColor: 'transparent',
                  color: TERRA, fontSize: '0.78rem', fontWeight: 400,
                  cursor: 'pointer', fontFamily: FONTS.body,
                }}
              >
                Load
              </button>
              <button
                onClick={() => handleDelete(r.id)}
                style={{
                  padding: '0.35rem 0.625rem', borderRadius: '6px',
                  border: `1px solid ${C.border}`, backgroundColor: 'transparent',
                  color: C.textSecondary, fontSize: '0.78rem',
                  cursor: 'pointer', fontFamily: FONTS.body,
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── BuilderCard ────────────────────────────────────────────────────────
function BuilderCard({ item, onRemove, onAddSet, onCreateSuperset }) {
  const [showSupersetPanel, setShowSupersetPanel] = useState(false);

  return (
    <div style={{ borderRadius: '10px', border: `1px solid ${C.border}`, backgroundColor: C.surface, marginBottom: '0.5rem', overflow: 'hidden' }}>
      <div style={{ padding: '0.65rem 0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {item.supersetLabel && (
          <span style={{ fontSize: '0.6rem', fontWeight: 700, color: TERRA, backgroundColor: '#F5EDE6', padding: '0.1rem 0.4rem', borderRadius: '999px', flexShrink: 0 }}>{item.supersetLabel}</span>
        )}
        <span style={{ fontWeight: 400, color: C.text, fontSize: '0.875rem', flex: 1, minWidth: 0 }}>{item.ex.name}</span>
        {item.ex.muscleGroup && (
          <span style={{ fontSize: '0.58rem', padding: '0.1rem 0.4rem', borderRadius: '999px', backgroundColor: '#F5EDE6', color: TERRA, textTransform: 'capitalize', flexShrink: 0 }}>{item.ex.muscleGroup}</span>
        )}
        <button onClick={() => onRemove(item.uid)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSecondary, fontSize: '1.25rem', lineHeight: 1, padding: '0 0.1rem', flexShrink: 0 }}>×</button>
      </div>
      <div style={{ padding: '0.3rem 0.875rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderTop: `1px solid ${C.border}` }}>
        <span style={{ fontSize: '0.72rem', color: C.textSecondary, fontWeight: 300, flex: 1 }}>{item.targetSets} sets</span>
        <button onClick={() => onAddSet(item.uid)} style={{ padding: '0.2rem 0.55rem', borderRadius: '5px', border: `1px solid ${C.border}`, backgroundColor: 'transparent', color: C.textSecondary, fontSize: '0.7rem', cursor: 'pointer', fontFamily: FONTS.body, fontWeight: 300 }}>+ Set</button>
        {!item.supersetGroup && (
          <button onClick={() => setShowSupersetPanel(true)} style={{ padding: '0.2rem 0.55rem', borderRadius: '5px', border: `1px solid ${C.border}`, backgroundColor: 'transparent', color: C.textSecondary, fontSize: '0.7rem', cursor: 'pointer', fontFamily: FONTS.body, fontWeight: 300 }}>+ Superset</button>
        )}
      </div>
      {showSupersetPanel && (
        <AddExercisePanel
          onAdd={(exData) => { onCreateSuperset(item.uid, exData); setShowSupersetPanel(false); }}
          onClose={() => setShowSupersetPanel(false)}
          panelTitle="Add Superset Partner"
        />
      )}
    </div>
  );
}

// ── ActiveCycleSection ─────────────────────────────────────────────────
function ActiveCycleSection({ onStartKratosSession }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cycle, setCycle] = useState(null);
  const [loadingCycle, setLoadingCycle] = useState(true);
  const [showFullBlock, setShowFullBlock] = useState(false);
  const [recoverSheetDay, setRecoverSheetDay] = useState(null);
  const [markingComplete, setMarkingComplete] = useState(false);

  useEffect(() => {
    if (!user) { setLoadingCycle(false); return; }
    supabase
      .from('cycles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { setCycle(data); setLoadingCycle(false); });
  }, [user]);

  if (loadingCycle) return null;

  const sectionLabel = {
    fontSize: '0.62rem', fontWeight: 700, color: C.textSecondary,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    marginBottom: '0.5rem', fontFamily: FONTS.body,
  };
  const cycleLabel = {
    fontSize: '0.58rem', fontWeight: 700, color: TERRA,
    textTransform: 'uppercase', letterSpacing: '0.1em',
    marginBottom: '0.5rem', fontFamily: FONTS.body,
  };

  if (!cycle) {
    return (
      <div style={{ ...card, padding: '1rem 1.25rem', marginBottom: '1.5rem', borderLeft: `3px solid ${C.border}` }}>
        <div style={cycleLabel}>Current Cycle</div>
        <div style={{ fontSize: '0.875rem', color: C.text, fontWeight: 400, marginBottom: '0.625rem' }}>No active Kratos Split cycle</div>
        <button
          onClick={() => navigate('/kratos')}
          style={{ fontSize: '0.8rem', color: TERRA, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: FONTS.body, fontWeight: 400 }}
        >
          Start the Kratos Split →
        </button>
      </div>
    );
  }

  const sessions = buildSessionMap(cycle);
  const completedSet = new Set(cycle.completed_sessions ?? []);
  const nextSession = sessions.find(s => !completedSet.has(s.sessionNum)) ?? null;

  // Session-based current week: the week containing the next incomplete session
  const currentWeekIdx = nextSession?.weekIdx ?? -1;

  // Sessions for current week and the week after
  const thisWeekSessions = currentWeekIdx >= 0
    ? sessions.filter(s => s.weekIdx === currentWeekIdx)
    : [];
  const nextWeekSessions = currentWeekIdx >= 0
    ? sessions.filter(s => s.weekIdx === currentWeekIdx + 1)
    : [];

  function startSession(session) {
    const d = session.day;
    if (!['push', 'pull', 'legs'].includes(d.type)) return;
    const exItems = (d.exercises ?? []).map(ex => ({
      uid: crypto.randomUUID(),
      ex: { id: ex.id ?? null, name: ex.name, muscleGroup: ex.muscleGroup ?? '', equipment: ex.equipment ?? '', trackingType: getTrackingType(ex) },
      targetSets: ex.sets ?? 3, logData: { sets: [] }, activeSets: 0,
      supersetGroup: null, supersetLabel: null,
    }));
    onStartKratosSession({
      title: `Week ${session.weekNum} · ${cap(d.type)} Day`,
      source: 'kratos_split', activeExercises: exItems,
      cycleId: cycle.id, weekNumber: session.weekNum,
      dayType: d.type, weekIdx: session.weekIdx,
      dayIdx: session.dayIdx, sessionNum: session.sessionNum,
    });
  }

  async function handleMarkComplete(sessionNum) {
    if (markingComplete) return;
    setMarkingComplete(true);
    const prev = new Set(cycle.completed_sessions ?? []);
    prev.add(sessionNum);
    const arr = [...prev];
    await supabase.from('cycles').update({ completed_sessions: arr }).eq('id', cycle.id);
    setCycle(c => ({ ...c, completed_sessions: arr }));
    setRecoverSheetDay(null);
    setMarkingComplete(false);
  }

  // Render a single session row
  function renderSessionRow(session) {
    const isCompleted = completedSet.has(session.sessionNum);
    const isNext    = nextSession?.sessionNum === session.sessionNum;
    const isLift    = ['push', 'pull', 'legs'].includes(session.day.type);
    const isRecover = session.day.type === 'recover';
    const exCount   = (session.day.exercises ?? []).length;
    const dotColor  = isRecover ? SAGE : TERRA;

    return (
      <div
        key={session.sessionNum}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.625rem',
          padding: '0.525rem 0',
          borderBottom: `1px solid ${C.border}`,
          opacity: isCompleted ? 0.45 : 1,
        }}
      >
        {/* Status circle */}
        <div style={{
          width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
          border: `1.5px solid ${isCompleted ? '#16a34a' : isNext ? dotColor : C.border}`,
          backgroundColor: isCompleted ? '#16a34a' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isCompleted && <span style={{ color: '#fff', fontSize: '0.55rem', fontWeight: 700, lineHeight: 1 }}>✓</span>}
          {isNext && !isCompleted && <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: dotColor }} />}
        </div>

        {/* Day label + sub-info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '0.82rem', fontWeight: isNext ? 400 : 300, color: isNext ? C.text : C.textSecondary }}>
            {cap(session.day.type)} Day
          </span>
          {isLift && exCount > 0 && (
            <span style={{ fontSize: '0.72rem', color: C.textSecondary, fontWeight: 300, marginLeft: '0.35rem' }}>
              · {exCount} ex
            </span>
          )}
          {isRecover && session.day.cardioBlock?.durationMin && (
            <span style={{ fontSize: '0.72rem', color: C.textSecondary, fontWeight: 300, marginLeft: '0.35rem' }}>
              · {session.day.cardioBlock.durationMin} min
            </span>
          )}
        </div>

        {/* Session number */}
        <span style={{ fontSize: '0.65rem', color: C.textSecondary, fontWeight: 300, flexShrink: 0 }}>
          #{session.sessionNum}
        </span>

        {/* Action buttons for the next upcoming session */}
        {isNext && isLift && (
          <button
            onClick={() => startSession(session)}
            style={{
              padding: '0.28rem 0.7rem', borderRadius: '6px', border: 'none',
              backgroundColor: TERRA, color: '#fff',
              fontSize: '0.72rem', fontWeight: 500, cursor: 'pointer',
              fontFamily: FONTS.body, flexShrink: 0,
            }}
          >
            Start →
          </button>
        )}
        {isNext && isRecover && !isCompleted && (
          <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
            <button
              onClick={() => setRecoverSheetDay(session.day)}
              style={{
                padding: '0.28rem 0.6rem', borderRadius: '6px',
                border: `1px solid ${SAGE}`, backgroundColor: 'transparent', color: SAGE,
                fontSize: '0.72rem', fontWeight: 500, cursor: 'pointer', fontFamily: FONTS.body,
              }}
            >
              View →
            </button>
            <button
              onClick={() => handleMarkComplete(session.sessionNum)}
              disabled={markingComplete}
              style={{
                padding: '0.28rem 0.6rem', borderRadius: '6px',
                border: '1px solid #16a34a', backgroundColor: 'transparent', color: '#16a34a',
                fontSize: '0.72rem', fontWeight: 500, cursor: 'pointer', fontFamily: FONTS.body,
                opacity: markingComplete ? 0.6 : 1,
              }}
            >
              {markingComplete ? '…' : '✓'}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!nextSession) {
    return (
      <div>
        <div style={{ ...card, padding: '1rem 1.25rem', marginBottom: '1rem', borderLeft: `3px solid #16a34a` }}>
          <div style={{ ...cycleLabel, color: '#16a34a' }}>Current Cycle</div>
          <div style={{ fontSize: '0.875rem', color: C.text, fontWeight: 400 }}>Kratos Split complete! All {sessions.length} sessions done.</div>
        </div>
        <button
          onClick={() => setShowFullBlock(true)}
          style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: 'transparent', color: C.textSecondary, fontSize: '0.8rem', fontWeight: 300, cursor: 'pointer', fontFamily: FONTS.body }}
        >
          View Full 12-Week Block →
        </button>
        {showFullBlock && <FullBlockOverlay cycle={cycle} onClose={() => setShowFullBlock(false)} />}
      </div>
    );
  }

  return (
    <div>
      {/* Next session summary card */}
      <div style={{ ...card, padding: '1rem 1.25rem', marginBottom: '1.25rem', borderLeft: `3px solid ${TERRA}` }}>
        <div style={cycleLabel}>Current Cycle</div>
        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: C.text, marginBottom: '0.15rem' }}>
          Kratos Split — Session {nextSession.sessionNum} of {sessions.length}
        </div>
        <div style={{ fontSize: '0.72rem', color: C.textSecondary, fontWeight: 300 }}>
          Week {nextSession.weekNum} · {cap(nextSession.day.type)} Day
          {(nextSession.day.exercises ?? []).length > 0 ? ` · ${(nextSession.day.exercises ?? []).length} exercises` : ''}
        </div>
      </div>

      {/* This Week */}
      {thisWeekSessions.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={sectionLabel}>Current Week — Week {currentWeekIdx + 1}</div>
          <div style={{ ...card, padding: '0 1rem' }}>
            {thisWeekSessions.map(s => renderSessionRow(s))}
          </div>
        </div>
      )}

      {/* Next Week */}
      {nextWeekSessions.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={sectionLabel}>Next Week — Week {currentWeekIdx + 2}</div>

          <div style={{ ...card, padding: '0 1rem' }}>
            {nextWeekSessions.map(s => renderSessionRow(s))}
          </div>
        </div>
      )}

      {/* View Full Block button */}
      <button
        onClick={() => setShowFullBlock(true)}
        style={{
          width: '100%', padding: '0.65rem', borderRadius: '8px',
          border: `1px solid ${C.border}`, backgroundColor: 'transparent',
          color: C.textSecondary, fontSize: '0.8rem', fontWeight: 300,
          cursor: 'pointer', fontFamily: FONTS.body, transition: 'all 0.15s',
        }}
        onMouseOver={(e) => { e.currentTarget.style.borderColor = TERRA; e.currentTarget.style.color = TERRA; }}
        onMouseOut={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSecondary; }}
      >
        View Full 12-Week Block →
      </button>

      {showFullBlock && <FullBlockOverlay cycle={cycle} onClose={() => setShowFullBlock(false)} />}
      {recoverSheetDay && (
        <RecoverySheet
          day={recoverSheetDay}
          onMarkComplete={() => handleMarkComplete(nextSession?.sessionNum)}
          onClose={() => setRecoverSheetDay(null)}
          marking={markingComplete}
        />
      )}
    </div>
  );
}

// ── RecoverySheet — inline overlay for recover day routine ──────────────
function RecoverySheet({ day, onMarkComplete, onClose, marking }) {
  const cb = day.cardioBlock ?? {};
  const stretches = day.stretches ?? [];

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'flex-end' }}>
      <div
        style={{
          width: '100%', maxWidth: '640px', margin: '0 auto',
          backgroundColor: C.bg, borderRadius: '16px 16px 0 0',
          maxHeight: '82vh', overflowY: 'auto',
          padding: '1.25rem 1.25rem 2.5rem',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.58rem', fontWeight: 700, color: SAGE, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: FONTS.body, marginBottom: '0.2rem' }}>
              Recovery Day
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 400, color: C.text, textTransform: 'capitalize' }}>
              {cb.modality ?? 'Active Recovery'}{cb.durationMin ? ` · ${cb.durationMin} min` : ''}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSecondary, fontSize: '1.5rem', lineHeight: 1, padding: '0.25rem' }}>×</button>
        </div>

        {/* Cardio block */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: SAGE, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '0.625rem', fontFamily: FONTS.body }}>
            Cardio Block
          </div>
          <div style={{ padding: '0.875rem 1rem', backgroundColor: '#EEF4EF', border: `1px solid ${SAGE}35`, borderRadius: '10px', borderLeft: `3px solid ${SAGE}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.375rem' }}>
              <span style={{ fontWeight: 400, color: C.text, fontSize: '0.95rem', textTransform: 'capitalize' }}>{cb.modality ?? 'Cardio'}</span>
              <span style={{ fontWeight: 500, color: SAGE, fontSize: '0.95rem', fontFamily: FONTS.heading }}>{cb.durationMin ?? 30} min</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: C.textSecondary, fontWeight: 300, lineHeight: 1.55, marginBottom: '0.625rem' }}>
              {cb.intensity ?? 'Zone 2 — conversational pace, 60–70% max HR'}
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

        {/* Mobility sequence */}
        {stretches.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: SAGE, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '0.625rem', fontFamily: FONTS.body }}>
              Mobility Sequence
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {stretches.map((s, i) => (
                <div key={i} style={{ padding: '0.625rem 0.875rem', backgroundColor: C.surface, borderRadius: '8px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
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

        {/* Mark complete */}
        <button
          onClick={onMarkComplete}
          disabled={marking}
          style={{
            width: '100%', padding: '0.875rem', borderRadius: '10px',
            border: '1.5px solid #16a34a', backgroundColor: 'transparent',
            color: '#16a34a', fontSize: '0.925rem', fontWeight: 500,
            cursor: marking ? 'default' : 'pointer', fontFamily: FONTS.body,
            opacity: marking ? 0.6 : 1, transition: 'opacity 0.15s',
          }}
        >
          {marking ? 'Marking…' : '✓ Mark Recovery Complete'}
        </button>
      </div>
    </div>
  );
}

// Full-screen overlay wrapping KratosSplitViewer
function FullBlockOverlay({ cycle, onClose }) {
  // Close on Escape key
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: C.bg, zIndex: 400, overflowY: 'auto' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '1.25rem 1rem 4rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: TERRA, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: FONTS.body }}>
            Kratos Split — Full 12-Week Block
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSecondary, fontSize: '1.5rem', lineHeight: 1, padding: '0.25rem 0.5rem', fontFamily: FONTS.body }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <KratosSplitViewer cycle={cycle} />
      </div>
    </div>
  );
}

// ── HomeView ───────────────────────────────────────────────────────────
function HomeView({ onStart, onLoadRoutine, onSaveRoutine, onStartKratosSession, onRemove, onAddExercise, onCompleteSet, onSaveAll, onAddSet, onDeleteSet, onCreateSuperset, onFinish, savingUid, onSwap }) {
  const { activeWorkout, isActive, updateTitle } = useActiveWorkout();
  const activeExercises = activeWorkout?.activeExercises ?? [];
  const workoutTitle    = activeWorkout?.title ?? '';
  const startTime       = activeWorkout?.startTime ?? null;
  const dayType         = activeWorkout?.dayType ?? null;
  const isKratosSplit   = activeWorkout?.source === 'kratos_split';

  const [tab, setTab] = useState(() => isActive ? 'workout' : 'cycle');
  const [builderExercises, setBuilderExercises] = useState([]);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);

  // Auto-switch to workout tab when a workout becomes active
  useEffect(() => {
    if (isActive) setTab('workout');
  }, [isActive]);

  // Auto-switch away from workout tab when workout ends
  useEffect(() => {
    if (!isActive && tab === 'workout') setTab('cycle');
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  function addBuilderEx(exData) {
    setBuilderExercises(prev => [...prev, { uid: crypto.randomUUID(), ex: exData, targetSets: 3, supersetGroup: null, supersetLabel: null }]);
  }
  function removeBuilderEx(uid) {
    setBuilderExercises(prev => {
      const removing = prev.find(i => i.uid === uid);
      return prev.filter(i => i.uid !== uid).map(i => {
        if (removing?.supersetGroup && i.supersetGroup === removing.supersetGroup)
          return { ...i, supersetGroup: null, supersetLabel: null };
        return i;
      });
    });
  }
  function addBuilderSet(uid) {
    setBuilderExercises(prev => prev.map(i => i.uid === uid ? { ...i, targetSets: i.targetSets + 1 } : i));
  }
  function createBuilderSuperset(currentUid, newExData) {
    const letter = nextSupersetGroup(builderExercises);
    setBuilderExercises(prev => {
      const idx = prev.findIndex(i => i.uid === currentUid);
      if (idx === -1) return prev;
      const result = prev.map(i => i.uid === currentUid ? { ...i, supersetGroup: letter, supersetLabel: letter + '1' } : i);
      result.splice(idx + 1, 0, { uid: crypto.randomUUID(), ex: newExData, targetSets: result[idx].targetSets, supersetGroup: letter, supersetLabel: letter + '2' });
      return [...result];
    });
  }

  const TABS = [
    { val: 'cycle',    label: 'Current Cycle' },
    ...(isActive ? [{ val: 'workout', label: 'Active Workout', live: true }] : []),
    { val: 'build',    label: 'Build My Own' },
    { val: 'generate', label: 'Generate for Me' },
    { val: 'routines', label: 'My Routines' },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div style={{ borderBottom: `1px solid ${C.border}`, backgroundColor: C.surface, overflowX: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ padding: '0 1.25rem', display: 'flex', minWidth: 'max-content' }}>
          {TABS.map(({ val, label, live }) => (
            <button
              key={val}
              onClick={() => setTab(val)}
              style={{
                padding: '0.875rem 0.75rem', border: 'none',
                borderBottom: `2px solid ${tab === val ? TERRA : 'transparent'}`,
                backgroundColor: 'transparent',
                color: live ? TERRA : (tab === val ? TERRA : C.textSecondary),
                fontWeight: tab === val ? 400 : 300,
                fontSize: '0.82rem', cursor: 'pointer',
                transition: 'all 0.15s', fontFamily: FONTS.body,
                whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: '0.35rem',
              }}
            >
              {live && (
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: TERRA, flexShrink: 0, animation: 'aw-pulse 1.5s ease-in-out infinite' }} />
              )}
              {label}
            </button>
          ))}
        </div>
      </div>
      <style>{`@keyframes aw-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>

      {/* Current Cycle tab */}
      {tab === 'cycle' && (
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1.5rem 1.25rem' }}>
          <ActiveCycleSection onStartKratosSession={onStartKratosSession} />
        </div>
      )}

      {/* Active Workout tab — only visible when a workout is in progress */}
      {tab === 'workout' && isActive && (
        <ActiveWorkoutView
          activeExercises={activeExercises}
          workoutTitle={workoutTitle}
          setWorkoutTitle={updateTitle}
          startTime={startTime}
          onRemove={onRemove}
          onCompleteSet={onCompleteSet}
          onSaveAll={onSaveAll}
          onAddSet={onAddSet}
          onDeleteSet={onDeleteSet}
          onCreateSuperset={onCreateSuperset}
          onFinish={onFinish}
          savingUid={savingUid}
          onAddExercise={onAddExercise}
          onSwap={onSwap}
          dayType={dayType}
          isKratosSplit={isKratosSplit}
        />
      )}

      {/* Generate tab — keep mounted to preserve form state */}
      <div style={{ display: tab === 'generate' ? 'block' : 'none' }}>
        <RoutineGenerator />
      </div>

      {/* My Routines tab */}
      {tab === 'routines' && (
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1.5rem 1.25rem' }}>
          <SavedRoutinesTab onLoadRoutine={onLoadRoutine} />
        </div>
      )}

      {/* Build My Own tab */}
      {tab === 'build' && (
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1.5rem 1.25rem' }}>
          {builderExercises.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: C.textSecondary }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#F5EDE6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.5rem' }}>💪</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 300, marginBottom: '0.25rem', color: C.text }}>Build your workout</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 300, marginBottom: '1.5rem', lineHeight: 1.6 }}>Add exercises below. You can save as a routine or start right away.</div>
            </div>
          ) : (
            <div style={{ marginBottom: '0.75rem' }}>
              {groupItems(builderExercises).map(group => {
                if (group.type === 'single') {
                  return <BuilderCard key={group.item.uid} item={group.item} onRemove={removeBuilderEx} onAddSet={addBuilderSet} onCreateSuperset={createBuilderSuperset} />;
                }
                return (
                  <div key={group.group} style={{ borderLeft: `3px solid ${TERRA}`, borderRadius: '10px', paddingLeft: '0.625rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.62rem', fontWeight: 600, color: TERRA, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Superset {group.group}</span>
                      <div style={{ flex: 1, height: '1px', backgroundColor: `${TERRA}30` }} />
                    </div>
                    {group.items.map(item => (
                      <BuilderCard key={item.uid} item={item} onRemove={removeBuilderEx} onAddSet={addBuilderSet} onCreateSuperset={createBuilderSuperset} />
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Exercise button */}
          <button
            onClick={() => setShowAddPanel(true)}
            style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: `1.5px dashed ${C.border}`, backgroundColor: 'transparent', color: C.textSecondary, fontSize: '0.875rem', cursor: 'pointer', fontFamily: FONTS.body, fontWeight: 300, marginBottom: '1rem' }}
          >
            + Add Exercise
          </button>

          {/* CTAs */}
          {builderExercises.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {showSaveForm ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      value={saveName}
                      onChange={e => setSaveName(e.target.value)}
                      placeholder="Routine name…"
                      autoFocus
                      style={{ flex: 1, padding: '0.65rem 0.75rem', borderRadius: '8px', border: `1.5px solid ${C.border}`, backgroundColor: C.bg, color: C.text, fontSize: '1rem', fontFamily: FONTS.body, outline: 'none' }}
                    />
                    <button onClick={() => { setShowSaveForm(false); setSaveName(''); }} style={{ padding: '0.65rem 0.5rem', border: 'none', background: 'none', color: C.textSecondary, cursor: 'pointer', fontFamily: FONTS.body, flexShrink: 0 }}>✕</button>
                  </div>
                  <button
                    onClick={async () => {
                      if (!saveName.trim()) return;
                      setSaving(true);
                      const ok = await onSaveRoutine(builderExercises, saveName);
                      setSaving(false);
                      if (ok !== false) { setShowSaveForm(false); setSaveName(''); setBuilderExercises([]); setTab('routines'); }
                    }}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: `1.5px solid ${C.border}`, backgroundColor: 'transparent', color: C.text, fontWeight: 400, fontSize: '0.9rem', cursor: saving ? 'default' : 'pointer', fontFamily: FONTS.body, opacity: saving ? 0.6 : 1 }}
                  >
                    {saving ? 'Saving…' : 'Save to My Routines'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setShowSaveForm(true); setSaveName(getDefaultTitle().replace(' · Workout', ' Routine')); }}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: `1.5px solid ${C.border}`, backgroundColor: 'transparent', color: C.text, fontWeight: 400, fontSize: '0.9rem', cursor: 'pointer', fontFamily: FONTS.body }}
                >
                  Save to My Routines
                </button>
              )}
              <button
                onClick={() => onStart(builderExercises)}
                style={{ width: '100%', padding: '0.875rem', borderRadius: '10px', border: 'none', backgroundColor: TERRA, color: '#fff', fontWeight: 400, fontSize: '1rem', cursor: 'pointer', fontFamily: FONTS.body, boxShadow: '0 2px 12px rgba(194,98,42,0.25)' }}
              >
                Start Workout →
              </button>
            </div>
          )}

          {showAddPanel && (
            <AddExercisePanel
              onAdd={(exData) => { addBuilderEx(exData); setShowAddPanel(false); }}
              onClose={() => setShowAddPanel(false)}
            />
          )}
        </div>
      )}

    </div>
  );
}

// ── ActiveWorkoutView ──────────────────────────────────────────────────
function ActiveWorkoutView({ activeExercises, workoutTitle, setWorkoutTitle, startTime, onRemove, onCompleteSet, onSaveAll, onAddSet, onDeleteSet, onCreateSuperset, onFinish, savingUid, onAddExercise, onSwap, dayType, isKratosSplit }) {
  const [showPanel, setShowPanel] = useState(false);

  const groups = groupItems(activeExercises);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <WorkoutHeader
        title={workoutTitle}
        setTitle={setWorkoutTitle}
        startTime={startTime}
        onFinish={onFinish}
      />
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem 6rem', maxWidth: '640px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {activeExercises.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: C.textSecondary }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 300, marginBottom: '0.25rem' }}>No exercises yet.</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 300 }}>Tap "Add Exercise" below to get started.</div>
          </div>
        ) : (
          groups.map((group) => {
            if (group.type === 'single') {
              return (
                <ActiveExerciseCard
                  key={group.item.uid}
                  item={group.item}
                  onRemove={onRemove}
                  onCompleteSet={onCompleteSet}
                  onSaveAll={onSaveAll}
                  onAddSet={onAddSet}
                  onDeleteSet={onDeleteSet}
                  onCreateSuperset={onCreateSuperset}
                  savingUid={savingUid}
                  onSwap={onSwap}
                  dayType={dayType}
                  isKratosSplit={isKratosSplit}
                />
              );
            }
            // superset group
            return (
              <div key={group.group} style={{ borderLeft: `3px solid ${TERRA}`, borderRadius: '10px', paddingLeft: '0.625rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 600, color: TERRA, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Superset {group.group}</span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: `${TERRA}30` }} />
                </div>
                {group.items.map(item => (
                  <ActiveExerciseCard
                    key={item.uid}
                    item={item}
                    onRemove={onRemove}
                    onCompleteSet={onCompleteSet}
                    onSaveAll={onSaveAll}
                    onAddSet={onAddSet}
                    onDeleteSet={onDeleteSet}
                    onCreateSuperset={onCreateSuperset}
                    savingUid={savingUid}
                    onSwap={onSwap}
                    dayType={dayType}
                    isKratosSplit={isKratosSplit}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* Sticky Add Exercise button */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '0.875rem 1.25rem',
        backgroundColor: C.bg, borderTop: `1px solid ${C.border}`,
        display: 'flex', justifyContent: 'center',
        zIndex: 50,
      }}>
        <button
          onClick={() => setShowPanel(true)}
          style={{
            padding: '0.75rem 2rem', borderRadius: '10px',
            border: `1.5px solid ${TERRA}`, backgroundColor: 'transparent',
            color: TERRA, fontWeight: 400, fontSize: '0.9rem',
            cursor: 'pointer', fontFamily: FONTS.body,
            transition: 'all 0.15s',
            maxWidth: '400px', width: '100%',
          }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#F5EDE6'; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          + Add Exercise
        </button>
      </div>

      {showPanel && (
        <AddExercisePanel
          onAdd={onAddExercise}
          onClose={() => setShowPanel(false)}
        />
      )}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────
export default function MyWorkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    activeWorkout, isActive,
    startWorkout, endWorkout,
    updateActiveExercises, updateTitle,
  } = useActiveWorkout();

  const [showFinish, setShowFinish] = useState(false);
  const [savingUid, setSavingUid]   = useState(null);

  // Derived from context — stays in sync with localStorage persistence
  const activeExercises = activeWorkout?.activeExercises ?? [];
  const workoutTitle    = activeWorkout?.title ?? '';
  const startTime       = activeWorkout?.startTime ?? null;

  function handleStart(exercises = []) {
    const exItems = exercises.map(ex => ({
      ...ex,
      logData: { sets: [] },
      activeSets: 0,
      supersetGroup: ex.supersetGroup ?? null,
      supersetLabel: ex.supersetLabel ?? null,
    }));
    startWorkout({
      title: getDefaultTitle(),
      source: 'custom',
      activeExercises: exItems,
      cycleId: null,
      weekNumber: 0,
      dayType: 'custom',
      weekIdx: null, dayIdx: null, sessionNum: null,
    });
  }

  function handleStartKratosSession(data) {
    startWorkout(data);
  }

  async function handleSaveRoutine(exercises, name) {
    if (!user || !name.trim()) return false;
    const exData = exercises.map(ex => ({
      id: ex.ex.id, name: ex.ex.name, muscleGroup: ex.ex.muscleGroup,
      equipment: ex.ex.equipment, trackingType: ex.ex.trackingType, defaultSets: ex.targetSets,
    }));
    const builderPayload = { user_id: user.id, title: name.trim(), exercises: exData };
    console.log('[custom_routines] builder insert payload:', JSON.stringify(builderPayload, null, 2));
    const { error } = await supabase.from('custom_routines').insert(builderPayload);
    if (error) {
      console.error('[custom_routines] builder insert error:', {
        message: error.message,
        code:    error.code,
        details: error.details,
        hint:    error.hint,
      });
    }
    return !error;
  }

  function handleLoadRoutine(routine) {
    const exercises = (routine.exercises ?? []).map((ex) => ({
      uid:          crypto.randomUUID(),
      ex:           { id: ex.id ?? null, name: ex.name, muscleGroup: ex.muscleGroup ?? '', equipment: ex.equipment ?? '', trackingType: ex.trackingType ?? 'reps' },
      targetSets:   ex.defaultSets ?? 3,
      logData:      { sets: [] },
      activeSets:   0,
      supersetGroup: null,
      supersetLabel: null,
    }));
    startWorkout({
      title: routine.title ?? routine.name ?? '',
      source: 'saved_routine',
      activeExercises: exercises,
      cycleId: null,
      weekNumber: 0,
      dayType: 'custom',
      weekIdx: null, dayIdx: null, sessionNum: null,
    });
    supabase.from('custom_routines').update({ last_used_at: new Date().toISOString() }).eq('id', routine.id).then(() => {});
  }

  function handleAddExercise(exData) {
    updateActiveExercises([
      ...activeExercises,
      { uid: crypto.randomUUID(), ex: exData, targetSets: 3, logData: { sets: [] }, activeSets: 0, supersetGroup: null, supersetLabel: null },
    ]);
  }

  function handleRemove(uid) {
    const removing = activeExercises.find(i => i.uid === uid);
    updateActiveExercises(
      activeExercises
        .filter(i => i.uid !== uid)
        .map(i => {
          if (removing?.supersetGroup && i.supersetGroup === removing.supersetGroup) {
            return { ...i, supersetGroup: null, supersetLabel: null };
          }
          return i;
        })
    );
  }

  function handleAddSet(uid) {
    updateActiveExercises(activeExercises.map(item =>
      item.uid === uid ? { ...item, targetSets: item.targetSets + 1 } : item
    ));
  }

  function handleDeleteSet(uid, setRecord) {
    updateActiveExercises(activeExercises.map(item => {
      if (item.uid !== uid) return item;
      const newSets = item.logData.sets.filter(s => s !== setRecord);
      return { ...item, logData: { sets: newSets }, activeSets: newSets.filter(s => s.saved).length };
    }));
    if (setRecord.db_id) {
      supabase.from('workout_logs').delete().eq('id', setRecord.db_id).then(() => {});
    }
  }

  function handleCreateSuperset(currentUid, newExData) {
    const letter = nextSupersetGroup(activeExercises);
    const idx = activeExercises.findIndex(i => i.uid === currentUid);
    if (idx === -1) return;
    const result = activeExercises.map(i =>
      i.uid === currentUid
        ? { ...i, supersetGroup: letter, supersetLabel: letter + '1' }
        : i
    );
    const partner = {
      uid: crypto.randomUUID(),
      ex: newExData,
      targetSets: result[idx].targetSets,
      logData: { sets: [] },
      activeSets: 0,
      supersetGroup: letter,
      supersetLabel: letter + '2',
    };
    result.splice(idx + 1, 0, partner);
    updateActiveExercises([...result]);
  }

  function handleSwapExercise(uid, newExData) {
    updateActiveExercises(activeExercises.map(item =>
      item.uid !== uid ? item : {
        ...item,
        ex: { ...newExData },
        logData: { sets: [] },
        activeSets: 0,
        swapped: true,
      }
    ));
  }

  function buildPayload(ex, setNumber, data, supersetGroup = null) {
    const tt = ex.trackingType;
    const base = {
      user_id:       user.id,
      cycle_id:      activeWorkout?.cycleId ?? null,
      week_number:   activeWorkout?.weekNumber ?? 0,
      day_type:      activeWorkout?.dayType ?? 'custom',
      exercise_name: ex.name,
      set_number:    setNumber,
      rpe_actual:    data.rpe !== '' && data.rpe != null ? parseFloat(data.rpe) : null,
      logged_at:     new Date().toISOString(),
      // Only include optional columns when they have a real value — omitting null
      // avoids 400 errors if the column hasn't been added to the table yet.
      ...(supersetGroup ? { superset_group: supersetGroup } : {}),
    };
    if (tt === 'time')               return { ...base, duration_seconds: data.duration !== '' ? parseInt(data.duration, 10) : null };
    if (tt === 'bodyweight')         return { ...base, reps_completed: data.reps !== '' ? parseInt(data.reps, 10) : null, is_bodyweight: true };
    if (tt === 'weighted_bodyweight') return { ...base, weight_lbs: data.weight !== '' ? parseFloat(data.weight) : null, reps_completed: data.reps !== '' ? parseInt(data.reps, 10) : null, is_bodyweight: true };
    if (tt === 'cardio_time')        return { ...base, duration_seconds: data.duration !== '' ? parseInt(data.duration, 10) : null };
    if (tt === 'cardio_distance')    return { ...base, ...(data.distance !== '' ? { distance_meters: parseFloat(data.distance) } : {}) };
    if (tt === 'cardio_distance_time') return { ...base, ...(data.distance !== '' ? { distance_meters: parseFloat(data.distance) } : {}), duration_seconds: data.duration !== '' ? parseInt(data.duration, 10) : null };
    if (tt === 'cardio_time_calories') return { ...base, duration_seconds: data.duration !== '' ? parseInt(data.duration, 10) : null, ...(data.calories !== '' ? { calories: parseInt(data.calories, 10) } : {}) };
    if (tt === 'cardio_time_reps')   return { ...base, duration_seconds: data.duration !== '' ? parseInt(data.duration, 10) : null, reps_completed: data.reps !== '' ? parseInt(data.reps, 10) : null };
    // default reps
    return { ...base, weight_lbs: data.weight !== '' ? parseFloat(data.weight) : null, reps_completed: data.reps !== '' ? parseInt(data.reps, 10) : null };
  }

  function buildSetRecord(ex, setNumber, data) {
    const tt = ex.trackingType;
    const base = { set_number: setNumber, rpe_actual: data.rpe, saved: true };
    if (tt === 'time')               return { ...base, duration_seconds: data.duration };
    if (tt === 'bodyweight')         return { ...base, reps_completed: data.reps };
    if (tt === 'weighted_bodyweight') return { ...base, weight_lbs: data.weight, reps_completed: data.reps };
    if (tt === 'cardio_time')        return { ...base, duration_seconds: data.duration };
    if (tt === 'cardio_distance')    return { ...base, distance_meters: data.distance };
    if (tt === 'cardio_distance_time') return { ...base, distance_meters: data.distance, duration_seconds: data.duration };
    if (tt === 'cardio_time_calories') return { ...base, duration_seconds: data.duration, calories: data.calories };
    if (tt === 'cardio_time_reps')   return { ...base, duration_seconds: data.duration, reps_completed: data.reps };
    return { ...base, weight_lbs: data.weight, reps_completed: data.reps };
  }

  async function handleCompleteSet(uid, setIdx, data) {
    if (!user) return false;
    setSavingUid(uid);
    const item = activeExercises.find((i) => i.uid === uid);
    if (!item) { setSavingUid(null); return false; }
    const payload = buildPayload(item.ex, setIdx + 1, data, item.supersetGroup ?? null);
    console.log('[workout_logs] completeSet payload:', payload);
    const { data: insertData, error } = await supabase.from('workout_logs').insert(payload).select('id').single();
    setSavingUid(null);
    if (error) {
      console.error('[workout_logs] completeSet error:', { message: error.message, code: error.code, details: error.details, hint: error.hint });
      return false;
    }
    const record = { ...buildSetRecord(item.ex, setIdx + 1, data), db_id: insertData.id, saved: true };
    updateActiveExercises(activeExercises.map(i =>
      i.uid === uid
        ? { ...i, logData: { sets: [...(i.logData.sets ?? []), record] }, activeSets: setIdx + 1 }
        : i
    ));
    return true;
  }

  async function handleSaveAll(uid, rows) {
    if (!user) return false;
    setSavingUid(uid);
    const item = activeExercises.find((i) => i.uid === uid);
    if (!item) { setSavingUid(null); return false; }
    const inserts = rows.map((row, i) => buildPayload(item.ex, i + 1, row, item.supersetGroup ?? null));
    console.log('[workout_logs] saveAll payloads:', inserts);
    const { data: insertData, error } = await supabase.from('workout_logs').insert(inserts).select('id');
    setSavingUid(null);
    if (error) {
      console.error('[workout_logs] saveAll error:', { message: error.message, code: error.code, details: error.details, hint: error.hint });
      return false;
    }
    const records = rows.map((row, i) => ({ ...buildSetRecord(item.ex, i + 1, row), db_id: insertData[i]?.id, saved: true }));
    updateActiveExercises(activeExercises.map(i =>
      i.uid === uid
        ? { ...i, logData: { sets: records }, activeSets: item.targetSets }
        : i
    ));
    return true;
  }

  async function handleSaveExit() {
    // If this was a Kratos Split session, mark the day complete
    if (activeWorkout?.source === 'kratos_split' && activeWorkout?.cycleId && activeWorkout?.sessionNum) {
      try {
        const { data: cycleData } = await supabase
          .from('cycles').select('completed_sessions').eq('id', activeWorkout.cycleId).single();
        const existing = Array.isArray(cycleData?.completed_sessions) ? cycleData.completed_sessions : [];
        if (!existing.includes(activeWorkout.sessionNum)) {
          await supabase.from('cycles')
            .update({ completed_sessions: [...existing, activeWorkout.sessionNum] })
            .eq('id', activeWorkout.cycleId);
        }
      } catch (err) {
        console.error('Failed to mark Kratos day complete:', err);
      }
    }
    endWorkout();
    setShowFinish(false);
  }

  async function handleDeleteExit() {
    if (user && activeWorkout?.startTime) {
      const since = new Date(activeWorkout.startTime).toISOString();
      await supabase.from('workout_logs').delete().eq('user_id', user.id).gte('logged_at', since);
    }
    endWorkout();
    setShowFinish(false);
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg }}>
      <HomeView
        onStart={handleStart}
        onLoadRoutine={handleLoadRoutine}
        onSaveRoutine={handleSaveRoutine}
        onStartKratosSession={handleStartKratosSession}
        onRemove={handleRemove}
        onAddExercise={handleAddExercise}
        onCompleteSet={handleCompleteSet}
        onSaveAll={handleSaveAll}
        onAddSet={handleAddSet}
        onDeleteSet={handleDeleteSet}
        onCreateSuperset={handleCreateSuperset}
        onFinish={() => setShowFinish(true)}
        savingUid={savingUid}
        onSwap={handleSwapExercise}
      />
      {isActive && showFinish && (
        <FinishModal
          activeExercises={activeExercises}
          startTime={startTime}
          workoutTitle={workoutTitle}
          onSaveExit={handleSaveExit}
          onDeleteExit={handleDeleteExit}
          onKeepGoing={() => setShowFinish(false)}
        />
      )}
    </div>
  );
}
