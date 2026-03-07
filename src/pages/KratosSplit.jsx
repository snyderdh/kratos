import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateAdvancedRoutine } from '../utils/routineGenerator';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { C, FONTS, card, btnPrimary, inputBase, labelBase } from '../theme';

// ── Brand colors ──────────────────────────────────────────────────────
const TERRA = '#C2622A';
const SAGE  = '#6B8F71';
const MIST  = '#9E9189';

// ── 7-day system ──────────────────────────────────────────────────────
const DAYS_CONFIG = [
  { idx: 0, label: 'Push',    abbr: 'Push', weekday: 'Mon', type: 'lift',    color: TERRA, muscles: ['chest', 'shoulders', 'arms'] },
  { idx: 1, label: 'Recover', abbr: 'Rec',  weekday: 'Tue', type: 'recover', color: SAGE  },
  { idx: 2, label: 'Pull',    abbr: 'Pull', weekday: 'Wed', type: 'lift',    color: TERRA, muscles: ['back', 'arms'] },
  { idx: 3, label: 'Recover', abbr: 'Rec',  weekday: 'Thu', type: 'recover', color: SAGE  },
  { idx: 4, label: 'Legs',    abbr: 'Legs', weekday: 'Fri', type: 'lift',    color: TERRA, muscles: ['legs', 'core'] },
  { idx: 5, label: 'Recover', abbr: 'Rec',  weekday: 'Sat', type: 'recover', color: SAGE  },
  { idx: 6, label: 'Rest',    abbr: 'Rest', weekday: 'Sun', type: 'rest',    color: MIST  },
];

const DAY_DETAILS = [
  {
    title: 'Push Day',
    tagline: 'Chest · Shoulders · Triceps',
    description: 'Anchored by a tier-1 pressing compound (bench press or overhead press), followed by secondary presses, targeted isolation work, and a core finisher. Progressive overload is built in across all 12 weeks.',
    principle: 'Horizontal + vertical pressing patterns with full shoulder girdle engagement.',
  },
  {
    title: 'Recovery Day',
    tagline: 'Zone 2 Cardio + Full-Body Mobility',
    description: 'Not a day off — a day in. Zone 2 cardio (60–70% max HR, conversational pace) drives mitochondrial density without accumulating fatigue. The 9-stretch sequence restores range of motion across all major joints.',
    principle: 'Active recovery accelerates supercompensation. Hard days hard, easy days easy.',
  },
  {
    title: 'Pull Day',
    tagline: 'Back · Biceps · Rear Delts',
    description: 'Anchored by a tier-1 horizontal or vertical pull (barbell row, weighted pull-up), followed by secondary rows and targeted bicep and rear delt isolation. Scapular health is a priority.',
    principle: 'Horizontal + vertical pulling patterns with thoracic stability emphasis.',
  },
  {
    title: 'Recovery Day',
    tagline: 'Zone 2 Cardio + Full-Body Mobility',
    description: 'Identical protocol to Tuesday. Consistency in recovery is what separates adaptive athletes from overtrained ones. Each session compounds the benefits of the last.',
    principle: 'Two structured recovery sessions per week create the conditions for peak output.',
  },
  {
    title: 'Leg Day',
    tagline: 'Quads · Hamstrings · Glutes · Core',
    description: 'Anchored by a tier-1 squat or hinge (back squat, Romanian deadlift), followed by secondary compound leg work, isolation accessories for hamstrings and glutes, and an anti-extension core finisher.',
    principle: 'Squat + hinge pattern balance for complete lower body development.',
  },
  {
    title: 'Recovery Day',
    tagline: 'Zone 2 Cardio + Full-Body Mobility',
    description: 'The third recovery session of the week. After a demanding leg day, prioritize hip flexor and hamstring flexibility in the stretch sequence. Same Zone 2 protocol.',
    principle: 'Residual leg fatigue impairs all subsequent sessions. Protect the next cycle.',
  },
  {
    title: 'Rest Day',
    tagline: 'Complete Rest',
    description: 'No training. No active recovery. Sleep, nutrition, and stress management take the wheel. This is when adaptation happens — during rest, not during training.',
    principle: 'Supercompensation occurs in the 48–72h post-stimulus window. Protect it.',
  },
];

