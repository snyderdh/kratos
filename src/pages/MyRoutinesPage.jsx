import { useNavigate } from 'react-router-dom';
import { useActiveWorkout } from '../context/ActiveWorkoutContext';
import { supabase } from '../supabase';
import { C, FONTS, card } from '../theme';
import { SavedRoutinesTab } from './MyWorkout';

const TERRA = '#C2622A';

export default function MyRoutinesPage() {
  const navigate = useNavigate();
  const { isActive, startWorkout } = useActiveWorkout();

  function handleLoadRoutine(routine) {
    const exercises = (routine.exercises ?? []).map((ex) => ({
      uid:           crypto.randomUUID(),
      ex:            { id: ex.id ?? null, name: ex.name, muscleGroup: ex.muscleGroup ?? '', equipment: ex.equipment ?? '', trackingType: ex.trackingType ?? 'reps' },
      targetSets:    ex.defaultSets ?? 3,
      logData:       { sets: [] },
      activeSets:    0,
      supersetGroup: null,
      supersetLabel: null,
    }));
    startWorkout({
      title:           routine.title ?? routine.name ?? '',
      source:          'saved_routine',
      activeExercises: exercises,
      cycleId:         null,
      weekNumber:      0,
      dayType:         'custom',
      weekIdx: null, dayIdx: null, sessionNum: null,
    });
    supabase.from('custom_routines').update({ last_used_at: new Date().toISOString() }).eq('id', routine.id).then(() => {});
    navigate('/active');
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '3.5rem 1.5rem' }}>

      {/* Resume banner */}
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

      {/* Heading */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.58rem', fontWeight: 700, color: TERRA, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem', fontFamily: FONTS.body }}>
          My Routines
        </div>
        <h1 style={{ fontFamily: FONTS.heading, fontStyle: 'italic', fontSize: '1.6rem', fontWeight: 400, color: C.text, margin: 0, lineHeight: 1.2 }}>
          Saved Routines
        </h1>
      </div>

      <SavedRoutinesTab onLoadRoutine={handleLoadRoutine} />
    </div>
  );
}
