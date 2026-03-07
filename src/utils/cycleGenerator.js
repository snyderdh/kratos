import { generateSingleDayRoutine, getBlendConfig } from './routineGenerator';

// ── Training split configs ─────────────────────────────────────────────
export const SPLITS = {
  ppl:        { label: 'Push / Pull / Legs', daysOptions: [3, 4, 5, 6], defaultDays: 3, description: 'Classic split. 3-day uses Full Body; 4-day adds a Full Body finisher; 5-day adds Upper/Lower.' },
  upperlower: { label: 'Upper / Lower',       daysOptions: [4],           defaultDays: 4, description: 'Trains upper and lower body on alternating days for balanced frequency.' },
  brosplit:   { label: 'Bro Split',           daysOptions: [5],           defaultDays: 5, description: 'One major muscle group per day with high volume per session.' },
  fullbody:   { label: 'Full Body',           daysOptions: [3],           defaultDays: 3, description: 'Trains all major muscle groups every session for maximum frequency.' },
};

// ── Day type → muscle groups ───────────────────────────────────────────
const DAY_MUSCLES = {
  push:      ['chest', 'shoulders', 'arms'],
  pull:      ['back', 'arms'],
  legs:      ['legs', 'core'],
  upper:     ['chest', 'back', 'shoulders', 'arms'],
  lower:     ['legs', 'core'],
  fullbody:  ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'],
  chest:     ['chest'],
  back:      ['back'],
  shoulders: ['shoulders'],
  arms:      ['arms'],
  rest:      [],
};

// ── Day type display meta ──────────────────────────────────────────────
export const DAY_TYPE_META = {
  push:      { label: 'Push',       color: '#2563eb', bg: '#eff6ff' },
  pull:      { label: 'Pull',       color: '#9333ea', bg: '#faf5ff' },
  legs:      { label: 'Legs',       color: '#16a34a', bg: '#f0fdf4' },
  upper:     { label: 'Upper',      color: '#0891b2', bg: '#ecfeff' },
  lower:     { label: 'Lower',      color: '#d97706', bg: '#fffbeb' },
  fullbody:  { label: 'Full Body',  color: '#FF6B2B', bg: '#fff7ed' },
  chest:     { label: 'Chest',      color: '#dc2626', bg: '#fef2f2' },
  back:      { label: 'Back',       color: '#9333ea', bg: '#faf5ff' },
  shoulders: { label: 'Shoulders',  color: '#2563eb', bg: '#eff6ff' },
  arms:      { label: 'Arms',       color: '#0891b2', bg: '#ecfeff' },
  rest:      { label: 'Rest',       color: '#9ca3af', bg: '#f9fafb' },
};

// ── Phase meta ────────────────────────────────────────────────────────
export const PHASE_META = {
  foundation: { label: 'Foundation', color: '#2563eb', bg: '#eff6ff', description: 'Build base strength and technique.' },
  build:      { label: 'Build',      color: '#16a34a', bg: '#f0fdf4', description: '+1 set per exercise for progressive overload.' },
  overload:   { label: 'Overload',   color: '#FF6B2B', bg: '#fff7ed', description: 'Peak intensity — +2 sets and higher reps.' },
  deload:     { label: 'Deload',     color: '#6b7280', bg: '#f9fafb', description: '40% volume reduction for active recovery.' },
};

// ── Phase schedule per cycle length ───────────────────────────────────
const PHASE_SCHEDULES = {
  4:  ['foundation', 'build', 'overload', 'deload'],
  6:  ['foundation', 'foundation', 'build', 'build', 'overload', 'deload'],
  8:  ['foundation', 'foundation', 'build', 'deload', 'build', 'overload', 'overload', 'deload'],
  10: ['foundation', 'foundation', 'build', 'deload', 'build', 'build', 'overload', 'deload', 'overload', 'deload'],
  12: ['foundation', 'foundation', 'build', 'deload', 'foundation', 'build', 'overload', 'deload', 'build', 'overload', 'overload', 'deload'],
};