const STRETCH_ROUTINE = [
  { name: 'Hip Flexor Stretch',        duration: '45s/side', cue: 'Lunge position, posterior pelvic tilt' },
  { name: 'Thread the Needle',         duration: '30s/side', cue: 'Thoracic rotation on all fours' },
  { name: "World's Greatest Stretch",  duration: '45s/side', cue: 'Full kinetic chain — ankle, hip, T-spine' },
  { name: 'Pigeon Pose',               duration: '60s/side', cue: 'External hip rotation, keep hips square' },
  { name: "Child's Pose",              duration: '60s',       cue: 'Spinal decompression, arms long overhead' },
  { name: 'Cat-Cow',                   duration: '10 reps',   cue: 'Segmental spine mobilization — slow' },
  { name: 'Standing Quad Stretch',     duration: '30s/side', cue: 'Knee flexion + hip extension, stand tall' },
  { name: 'Doorway Chest Opener',      duration: '45s',       cue: 'Pec minor release, scapular retraction' },
  { name: 'Neck Half-Rolls',           duration: '60s',       cue: 'Upper trap and SCM — slow controlled arcs' },
];

// ── 12-week phase schedule ────────────────────────────────────────────
const PHASE_BREAKDOWN = [
  { phase: 'Foundation', weeks: '1–3',  color: '#2563eb', bg: '#eff6ff', rpe: '7–8',   desc: 'Build technical proficiency and aerobic base. Volumes are moderate; execution is the priority.' },
  { phase: 'Deload',     weeks: '4',    color: '#6b7280', bg: '#f9fafb', rpe: '6',     desc: '40% volume reduction. Maintain movement quality; allow full systemic recovery before the build.' },
  { phase: 'Build',      weeks: '5–7',  color: '#16a34a', bg: '#f0fdf4', rpe: '8',     desc: '+1 set per exercise. Progressive overload begins in earnest. Track and increase loads weekly.' },
  { phase: 'Deload',     weeks: '8',    color: '#6b7280', bg: '#f9fafb', rpe: '6',     desc: 'Strategic deload before the peak block. Tissue recovery and CNS reset before max intensity.' },
  { phase: 'Peak',       weeks: '9–11', color: TERRA,     bg: '#F5EDE6', rpe: '8.5–9', desc: 'Highest intensity of the cycle. Volume stable; load climbs each session. This is where you earn it.' },
  { phase: 'Taper',      weeks: '12',   color: '#9333ea', bg: '#faf5ff', rpe: '7',     desc: 'Volume drops 30%. Maintain neuromuscular priming for post-cycle testing or transition.' },
];

// ── Form options ──────────────────────────────────────────────────────
const EXPERIENCE_LEVELS = [
  { value: 'beginner',     label: 'Beginner',     desc: 'Under 1 year of consistent training',    philosophy: 'general_fitness'      },
  { value: 'intermediate', label: 'Intermediate',  desc: '1–3 years with solid movement patterns',  philosophy: 'bodybuilding'         },
  { value: 'advanced',     label: 'Advanced',      desc: '3+ years of structured programming',      philosophy: 'athletic_performance' },
];

const GOAL_OPTIONS = [
  { value: 'strength',    label: 'Strength'    },
  { value: 'hypertrophy', label: 'Hypertrophy' },
  { value: 'power',       label: 'Power'       },
  { value: 'endurance',   label: 'Endurance'   },
];

const EQUIPMENT_OPTIONS = [
  { value: 'barbell',     label: 'Barbell'     },
  { value: 'dumbbells',   label: 'Dumbbells'   },
  { value: 'bodyweight',  label: 'Bodyweight'  },
  { value: 'cables',      label: 'Cables'      },
  { value: 'machines',    label: 'Machines'    },
  { value: 'kettlebells', label: 'Kettlebells' },
  { value: 'bands',       label: 'Bands'       },
];

const CARDIO_MODALITIES = [
  { value: 'cycling',    label: 'Cycling'    },
  { value: 'rowing',     label: 'Rowing'     },
  { value: 'treadmill',  label: 'Treadmill'  },
  { value: 'stairmaster',label: 'Stairmaster' },
  { value: 'elliptical', label: 'Elliptical' },
  { value: 'walking',    label: 'Walking'    },
];

