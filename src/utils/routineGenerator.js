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

// ── Push / pull classification for exercise alternation ───────────────────
const PUSH_GROUPS = ['chest', 'shoulders'];
const PULL_GROUPS = ['back', 'arms'];

// ── Sub-group classifiers ─────────────────────────────────────────────────
export function classifyArm(name) {
  return name.toLowerCase().includes('curl') ? 'bicep' : 'tricep';
}

export function classifyShoulder(name) {
  const lower = name.toLowerCase();
  return (lower.includes('press') || lower.includes('pike')) ? 'press' : 'lateral';
}

export function classifyCore(name) {
  const lower = name.toLowerCase();
  if (
    lower.includes('plank') ||
    lower.includes('rollout') ||
    lower.includes('mountain') ||
    lower.includes('turkish') ||
    lower.includes('get-up')
  ) {
    return 'anti-extension';
  }
  return 'flexion-rotation';
}

// Reorder exercises to alternate push → pull → push → pull.
// Neutral groups (legs, core) are appended after.
// If no push or no pull exercises are present, returns the original order.
function alternatePushPull(exList) {
  const push = exList.filter((ex) => PUSH_GROUPS.includes(ex.muscleGroup));
  const pull = exList.filter((ex) => PULL_GROUPS.includes(ex.muscleGroup));
  const neutral = exList.filter(
    (ex) => !PUSH_GROUPS.includes(ex.muscleGroup) && !PULL_GROUPS.includes(ex.muscleGroup)
  );
  if (push.length === 0 || pull.length === 0) return exList;
  const result = [];
  const len = Math.max(push.length, pull.length);
  for (let i = 0; i < len; i++) {
    if (i < push.length) result.push(push[i]);
    if (i < pull.length) result.push(pull[i]);
  }
  result.push(...neutral);
  return result;
}

// ── Antagonist pairs for superset creation ───────────────────────────────
const ANTAGONIST_PAIRS = [
  ['chest', 'back'],
  ['shoulders', 'arms'],
  ['legs', 'core'],
];

// ── Compound exercise detection ───────────────────────────────────────────
const COMPOUND_KEYWORDS = [
  'bench press', 'press', 'deadlift', 'squat', 'row', 'pull-up', 'pull up',
  'pullup', 'chin-up', 'chin up', 'chinup', 'pulldown', 'lunge', 'dip',
  'hip thrust', 'push-up', 'push up', 'pushup', 'swing', 'clean', 'snatch',
  'thruster', 'romanian', 'leg press', 'get-up', 'step-up', 'step up',
  'split squat', 'hack squat', 'inverted',
];