// ── Weekly day templates (7 slots, Mon–Sun) ───────────────────────────
// PPL 3-day: Full Body ×3 (proper recovery between sessions)
// PPL 4-day: Push/Pull/Legs + Full Body finisher
// PPL 5-day: Push/Pull/Legs, then Upper/Lower for second frequency hit
// PPL 6-day: Classic PPL twice per week
const WEEK_TEMPLATES = {
  ppl: {
    3: ['fullbody', 'rest', 'fullbody', 'rest', 'fullbody', 'rest', 'rest'],
    4: ['push', 'pull', 'legs', 'fullbody', 'rest', 'rest', 'rest'],
    5: ['push', 'pull', 'legs', 'rest', 'upper', 'lower', 'rest'],
    6: ['push', 'pull', 'legs', 'push', 'pull', 'legs', 'rest'],
  },
  upperlower: {
    4: ['upper', 'lower', 'rest', 'upper', 'lower', 'rest', 'rest'],
  },
  brosplit: {
    5: ['chest', 'back', 'legs', 'shoulders', 'arms', 'rest', 'rest'],
  },
  fullbody: {
    3: ['fullbody', 'rest', 'fullbody', 'rest', 'fullbody', 'rest', 'rest'],
  },
};

// ── Reps bumper for overload phase ────────────────────────────────────
function bumpReps(repsStr, amount) {
  const match = repsStr.match(/^(\d+)-(\d+)$/);
  if (!match) return repsStr;
  return `${parseInt(match[1]) + amount}-${parseInt(match[2]) + amount}`;
}

// ── Apply phase modifier to exercise list ─────────────────────────────
function applyPhase(exercises, phase) {
  return exercises.map((ex) => {
    if (ex.isMobility) return ex;
    let { sets, reps } = ex;
    if (phase === 'build') {
      sets = sets + 1;
    } else if (phase === 'overload') {
      sets = sets + 2;
      reps = bumpReps(reps, 2);
    } else if (phase === 'deload') {
      sets = Math.max(1, Math.round(sets * 0.6));
    }
    return { ...ex, sets, reps };
  });
}

// ── Time estimation helpers ────────────────────────────────────────────
function parseAvgReps(repsStr) {
  if (repsStr === '30s') return 1;
  const match = repsStr.match(/^(\d+)-(\d+)$/);
  if (match) return (parseInt(match[1]) + parseInt(match[2])) / 2;
  return parseInt(repsStr) || 10;
}

function parseRestSec(restStr) {
  return parseInt(restStr) || 60;
}

function estimateMinutes(exercises) {
  if (!exercises || exercises.length === 0) return 0;
  const SEC_PER_REP = 4;
  const TRANSITION_SEC = 15;
  let total = 0;
  exercises.forEach((ex) => {
    const avgReps = parseAvgReps(ex.reps);
    const restSec = parseRestSec(ex.rest);
    const workPerSet = ex.reps === '30s' ? 30 : avgReps * SEC_PER_REP;
    total += ex.sets * (workPerSet + restSec) + TRANSITION_SEC;
  });
  return Math.ceil(total / 60);
}

// ── Exercise count from session length ────────────────────────────────
// Default counts when no session length is given — sized per day type
const BASE_EXERCISE_COUNT = {
  fullbody:  6,
  upper:     6,
  lower:     5,
  push:      5,
  pull:      5,
  legs:      5,
  chest:     5,
  back:      5,
  shoulders: 4,
  arms:      4,
  rest:      0,
};

export function calculateExerciseCount(sessionMins, goals, dayType) {
  if (!sessionMins) {
    return BASE_EXERCISE_COUNT[dayType] ?? 6;
  }
  const blendConfig = getBlendConfig(goals);
  const avgReps = parseAvgReps(blendConfig.reps);
  const secPerEx = blendConfig.sets * (avgReps * 4 + blendConfig.restSeconds) + 15;
  const calculated = Math.floor((sessionMins * 60) / secPerEx);

  // Spec-driven minimums
  if (sessionMins >= 75) return Math.max(9, calculated);
  if (sessionMins >= 60) return Math.max(7, calculated);
  if (sessionMins >= 45) return Math.max(5, calculated);
  return Math.max(3, calculated);
}

