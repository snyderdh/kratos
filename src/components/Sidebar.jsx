import { NavLink, Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Home, Dumbbell, Calendar, BookOpen,
  Bookmark, Archive, Users, Trophy, Menu, X, UserCircle,
} from 'lucide-react';

const orange = '#FF6B2B';
export const SIDEBAR_WIDTH = 240;

const navLinks = [
  { to: '/',            label: 'Home',              icon: Home,        end: true },
  { to: '/generate',    label: 'Routine Generator',  icon: Dumbbell },
  { to: '/cycle',       label: 'Cycle Generator',    icon: Calendar },
  { to: '/library',     label: 'Exercise Library',   icon: BookOpen },
  { to: '/saved',       label: 'Saved Routines',     icon: Bookmark },
  { to: '/saved-cycles',label: 'Saved Cycles',       icon: Archive },
  { to: '/community',   label: 'Community',          icon: Users },
  { to: '/athletes',    label: 'Athletes',           icon: Trophy },
  { to: '/profile',     label: 'Profile',            icon: UserCircle },
];

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
            strokeWidth={isActive ? 2.5 : 2}
            color={isActive ? orange : '#6b7280'}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
            <span style={{ fontSize: '1.55rem', fontWeight: 900, color: '#111827', letterSpacing: '-0.5px', fontStyle: 'italic', lineHeight: 1 }}>KRA</span>
            <span style={{ fontSize: '1.55rem', fontWeight: 900, color: orange, letterSpacing: '-0.5px', fontStyle: 'italic', lineHeight: 1 }}>TOS</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#9ca3af', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '0.2rem' }}>Training Platform</div>
        </Link>
      </div>

      <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '0 1.25rem 0.875rem' }} />

      {/* Nav links */}
      <nav style={{ flex: 1, padding: '0 0.625rem', overflowY: 'auto' }}>
        {navLinks.map((link) => (
          <NavItem key={link.to} {...link} onClick={onClose} />
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding: '0.875rem 0.875rem 1rem', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
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
              background: `linear-gradient(135deg, ${orange}, #ff9258)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.875rem', fontWeight: 800, color: '#fff', flexShrink: 0,
            }}>
              {initial}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
            <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>Hey, {firstName}</div>
          </div>
        </div>
        <button
          onClick={signOut}
          style={{
            width: '100%', padding: '0.4rem 0.75rem',
            borderRadius: '6px', border: '1.5px solid #e5e7eb',
            backgroundColor: 'transparent', color: '#6b7280',
            fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s', textAlign: 'center',
          }}
          onMouseOver={(e) => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.backgroundColor = '#fef2f2'; }}
          onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.backgroundColor = 'transparent'; }}
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
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e5e7eb',
          boxShadow: '2px 0 12px rgba(0,0,0,0.04)',
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
          backgroundColor: '#fff', border: '1px solid #e5e7eb',
          borderRadius: '8px', cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        <Menu size={20} color="#374151" />
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
              backgroundColor: '#fff', zIndex: 200,
              borderRight: '1px solid #e5e7eb',
              boxShadow: '4px 0 24px rgba(0,0,0,0.14)',
            }}
          >
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              style={{ position: 'absolute', top: '1rem', right: '0.875rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}
            >
              <X size={20} color="#6b7280" />
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
          border-radius: 8px;
          text-decoration: none;
          color: #374151;
          font-size: 0.855rem;
          font-weight: 500;
          margin-bottom: 0.2rem;
          transition: background-color 0.13s, color 0.13s;
        }
        .sidebar-nav-item:hover {
          background-color: #f9fafb;
          color: #111827;
        }
        .sidebar-nav-item--active {
          background-color: #fff7ed !important;
          color: ${orange} !important;
          font-weight: 700;
        }
        .sidebar-nav-item--active:hover {
          background-color: #fff3e0 !important;
        }

        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .sidebar-hamburger { display: flex !important; }
          .sidebar-main-content {
            margin-left: 0 !important;
            padding-top: 3.5rem;
          }
        }
      `}</style>
    </>
  );
}
