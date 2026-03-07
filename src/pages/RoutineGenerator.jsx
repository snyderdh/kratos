import { useState } from 'react';
import { generateSingleDayRoutine, getReplacementExercise } from '../utils/routineGenerator';

const GOALS = [
  { value: 'strength', label: 'Strength', desc: '5 sets × 3-5 reps | Heavy loads' },
  { value: 'hypertrophy', label: 'Hypertrophy', desc: '4 sets × 8-12 reps | Muscle growth' },
  { value: 'endurance', label: 'Endurance', desc: '3 sets × 15-20 reps | High volume' },
];

const EQUIPMENT = [
  { value: 'barbell', label: 'Barbell' },
  { value: 'dumbbells', label: 'Dumbbells' },
  { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'cables', label: 'Cables' },
];

const MUSCLES = [
  { value: 'chest', label: 'Chest' },
  { value: 'back', label: 'Back' },
  { value: 'legs', label: 'Legs' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'arms', label: 'Arms' },
  { value: 'core', label: 'Core' },
];

const COUNT_OPTIONS = [3, 4, 5, 6, 7, 8];

const orange = '#FF6B2B';
const orangeHover = '#e55a1f';

const difficultyBadge = {
  beginner: { bg: '#dcfce7', text: '#16a34a' },
  intermediate: { bg: '#fef9c3', text: '#ca8a04' },
  advanced: { bg: '#fee2e2', text: '#dc2626' },
};

function ReplaceIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4v6h6" />
      <path d="M23 20v-6h-6" />
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15" />
    </svg>
  );
}

