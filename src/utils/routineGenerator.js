import { exercises } from '../data/exercises';

// ── Blend configs keyed by sorted goal combo ─────────────────────────────
const blendConfigs = {
  // Single goals
  strength:    { sets: 5, reps: '3-5',   restSeconds: 180, supersets: false, label: 'Strength',    description: 'Heavy, low-rep training to build maximal strength.' },
  hypertrophy: { sets: 4, reps: '8-12',  restSeconds: 90,  supersets: false, label: 'Hypertrophy', description: 'Moderate weight, higher volume for muscle growth.' },
  endurance:   { sets: 3, reps: '15-20', restSeconds: 45,  supersets: false, label: 'Endurance',   description: 'Lighter weight, high reps for muscular endurance.' },
  power:       { sets: 5, reps: '3-5',   restSeconds: 240, supersets: false, label: 'Power',       description: 'Explosive, heavy training for athletic power.' },
  mobility:    { sets: 2, reps: '30s',   restSeconds: 15,  supersets: false, label: 'Mobility',    description: 'Flexibility and mobility work to improve range of motion.' },

  // Two-goal blends (key = sorted goals joined by '+')
  'power+strength':        { sets: 5, reps: '3-5',   restSeconds: 240, supersets: false, label: 'Strength & Power',        description: 'Heavy compound work focused on maximal strength and explosive power.' },
  'hypertrophy+strength':  { sets: 4, reps: '5-10',  restSeconds: 120, supersets: false, label: 'Strength & Hypertrophy',  description: 'Build size and strength simultaneously with moderate-heavy loading.' },
  'endurance+hypertrophy': { sets: 3, reps: '12-20', restSeconds: 60,  supersets: true,  label: 'Hypertrophy & Endurance', description: 'High-volume supersets to maximize muscle fatigue and growth.' },
  'endurance+strength':    { sets: 4, reps: '6-12',  restSeconds: 75,  supersets: false, label: 'Strength & Endurance',    description: 'Strength-focused training with higher rep ranges for conditioning.' },
  'endurance+power':       { sets: 3, reps: '8-12',  restSeconds: 60,  supersets: false, label: 'Power & Endurance',       description: 'Explosive reps with moderate volume for athletic conditioning.' },
  'hypertrophy+power':     { sets: 4, reps: '5-8',   restSeconds: 120, supersets: false, label: 'Power & Hypertrophy',     description: 'Heavier volume work to build powerful, dense muscle.' },

  // Three-goal blends
  'endurance+hypertrophy+strength': { sets: 4, reps: '8-15', restSeconds: 75, supersets: true, label: 'Strength, Hypertrophy & Endurance', description: 'Comprehensive training combining strength, size, and stamina.' },
  'endurance+power+strength':       { sets: 4, reps: '6-12', restSeconds: 75, supersets: true, label: 'Strength, Power & Endurance',       description: 'Athletic conditioning combining strength, power, and stamina.' },
  'hypertrophy+power+strength':     { sets: 4, reps: '5-10', restSeconds: 120, supersets: false, label: 'Strength, Power & Hypertrophy',   description: 'Heavy, high-volume training for powerful, muscular development.' },

  // Fallback for any unhandled combo
  default: { sets: 3, reps: '10-15', restSeconds: 60, supersets: true, label: 'Blended Circuit', description: 'Full circuit training combining multiple training modalities.' },
};

// ── Mobility warmup exercise pool ────────────────────────────────────────
const mobilityExercises = [
  { id: 'mob-1', name: 'Hip 90/90 Stretch',       muscleGroup: 'legs',      equipment: 'bodyweight', difficulty: 'beginner' },
  { id: 'mob-2', name: "World's Greatest Stretch", muscleGroup: 'core',      equipment: 'bodyweight', difficulty: 'beginner' },
  { id: 'mob-3', name: 'Cat-Cow',                  muscleGroup: 'core',      equipment: 'bodyweight', difficulty: 'beginner' },
  { id: 'mob-4', name: 'Thoracic Rotations',       muscleGroup: 'back',      equipment: 'bodyweight', difficulty: 'beginner' },
  { id: 'mob-5', name: 'Shoulder Dislocates',      muscleGroup: 'shoulders', equipment: 'bodyweight', difficulty: 'beginner' },
  { id: 'mob-6', name: 'Ankle Circles',            muscleGroup: 'legs',      equipment: 'bodyweight', difficulty: 'beginner' },
  { id: 'mob-7', name: 'Pigeon Pose',              muscleGroup: 'legs',      equipment: 'bodyweight', difficulty: 'beginner' },
  { id: 'mob-8', name: 'Doorway Pec Stretch',      muscleGroup: 'chest',     equipment: 'bodyweight', difficulty: 'beginner' },
];

// ── Antagonist pairs for superset creation ───────────────────────────────
const ANTAGONIST_PAIRS = [
  ['chest', 'back'],
  ['shoulders', 'arms'],
  ['legs', 'core'],
];

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Returns the blend config for a given goals array
export function getBlendConfig(goals) {
  const mainGoals = goals.filter((g) => g !== 'mobility');
  if (mainGoals.length === 0) return blendConfigs.mobility;
  if (mainGoals.length === 1) return blendConfigs[mainGoals[0]] ?? blendConfigs.default;
  const key = [...mainGoals].sort().join('+');
  return blendConfigs[key] ?? blendConfigs.default;
}

function getBlendLabel(goals) {
  const config = getBlendConfig(goals);
  if (goals.includes('mobility') && goals.length > 1) {
    return `Mobility + ${config.label}`;
  }
  return config.label;
}

