import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { C, FONTS, card } from '../theme';

const TERRA = '#C2622A';

const DAY_TYPE_STYLES = {
  push:    { bg: '#F5EDE6', text: TERRA,    border: '#C2622A55' },
  pull:    { bg: '#EEF2FF', text: '#4338CA', border: '#6366F155' },
  legs:    { bg: '#F0FDF4', text: '#15803D', border: '#22C55E55' },
  recover: { bg: '#EEF4EF', text: '#6B8F71', border: '#6B8F7155' },
  custom:  { bg: '#F5F5F5', text: '#6B7280', border: '#9CA3AF55' },
  upper:   { bg: '#F5EDE6', text: TERRA,    border: '#C2622A55' },
  lower:   { bg: '#F0FDF4', text: '#15803D', border: '#22C55E55' },
};

function getDayTypeStyle(dayType) {
  return DAY_TYPE_STYLES[dayType] || DAY_TYPE_STYLES.custom;
}

function getDayTypeLabel(dayType) {
  const labels = {
    push: 'Push', pull: 'Pull', legs: 'Legs', recover: 'Recover',
    custom: 'Custom', upper: 'Upper', lower: 'Lower',
  };
  return labels[dayType] || (dayType ? dayType.charAt(0).toUpperCase() + dayType.slice(1) : 'Workout');
}

function groupLogsByDate(logs) {
  const groups = {};
  logs.forEach((log) => {
    const date = log.logged_at?.split('T')[0];
    if (!date) return;
    if (!groups[date]) groups[date] = [];
    groups[date].push(log);
  });

  return Object.entries(groups)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, dateLogs]) => {
      const exercises = [...new Set(dateLogs.map((l) => l.exercise_name))];
      let totalVolume = 0;
      dateLogs.forEach((l) => {
        if (l.weight_lbs && l.reps_completed) {
          totalVolume += parseFloat(l.weight_lbs) * parseInt(l.reps_completed, 10);
        }
      });
      const rpeValues = dateLogs.filter((l) => l.rpe_actual).map((l) => parseFloat(l.rpe_actual));
      const avgRPE = rpeValues.length > 0
        ? (rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length).toFixed(1)
        : null;
      const dayType = dateLogs[0]?.day_type ?? 'custom';
      const totalSets = dateLogs.length;

      const byExercise = {};
      dateLogs.forEach((l) => {
        if (!byExercise[l.exercise_name]) byExercise[l.exercise_name] = [];
        byExercise[l.exercise_name].push(l);
      });

      return { date, logs: dateLogs, exercises, totalVolume: Math.round(totalVolume), avgRPE, dayType, totalSets, byExercise };
    });
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function formatSetDetail(log) {
  const parts = [];
  if (log.weight_lbs && log.reps_completed) parts.push(`${log.weight_lbs} lbs × ${log.reps_completed}`);
  else if (log.reps_completed) parts.push(`${log.reps_completed} reps`);
  if (log.duration_seconds) parts.push(`${log.duration_seconds}s`);
  if (log.rpe_actual) parts.push(`RPE ${log.rpe_actual}`);
  return parts.join(' · ') || '—';
}

function ChevronDownIcon({ size = 16, color = C.textSecondary }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

function ChevronUpIcon({ size = 16, color = C.textSecondary }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  );
}

function SessionCard({ session }) {
  const [expanded, setExpanded] = useState(false);
  const typeStyle = getDayTypeStyle(session.dayType);
  const typeLabel = getDayTypeLabel(session.dayType);

  return (
    <div style={{ ...card, overflow: 'hidden', marginBottom: '0.875rem' }}>
      {/* Clickable header */}
      <div
        onClick={() => setExpanded((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded((v) => !v); }}
        style={{
          padding: '1rem 1.25rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
          userSelect: 'none',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Day type + date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.58rem', fontWeight: 600,
              color: typeStyle.text, backgroundColor: typeStyle.bg,
              border: `1px solid ${typeStyle.border}`,
              borderRadius: '999px', padding: '0.15rem 0.625rem',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              {typeLabel}
            </span>
            <span style={{ fontSize: '0.825rem', fontWeight: 400, color: C.text }}>
              {formatDate(session.date)}
            </span>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: C.textSecondary, fontWeight: 300 }}>
              {session.exercises.length} exercise{session.exercises.length !== 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: '0.72rem', color: C.textSecondary, fontWeight: 300 }}>
              {session.totalSets} set{session.totalSets !== 1 ? 's' : ''}
            </span>
            {session.totalVolume > 0 && (
              <span style={{ fontSize: '0.72rem', color: C.textSecondary, fontWeight: 300 }}>
                {session.totalVolume.toLocaleString()} lbs
              </span>
            )}
            {session.avgRPE && (
              <span style={{ fontSize: '0.72rem', color: C.textSecondary, fontWeight: 300 }}>
                RPE {session.avgRPE}
              </span>
            )}
          </div>
        </div>

        {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
      </div>

      {/* Expandable exercise breakdown */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '0.875rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {Object.entries(session.byExercise).map(([exName, sets]) => (
            <div key={exName}>
              <div style={{ fontWeight: 400, color: C.text, fontSize: '0.875rem', marginBottom: '0.35rem' }}>
                {exName}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                {sets.sort((a, b) => (a.set_number ?? 0) - (b.set_number ?? 0)).map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: C.textSecondary, fontWeight: 300 }}>
                    <span style={{ color: C.border, fontSize: '0.65rem', minWidth: '32px' }}>Set {s.set_number ?? i + 1}</span>
                    <span>{formatSetDetail(s)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WorkoutLog() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from('workout_logs')
      .select('logged_at, day_type, exercise_name, set_number, weight_lbs, reps_completed, duration_seconds, rpe_actual')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })
      .limit(1000)
      .then(({ data }) => {
        setSessions(groupLogsByDate(data ?? []));
        setLoading(false);
      });
  }, [user]);

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 500, color: C.text, marginBottom: '0.25rem', fontFamily: FONTS.heading }}>
          Workout Log
        </h1>
        <p style={{ color: C.textSecondary, fontSize: '0.875rem', fontWeight: 300 }}>
          Your complete training history, session by session.
        </p>
      </div>

      {loading ? (
        <div style={{ ...card, padding: '3rem', textAlign: 'center', color: C.textSecondary, fontWeight: 300, fontSize: '0.875rem' }}>
          Loading…
        </div>
      ) : sessions.length === 0 ? (
        <div style={{ ...card, padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: C.text, fontWeight: 400, marginBottom: '0.5rem', fontFamily: FONTS.heading }}>No workouts logged yet</p>
          <p style={{ color: C.textSecondary, fontWeight: 300, fontSize: '0.875rem' }}>
            Complete a workout session to see it here.
          </p>
        </div>
      ) : (
        <>
          <div style={{ fontSize: '0.7rem', color: C.textSecondary, fontWeight: 300, marginBottom: '1rem' }}>
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} logged
          </div>
          {sessions.map((session) => (
            <SessionCard key={session.date} session={session} />
          ))}
        </>
      )}
    </div>
  );
}
