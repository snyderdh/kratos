import { NavLink, Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Home, Dumbbell, Users, Menu, X, Zap, ClipboardList, Settings,
} from 'lucide-react';
import { C, FONTS } from '../theme';

export const SIDEBAR_WIDTH = 240;

const TERRA = '#C2622A';

function NavItem({ to, label, icon: Icon, end, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) => ['sidebar-nav-item', isActive ? 'sidebar-nav-item--active' : ''].join(' ')}
    >
      {({ isActive }) => (
        <>
          <Icon
            size={18}
            strokeWidth={isActive ? 2 : 1.5}
            color={isActive ? C.accent : C.textSecondary}
            style={{ flexShrink: 0 }}
          />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}

function SidebarContent({ onClose }) {
  const { user, profile, signOut } = useAuth();
  const displayName = profile?.name || user?.email?.split('@')[0] || 'Account';
  const firstName = displayName.split(' ')[0];
  const initial = displayName[0]?.toUpperCase() ?? '?';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{ padding: '1.375rem 1.25rem 1.125rem', flexShrink: 0 }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '1.55rem', fontWeight: 500, color: C.text, letterSpacing: '-0.5px', fontStyle: 'italic', lineHeight: 1, fontFamily: FONTS.heading }}>KRATOS</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: C.textSecondary, fontWeight: 300, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '0.2rem', fontFamily: FONTS.body }}>Training Platform</div>
        </Link>
      </div>

      <div style={{ height: '1px', backgroundColor: C.border, margin: '0 1.25rem 0.875rem' }} />

      {/* Nav links */}
      <nav style={{ flex: 1, padding: '0 0.625rem', overflowY: 'auto' }}>
        <NavItem to="/" label="Home" icon={Home} end onClick={onClose} />
        <NavItem to="/train" label="Train" icon={Dumbbell} onClick={onClose} />

        <NavItem to="/kratos" label="Kratos Split" icon={Zap} onClick={onClose} />

        <NavItem to="/log" label="Workout Log" icon={ClipboardList} onClick={onClose} />
        <NavItem to="/community" label="Community" icon={Users} onClick={onClose} />
      </nav>

      {/* User footer */}
      <div style={{ padding: '0.875rem 0.875rem 1rem', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        <NavLink
          to="/settings"
          onClick={onClose}
          className={({ isActive }) => ['sidebar-nav-item', isActive ? 'sidebar-nav-item--active' : ''].join(' ')}
          style={{ marginBottom: '0.75rem' }}
        >
          {({ isActive }) => (
            <>
              <Settings size={18} strokeWidth={isActive ? 2 : 1.5} color={isActive ? C.accent : C.textSecondary} style={{ flexShrink: 0 }} />
              <span>Settings</span>
            </>
          )}
        </NavLink>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem' }}>
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              backgroundColor: C.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.875rem', fontWeight: 400, color: '#fff', flexShrink: 0,
            }}>
              {initial}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 400, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
            <div style={{ fontSize: '0.68rem', color: C.textSecondary, fontWeight: 300 }}>Hey, {firstName}</div>
          </div>
        </div>
        <button
          onClick={signOut}
          style={{
            width: '100%', padding: '0.4rem 0.75rem',
            borderRadius: '6px', border: `1px solid ${C.border}`,
            backgroundColor: 'transparent', color: C.textSecondary,
            fontSize: '0.78rem', fontWeight: 400, cursor: 'pointer',
            transition: 'all 0.15s', textAlign: 'center',
            fontFamily: FONTS.body,
          }}
          onMouseOver={(e) => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
          onMouseOut={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSecondary; }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* ── Desktop sidebar — fixed ─────────────────────────────────── */}
      <div
        className="sidebar-desktop"
        style={{
          position: 'fixed', top: 0, left: 0,
          width: `${SIDEBAR_WIDTH}px`, height: '100vh',
          backgroundColor: C.surface,
          borderRight: `1px solid ${C.border}`,
          zIndex: 100,
        }}
      >
        <SidebarContent onClose={null} />
      </div>

      {/* ── Mobile hamburger button ─────────────────────────────────── */}
      <button
        className="sidebar-hamburger"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        style={{
          position: 'fixed', top: '0.875rem', left: '0.875rem',
          zIndex: 200, display: 'none',
          alignItems: 'center', justifyContent: 'center',
          width: '40px', height: '40px',
          backgroundColor: C.surface, border: `1px solid ${C.border}`,
          borderRadius: '8px', cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <Menu size={20} color={C.text} />
      </button>

      {/* ── Mobile drawer ───────────────────────────────────────────── */}
      {mobileOpen && (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 150 }}
          />
          <div
            style={{
              position: 'fixed', top: 0, left: 0,
              width: `${SIDEBAR_WIDTH}px`, height: '100vh',
              backgroundColor: C.surface, zIndex: 200,
              borderRight: `1px solid ${C.border}`,
              boxShadow: '4px 0 24px rgba(0,0,0,0.10)',
            }}
          >
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              style={{ position: 'absolute', top: '1rem', right: '0.875rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}
            >
              <X size={20} color={C.textSecondary} />
            </button>
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      <style>{`
        .sidebar-nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.575rem 0.75rem;
          min-height: 44px;
          border-radius: 8px;
          text-decoration: none;
          color: var(--text-secondary);
          font-size: 0.855rem;
          font-weight: 300;
          margin-bottom: 0.2rem;
          transition: background-color 0.13s, color 0.13s;
        }
        .sidebar-nav-item:hover {
          background-color: var(--bg);
          color: var(--text);
        }
        .sidebar-nav-item--active {
          background-color: var(--accent-muted) !important;
          color: var(--accent) !important;
          font-weight: 400;
        }
        .sidebar-nav-item--active:hover {
          background-color: var(--accent-muted) !important;
        }

        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .sidebar-hamburger { display: flex !important; }
          .sidebar-main-content {
            margin-left: 0 !important;
            padding-top: 3.5rem;
            padding-bottom: 56px;
          }
          .bottom-tab-bar { display: flex !important; }
        }
      `}</style>
    </>
  );
}
