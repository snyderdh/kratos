import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useActiveWorkout } from '../context/ActiveWorkoutContext';
import { supabase } from '../supabase';
import { C, FONTS, card } from '../theme';
import { AddExercisePanel, BuilderCard } from './MyWorkout';

const TERRA = '#C2622A';

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

function getDefaultTitle() {
  const now = new Date();
  const month = now.toLocaleString('default', { month: 'short' });
  const day = now.getDate();
  return `${month} ${day} · Workout`;
}

export default function BuildWorkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isActive, startWorkout } = useActiveWorkout();

  const [exercises, setExercises] = useState([]);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);

  function addExercise(exData) {
    setExercises(prev => [...prev, {
      uid: crypto.randomUUID(),
      ex: exData,
      targetSets: 3,
      supersetGroup: null,
      supersetLabel: null,
    }]);
  }

  function removeExercise(uid) {
    setExercises(prev => {
      const removing = prev.find(i => i.uid === uid);
      return prev.filter(i => i.uid !== uid).map(i => {
        if (removing?.supersetGroup && i.supersetGroup === removing.supersetGroup)
          return { ...i, supersetGroup: null, supersetLabel: null };
        return i;
      });
    });
  }

  function addSet(uid) {
    setExercises(prev => prev.map(i => i.uid === uid ? { ...i, targetSets: i.targetSets + 1 } : i));
  }

  function createSuperset(currentUid, newExData) {
    const letter = nextSupersetGroup(exercises);
    setExercises(prev => {
      const idx = prev.findIndex(i => i.uid === currentUid);
      if (idx === -1) return prev;
      const result = prev.map(i =>
        i.uid === currentUid
          ? { ...i, supersetGroup: letter, supersetLabel: letter + '1' }
          : i
      );
      result.splice(idx + 1, 0, {
        uid: crypto.randomUUID(),
        ex: newExData,
        targetSets: result[idx].targetSets,
        supersetGroup: letter,
        supersetLabel: letter + '2',
      });
      return [...result];
    });
  }

  async function handleSaveRoutine() {
    if (!user || !saveName.trim()) return;
    setSaving(true);
    const exData = exercises.map(ex => ({
      id: ex.ex.id, name: ex.ex.name, muscleGroup: ex.ex.muscleGroup,
      equipment: ex.ex.equipment, trackingType: ex.ex.trackingType, defaultSets: ex.targetSets,
    }));
    const { error } = await supabase.from('custom_routines').insert({
      user_id: user.id, title: saveName.trim(), exercises: exData,
    });
    setSaving(false);
    if (!error) {
      setShowSaveForm(false);
      setSaveName('');
      setExercises([]);
      navigate('/routines');
    }
  }

  function handleStartWorkout() {
    const exItems = exercises.map(ex => ({
      ...ex,
      logData: { sets: [] },
      activeSets: 0,
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
    navigate('/active');
  }

  const groups = groupItems(exercises);

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '3.5rem 1.5rem 8rem' }}>

      {/* Resume banner when a workout is already in progress */}
      {isActive && (
        <div
          onClick={() => navigate('/active')}
          style={{
            ...card,
            padding: '0.75rem 1.125rem',
            marginBottom: '1.5rem',
            borderLeft: `3px solid ${TERRA}`,
            cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.82rem', color: TERRA, fontWeight: 400 }}>Workout in progress</span>
          <span style={{ fontSize: '0.78rem', color: TERRA, fontWeight: 500 }}>Resume →</span>
        </div>
      )}

      {/* Page heading */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.58rem', fontWeight: 700, color: TERRA, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem', fontFamily: FONTS.body }}>
          Build
        </div>
        <h1 style={{ fontFamily: FONTS.heading, fontStyle: 'italic', fontSize: '1.6rem', fontWeight: 400, color: C.text, margin: 0, lineHeight: 1.2 }}>
          Build My Own Workout
        </h1>
      </div>

      {/* Exercise list */}
      {exercises.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem 1.5rem', color: C.textSecondary }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#F5EDE6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.5rem' }}>💪</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 300, marginBottom: '0.25rem', color: C.text }}>Build your workout</div>
          <div style={{ fontSize: '0.75rem', fontWeight: 300, lineHeight: 1.6 }}>Add exercises below. You can save as a routine or start right away.</div>
        </div>
      ) : (
        <div style={{ marginBottom: '0.75rem' }}>
          {groups.map(group => {
            if (group.type === 'single') {
              return (
                <BuilderCard
                  key={group.item.uid}
                  item={group.item}
                  onRemove={removeExercise}
                  onAddSet={addSet}
                  onCreateSuperset={createSuperset}
                />
              );
            }
            return (
              <div key={group.group} style={{ borderLeft: `3px solid ${TERRA}`, borderRadius: '10px', paddingLeft: '0.625rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 600, color: TERRA, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Superset {group.group}</span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: `${TERRA}30` }} />
                </div>
                {group.items.map(item => (
                  <BuilderCard
                    key={item.uid}
                    item={item}
                    onRemove={removeExercise}
                    onAddSet={addSet}
                    onCreateSuperset={createSuperset}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Add exercise */}
      <button
        onClick={() => setShowAddPanel(true)}
        style={{
          width: '100%', padding: '0.65rem', borderRadius: '8px',
          border: `1.5px dashed ${C.border}`, backgroundColor: 'transparent',
          color: C.textSecondary, fontSize: '0.875rem', cursor: 'pointer',
          fontFamily: FONTS.body, fontWeight: 300, marginBottom: '1rem',
        }}
      >
        + Add Exercise
      </button>

      {/* CTAs */}
      {exercises.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {showSaveForm ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  placeholder="Routine name…"
                  autoFocus
                  style={{
                    flex: 1, padding: '0.65rem 0.75rem', borderRadius: '8px',
                    border: `1.5px solid ${C.border}`, backgroundColor: C.bg,
                    color: C.text, fontSize: '1rem', fontFamily: FONTS.body, outline: 'none',
                  }}
                />
                <button
                  onClick={() => { setShowSaveForm(false); setSaveName(''); }}
                  style={{ padding: '0.65rem 0.5rem', border: 'none', background: 'none', color: C.textSecondary, cursor: 'pointer', fontFamily: FONTS.body, flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>
              <button
                onClick={handleSaveRoutine}
                disabled={!saveName.trim() || saving}
                style={{
                  width: '100%', padding: '0.8rem', borderRadius: '10px',
                  border: `1.5px solid ${C.border}`, backgroundColor: 'transparent',
                  color: C.text, fontWeight: 400, fontSize: '0.9rem',
                  cursor: (!saveName.trim() || saving) ? 'default' : 'pointer',
                  fontFamily: FONTS.body, opacity: (!saveName.trim() || saving) ? 0.6 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Save to My Routines'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setShowSaveForm(true); setSaveName(getDefaultTitle().replace(' · Workout', ' Routine')); }}
              style={{
                width: '100%', padding: '0.8rem', borderRadius: '10px',
                border: `1.5px solid ${C.border}`, backgroundColor: 'transparent',
                color: C.text, fontWeight: 400, fontSize: '0.9rem',
                cursor: 'pointer', fontFamily: FONTS.body,
              }}
            >
              Save to My Routines
            </button>
          )}
          <button
            onClick={handleStartWorkout}
            style={{
              width: '100%', padding: '0.875rem', borderRadius: '10px',
              border: 'none', backgroundColor: TERRA, color: '#fff',
              fontWeight: 400, fontSize: '1rem', cursor: 'pointer',
              fontFamily: FONTS.body, boxShadow: '0 2px 12px rgba(194,98,42,0.25)',
            }}
          >
            Start Workout →
          </button>
        </div>
      )}

      {showAddPanel && (
        <AddExercisePanel
          onAdd={(exData) => { addExercise(exData); setShowAddPanel(false); }}
          onClose={() => setShowAddPanel(false)}
        />
      )}
    </div>
  );
}
