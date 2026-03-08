import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useActiveWorkout } from '../context/ActiveWorkoutContext';
import { C, FONTS } from '../theme';

const TERRA = '#C2622A';

function formatElapsed(ms) {
  const s = Math.floor(ms / 1000);
  if (s >= 3600) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function ActiveWorkoutBanner() {
  const { activeWorkout, isActive, loggedSetCount } = useActiveWorkout();
  const location = useLocation();
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isActive || !activeWorkout?.startTime) { setElapsed(0); return; }
    setElapsed(Date.now() - activeWorkout.startTime);
    const id = setInterval(() => setElapsed(Date.now() - activeWorkout.startTime), 1000);
    return () => clearInterval(id);
  }, [isActive, activeWorkout?.startTime]);

  // Don't show on /train — the active workout view is already there
  if (!isActive || location.pathname === '/train') return null;

  return (
    <>
      <div
        className="active-workout-banner"
        onClick={() => navigate('/train')}
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 95,
          backgroundColor: C.surface,
          borderTop: `3px solid ${TERRA}`,
          boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
          padding: '0.625rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{
          width: '9px', height: '9px', borderRadius: '50%',
          backgroundColor: TERRA, flexShrink: 0,
          animation: 'aw-pulse 1.5s ease-in-out infinite',
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.8rem', fontWeight: 500, color: C.text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontFamily: FONTS.body,
          }}>
            {activeWorkout.title ?? 'Active Workout'}
          </div>
          <div style={{ fontSize: '0.68rem', color: C.textSecondary, fontWeight: 300 }}>
            {formatElapsed(elapsed)} · {loggedSetCount} set{loggedSetCount !== 1 ? 's' : ''} logged
          </div>
        </div>
        <div style={{
          fontSize: '0.72rem', fontWeight: 500, color: TERRA,
          fontFamily: FONTS.body, flexShrink: 0, letterSpacing: '0.02em',
        }}>
          Resume →
        </div>
      </div>
      <style>{`
        @keyframes aw-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @media (max-width: 768px) { .active-workout-banner { bottom: 56px !important; } }
      `}</style>
    </>
  );
}
