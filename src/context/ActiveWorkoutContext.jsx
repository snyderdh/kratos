import { createContext, useContext, useState, useEffect } from 'react';
import { C, FONTS } from '../theme';

const ActiveWorkoutContext = createContext(null);
const LS_KEY = 'kratos_active_workout';
const TERRA = '#C2622A';

export function useActiveWorkout() {
  return useContext(ActiveWorkoutContext);
}

// ── Conflict modal — shown when starting a workout while one is active ─
function ConflictModal({ currentTitle, onResume, onStartNew }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      backgroundColor: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        backgroundColor: C.surface, borderRadius: '16px',
        padding: '1.75rem 1.5rem', maxWidth: '380px', width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
      }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 500, color: C.text, fontFamily: FONTS.heading }}>
          Workout in Progress
        </h3>
        <p style={{ margin: '0 0 1.5rem', fontSize: '0.875rem', color: C.textSecondary, fontWeight: 300, lineHeight: 1.55 }}>
          "{currentTitle}" is still active. What would you like to do?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <button
            onClick={onResume}
            style={{
              width: '100%', padding: '0.8rem', borderRadius: '10px',
              border: 'none', backgroundColor: TERRA, color: '#fff',
              fontWeight: 400, fontSize: '0.875rem', cursor: 'pointer',
              fontFamily: FONTS.body,
            }}
          >
            Resume Current Workout
          </button>
          <button
            onClick={onStartNew}
            style={{
              width: '100%', padding: '0.8rem', borderRadius: '10px',
              border: `1.5px solid ${C.border}`, backgroundColor: 'transparent',
              color: C.text, fontWeight: 400, fontSize: '0.875rem',
              cursor: 'pointer', fontFamily: FONTS.body,
            }}
          >
            Discard & Start New
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Provider ────────────────────────────────────────────────────────────
export function ActiveWorkoutProvider({ children }) {
  const [activeWorkout, setActiveWorkout] = useState(() => {
    try {
      const s = localStorage.getItem(LS_KEY);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });

  const [pendingStart, setPendingStart] = useState(null);

  // Persist to localStorage on every change
  useEffect(() => {
    if (activeWorkout) {
      try { localStorage.setItem(LS_KEY, JSON.stringify(activeWorkout)); } catch {}
    } else {
      localStorage.removeItem(LS_KEY);
    }
  }, [activeWorkout]);

  // Start a workout — shows conflict dialog if one is already active
  function startWorkout(data) {
    if (activeWorkout) {
      setPendingStart(data);
      return false; // conflict — user must resolve
    }
    setActiveWorkout({ ...data, startTime: data.startTime ?? Date.now() });
    return true;
  }

  // Clear the active workout (call after all saves are done)
  function endWorkout() {
    setActiveWorkout(null);
  }

  // Called from MyWorkout.jsx after every set log/state change
  function updateActiveExercises(exercises) {
    setActiveWorkout(prev => prev ? { ...prev, activeExercises: exercises } : prev);
  }

  function updateTitle(title) {
    setActiveWorkout(prev => prev ? { ...prev, title } : prev);
  }

  const loggedSetCount = (activeWorkout?.activeExercises ?? [])
    .reduce((sum, item) => sum + (item.logData?.sets?.filter(s => s.saved)?.length ?? 0), 0);

  return (
    <ActiveWorkoutContext.Provider value={{
      activeWorkout,
      isActive: !!activeWorkout,
      loggedSetCount,
      startWorkout,
      endWorkout,
      updateActiveExercises,
      updateTitle,
    }}>
      {children}
      {pendingStart && (
        <ConflictModal
          currentTitle={activeWorkout?.title ?? 'Current Workout'}
          onResume={() => setPendingStart(null)}
          onStartNew={() => {
            setActiveWorkout({ ...pendingStart, startTime: Date.now() });
            setPendingStart(null);
          }}
        />
      )}
    </ActiveWorkoutContext.Provider>
  );
}
