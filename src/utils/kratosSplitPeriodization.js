/**
 * Kratos Split Periodization Engine
 *
 * Generates structured 12-week periodized sessions using pre-built exercise pools:
 * - Primary compounds: 2 fixed lifts per day type, alternating every week
 * - Secondary compounds: 2 per session, rotating every 2 weeks
 * - Accessories: pool of up to 8, rotating weekly for full coverage every 2 weeks
 * - Core: always last, 1–2 exercises depending on day type
 * - RPE targets driven by phase (Foundation/Deload/Build/Peak/Taper), not philosophy
 */

import { exercises } from '../data/exercises';

// ── Exercise lookup map ────────────────────────────────────────────────
const EX = {};
exercises.forEach((e) => { EX[e.id] = e; });

// ── Phase training parameters ─────────────────────────────────────────
const PHASE_PARAMS = {
  foundation: {
    rpe: 7,
    primarySets: 4,  primaryReps: '6–8',    primaryRest: '2 min',
    secondarySets: 3, secondaryReps: '10–12', secondaryRest: '90s',
    accessorySets: 3, accessoryReps: '12–15', accessoryRest: '60s',
    coreSets: 3,      coreReps: '30–45s',    coreRest: '45s',
    numAccessories: 3,
    setStructure: 'straight',
  },
  deload: {
    rpe: 5.5,
    primarySets: 2,  primaryReps: '8–10',   primaryRest: '90s',
    secondarySets: 2, secondaryReps: '12–15', secondaryRest: '75s',
    accessorySets: 2, accessoryReps: '15–20', accessoryRest: '60s',
    coreSets: 2,      coreReps: '30s',        coreRest: '45s',
    numAccessories: 2,
    setStructure: 'straight',
  },
  build: {
    rpe: 7.5,
    primarySets: 4,  primaryReps: '5–7',    primaryRest: '2.5 min',
    secondarySets: 3, secondaryReps: '8–10',  secondaryRest: '2 min',
    accessorySets: 3, accessoryReps: '10–12', accessoryRest: '75s',
    coreSets: 3,      coreReps: '30–45s',    coreRest: '45s',
    numAccessories: 3,
    setStructure: 'straight',
  },
  peak: {
    rpe: 8.5,
    primarySets: 5,  primaryReps: '3–5',    primaryRest: '4 min',
    secondarySets: 4, secondaryReps: '5–8',   secondaryRest: '3 min',
    accessorySets: 3, accessoryReps: '8–12',  accessoryRest: '90s',
    coreSets: 3,      coreReps: '30–45s',    coreRest: '45s',
    numAccessories: 2,
    setStructure: 'pyramid',
  },
  taper: {
    rpe: 7,
    primarySets: 3,  primaryReps: '6–8',    primaryRest: '2 min',
    secondarySets: 3, secondaryReps: '8–10',  secondaryRest: '90s',
    accessorySets: 2, accessoryReps: '12–15', accessoryRest: '60s',
    coreSets: 2,      coreReps: '30s',        coreRest: '45s',
    numAccessories: 2,
    setStructure: 'straight',
  },
};

// ── Primary compound preference lists ─────────────────────────────────
// Ordered by preference; first available given user's equipment is chosen.
const PRIMARY_PREFS = {
  push: {
    // A = chest-focused horizontal press
    A: [1, 4, 70, 46],          // BB Bench, DB Bench, Smith Bench, Machine Chest Press
    // B = shoulder-focused vertical press
    B: [23, 25, 61, 26],        // BB OHP, DB Shoulder Press, Shoulder Press Machine, Pike Push-Up
  },
  pull: {
    // A = horizontal pull (row)
    A: [9, 100, 11, 13, 50],    // BB Row, Pendlay Row, DB Row, Cable Row, Machine Row
    // B = vertical pull (pull-up / pulldown)
    B: [10, 107, 108, 12, 49, 51], // Pull-Up, Neutral Pull-Up, Wide Pull-Up, Lat PD, Machine PD, Assisted PU
  },
  legs: {
    // A = squat pattern
    A: [15, 43, 53, 18, 69],    // Back Squat, Front Squat, Leg Press, Goblet Squat, Smith Squat
    // B = hinge pattern
    B: [16, 118, 119, 44, 22],  // RDL, Sumo DL, Hex Bar DL, DB RDL, Hip Thrust
  },
};