// ── Main generateCycle export ─────────────────────────────────────────
export function generateCycle({ title, cycleLength, split, daysPerWeek, goals, equipment, sessionMins = null }) {
  const phaseSchedule = PHASE_SCHEDULES[cycleLength] ?? PHASE_SCHEDULES[8];
  const splitTemplates = WEEK_TEMPLATES[split] ?? WEEK_TEMPLATES.ppl;
  const weekTemplate = splitTemplates[daysPerWeek] ?? Object.values(splitTemplates)[0] ?? Array(7).fill('rest');

  const weeks = [];

  for (let w = 0; w < cycleLength; w++) {
    const phase = phaseSchedule[w] ?? 'foundation';
    const days = [];
    let prevTrainingExerciseIds = []; // Exclude from next training day to avoid repeats

    weekTemplate.forEach((dayType, dayIdx) => {
      if (dayType === 'rest') {
        // Reset exclusion list after a rest day — recovered, repeats are fine
        prevTrainingExerciseIds = [];
        days.push({
          dayNum: dayIdx + 1,
          dayType: 'rest',
          dayLabel: 'Rest',
          isRest: true,
          exercises: [],
          sessionMins: null,
          estimatedMinutes: 0,
        });
        return;
      }

      const muscleGroups = DAY_MUSCLES[dayType] ?? [];
      const exerciseCount = calculateExerciseCount(sessionMins, goals, dayType);

      const routine = generateSingleDayRoutine({
        goals,
        equipment,
        muscleGroups,
        exerciseCount,
        excludeIds: prevTrainingExerciseIds,
      });

      const phasedExercises = applyPhase(routine.exercises, phase);

      // Track exercise IDs so the next day avoids repeats
      prevTrainingExerciseIds = phasedExercises
        .filter((ex) => !ex.isMobility)
        .map((ex) => ex.id);

      days.push({
        dayNum: dayIdx + 1,
        dayType,
        dayLabel: DAY_TYPE_META[dayType]?.label ?? dayType,
        isRest: false,
        exercises: phasedExercises,
        blendLabel: routine.blendLabel,
        sessionMins,
        estimatedMinutes: estimateMinutes(phasedExercises),
      });
    });

    weeks.push({ weekNum: w + 1, phase, days });
  }

  return {
    title: title || 'My Training Cycle',
    split,
    splitLabel: SPLITS[split]?.label ?? split,
    cycleLength,
    daysPerWeek,
    goals,
    equipment,
    sessionMins,
    weeks,
    generatedAt: new Date().toISOString(),
  };
}

// ── Regenerate a single day with a new session length ─────────────────
export function regenerateSingleDay(cycle, weekIdx, dayIdx, newSessionMins) {
  const week = cycle.weeks[weekIdx];
  if (!week) return cycle;
  const day = week.days[dayIdx];
  if (!day || day.isRest) return cycle;

  const muscleGroups = DAY_MUSCLES[day.dayType] ?? [];
  const exerciseCount = calculateExerciseCount(newSessionMins, cycle.goals, day.dayType);

  const routine = generateSingleDayRoutine({
    goals: cycle.goals,
    equipment: cycle.equipment,
    muscleGroups,
    exerciseCount,
  });

  const phasedExercises = applyPhase(routine.exercises, week.phase);

  const newDay = {
    ...day,
    exercises: phasedExercises,
    sessionMins: newSessionMins,
    estimatedMinutes: estimateMinutes(phasedExercises),
    blendLabel: routine.blendLabel,
  };

  const newWeeks = cycle.weeks.map((w, wi) =>
    wi !== weekIdx ? w : { ...w, days: w.days.map((d, di) => (di !== dayIdx ? d : newDay)) }
  );

  return { ...cycle, weeks: newWeeks };
}