export default function RoutineGenerator() {
  const [goal, setGoal] = useState('hypertrophy');
  const [equipment, setEquipment] = useState(['barbell', 'dumbbells']);
  const [muscleGroups, setMuscleGroups] = useState(['chest', 'back', 'legs', 'shoulders']);
  const [exerciseCount, setExerciseCount] = useState(5);
  const [routine, setRoutine] = useState(null);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  function toggleEquipment(val) {
    setEquipment((prev) =>
      prev.includes(val) ? prev.filter((e) => e !== val) : [...prev, val]
    );
  }

  function toggleMuscle(val) {
    setMuscleGroups((prev) =>
      prev.includes(val) ? prev.filter((m) => m !== val) : [...prev, val]
    );
  }

  function handleGenerate() {
    if (equipment.length === 0) {
      setError('Select at least one equipment type.');
      return;
    }
    if (muscleGroups.length === 0) {
      setError('Select at least one muscle group.');
      return;
    }
    setError('');
    setSaveSuccess(false);
    const result = generateSingleDayRoutine({ goal, equipment, muscleGroups, exerciseCount });
    setRoutine(result);
    setTimeout(() => {
      document.getElementById('routine-output')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  function handleReplace(index) {
    if (!routine) return;
    const excludeIds = routine.exercises.map((ex) => ex.id);
    const replacement = getReplacementExercise({
      exercise: routine.exercises[index],
      equipment,
      muscleGroups,
      excludeIds,
      goal,
    });
    if (!replacement) return;
    setRoutine((prev) => {
      const updated = [...prev.exercises];
      updated[index] = replacement;
      return { ...prev, exercises: updated };
    });
  }

  function handleSave() {
    if (!routine) return;
    const saved = (() => {
      try {
        return JSON.parse(localStorage.getItem('kratos-saved-routines') || '[]');
      } catch {
        return [];
      }
    })();

    const entry = {
      id: Date.now(),
      goal: routine.goal,
      savedAt: new Date().toISOString(),
      exercises: routine.exercises,
    };

    localStorage.setItem('kratos-saved-routines', JSON.stringify([entry, ...saved]));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  }

  return (
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

        {/* Goal */}
        <section style={{ marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.75rem' }}>
            Training Goal
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
            {GOALS.map((g) => {
              const active = goal === g.value;
              return (
                <button
                  key={g.value}
                  onClick={() => setGoal(g.value)}
                  style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    border: `2px solid ${active ? orange : '#e5e7eb'}`,
                    backgroundColor: active ? '#fff5f0' : '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontWeight: 700, color: active ? orange : '#111827', fontSize: '0.95rem', marginBottom: '0.2rem' }}>{g.label}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{g.desc}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Equipment */}
        <section style={{ marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.75rem' }}>
            Available Equipment
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            {EQUIPMENT.map((eq) => {
              const active = equipment.includes(eq.value);
              return (
                <button
                  key={eq.value}
                  onClick={() => toggleEquipment(eq.value)}
                  style={{
                    padding: '0.45rem 1rem',
                    borderRadius: '20px',
                    border: `2px solid ${active ? orange : '#e5e7eb'}`,
                    backgroundColor: active ? '#fff5f0' : '#f9fafb',
                    color: active ? orange : '#374151',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {eq.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Muscle Groups */}
        <section style={{ marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.75rem' }}>
            Target Muscle Groups
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            {MUSCLES.map((m) => {
              const active = muscleGroups.includes(m.value);
              return (
                <button
                  key={m.value}
                  onClick={() => toggleMuscle(m.value)}
                  style={{
                    padding: '0.45rem 1rem',
                    borderRadius: '20px',
                    border: `2px solid ${active ? orange : '#e5e7eb'}`,
                    backgroundColor: active ? '#fff5f0' : '#f9fafb',
                    color: active ? orange : '#374151',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Exercise Count */}
        <section style={{ marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.75rem' }}>
            Number of Exercises
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {COUNT_OPTIONS.map((n) => {
              const active = exerciseCount === n;
              return (
                <button
                  key={n}
                  onClick={() => setExerciseCount(n)}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '8px',
                    border: `2px solid ${active ? orange : '#e5e7eb'}`,
                    backgroundColor: active ? orange : '#f9fafb',
                    color: active ? '#ffffff' : '#374151',
                    fontWeight: 800,
                    fontSize: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </section>

        {error && (
          <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>
        )}

        <button
          onClick={handleGenerate}
          style={{
            width: '100%',
            padding: '1rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: orange,
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '1rem',
            letterSpacing: '0.5px',
            cursor: 'pointer',
            transition: 'background-color 0.15s',
          }}
          onMouseOver={(e) => (e.target.style.backgroundColor = orangeHover)}
          onMouseOut={(e) => (e.target.style.backgroundColor = orange)}
        >
          Generate Routine
        </button>
      </div>

      {/* Output */}
      {routine && (
        <div id="routine-output">
          <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#111827' }}>
                Your {routine.goal} Routine
              </h2>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.2rem' }}>{routine.goalDescription}</p>
            </div>
            <span style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: '#fff5f0',
              color: orange,
              fontWeight: 700,
              fontSize: '0.8rem',
              border: `1px solid ${orange}`,
            }}>
              {routine.goal}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {routine.exercises.map((ex, i) => {
              const diff = difficultyBadge[ex.difficulty];
              return (
                <div
                  key={`${ex.id}-${i}`}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderLeft: `4px solid ${orange}`,
                    borderRadius: '10px',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: orange, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Exercise #{i + 1}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, color: '#111827', fontSize: '1rem', marginBottom: '0.4rem' }}>{ex.name}</div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                        backgroundColor: '#f3f4f6', color: '#6b7280',
                      }}>
                        {ex.equipment}
                      </span>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                        backgroundColor: '#f3f4f6', color: '#6b7280',
                      }}>
                        {ex.muscleGroup}
                      </span>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                        backgroundColor: diff.bg, color: diff.text,
                      }}>
                        {ex.difficulty}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: orange }}>{ex.sets}</div>
                      <div style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>sets</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>{ex.reps}</div>
                      <div style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>reps</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#6b7280' }}>{ex.rest}</div>
                      <div style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>rest</div>
                    </div>
                    <button
                      onClick={() => handleReplace(i)}
                      title="Replace exercise"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                        backgroundColor: '#f9fafb',
                        color: '#6b7280',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.borderColor = orange;
                        e.currentTarget.style.color = orange;
                        e.currentTarget.style.backgroundColor = '#fff5f0';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                        e.currentTarget.style.color = '#6b7280';
                        e.currentTarget.style.backgroundColor = '#f9fafb';
                      }}
                    >
                      <ReplaceIcon />
                      Replace
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={handleGenerate}
              style={{
                padding: '0.7rem 1.4rem',
                borderRadius: '8px',
                border: `2px solid ${orange}`,
                backgroundColor: 'transparent',
                color: orange,
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#fff5f0';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Regenerate
            </button>

            <button
              onClick={handleSave}
              style={{
                padding: '0.7rem 1.4rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: orange,
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'background-color 0.15s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = orangeHover)}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = orange)}
            >
              Save Routine
            </button>

            {saveSuccess && (
              <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.875rem' }}>
                ✓ Routine saved!
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