// ── Secondary compound preference lists ───────────────────────────────
const SECONDARY_PREFS = {
  push: [4, 5, 25, 46, 48, 31, 93, 70],   // DB Bench, Push-Up, DB OHP, Machine Press, Dip Machine, Tricep Dip, Weighted Dip, Smith Bench
  pull: [12, 13, 11, 49, 50, 51, 14, 27], // Lat PD, Cable Row, DB Row, Machine PD, Machine Row, Assisted PU, Inverted Row, Face Pull
  legs: [53, 17, 20, 18, 44, 22, 60, 71], // Leg Press, DB Lunges, Bulgarian SS, Goblet Squat, DB RDL, Hip Thrust, Hack Squat, KB Swing
};

// ── Helpers ────────────────────────────────────────────────────────────
function firstAvailable(idList, equipment) {
  for (const id of idList) {
    const ex = EX[id];
    if (ex && equipment.includes(ex.equipment)) return ex;
  }
  return null;
}

const isTricepEx = (ex) =>
  /tricep|pushdown|skull|close.grip|tate|jm press|kickback/i.test(ex.name);

const isBicepEx = (ex) =>
  /curl|bicep/i.test(ex.name);

function buildAccessoryPool(dayType, available) {
  switch (dayType) {
    case 'push': {
      const chest    = available.filter((e) => e.tier === 3 && e.muscleGroup === 'chest');
      const shoulder = available.filter((e) => e.tier === 3 && e.muscleGroup === 'shoulders');
      const tricep   = available.filter((e) => e.tier === 3 && e.muscleGroup === 'arms' && isTricepEx(e));
      return [...chest, ...shoulder, ...tricep].slice(0, 8);
    }
    case 'pull': {
      const back  = available.filter((e) => e.tier === 3 && e.muscleGroup === 'back');
      const bicep = available.filter((e) => e.tier === 3 && e.muscleGroup === 'arms' && isBicepEx(e));
      return [...back, ...bicep].slice(0, 8);
    }
    case 'legs': {
      const legs = available.filter((e) => e.tier === 3 && e.muscleGroup === 'legs');
      return legs.slice(0, 8);
    }
    default:
      return [];
  }
}

function buildCorePool(available) {
  const coreExs = available.filter((e) => e.muscleGroup === 'core');
  const antiExt = coreExs.filter((e) =>
    e.movementPattern === 'isometric' || /plank|rollout|hollow|dead.bug|bird.dog|pallof/i.test(e.name)
  );
  const other = coreExs.filter((e) => !antiExt.includes(e));
  return [...antiExt, ...other].slice(0, 6);
}

// ── Build day pools (called once at cycle creation) ────────────────────
export function buildDayPools(dayType, equipment) {
  const available = exercises.filter((e) => equipment.includes(e.equipment));
  const prefs = PRIMARY_PREFS[dayType];

  let primaryA = firstAvailable(prefs.A, equipment);
  let primaryB = firstAvailable(prefs.B, equipment);

  // Fallback: any tier-1 if preferred lists exhausted
  if (!primaryA) {
    primaryA = available.find((e) => e.tier === 1) ?? null;
  }
  if (!primaryB || primaryB.id === primaryA?.id) {
    primaryB = available.find((e) => e.tier === 1 && e.id !== primaryA?.id) ?? primaryA;
  }

  // Secondary pool — filtered by preference list, exclude primaries
  const secondaries = (SECONDARY_PREFS[dayType] ?? [])
    .map((id) => EX[id])
    .filter((ex) => ex && equipment.includes(ex.equipment) && ex.id !== primaryA?.id && ex.id !== primaryB?.id)
    .slice(0, 6);

  const accessories = buildAccessoryPool(dayType, available);
  const corePool    = buildCorePool(available);

  return { primaryA, primaryB, secondaries, accessories, corePool };
}

