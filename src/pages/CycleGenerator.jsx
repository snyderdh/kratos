import { useState, useEffect } from 'react';
import { generateCycle, regenerateSingleDay, SPLITS } from '../utils/cycleGenerator';
import CycleViewer from '../components/CycleViewer';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

const orange = '#FF6B2B';

const GOALS = [
  { value: 'strength',    label: 'Strength',    desc: '5×3-5 · Heavy' },
  { value: 'hypertrophy', label: 'Hypertrophy', desc: '4×8-12 · Growth' },
  { value: 'endurance',   label: 'Endurance',   desc: '3×15-20 · Volume' },
  { value: 'power',       label: 'Power',        desc: '5×3-5 · Explosive' },
  { value: 'mobility',    label: 'Mobility',     desc: 'Warmup + flexibility' },
];

const EQUIPMENT = [
  { value: 'barbell',     label: 'Barbell' },
  { value: 'dumbbells',   label: 'Dumbbells' },
  { value: 'bodyweight',  label: 'Bodyweight' },
  { value: 'cables',      label: 'Cables' },
  { value: 'machines',    label: 'Machines' },
  { value: 'kettlebells', label: 'Kettlebells' },
  { value: 'bands',       label: 'Bands' },
];

const SESSION_LIMITS = [
  { value: null, label: 'No limit' },
  { value: 30,   label: '30 min' },
  { value: 45,   label: '45 min' },
  { value: 60,   label: '60 min' },
  { value: 75,   label: '75 min' },
  { value: 90,   label: '90 min' },
];

const ALL_EQUIPMENT = EQUIPMENT.map((e) => e.value);
const CYCLE_LENGTHS = [4, 6, 8, 10, 12];
const SPLIT_ORDER = ['ppl', 'upperlower', 'brosplit', 'fullbody'];

function pill(active) {
  return {
    padding: '0.4rem 0.875rem',
    borderRadius: '999px',
    border: '1.5px solid',
    borderColor: active ? orange : '#e5e7eb',
    backgroundColor: active ? '#fff7ed' : '#fff',
    color: active ? orange : '#374151',
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.15s',
  };
}

