import { exercises } from '../data/exercises';

const goalConfig = {
  strength: {
    sets: 5,
    reps: '3-5',
    restSeconds: 180,
    label: 'Strength',
    description: 'Heavy, low-rep training to build maximal strength.',
  },
  hypertrophy: {
    sets: 4,
    reps: '8-12',
    restSeconds: 90,
    label: 'Hypertrophy',
    description: 'Moderate weight, higher volume for muscle growth.',
  },
  endurance: {
    sets: 3,
    reps: '15-20',
    restSeconds: 45,
    label: 'Endurance',
    description: 'Lighter weight, high reps for muscular endurance.',
  },
};

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickExercises(targetMuscles, availableEquipment, goal, count) {
  const filtered = exercises.filter(
    (ex) =>
      targetMuscles.includes(ex.muscleGroup) &&
      availableEquipment.includes(ex.equipment)
  );

  const sorted = [...filtered].sort((a, b) => {
    if (goal === 'strength') {
      const diff = { advanced: 0, intermediate: 1, beginner: 2 };
      return diff[a.difficulty] - diff[b.difficulty];
    }
    if (goal === 'endurance') {
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

export function generateSingleDayRoutine({ goal, equipment, muscleGroups, exerciseCount }) {
  const config = goalConfig[goal];
  if (!config) return null;

  const picked = pickExercises(muscleGroups, equipment, goal, exerciseCount);
  const exerciseList = picked.map((ex) => decorate(ex, config));

  return {
    goal: config.label,
    goalDescription: config.description,
    exercises: exerciseList,
    generatedAt: new Date().toISOString(),
  };
}

export function getReplacementExercise({ exercise, equipment, muscleGroups, excludeIds, goal }) {
  const config = goalConfig[goal] || goalConfig.hypertrophy;

  const pool = exercises.filter(
    (ex) =>
      muscleGroups.includes(ex.muscleGroup) &&
      equipment.includes(ex.equipment) &&
      !excludeIds.includes(ex.id)
  );

  if (pool.length === 0) return null;

  const shuffled = shuffleArray(pool);
  return decorate(shuffled[0], config);
}