// ── Generate a single day session ─────────────────────────────────────
export function generateKratosSplitDay(dayType, pools, weekIdx, phase, durationLimit) {
  const params = PHASE_PARAMS[phase] ?? PHASE_PARAMS.foundation;
  const { primaryA, primaryB, secondaries, accessories, corePool } = pools;

  // Alternating primary: odd weeks (0,2,4...) → A, even weeks (1,3,5...) → B
  const useA           = weekIdx % 2 === 0;
  const currentPrimary = (useA ? primaryA : primaryB) ?? primaryA;
  const altPrimary     = (useA ? primaryB : primaryA) ?? primaryA;

  // Secondary selection: rotate pair every 2 weeks
  const secOffset        = (Math.floor(weekIdx / 2) * 2) % Math.max(1, secondaries.length);
  const selectedSecondaries = secondaries.length > 0
    ? [0, 1].map((i) => secondaries[(secOffset + i) % secondaries.length]).filter(Boolean)
    : [];

  // Accessory selection: shift start index each week, no exact repeat
  const numAcc = params.numAccessories;
  const accOffset = accessories.length > 0 ? weekIdx % accessories.length : 0;
  const selectedAccessories = accessories.length > 0
    ? Array.from({ length: numAcc }, (_, i) => accessories[(accOffset + i) % accessories.length]).filter(Boolean)
    : [];

  // Core: 1 anti-extension for push/pull, 2 for legs
  const coreCount    = dayType === 'legs' ? 2 : 1;
  const coreOffset   = corePool.length > 0 ? weekIdx % corePool.length : 0;
  const coreExercises = corePool.length > 0
    ? Array.from({ length: coreCount }, (_, i) => corePool[(coreOffset + i) % corePool.length]).filter(Boolean)
    : [];

  const exercises_out = [];
  let flatIdx = 0;

  // Phase 1 — Primary compound
  if (currentPrimary) {
    exercises_out.push({
      id:          currentPrimary.id,
      name:        currentPrimary.name,
      muscleGroup: currentPrimary.muscleGroup,
      equipment:   currentPrimary.equipment,
      phaseId:     'primary',
      sets:        params.primarySets,
      reps:        params.primaryReps,
      rest:        params.primaryRest,
      targetRPE:   params.rpe,
      setStructure: params.setStructure,
      movementCue: currentPrimary.cue ?? 'Control the descent. Full range of motion. Drive with intent.',
      warmupSets:  [{ pct: 40, reps: 5 }, { pct: 60, reps: 3 }, { pct: 80, reps: 2 }],
      _flatIdx:    flatIdx++,
    });
  }

  // Phase 2 — Secondary compounds
  selectedSecondaries.forEach((ex) => {
    exercises_out.push({
      id:          ex.id,
      name:        ex.name,
      muscleGroup: ex.muscleGroup,
      equipment:   ex.equipment,
      phaseId:     'secondary',
      sets:        params.secondarySets,
      reps:        params.secondaryReps,
      rest:        params.secondaryRest,
      targetRPE:   Math.max(5, params.rpe - 0.5),
      setStructure: 'straight',
      movementCue: ex.cue ?? 'Full range of motion. Control the eccentric phase.',
      _flatIdx:    flatIdx++,
    });
  });

  // Phase 3 — Accessories
  selectedAccessories.forEach((ex) => {
    exercises_out.push({
      id:          ex.id,
      name:        ex.name,
      muscleGroup: ex.muscleGroup,
      equipment:   ex.equipment,
      phaseId:     'accessory',
      sets:        params.accessorySets,
      reps:        params.accessoryReps,
      rest:        params.accessoryRest,
      targetRPE:   Math.max(5, params.rpe - 1),
      setStructure: 'straight',
      movementCue: ex.cue ?? 'Mind-muscle connection. Squeeze the target muscle.',
      _flatIdx:    flatIdx++,
    });
  });

  // Phase 4 — Core
  coreExercises.forEach((ex) => {
    exercises_out.push({
      id:          ex.id,
      name:        ex.name,
      muscleGroup: 'core',
      equipment:   ex.equipment,
      phaseId:     'core',
      sets:        params.coreSets,
      reps:        params.coreReps,
      rest:        params.coreRest,
      targetRPE:   Math.max(5, params.rpe - 1.5),
      setStructure: 'straight',
      movementCue: ex.cue ?? 'Brace the core. Maintain neutral spine throughout.',
      _flatIdx:    flatIdx++,
    });
  });

  // ── Time estimate and duration limiting ────────────────────────────
  const primaryMin   = 20;
  const secMin       = selectedSecondaries.length * 13;
  const accMin       = selectedAccessories.length * 7;
  const coreMin      = coreExercises.length * 4.5;
  const buffer       = 5;
  let   totalMin     = Math.round(primaryMin + secMin + accMin + coreMin + buffer);
  let   setReductionNote = null;

  if (durationLimit && totalMin > durationLimit) {
    // Remove accessories from the end first, core is protected
    const accExs = exercises_out.filter((e) => e.phaseId === 'accessory');
    let toRemove = accExs.length;
    while (toRemove > 0 && totalMin > durationLimit) {
      const idx = exercises_out.findLastIndex((e) => e.phaseId === 'accessory');
      if (idx === -1) break;
      exercises_out.splice(idx, 1);
      totalMin -= 7;
      toRemove--;
    }
    setReductionNote = `Accessories trimmed to fit ${durationLimit}-minute session`;
    exercises_out.forEach((ex, i) => { ex._flatIdx = i; });
  }

  // ── Compound alternation metadata ──────────────────────────────────
  const compoundAlt = {
    currentName:  currentPrimary?.name ?? 'Primary compound',
    altName:      altPrimary?.name ?? 'Alternate compound',
    nextSwapWeek: weekIdx + 2,   // 0-indexed; convert to 1-indexed in UI
    sameCompound: currentPrimary?.id === altPrimary?.id,
  };

  // ── Explanation ────────────────────────────────────────────────────
  const PHASE_DESC = {
    foundation: 'Foundation phase: technique-focused, moderate RPE. Build movement patterns before intensity climbs.',
    deload:     'Deload week: volume cut 40%, loads maintained. Active recovery for systemic reset.',
    build:      'Build phase: progressive overload in earnest. Add load each session where RPE permits.',
    peak:       'Peak phase: maximum intensity of the cycle. Every session is a new stimulus.',
    taper:      'Taper week: volume reduced 30%, intensity maintained. Priming the CNS for post-cycle testing.',
  };
  const DAY_DESC = {
    push: `Anchored by ${currentPrimary?.name ?? 'the primary press'}. Horizontal and vertical pressing with full shoulder girdle engagement.`,
    pull: `Anchored by ${currentPrimary?.name ?? 'the primary pull'}. Horizontal and vertical pulling with scapular health emphasis.`,
    legs: `Anchored by ${currentPrimary?.name ?? 'the primary lift'}. Squat and hinge pattern balance for complete lower body development.`,
  };
  const explanation = `${DAY_DESC[dayType] ?? ''} ${PHASE_DESC[phase] ?? ''}`.trim();

  return {
    exercises: exercises_out,
    totalEstimatedMin: totalMin,
    explanation,
    compoundAlt,
    accessoryNote: 'Rotating accessories — full muscle coverage every 2 weeks',
    setReductionNote,
  };
}