export default function CycleGenerator() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [cycleLength, setCycleLength] = useState(8);
  const [split, setSplit] = useState('ppl');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [sessionMins, setSessionMins] = useState(null);
  const [goals, setGoals] = useState(['hypertrophy']);
  const [equipment, setEquipment] = useState(['barbell', 'dumbbells', 'bodyweight']);
  const [cycle, setCycle] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [sharePublic, setSharePublic] = useState(false);
  const [error, setError] = useState('');

  // Sync default days when split changes
  useEffect(() => {
    setDaysPerWeek(SPLITS[split]?.defaultDays ?? 3);
  }, [split]);

  function toggleGoal(g) {
    setGoals((prev) =>
      prev.includes(g)
        ? prev.length > 1 ? prev.filter((x) => x !== g) : prev
        : [...prev, g]
    );
  }

  function toggleEquipment(v) {
    if (v === 'all') {
      setEquipment((prev) => prev.length === ALL_EQUIPMENT.length ? ['bodyweight'] : [...ALL_EQUIPMENT]);
      return;
    }
    setEquipment((prev) =>
      prev.includes(v)
        ? prev.length > 1 ? prev.filter((x) => x !== v) : prev
        : [...prev, v]
    );
  }

  function handleGenerate() {
    setError('');
    if (equipment.length === 0) { setError('Select at least one equipment type.'); return; }
    const generated = generateCycle({
      title: title.trim() || 'My Training Cycle',
      cycleLength,
      split,
      daysPerWeek,
      goals,
      equipment,
      sessionMins,
    });
    setCycle(generated);
    setSaveSuccess(false);
    setTimeout(() => {
      document.getElementById('cycle-output')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  function handleRegenerateDay(weekIdx, dayIdx, newSessionMins) {
    if (!cycle) return;
    setCycle((prev) => regenerateSingleDay(prev, weekIdx, dayIdx, newSessionMins));
  }

  async function handleSave() {
    if (!cycle || saving) return;
    setSaving(true);
    setError('');
    const { error: dbErr } = await supabase.from('cycles').insert({
      user_id: user.id,
      title: cycle.title,
      split: cycle.split,
      split_label: cycle.splitLabel,
      cycle_length: cycle.cycleLength,
      days_per_week: cycle.daysPerWeek,
      goals: cycle.goals,
      equipment: cycle.equipment,
      weeks: cycle.weeks,
      is_public: sharePublic,
    });
    setSaving(false);
    if (dbErr) {
      setError('Failed to save: ' + dbErr.message);
    } else {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  }

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#111827', marginBottom: '0.25rem' }}>Cycle Generator</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '0.9rem' }}>
        Build a structured multi-week training block with progressive overload built in.
      </p>

      {/* Form card */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: '1.5rem' }}>

        {/* Title */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 700, color: '#111827', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Cycle Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Summer Strength Block"
            maxLength={60}
            style={{ width: '100%', padding: '0.6rem 0.875rem', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', color: '#111827', outline: 'none', boxSizing: 'border-box' }}
            onFocus={(e) => (e.target.style.borderColor = orange)}
            onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
          />
        </div>

        {/* Cycle length */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 700, color: '#111827', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Cycle Length</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {CYCLE_LENGTHS.map((wk) => (
              <button key={wk} onClick={() => setCycleLength(wk)} style={pill(cycleLength === wk)}>
                {wk} weeks
              </button>
            ))}
          </div>
        </div>

        {/* Training split */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 700, color: '#111827', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Training Split</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '0.625rem' }}>
            {SPLIT_ORDER.map((s) => {
              const sp = SPLITS[s];
              const active = split === s;
              return (
                <button
                  key={s}
                  onClick={() => setSplit(s)}
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '2px solid', borderColor: active ? orange : '#e5e7eb', backgroundColor: active ? '#fff7ed' : '#fff', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s' }}
                >
                  <div style={{ fontWeight: 700, color: active ? orange : '#111827', fontSize: '0.875rem', marginBottom: '0.25rem' }}>{sp.label}</div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280', lineHeight: 1.4 }}>{sp.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Days per week — only shown for splits with multiple options */}
        {SPLITS[split]?.daysOptions?.length > 1 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 700, color: '#111827', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Days per Week</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {SPLITS[split].daysOptions.map((d) => (
                <button key={d} onClick={() => setDaysPerWeek(d)} style={pill(daysPerWeek === d)}>
                  {d} days
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Session length */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 700, color: '#111827', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Default Session Length</label>
          <p style={{ color: '#6b7280', fontSize: '0.78rem', marginBottom: '0.5rem', marginTop: 0 }}>Sets the exercise count per session. You can override per day after generating.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {SESSION_LIMITS.map(({ value, label }) => (
              <button key={String(value)} onClick={() => setSessionMins(value)} style={pill(sessionMins === value)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Goals */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 700, color: '#111827', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Training Goals</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {GOALS.map((g) => (
              <button key={g.value} onClick={() => toggleGoal(g.value)} style={pill(goals.includes(g.value))}>
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Equipment */}
        <div style={{ marginBottom: '1.75rem' }}>
          <label style={{ display: 'block', fontWeight: 700, color: '#111827', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Available Equipment</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button onClick={() => toggleEquipment('all')} style={pill(equipment.length === ALL_EQUIPMENT.length)}>All</button>
            {EQUIPMENT.map((eq) => (
              <button key={eq.value} onClick={() => toggleEquipment(eq.value)} style={pill(equipment.includes(eq.value))}>
                {eq.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{error}</p>}

        <button
          onClick={handleGenerate}
          style={{ width: '100%', padding: '0.875rem', backgroundColor: orange, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', transition: 'background-color 0.15s' }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#e55a1f')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = orange)}
        >
          Generate Cycle
        </button>
      </div>

      {/* Output */}
      {cycle && (
        <div id="cycle-output" style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>{cycle.title}</h2>
              <p style={{ color: '#6b7280', fontSize: '0.82rem', margin: '0.2rem 0 0' }}>Click any training day to view exercises or adjust its session length</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleGenerate}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: `1.5px solid ${orange}`, backgroundColor: 'transparent', color: orange, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
              >
                Regenerate
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: saveSuccess ? '#16a34a' : orange, color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'background-color 0.2s', whiteSpace: 'nowrap' }}
              >
                {saving ? 'Saving…' : saveSuccess ? 'Saved!' : 'Save Cycle'}
              </button>
            </div>
          </div>

          {/* Share toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <button
              onClick={() => setSharePublic((v) => !v)}
              style={{ width: '36px', height: '20px', borderRadius: '999px', border: 'none', backgroundColor: sharePublic ? orange : '#d1d5db', position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s', flexShrink: 0 }}
            >
              <span style={{ position: 'absolute', top: '2px', left: sharePublic ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s' }} />
            </button>
            <span style={{ fontSize: '0.84rem', color: '#374151', fontWeight: 600 }}>Share to Community feed</span>
          </div>

          <CycleViewer cycle={cycle} onRegenerateDay={handleRegenerateDay} />
        </div>
      )}
    </div>
  );
}