const SESSION_LENGTHS = [
  { value: null, label: 'No limit' },
  { value: 45,   label: '45 min'  },
  { value: 60,   label: '60 min'  },
  { value: 75,   label: '75 min'  },
  { value: 90,   label: '90 min'  },
];

// ── 12-week phase-to-week mapping ─────────────────────────────────────
const PHASE_WEEKS = [
  'foundation', 'foundation', 'foundation', 'deload',
  'build',      'build',      'build',      'deload',
  'peak',       'peak',       'peak',       'taper',
];

const PHASE_DUR_MULT = { foundation: 1, deload: 0.6, build: 1, peak: 1, taper: 0.75 };

// ── SVG helpers ───────────────────────────────────────────────────────
const CX = 160, CY = 160, OR = 138, IR = 70;
const SEG_DEG = 360 / 7;
const GAP_DEG = 1.8;

function arcPath(cx, cy, R, r, sDeg, eDeg) {
  const rad = (d) => (d * Math.PI) / 180;
  const x1 = cx + R * Math.cos(rad(sDeg)), y1 = cy + R * Math.sin(rad(sDeg));
  const x2 = cx + R * Math.cos(rad(eDeg)), y2 = cy + R * Math.sin(rad(eDeg));
  const x3 = cx + r * Math.cos(rad(eDeg)), y3 = cy + r * Math.sin(rad(eDeg));
  const x4 = cx + r * Math.cos(rad(sDeg)), y4 = cy + r * Math.sin(rad(sDeg));
  const lg = eDeg - sDeg > 180 ? 1 : 0;
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 ${lg} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L${x3.toFixed(2)} ${y3.toFixed(2)} A${r} ${r} 0 ${lg} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}Z`;
}

function pill(active) {
  return {
    padding: '0.4rem 0.875rem',
    borderRadius: '999px',
    border: `1px solid ${active ? C.accent : C.border}`,
    backgroundColor: active ? C.accentMuted : 'transparent',
    color: active ? C.accent : C.textSecondary,
    fontWeight: active ? 400 : 300,
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: FONTS.body,
  };
}

// ── Main component ────────────────────────────────────────────────────
export default function KratosSplit() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedDay, setSelectedDay] = useState(null);

  // Form state
  const [experience,     setExperience]     = useState('intermediate');
  const [goalEmphasis,   setGoalEmphasis]   = useState('hypertrophy');
  const [equipment,      setEquipment]      = useState(['barbell', 'dumbbells', 'cables', 'bodyweight']);
  const [cardioModalities, setCardioModalities] = useState(['cycling']);
  const [cardioMins,     setCardioMins]     = useState(30);
  const [sessionMins,    setSessionMins]    = useState(60);
  const [cycleTitle,     setCycleTitle]     = useState('');

  // Action state
  const [generating, setGenerating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  function toggleEquipment(v) {
    setEquipment((prev) =>
      prev.includes(v)
        ? prev.length > 1 ? prev.filter((x) => x !== v) : prev
        : [...prev, v]
    );
  }

  function toggleCardioModality(v) {
    setCardioModalities((prev) =>
      prev.includes(v)
        ? prev.length > 1 ? prev.filter((x) => x !== v) : prev
        : [...prev, v]
    );
  }

  async function handleBeginSplit() {
    if (generating) return;
    setGenerating(true);
    setError('');
    setSaveSuccess(false);

    const philosophy = EXPERIENCE_LEVELS.find((e) => e.value === experience)?.philosophy ?? 'general_fitness';
    const title = cycleTitle.trim() || 'Kratos Split — 12-Week Block';

    const weeks = [];

    for (let wk = 0; wk < 12; wk++) {
      const phaseName = PHASE_WEEKS[wk];
      const durMult   = PHASE_DUR_MULT[phaseName];
      const phaseDur  = sessionMins ? Math.max(30, Math.round(sessionMins * durMult)) : null;

      const makeRoutine = (muscleGroups) =>
        generateAdvancedRoutine({
          goals: [goalEmphasis],
          equipment,
          muscleGroups,
          philosophy,
          durationLimit: phaseDur,
          excludedExerciseIds: [],
        });

      const pushR = makeRoutine(['chest', 'shoulders', 'arms']);
      const pullR = makeRoutine(['back', 'arms']);
      const legsR = makeRoutine(['legs', 'core']);

      const makeCardioBlock = (recoverIdx) => ({
        modality:    cardioModalities[recoverIdx % cardioModalities.length],
        durationMin: cardioMins,
        intensity:   'Zone 2 (60–70% max HR, conversational pace)',
      });

      const days = [
        { type: 'push',    label: 'Push',    phase: phaseName, exercises: pushR.exercises, estimatedMin: pushR.totalEstimatedMin, explanation: pushR.explanation },
        { type: 'recover', label: 'Recover', phase: phaseName, cardioBlock: makeCardioBlock(0), stretches: STRETCH_ROUTINE },
        { type: 'pull',    label: 'Pull',    phase: phaseName, exercises: pullR.exercises, estimatedMin: pullR.totalEstimatedMin, explanation: pullR.explanation },
        { type: 'recover', label: 'Recover', phase: phaseName, cardioBlock: makeCardioBlock(1), stretches: STRETCH_ROUTINE },
        { type: 'legs',    label: 'Legs',    phase: phaseName, exercises: legsR.exercises, estimatedMin: legsR.totalEstimatedMin, explanation: legsR.explanation },
        { type: 'recover', label: 'Recover', phase: phaseName, cardioBlock: makeCardioBlock(2), stretches: STRETCH_ROUTINE },
        { type: 'rest',    label: 'Rest',    phase: phaseName },
      ];

      weeks.push({ weekNumber: wk + 1, phase: phaseName, days });
    }

    const resolvedGoal = goalEmphasis || 'general_fitness';

    const { error: dbErr } = await supabase.from('cycles').insert({
      user_id:              user.id,
      title,
      split:                'kratos_split',
      goal:                 resolvedGoal,
      goals:                [resolvedGoal],
      equipment:            [...equipment],
      weeks,
      is_public:            false,
      experience_level:     experience,
      cardio_modalities:    [...cardioModalities],
      cardio_stretch_ratio: cardioMins,
    });

    setGenerating(false);

    if (dbErr) {
      setError('Failed to save: ' + dbErr.message);
    } else {
      setSaveSuccess(true);
      setTimeout(() => navigate('/saved-cycles'), 2200);
    }
  }

  // ── SVG Wheel ─────────────────────────────────────────────────────
  function Wheel() {
    return (
      <svg viewBox="0 0 320 320" width="272" height="272" style={{ display: 'block', margin: '0 auto' }}>
        {DAYS_CONFIG.map((day, i) => {
          const sDeg = -90 + i * SEG_DEG + GAP_DEG / 2;
          const eDeg = -90 + (i + 1) * SEG_DEG - GAP_DEG / 2;
          const midDeg = (sDeg + eDeg) / 2;
          const midRad = (midDeg * Math.PI) / 180;
          const labelR  = (OR + IR) / 2;
          const lx = CX + labelR * Math.cos(midRad);
          const ly = CY + labelR * Math.sin(midRad);
          const active = selectedDay === i;

          return (
            <g key={i} onClick={() => setSelectedDay(active ? null : i)} style={{ cursor: 'pointer' }}>
              <path
                d={arcPath(CX, CY, OR, IR, sDeg, eDeg)}
                fill={day.color}
                opacity={selectedDay === null || active ? 1 : 0.4}
                stroke="#fff"
                strokeWidth="1.5"
                style={{ transition: 'opacity 0.2s' }}
              />
              <text
                x={lx} y={ly - 6}
                textAnchor="middle" dominantBaseline="middle"
                fill="#fff" fontSize={day.type === 'lift' ? 9 : 8}
                fontWeight="400" fontFamily={FONTS.body}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {day.abbr}
              </text>
              <text
                x={lx} y={ly + 7}
                textAnchor="middle" dominantBaseline="middle"
                fill="rgba(255,255,255,0.65)" fontSize="7"
                fontFamily={FONTS.body}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {day.weekday}
              </text>
            </g>
          );
        })}
        <text x={CX} y={CY - 9} textAnchor="middle" fill={C.text} fontSize="13" fontWeight="500" fontFamily={FONTS.heading} fontStyle="italic">KRATOS</text>
        <text x={CX} y={CY + 8} textAnchor="middle" fill={C.textSecondary} fontSize="8" fontFamily={FONTS.body} fontWeight="300">6-Day Split</text>
      </svg>
    );
  }

  const selDay  = selectedDay !== null ? DAYS_CONFIG[selectedDay]   : null;
  const selInfo = selectedDay !== null ? DAY_DETAILS[selectedDay]   : null;

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', paddingBottom: '4rem' }}>

      {/* ── A: Manifesto Hero ─────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(155deg, #1A0F06 0%, #281505 55%, #1A0F06 100%)',
        padding: 'clamp(2.5rem, 6vw, 4rem) clamp(1.5rem, 5vw, 3rem)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(ellipse at 75% 15%, rgba(194,98,42,0.12) 0%, transparent 55%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            backgroundColor: 'rgba(194,98,42,0.14)', border: '1px solid rgba(194,98,42,0.28)',
            borderRadius: '999px', padding: '0.3rem 0.875rem', marginBottom: '1.5rem',
          }}>
            <span style={{ color: TERRA, fontSize: '0.7rem', fontWeight: 400, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: FONTS.body }}>
              Flagship Training System
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 500,
            color: '#F5EDE6', marginBottom: '0.4rem',
            fontFamily: FONTS.heading, fontStyle: 'italic', lineHeight: 1.1,
          }}>
            The Kratos Split
          </h1>
          <p style={{ fontSize: '0.975rem', color: 'rgba(245,237,230,0.5)', fontWeight: 300, marginBottom: '2.25rem', letterSpacing: '0.04em' }}>
            Six days. Three systems. Twelve weeks.
          </p>

          <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '1.1rem', marginBottom: '2.5rem' }}>
            {[
              'Most training programs fail for one reason: they ignore the relationship between stress, recovery, and adaptation. They push hard, then push harder, until the athlete either stagnates or breaks. The Kratos Split was built to solve this.',
              'Three dedicated lifting sessions — Push, Pull, Legs — each separated by a structured recovery day combining Zone 2 cardio and full-body mobility work. Sunday is complete rest. This alternating rhythm creates the physiological conditions for genuine adaptation, week after week, for 12 full weeks.',
              'Each session uses our 5-phase periodized engine: primary compound, secondary compound, targeted accessories, intensifier, core finisher. Every exercise carries RPE targets, movement cues, and phase-appropriate set/rep schemes. Progressive overload is built into the macro structure — not left to chance.',
            ].map((text, i) => (
              <p key={i} style={{ color: 'rgba(245,237,230,0.72)', fontSize: '0.9rem', lineHeight: 1.8, fontWeight: 300, margin: 0 }}>
                {text}
              </p>
            ))}
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem',
            padding: '1.375rem 1.5rem',
            backgroundColor: 'rgba(245,237,230,0.04)', border: '1px solid rgba(194,98,42,0.2)',
            borderRadius: '12px', maxWidth: '520px',
          }}>
            {[
              { value: '36', label: 'Training Sessions' },
              { value: '84', label: 'Days Structured'   },
              { value: '5',  label: 'Phase Engine'       },
              { value: '12', label: 'Weeks Periodized'  },
            ].map(({ value, label }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 500, color: TERRA, fontFamily: FONTS.heading, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(245,237,230,0.45)', fontWeight: 300, marginTop: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── B: Weekly Protocol ────────────────────────────────────────── */}
      <div style={{ padding: '3rem 1.5rem', backgroundColor: C.bg }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 500, color: C.text, margin: '0 0 0.35rem', fontFamily: FONTS.heading }}>The Weekly Protocol</h2>
          <p style={{ color: C.textSecondary, fontSize: '0.875rem', fontWeight: 300, margin: 0 }}>Tap any day to explore its structure</p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2.5rem', justifyContent: 'center', alignItems: 'flex-start' }}>
          {/* Wheel + legend */}
          <div style={{ flexShrink: 0 }}>
            <Wheel />
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem', marginTop: '0.875rem', flexWrap: 'wrap' }}>
              {[{ color: TERRA, label: 'Lift' }, { color: SAGE, label: 'Recover' }, { color: MIST, label: 'Rest' }].map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }} />
                  <span style={{ fontSize: '0.75rem', color: C.textSecondary, fontWeight: 300 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: expand or list */}
          <div style={{ flex: '1 1 260px', minWidth: '230px' }}>
            {selDay ? (
              <div style={{
                ...card,
                border: `1.5px solid ${selDay.color}45`,
                borderTop: `3px solid ${selDay.color}`,
                padding: '1.375rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.875rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: selDay.color }} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 400, color: selDay.color, textTransform: 'uppercase', letterSpacing: '0.09em' }}>
                    {selDay.weekday}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 500, color: C.text, margin: '0 0 0.2rem', fontFamily: FONTS.heading }}>{selInfo.title}</h3>
                <p style={{ fontSize: '0.78rem', color: C.textSecondary, margin: '0 0 1rem', fontWeight: 300 }}>{selInfo.tagline}</p>
                <p style={{ fontSize: '0.875rem', color: C.text, lineHeight: 1.7, margin: '0 0 1.1rem', fontWeight: 300 }}>{selInfo.description}</p>
                <div style={{ padding: '0.7rem 1rem', backgroundColor: `${selDay.color}12`, borderLeft: `3px solid ${selDay.color}`, borderRadius: '0 6px 6px 0' }}>
                  <span style={{ fontSize: '0.78rem', color: selDay.color, fontWeight: 400, fontStyle: 'italic' }}>{selInfo.principle}</span>
                </div>

                {selDay.type === 'recover' && (
                  <div style={{ marginTop: '1.25rem' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 400, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '0.625rem' }}>
                      Stretch Protocol
                    </div>
                    {STRETCH_ROUTINE.map((s, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem', padding: '0.25rem 0', borderBottom: i < STRETCH_ROUTINE.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                        <span style={{ fontSize: '0.8rem', color: C.text, fontWeight: 300 }}>{s.name}</span>
                        <span style={{ fontSize: '0.72rem', color: C.textSecondary, fontWeight: 300, whiteSpace: 'nowrap' }}>{s.duration}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setSelectedDay(null)}
                  style={{ marginTop: '1rem', fontSize: '0.78rem', color: C.textSecondary, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: FONTS.body }}
                >
                  ← Back to all days
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {DAYS_CONFIG.map((day, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(i)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.875rem',
                      padding: '0.7rem 1rem', borderRadius: '8px',
                      border: `1px solid ${C.border}`, backgroundColor: C.surface,
                      cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.13s',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = day.color + '70'; }}
                    onMouseOut={(e)  => { e.currentTarget.style.borderColor = C.border; }}
                  >
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: day.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 400, color: C.text }}>{day.label}</div>
                      <div style={{ fontSize: '0.72rem', color: C.textSecondary, fontWeight: 300 }}>
                        {day.weekday} · {DAY_DETAILS[i].tagline}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: C.textSecondary }}>›</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 12-week breakdown */}
        <div style={{ marginTop: '3rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 500, color: C.text, margin: '0 0 1rem', fontFamily: FONTS.heading }}>
            12-Week Periodization
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {PHASE_BREAKDOWN.map((p, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: '1rem',
                padding: '0.875rem 1rem', borderRadius: '8px',
                border: `1px solid ${C.border}`, backgroundColor: C.surface,
              }}>
                <div style={{
                  flexShrink: 0, minWidth: '68px',
                  backgroundColor: p.bg, borderRadius: '999px',
                  padding: '0.2rem 0.6rem', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 400, color: p.color }}>Wk {p.weeks}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 400, color: C.text }}>{p.phase}</span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 400, color: p.color, backgroundColor: p.bg, padding: '0.1rem 0.5rem', borderRadius: '999px' }}>
                      RPE {p.rpe}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: C.textSecondary, fontWeight: 300, margin: 0, lineHeight: 1.55 }}>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── C: Configuration Form ─────────────────────────────────────── */}
      <div style={{ padding: '0 1.5rem' }}>
        <div style={{ marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 500, color: C.text, margin: '0 0 0.4rem', fontFamily: FONTS.heading }}>
            Begin Your Block
          </h2>
          <p style={{ color: C.textSecondary, fontSize: '0.875rem', fontWeight: 300, margin: 0 }}>
            Configure your 12-week Kratos Split. We'll generate all 36 training sessions and save your complete cycle.
          </p>
        </div>

        <div style={{ ...card, padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Cycle name */}
          <div>
            <label style={labelBase}>Cycle Name</label>
            <input
              type="text" value={cycleTitle}
              onChange={(e) => setCycleTitle(e.target.value)}
              placeholder="e.g. Summer 2025 Block"
              maxLength={60} style={inputBase}
              onFocus={(e) => (e.target.style.borderColor = C.accent)}
              onBlur={(e)  => (e.target.style.borderColor = C.border)}
            />
          </div>

          {/* Experience level */}
          <div>
            <label style={labelBase}>Experience Level</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.375rem' }}>
              {EXPERIENCE_LEVELS.map(({ value, label, desc }) => {
                const active = experience === value;
                return (
                  <button
                    key={value} onClick={() => setExperience(value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.875rem',
                      padding: '0.75rem 1rem', borderRadius: '8px',
                      border: `1.5px solid ${active ? C.accent : C.border}`,
                      backgroundColor: active ? C.accentMuted : C.bg,
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${active ? C.accent : C.border}`,
                      backgroundColor: active ? C.accent : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {active && <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#fff' }} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 400, fontSize: '0.875rem', color: active ? C.accent : C.text }}>{label}</div>
                      <div style={{ fontSize: '0.75rem', color: C.textSecondary, fontWeight: 300 }}>{desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Goal emphasis */}
          <div>
            <label style={labelBase}>Goal Emphasis</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.375rem' }}>
              {GOAL_OPTIONS.map(({ value, label }) => (
                <button key={value} onClick={() => setGoalEmphasis(value)} style={pill(goalEmphasis === value)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Equipment */}
          <div>
            <label style={labelBase}>Available Equipment</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.375rem' }}>
              {EQUIPMENT_OPTIONS.map(({ value, label }) => (
                <button key={value} onClick={() => toggleEquipment(value)} style={pill(equipment.includes(value))}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Session length */}
          <div>
            <label style={labelBase}>Lifting Session Length</label>
            <p style={{ fontSize: '0.78rem', color: C.textSecondary, margin: '0 0 0.5rem', fontWeight: 300 }}>
              Applies to lifting days. Recovery days use a fixed protocol.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {SESSION_LENGTHS.map(({ value, label }) => (
                <button key={String(value)} onClick={() => setSessionMins(value)} style={pill(sessionMins === value)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Cardio modality */}
          <div>
            <label style={labelBase}>Recovery Day Cardio</label>
            <p style={{ fontSize: '0.78rem', color: C.textSecondary, margin: '0 0 0.5rem', fontWeight: 300 }}>
              Zone 2 intensity (60–70% max HR, conversational pace) · {cardioMins} min per session · rotates across recovery days
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.875rem' }}>
              {CARDIO_MODALITIES.map(({ value, label }) => (
                <button key={value} onClick={() => toggleCardioModality(value)} style={pill(cardioModalities.includes(value))}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <input
                type="range" min="15" max="60" step="5"
                value={cardioMins}
                onChange={(e) => setCardioMins(Number(e.target.value))}
                style={{ flex: 1, accentColor: C.accent }}
              />
              <span style={{ fontSize: '0.875rem', color: C.text, fontWeight: 400, minWidth: '46px' }}>{cardioMins} min</span>
            </div>
          </div>

          {/* Error / Success */}
          {error && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          {saveSuccess && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: '0.875rem' }}>
              Your 12-week Kratos Split has been generated and saved. Redirecting to Saved Cycles…
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleBeginSplit}
            disabled={generating}
            style={{
              ...btnPrimary,
              padding: '1rem', fontSize: '1rem',
              letterSpacing: '0.02em',
              cursor: generating ? 'default' : 'pointer',
              opacity: generating ? 0.75 : 1,
              backgroundColor: saveSuccess ? '#16a34a' : C.accent,
            }}
            onMouseOver={(e) => { if (!generating && !saveSuccess) e.currentTarget.style.backgroundColor = '#A8521F'; }}
            onMouseOut={(e)  => { if (!generating && !saveSuccess) e.currentTarget.style.backgroundColor = C.accent; }}
          >
            {generating ? 'Generating 36 sessions…' : saveSuccess ? 'Saved — Redirecting…' : 'Begin the Kratos Split'}
          </button>

          <p style={{ fontSize: '0.78rem', color: C.textSecondary, fontWeight: 300, margin: 0, textAlign: 'center' }}>
            Generates all 36 lifting sessions, 36 recovery protocols, and 12 rest days. Saved to your account automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