function getBlendDescription(goals) {
  const config = getBlendConfig(goals);
  if (goals.includes('mobility') && goals.length > 1) {
    return `Starts with a mobility warmup. ${config.description}`;
  }
  return config.description;
}

// Pair antagonist muscle groups into supersets and reorder exercises so partners are adjacent
function applySupersetsToExercises(exercises) {
  const result = exercises.map((ex) => ({ ...ex, supersetGroup: null }));
  const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
  let labelIdx = 0;
  const paired = new Set();

  for (const [m1, m2] of ANTAGONIST_PAIRS) {
    const idx1 = result.findIndex((ex, i) => !paired.has(i) && ex.muscleGroup === m1);
    const idx2 = result.findIndex((ex, i) => !paired.has(i) && ex.muscleGroup === m2);
    if (idx1 !== -1 && idx2 !== -1 && labelIdx < labels.length) {
      const label = labels[labelIdx++];
      result[idx1] = { ...result[idx1], supersetGroup: label };
      result[idx2] = { ...result[idx2], supersetGroup: label };
      paired.add(idx1);
      paired.add(idx2);
    }
  }

  // Reorder so superset partners are adjacent
  const groups = {};
  result.forEach((ex) => {
    if (ex.supersetGroup) {
      if (!groups[ex.supersetGroup]) groups[ex.supersetGroup] = [];
      groups[ex.supersetGroup].push(ex);
    }
  });

  const reordered = [];
  const seenGroups = new Set();
  result.forEach((ex) => {
    if (!ex.supersetGroup) {
      reordered.push(ex);
    } else if (!seenGroups.has(ex.supersetGroup)) {
      seenGroups.add(ex.supersetGroup);
      reordered.push(...groups[ex.supersetGroup]);
    }
  });

  return reordered;
}

function pickExercises(targetMuscles, availableEquipment, primaryGoal, count) {
  const filtered = exercises.filter(
    (ex) =>
      targetMuscles.includes(ex.muscleGroup) &&
      availableEquipment.includes(ex.equipment)
  );

  const sorted = [...filtered].sort((a, b) => {
    if (primaryGoal === 'strength' || primaryGoal === 'power') {
      const diff = { advanced: 0, intermediate: 1, beginner: 2 };
      return diff[a.difficulty] - diff[b.difficulty];
    }
    if (primaryGoal === 'endurance') {
      const equipPriority = { bodyweight: 0, cables: 1, dumbbells: 2, barbell: 3 };
      return equipPriority[a.equipment] - equipPriority[b.equipment];
    }
    return 0;
  });

  return shuffleArray(sorted).slice(0, count);
}

function decorate(ex, config) {
  return {
    ...ex,
    sets: config.sets,
    reps: config.reps,
    rest: `${config.restSeconds}s`,
  };
}

export function generateSingleDayRoutine({ goals, equipment, muscleGroups, exerciseCount }) {
  const blendConfig = getBlendConfig(goals);
  const mainGoals = goals.filter((g) => g !== 'mobility');

  // Mobility warmup exercises (always bodyweight, 2 sets, 30s hold, 15s rest)
  const mobilityExs = goals.includes('mobility')
    ? shuffleArray(mobilityExercises).slice(0, 2).map((ex) => ({
        ...ex,
        sets: 2,
        reps: '30s',
        rest: '15s',
        isMobility: true,
        supersetGroup: null,
      }))
    : [];

  if (mainGoals.length === 0) {
    return {
      goals,
      blendLabel: 'Mobility Warmup',
      blendDescription: blendConfigs.mobility.description,
      exercises: mobilityExs,
      generatedAt: new Date().toISOString(),
    };
  }

  const primaryGoal = mainGoals[0];
  const picked = pickExercises(muscleGroups, equipment, primaryGoal, exerciseCount);
  const mainExercises = picked.map((ex) => ({ ...decorate(ex, blendConfig), supersetGroup: null }));
  const orderedMain = blendConfig.supersets
    ? applySupersetsToExercises(mainExercises)
    : mainExercises;

  return {
    goals,
    blendLabel: getBlendLabel(goals),
    blendDescription: getBlendDescription(goals),
    exercises: [...mobilityExs, ...orderedMain],
    generatedAt: new Date().toISOString(),
  };
}

// Returns all alternatives for the replace modal (same muscle group, different exercise)
export function getAlternativeExercises({ exercise, equipment, excludeIds, goals }) {
  const mainGoals = (goals || []).filter((g) => g !== 'mobility');
  const primaryGoal = mainGoals[0] || 'hypertrophy';
  const config = getBlendConfig(goals && goals.length > 0 ? goals : [primaryGoal]);

  const pool = exercises.filter(
    (ex) =>
      ex.muscleGroup === exercise.muscleGroup &&
      equipment.includes(ex.equipment) &&
      !excludeIds.includes(ex.id)
  );

  const sorted = [...pool].sort((a, b) => {
    if (primaryGoal === 'strength' || primaryGoal === 'power') {
      const diff = { advanced: 0, intermediate: 1, beginner: 2 };
      return diff[a.difficulty] - diff[b.difficulty];
    }
    if (primaryGoal === 'endurance') {
      const equipPriority = { bodyweight: 0, cables: 1, dumbbells: 2, barbell: 3 };
      return equipPriority[a.equipment] - equipPriority[b.equipment];
    }
    return 0;
  });

  return sorted.map((ex) => decorate(ex, config));
}
