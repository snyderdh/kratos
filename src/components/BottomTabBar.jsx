import { NavLink } from 'react-router-dom';
import { Home, Dumbbell, Wand2, BookMarked, ClipboardList, Activity } from 'lucide-react';
import { C, FONTS } from '../theme';
import { useActiveWorkout } from '../context/ActiveWorkoutContext';

const TERRA = '#C2622A';

const DEFAULT_TABS = [
  { to: '/',         label: 'Home',       icon: Home,        end: true },
  { to: '/build',    label: 'Build',      icon: Dumbbell },
  { to: '/generate', label: 'Generate',   icon: Wand2 },
  { to: '/routines', label: 'Routines',   icon: BookMarked },
  { to: '/log',      label: 'Log',        icon: ClipboardList },
];

export default function BottomTabBar() {
  const { isActive } = useActiveWorkout();

  const tabs = isActive
    ? [
        DEFAULT_TABS[0],
        { to: '/active', label: 'Active', icon: Activity, live: true },
        ...DEFAULT_TABS.slice(1),
      ]
    : DEFAULT_TABS;

  return (
    <nav
      className="bottom-tab-bar"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        backgroundColor: C.surface,
        borderTop: `1px solid ${C.border}`,
        display: 'none', // enabled via CSS media query in Sidebar.jsx
        justifyContent: 'space-around',
        alignItems: 'stretch',
        zIndex: 100,
        height: '56px',
      }}
    >
      {tabs.map(({ to, label, icon: Icon, end, live }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          style={({ isActive: active }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            gap: '3px',
            textDecoration: 'none',
            color: live ? TERRA : (active ? C.accent : C.textSecondary),
            fontSize: '0.6rem',
            fontFamily: FONTS.body,
            fontWeight: (live || active) ? 400 : 300,
            letterSpacing: '0.04em',
            minHeight: '44px',
            padding: '0.35rem 0',
            transition: 'color 0.15s',
            position: 'relative',
          })}
        >
          {({ isActive: active }) => (
            <>
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                <Icon size={21} strokeWidth={(live || active) ? 2 : 1.5} color={live ? TERRA : undefined} />
                {live && (
                  <div style={{
                    position: 'absolute', top: '-2px', right: '-2px',
                    width: '7px', height: '7px', borderRadius: '50%',
                    backgroundColor: TERRA,
                    animation: 'btm-pulse 1.5s ease-in-out infinite',
                  }} />
                )}
              </div>
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
      <style>{`@keyframes btm-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </nav>
  );
}