export function isCompoundExercise(name) {
  const lower = name.toLowerCase();
  return COMPOUND_KEYWORDS.some((kw) => lower.includes(kw));
}

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
function applySupersetsToExercises(exList) {
  const result = exList.map((ex) => ({ ...ex, supersetGroup: null }));
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

// ── Sorting helper shared by pick functions ───────────────────────────────
function sortPool(pool, primaryGoal) {
  if (primaryGoal === 'strength' || primaryGoal === 'power') {
    const tiers = { advanced: [], intermediate: [], beginner: [] };
    pool.forEach((ex) => { (tiers[ex.difficulty] ?? tiers.beginner).push(ex); });
    return [
      ...shuffleArray(tiers.advanced),
      ...shuffleArray(tiers.intermediate),
      ...shuffleArray(tiers.beginner),
    ];
  }
  if (primaryGoal === 'endurance') {
    const equipPriority = { bodyweight: 0, cables: 1, dumbbells: 2, barbell: 3 };
    return [...pool].sort(
      (a, b) => (equipPriority[a.equipment] ?? 4) - (equipPriority[b.equipment] ?? 4)
    );
  }
  return shuffleArray(pool);
}

// ── Pick one exercise, compound-preferred for strength/power ─────────────
function pickOne(muscleGroup, availableEquipment, primaryGoal, excludeIds = [], filterFn = null) {
  const pool = exercises.filter(
    (ex) =>
      ex.muscleGroup === muscleGroup &&
      availableEquipment.includes(ex.equipment) &&
      !excludeIds.includes(ex.id) &&
      (filterFn ? filterFn(ex) : true)
  );
  if (pool.length === 0) return null;

  const isStrengthPower = primaryGoal === 'strength' || primaryGoal === 'power';
  if (isStrengthPower) {
    const compounds = pool.filter((ex) => isCompoundExercise(ex.name));
    if (compounds.length > 0) return sortPool(compounds, primaryGoal)[0];
  }
  return sortPool(pool, primaryGoal)[0];
}

// ── Guaranteed coverage pick — ensures sub-group balance ─────────────────
function pickGuaranteed(targetMuscles, availableEquipment, primaryGoal, excludeIds = []) {
  const guaranteed = [];
  const usedIds = [...excludeIds];

  for (const mg of targetMuscles) {
    if (mg === 'arms') {
      const bicep = pickOne('arms', availableEquipment, primaryGoal, usedIds,
        (ex) => classifyArm(ex.name) === 'bicep');
      if (bicep) { guaranteed.push(bicep); usedIds.push(bicep.id); }

      const tricep = pickOne('arms', availableEquipment, primaryGoal, usedIds,
        (ex) => classifyArm(ex.name) === 'tricep');
      if (tricep) { guaranteed.push(tricep); usedIds.push(tricep.id); }

    } else if (mg === 'shoulders') {
      const press = pickOne('shoulders', availableEquipment, primaryGoal, usedIds,
        (ex) => classifyShoulder(ex.name) === 'press');
      if (press) { guaranteed.push(press); usedIds.push(press.id); }

      const lateral = pickOne('shoulders', availableEquipment, primaryGoal, usedIds,
        (ex) => classifyShoulder(ex.name) === 'lateral');
      if (lateral) { guaranteed.push(lateral); usedIds.push(lateral.id); }

    } else if (mg === 'core') {
      const antiExt = pickOne('core', availableEquipment, primaryGoal, usedIds,
        (ex) => classifyCore(ex.name) === 'anti-extension');
      if (antiExt) { guaranteed.push(antiExt); usedIds.push(antiExt.id); }

      const flexRot = pickOne('core', availableEquipment, primaryGoal, usedIds,
        (ex) => classifyCore(ex.name) === 'flexion-rotation');
      if (flexRot) { guaranteed.push(flexRot); usedIds.push(flexRot.id); }

    } else {
      // chest / back / legs — one compound-preferred pick
      const ex = pickOne(mg, availableEquipment, primaryGoal, usedIds);
      if (ex) { guaranteed.push(ex); usedIds.push(ex.id); }
    }
  }

  return { guaranteed, usedIds };
}

// ── Supplemental picks — fills remaining slots, compound-first ────────────
function pickSupplemental(targetMuscles, availableEquipment, primaryGoal, count, excludeIds = []) {
  if (count <= 0) return [];

  const pool = exercises.filter(
    (ex) =>
      targetMuscles.includes(ex.muscleGroup) &&
      availableEquipment.includes(ex.equipment) &&
      !excludeIds.includes(ex.id)
  );

  const compounds = pool.filter((ex) => isCompoundExercise(ex.name));
  const isolations = pool.filter((ex) => !isCompoundExercise(ex.name));

  return [...sortPool(compounds, primaryGoal), ...sortPool(isolations, primaryGoal)].slice(0, count);
}

// ── Ordering helpers ──────────────────────────────────────────────────────

// Greedy swap: if consecutive pair has same muscleGroup, find nearest different-muscle
// exercise and move it forward.
function ensureNoSameMuscleBackToBack(list) {
  const result = [...list];
  for (let i = 0; i < result.length - 1; i++) {
    if (result[i].muscleGroup === result[i + 1].muscleGroup) {
      let swapIdx = -1;
      for (let j = i + 2; j < result.length; j++) {
        if (result[j].muscleGroup !== result[i].muscleGroup) {
          swapIdx = j;
          break;
        }
      }
      if (swapIdx !== -1) {
        const [moved] = result.splice(swapIdx, 1);
        result.splice(i + 1, 0, moved);
      }
    }
  }
  return result;
}

// Order: compounds first (push/pull alternated), then isolations, core always last.
function orderForRoutine(mainExercises) {
  const core = mainExercises.filter((ex) => ex.muscleGroup === 'core');
  const nonCore = mainExercises.filter((ex) => ex.muscleGroup !== 'core');
  const compounds = nonCore.filter((ex) => isCompoundExercise(ex.name));
  const isolations = nonCore.filter((ex) => !isCompoundExercise(ex.name));
  const altComps = alternatePushPull(compounds);
  const ordered = ensureNoSameMuscleBackToBack([...altComps, ...isolations]);
  return [...ordered, ...core];
}

function decorate(ex, config) {
  return {
    ...ex,
    sets: config.sets,
    reps: config.reps,
    rest: `${config.restSeconds}s`,
  };
}

export function generateSingleDayRoutine({ goals, equipment, muscleGroups, exerciseCount, excludeIds = [] }) {
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
      supplementalIds: [],
      generatedAt: new Date().toISOString(),
    };
  }

  const primaryGoal = mainGoals[0];

  // Step 1: guaranteed sub-group coverage
  const { guaranteed, usedIds } = pickGuaranteed(muscleGroups, equipment, primaryGoal, excludeIds);

  // Step 2: supplemental exercises for remaining slots
  const totalCount = Math.max(exerciseCount, guaranteed.length);
  const supplemental = pickSupplemental(
    muscleGroups, equipment, primaryGoal, totalCount - guaranteed.length, usedIds
  );
  const supplementalIds = supplemental.map((ex) => ex.id);

  // Step 3: decorate (attach sets/reps/rest from blend config)
  const allExercises = [...guaranteed, ...supplemental].map((ex) => ({
    ...decorate(ex, blendConfig),
    supersetGroup: null,
  }));

  // Step 4: order — compounds first, core last, no same-muscle back-to-back
  const ordered = orderForRoutine(allExercises);
  const orderedNonCore = ordered.filter((ex) => ex.muscleGroup !== 'core');
  const coreExercises = ordered.filter((ex) => ex.muscleGroup === 'core');

  // Step 5: apply supersets to non-core only, then append core
  const withSupersets = blendConfig.supersets
    ? applySupersetsToExercises(orderedNonCore)
    : orderedNonCore;

  const finalMain = [...withSupersets, ...coreExercises];

  return {
    goals,
    blendLabel: getBlendLabel(goals),
    blendDescription: getBlendDescription(goals),
    exercises: [...mobilityExs, ...finalMain],
    supplementalIds,
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

// ── Scientific explanation layer ──────────────────────────────────────────

const GOAL_SCIENCE_NOTES = {
  strength:    'Heavy progressive overload (≥85% 1RM) increases myofibrillar density and neural drive, producing maximal force output gains over 6–12 week cycles.',
  hypertrophy: 'Moderate loads (65–80% 1RM) at 8–12 reps with controlled tempo maximize mechanical tension and metabolic stress — the two primary drivers of muscle hypertrophy.',
  endurance:   'High-rep, short-rest training shifts muscle fiber recruitment toward slow-twitch type I fibers and improves mitochondrial density for sustained output.',
  power:       'Explosive intent with moderate-heavy loads (70–85% 1RM) trains fast-twitch type II fibers and improves rate of force development (RFD) — the foundation of athletic power.',
  mobility:    'Active and passive stretching under load increases joint ROM by remodeling connective tissue and reducing neural inhibition of muscle extensibility.',
};

const GOAL_RATIONALE = {
  strength:    'Heavy compound lifts performed first drive maximal neuromuscular adaptation. Long rest intervals (3+ min) allow full phosphocreatine replenishment between sets.',
  hypertrophy: 'Moderate loads with controlled tempo create mechanical tension and metabolic stress — the two primary drivers of muscle growth. Rest intervals are optimized for hormonal response.',
  endurance:   'High-rep, short-rest circuits increase cardiovascular demand and shift metabolism toward fat oxidation. Bodyweight and cable exercises reduce inertia for sustained repetitions.',
  power:       'Explosive intent on every rep trains fast-twitch fiber recruitment and rate of force development. Extended rest (4+ min) preserves the quality of each set.',
  mobility:    'Mobility work primes the nervous system and increases tissue temperature before loading, reducing injury risk and improving range of motion for subsequent exercises.',
};

export function getExerciseRationale(exercise, goals) {
  const mainGoals = (goals || []).filter((g) => g !== 'mobility');
  const primaryGoal = mainGoals[0] || 'hypertrophy';

  const isCompound = isCompoundExercise(exercise.name);
  const isPush = PUSH_GROUPS.includes(exercise.muscleGroup);
  const isPull = PULL_GROUPS.includes(exercise.muscleGroup);
  const isCore = exercise.muscleGroup === 'core';

  let role;
  if (isCore) {
    role = 'Core stabilizer — placed last to avoid fatiguing stabilizers needed for compound lifts';
  } else if (isCompound && isPush) {
    role = `Primary compound push movement for ${exercise.muscleGroup} — ordered first to maximize force output`;
  } else if (isCompound && isPull) {
    role = `Primary compound pull movement for ${exercise.muscleGroup} — ordered first to maximize force output`;
  } else if (isCompound) {
    role = `Compound movement for ${exercise.muscleGroup} — prioritized for maximal motor unit recruitment`;
  } else {
    role = `Isolation movement for ${exercise.muscleGroup} — placed after compounds to target specific muscles at full fatigue capacity`;
  }

  const primary = (exercise.primaryMuscles || []).join(', ');
  const secondary = (exercise.secondaryMuscles || []).join(', ');
  const targetDetail = secondary
    ? `Primary: ${primary} · Secondary: ${secondary}`
    : `Primary: ${primary}`;

  const scienceNote = GOAL_SCIENCE_NOTES[primaryGoal] || GOAL_SCIENCE_NOTES.hypertrophy;

  return { role, targetDetail, scienceNote };
}

// ── Advanced Routine Engine ───────────────────────────────────────────────

export const PHILOSOPHY_CONFIG = {
  powerlifting:           { preferTier1: true,  sets: [4, 5], reps: [3, 5],   rest: 240, rpe: 8.5, setStructure: 'pyramid' },
  bodybuilding:           { preferTier1: false, sets: [3, 4], reps: [8, 12],  rest: 90,  rpe: 7.5, setStructure: 'superset' },
  athletic_performance:   { preferTier1: true,  sets: [3, 4], reps: [5, 8],   rest: 150, rpe: 8,   setStructure: 'straight' },
  general_fitness:        { preferTier1: false, sets: [3, 3], reps: [10, 12], rest: 90,  rpe: 7,   setStructure: 'straight' },
  endurance_conditioning: { preferTier1: false, sets: [2, 3], reps: [15, 20], rest: 60,  rpe: 6.5, setStructure: 'superset' },
};

const PHASE_TIME_ESTIMATES = {
  primary: 20,
  secondary_per_ex: 13,
  accessory_straight: 7,
  accessory_superset_pair: 9,
  intensifier: 5,
  core_per_ex: 4.5,
  buffer: 6,
};

const MOVEMENT_CUES = {
  squat:     'Brace core, drive through heels, track knees over toes',
  hinge:     'Hinge at hips, soft knees, maintain neutral spine throughout',
  push:      'Retract scapulae, controlled eccentric, full lockout at top',
  pull:      'Initiate with scapular retraction, elbows drive back and down',
  isometric: 'Neutral spine, diaphragmatic breathing, full-body tension',
  rotation:  'Initiate from hips, decelerate through obliques, control throughout',
  isolation: 'Full range of motion, peak contraction, mind-muscle connection',
  carry:     'Shoulders packed, tall posture, rhythmic steady steps',
};

function buildAdvancedExplanation(goals, philosophy, phases, blendLabel) {
  const cfg = PHILOSOPHY_CONFIG[philosophy] || PHILOSOPHY_CONFIG.general_fitness;
  const philosophyLabels = {
    powerlifting:           'powerlifting',
    bodybuilding:           'bodybuilding',
    athletic_performance:   'athletic performance',
    general_fitness:        'general fitness',
    endurance_conditioning: 'endurance conditioning',
  };
  const philLabel = philosophyLabels[philosophy] || 'general fitness';
  const sets = cfg.sets.length > 1 && cfg.sets[0] !== cfg.sets[1]
    ? `${cfg.sets[0]}–${cfg.sets[1]}`
    : `${cfg.sets[0]}`;
  const reps = `${cfg.reps[0]}–${cfg.reps[1]}`;
  const phaseCount = phases.length;

  const sentence1 = `This ${philLabel} routine is structured across ${phaseCount} progressive phases — a heavy compound opener, supporting compound work, targeted isolation, and a core stability finisher.`;
  const sentence2 = `Following ${philLabel} principles, working sets are prescribed at ${sets} × ${reps} reps targeting RPE ${cfg.rpe}, calibrating volume and intensity for consistent progressive overload.`;
  const sentence3 = `Exercise order is deliberate: primary compounds are placed first when your nervous system is freshest and force output is highest, followed by accessory work at reduced load to maximize metabolic stress without compromising technique on the main lifts.`;
  const hasSuperset = cfg.setStructure === 'superset';
  const sentence4 = hasSuperset
    ? 'Accessory exercises are paired as A1/A2 supersets to increase training density, time under tension, and caloric expenditure — proven techniques for hypertrophy and conditioning.'
    : 'Core work is placed last to avoid pre-fatiguing the stabilizers required for safe, powerful execution of the compound movements earlier in the session.';

  return [sentence1, sentence2, sentence3, sentence4].join(' ');
}

export function generateAdvancedRoutine({
  goals,
  equipment,
  muscleGroups: targetMuscles,
  philosophy,
  durationLimit,
  excludedExerciseIds = [],
}) {
  const philosophyConfig = PHILOSOPHY_CONFIG[philosophy] || PHILOSOPHY_CONFIG.general_fitness;
  const blendLabel = getBlendLabel(goals);
  const blendDescription = getBlendDescription(goals);
  const primaryGoal = goals.filter((g) => g !== 'mobility')[0] || 'hypertrophy';

  const usedIds = new Set(excludedExerciseIds.map(String));

  const nonCoreMuscles = targetMuscles.filter((m) => m !== 'core');

  function pickBest(pool) {
    if (pool.length === 0) return null;
    return sortPool(pool, primaryGoal)[0];
  }

  // ── Phase 2: Primary Compound ──────────────────────────────────────
  let phase2Ex = null;
  for (const mg of nonCoreMuscles) {
    if (phase2Ex) break;
    const pool = exercises.filter(
      (ex) => ex.muscleGroup === mg && ex.tier === 1 && equipment.includes(ex.equipment) && !usedIds.has(String(ex.id))
    );
    if (pool.length > 0) phase2Ex = pickBest(pool);
  }
  if (!phase2Ex) {
    for (const mg of nonCoreMuscles) {
      if (phase2Ex) break;
      const pool = exercises.filter(
        (ex) => ex.muscleGroup === mg && ex.tier === 2 && equipment.includes(ex.equipment) && !usedIds.has(String(ex.id))
      );
      if (pool.length > 0) phase2Ex = pickBest(pool);
    }
  }

  const phase2Exercises = [];
  if (phase2Ex) {
    usedIds.add(String(phase2Ex.id));
    const maxSets = philosophyConfig.sets[philosophyConfig.sets.length - 1];
    const reps = `${philosophyConfig.reps[0]}-${philosophyConfig.reps[1]}`;
    const setStructure = philosophyConfig.setStructure === 'pyramid' ? 'pyramid' : 'straight';
    phase2Exercises.push({
      ...phase2Ex,
      phaseId: 'primary',
      sets: maxSets,
      reps,
      rest: `${philosophyConfig.rest}s`,
      targetRPE: philosophyConfig.rpe,
      setStructure,
      warmupSets: [{ pct: 40, reps: 5 }, { pct: 60, reps: 3 }, { pct: 80, reps: 2 }],
      movementCue: MOVEMENT_CUES[phase2Ex.movementPattern] || MOVEMENT_CUES.isolation,
    });
  }

  // ── Phase 3: Secondary Compounds ──────────────────────────────────────
  const phase3Exercises = [];
  const phase2Muscles = new Set(phase2Exercises.map((ex) => ex.muscleGroup));
  const uncoveredMuscles = nonCoreMuscles.filter((mg) => !phase2Muscles.has(mg));
  const phase3Candidates = [...uncoveredMuscles, ...Array.from(phase2Muscles)];

  for (const mg of phase3Candidates) {
    if (phase3Exercises.length >= 2) break;
    const pool = exercises.filter(
      (ex) => ex.muscleGroup === mg && ex.tier === 2 && equipment.includes(ex.equipment) && !usedIds.has(String(ex.id))
    );
    if (pool.length > 0) {
      const ex = pickBest(pool);
      usedIds.add(String(ex.id));
      const maxSets = philosophyConfig.sets[philosophyConfig.sets.length - 1];
      const secMin = Math.min(philosophyConfig.reps[0] + 2, 15);
      const secMax = Math.min(philosophyConfig.reps[1] + 3, 20);
      phase3Exercises.push({
        ...ex,
        phaseId: 'secondary',
        sets: maxSets,
        reps: `${secMin}-${secMax}`,
        rest: `${Math.round(philosophyConfig.rest * 0.8)}s`,
        targetRPE: Math.round((philosophyConfig.rpe - 0.5) * 10) / 10,
        setStructure: 'straight',
        movementCue: MOVEMENT_CUES[ex.movementPattern] || MOVEMENT_CUES.isolation,
      });
    }
  }

  // ── Phase 4: Accessory / Isolation ────────────────────────────────────
  const phase4Exercises = [];
  const minSets = philosophyConfig.sets[0];
  const acc4Min = Math.min(philosophyConfig.reps[0] + 3, 12);
  const acc4Max = Math.min(philosophyConfig.reps[1] + 4, 20);
  const acc4Reps = `${acc4Min}-${acc4Max}`;
  const acc4Rest = `${Math.round(philosophyConfig.rest * 0.6)}s`;
  const acc4RPE = Math.round((philosophyConfig.rpe - 1) * 10) / 10;

  function addAccessory(ex) {
    phase4Exercises.push({
      ...ex,
      phaseId: 'accessory',
      sets: minSets,
      reps: acc4Reps,
      rest: acc4Rest,
      targetRPE: acc4RPE,
      setStructure: 'straight',
      movementCue: MOVEMENT_CUES[ex.movementPattern] || MOVEMENT_CUES.isolation,
    });
  }

  // Guaranteed: arms → 1 bicep + 1 tricep
  if (targetMuscles.includes('arms')) {
    const bicepPool = exercises.filter(
      (ex) => ex.muscleGroup === 'arms' && ex.tier === 3 && equipment.includes(ex.equipment) &&
        !usedIds.has(String(ex.id)) && classifyArm(ex.name) === 'bicep'
    );
    const tricepPool = exercises.filter(
      (ex) => ex.muscleGroup === 'arms' && ex.tier === 3 && equipment.includes(ex.equipment) &&
        !usedIds.has(String(ex.id)) && classifyArm(ex.name) === 'tricep'
    );
    if (bicepPool.length > 0) { const ex = pickBest(bicepPool); usedIds.add(String(ex.id)); addAccessory(ex); }
    if (tricepPool.length > 0) { const ex = pickBest(tricepPool); usedIds.add(String(ex.id)); addAccessory(ex); }
  }

  // Guaranteed: shoulders → 1 press + 1 lateral
  if (targetMuscles.includes('shoulders') && phase4Exercises.length < 4) {
    const pressPool = [3, 2].flatMap((tier) =>
      exercises.filter(
        (ex) => ex.muscleGroup === 'shoulders' && ex.tier === tier && equipment.includes(ex.equipment) &&
          !usedIds.has(String(ex.id)) && classifyShoulder(ex.name) === 'press'
      )
    );
    const lateralPool = exercises.filter(
      (ex) => ex.muscleGroup === 'shoulders' && (ex.tier === 3 || ex.tier === 2) &&
        equipment.includes(ex.equipment) && !usedIds.has(String(ex.id)) &&
        classifyShoulder(ex.name) === 'lateral'
    );
    if (pressPool.length > 0) { const ex = pickBest(pressPool); usedIds.add(String(ex.id)); addAccessory(ex); }
    if (lateralPool.length > 0 && phase4Exercises.length < 4) {
      const ex = pickBest(lateralPool); usedIds.add(String(ex.id)); addAccessory(ex);
    }
  }

  // Fill up to 4 total from any non-core muscle
  for (const mg of nonCoreMuscles) {
    if (phase4Exercises.length >= 4) break;
    const pool = exercises.filter(
      (ex) => ex.muscleGroup === mg && ex.tier === 3 && equipment.includes(ex.equipment) && !usedIds.has(String(ex.id))
    );
    if (pool.length > 0) {
      const ex = shuffleArray(pool)[0];
      usedIds.add(String(ex.id));
      addAccessory(ex);
    }
  }

  // Apply superset structure (bodybuilding / endurance)
  const useSupersets = philosophyConfig.setStructure === 'superset' && phase4Exercises.length >= 2;
  if (useSupersets) {
    for (let i = 0; i + 1 < phase4Exercises.length; i += 2) {
      const label = String.fromCharCode(65 + Math.floor(i / 2));
      phase4Exercises[i] = { ...phase4Exercises[i], supersetGroup: label, supersetLabel: 'A1', setStructure: 'superset' };
      phase4Exercises[i + 1] = { ...phase4Exercises[i + 1], supersetGroup: label, supersetLabel: 'A2', setStructure: 'superset' };
    }
  }

  // ── Phase 5: Intensifier / Drop Set ───────────────────────────────────
  let phase5Exercise = null;
  if (phase4Exercises.length > 0) {
    const base = phase4Exercises[phase4Exercises.length - 1];
    phase5Exercise = {
      ...base,
      id: `${base.id}-drop`,
      phaseId: 'intensifier',
      setStructure: 'drop',
      supersetGroup: null,
      supersetLabel: null,
      dropSetNote: 'Drop 20% after last rep → continue to failure',
      targetRPE: 10,
    };
  }

  // ── Phase 6: Core ─────────────────────────────────────────────────────
  const phase6Exercises = [];
  const coreEquip = equipment.includes('bodyweight') ? equipment : [...equipment, 'bodyweight'];

  const antiExtPool = exercises.filter(
    (ex) => ex.muscleGroup === 'core' && coreEquip.includes(ex.equipment) &&
      !usedIds.has(String(ex.id)) && classifyCore(ex.name) === 'anti-extension'
  );
  const flexRotPool = exercises.filter(
    (ex) => ex.muscleGroup === 'core' && coreEquip.includes(ex.equipment) &&
      !usedIds.has(String(ex.id)) && classifyCore(ex.name) === 'flexion-rotation'
  );

  if (antiExtPool.length > 0) {
    const ex = pickBest(antiExtPool);
    usedIds.add(String(ex.id));
    phase6Exercises.push({ ...ex, phaseId: 'core', sets: 3, reps: '30-45s', rest: '60s', targetRPE: 6, setStructure: 'straight', movementCue: MOVEMENT_CUES.isometric });
  }
  if (flexRotPool.length > 0) {
    const ex = pickBest(flexRotPool);
    usedIds.add(String(ex.id));
    phase6Exercises.push({ ...ex, phaseId: 'core', sets: 3, reps: '15-20', rest: '60s', targetRPE: 6.5, setStructure: 'straight', movementCue: MOVEMENT_CUES.isometric });
  }

  // ── Time Estimation ────────────────────────────────────────────────────
  function estimateTime(p2, p3, p4, hasP5, p6) {
    const pairs = useSupersets ? Math.floor(p4.length / 2) : 0;
    const straight = p4.length - pairs * 2;
    return (
      PHASE_TIME_ESTIMATES.buffer +
      (p2.length > 0 ? PHASE_TIME_ESTIMATES.primary : 0) +
      p3.length * PHASE_TIME_ESTIMATES.secondary_per_ex +
      pairs * PHASE_TIME_ESTIMATES.accessory_superset_pair +
      straight * PHASE_TIME_ESTIMATES.accessory_straight +
      (hasP5 ? PHASE_TIME_ESTIMATES.intensifier : 0) +
      p6.length * PHASE_TIME_ESTIMATES.core_per_ex
    );
  }

  // ── Time Scaling ───────────────────────────────────────────────────────
  let currentPhase4 = [...phase4Exercises];
  let hasPhase5 = phase5Exercise !== null;
  let setReductionNote = null;

  if (durationLimit) {
    let totalTime = estimateTime(phase2Exercises, phase3Exercises, currentPhase4, hasPhase5, phase6Exercises);

    if (totalTime > durationLimit && hasPhase5) {
      hasPhase5 = false;
      totalTime = estimateTime(phase2Exercises, phase3Exercises, currentPhase4, false, phase6Exercises);
      setReductionNote = `Drop set block removed to fit your ${durationLimit} min session`;
    }

    while (totalTime > durationLimit && currentPhase4.length > 0) {
      currentPhase4 = currentPhase4.slice(0, -1);
      // Clean up orphaned superset partner
      if (useSupersets && currentPhase4.length > 0) {
        const last = currentPhase4[currentPhase4.length - 1];
        if (last.supersetLabel === 'A1') {
          currentPhase4 = currentPhase4.slice(0, -1);
        }
      }
      totalTime = estimateTime(phase2Exercises, phase3Exercises, currentPhase4, false, phase6Exercises);
      setReductionNote = `Routine trimmed to fit your ${durationLimit} min session`;
    }
  }

  const finalPhase5 = hasPhase5 ? phase5Exercise : null;
  const totalEstimatedMin = Math.round(
    estimateTime(phase2Exercises, phase3Exercises, currentPhase4, !!finalPhase5, phase6Exercises)
  );

  // ── Build Phases Array ─────────────────────────────────────────────────
  const phases = [];
  if (phase2Exercises.length > 0) {
    phases.push({
      phaseId: 'primary',
      phaseLabel: 'Phase 2 — Primary Compound',
      phaseShort: 'Primary',
      description: `${phase2Exercises.length} exercise · Heavy compound · Warm-up sets included`,
      estimatedMin: PHASE_TIME_ESTIMATES.primary,
    });
  }
  if (phase3Exercises.length > 0) {
    phases.push({
      phaseId: 'secondary',
      phaseLabel: 'Phase 3 — Secondary Compounds',
      phaseShort: 'Secondary',
      description: `${phase3Exercises.length} exercise${phase3Exercises.length > 1 ? 's' : ''} · Supporting compound movements`,
      estimatedMin: phase3Exercises.length * PHASE_TIME_ESTIMATES.secondary_per_ex,
    });
  }
  if (currentPhase4.length > 0) {
    const p4Pairs = useSupersets ? Math.floor(currentPhase4.length / 2) : 0;
    const p4Straight = currentPhase4.length - p4Pairs * 2;
    phases.push({
      phaseId: 'accessory',
      phaseLabel: 'Phase 4 — Accessory / Isolation',
      phaseShort: 'Accessory',
      description: `${currentPhase4.length} exercises · ${useSupersets ? 'A1/A2 supersets' : 'Targeted isolation'}`,
      estimatedMin: Math.round(p4Pairs * PHASE_TIME_ESTIMATES.accessory_superset_pair + p4Straight * PHASE_TIME_ESTIMATES.accessory_straight),
    });
  }
  if (finalPhase5) {
    phases.push({
      phaseId: 'intensifier',
      phaseLabel: 'Phase 5 — Intensifier',
      phaseShort: 'Intensifier',
      description: '1 exercise · Drop set to failure · Maximum metabolic stress',
      estimatedMin: PHASE_TIME_ESTIMATES.intensifier,
    });
  }
  if (phase6Exercises.length > 0) {
    phases.push({
      phaseId: 'core',
      phaseLabel: 'Phase 6 — Core Finisher',
      phaseShort: 'Core',
      description: `${phase6Exercises.length} exercises · Stability finisher · Always last`,
      estimatedMin: Math.round(phase6Exercises.length * PHASE_TIME_ESTIMATES.core_per_ex),
    });
  }

  // ── Build Flat Exercises Array ─────────────────────────────────────────
  const allExercises = [
    ...phase2Exercises,
    ...phase3Exercises,
    ...currentPhase4,
    ...(finalPhase5 ? [finalPhase5] : []),
    ...phase6Exercises,
  ].map((ex, idx) => ({ ...ex, _flatIdx: idx }));

  return {
    goals,
    philosophy,
    blendLabel,
    blendDescription,
    explanation: buildAdvancedExplanation(goals, philosophy, phases, blendLabel),
    phases,
    exercises: allExercises,
    supplementalIds: currentPhase4.map((ex) => ex.id).concat(finalPhase5 ? [finalPhase5.id] : []),
    totalEstimatedMin,
    setReductionNote,
    generatedAt: new Date().toISOString(),
  };
}

export function getRoutineExplanation(goals, blendConfig) {
  const mainGoals = (goals || []).filter((g) => g !== 'mobility');
  const hasMobility = (goals || []).includes('mobility');

  if (mainGoals.length === 0) {
    return 'This mobility-only routine focuses on improving joint range of motion and tissue quality before or between training sessions.';
  }

  const { sets, reps, restSeconds } = blendConfig;
  const restMin = restSeconds >= 60 ? `${Math.round(restSeconds / 60)} min` : `${restSeconds}s`;
  const prescription = `This routine prescribes ${sets} sets × ${reps} reps with ${restMin} rest between sets.`;

  const goalLines = mainGoals.map((g) => GOAL_RATIONALE[g]).filter(Boolean);

  const orderingNote =
    'Compound exercises are ordered first to maximize force output when you are freshest. Core movements are placed last to preserve spinal stability throughout the session.';

  const mobilityNote = hasMobility
    ? ' A mobility warmup is included to prime your joints and nervous system.'
    : '';

  return [prescription, ...goalLines, orderingNote].join(' ') + mobilityNote;
}
