import { NavLink } from 'react-router-dom';
import { Home, Dumbbell, Zap, ClipboardList } from 'lucide-react';
import { C, FONTS } from '../theme';

const tabs = [
  { to: '/',      label: 'Home',   icon: Home,          end: true },
  { to: '/train', label: 'Train',  icon: Dumbbell },
  { to: '/kratos',label: 'Kratos', icon: Zap },
  { to: '/log',   label: 'Log',    icon: ClipboardList },
];

export default function BottomTabBar() {
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
      {tabs.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            gap: '3px',
            textDecoration: 'none',
            color: isActive ? C.accent : C.textSecondary,
            fontSize: '0.6rem',
            fontFamily: FONTS.body,
            fontWeight: isActive ? 400 : 300,
            letterSpacing: '0.04em',
            minHeight: '44px',
            padding: '0.35rem 0',
            transition: 'color 0.15s',
          })}
        >
          {({ isActive }) => (
            <>
              <Icon size={21} strokeWidth={isActive ? 2 : 1.5} />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
