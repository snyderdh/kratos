import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const orange = '#FF6B2B';

const navLinks = [
  { to: '/', label: 'Routine Generator' },
  { to: '/community', label: 'Community' },
  { to: '/athletes', label: 'Athletes' },
  { to: '/library', label: 'Exercise Library' },
  { to: '/saved', label: 'Saved Routines' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Account';

  return (
    <nav style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#111827', letterSpacing: '-0.5px', fontStyle: 'italic' }}>KRA</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: orange, letterSpacing: '-0.5px', fontStyle: 'italic' }}>TOS</span>
          </div>

          {/* Desktop Links */}
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }} className="desktop-nav">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                style={({ isActive }) => ({
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                  backgroundColor: isActive ? orange : 'transparent',
                  color: isActive ? '#ffffff' : '#374151',
                })}
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* User + Sign Out */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }} className="desktop-nav">
            <span style={{ fontSize: '0.8rem', color: '#9ca3af', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </span>
            <button
              onClick={signOut}
              style={{
                padding: '0.4rem 0.9rem',
                borderRadius: '6px',
                border: '1.5px solid #e5e7eb',
                backgroundColor: 'transparent',
                color: '#6b7280',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.color = '#dc2626'; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#6b7280'; }}
            >
              Sign out
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}
            className="mobile-menu-btn"
            aria-label="Toggle menu"
          >
            <div style={{ width: '24px', height: '2px', backgroundColor: '#374151', marginBottom: '5px' }} />
            <div style={{ width: '24px', height: '2px', backgroundColor: '#374151', marginBottom: '5px' }} />
            <div style={{ width: '24px', height: '2px', backgroundColor: '#374151' }} />
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div style={{ paddingBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTop: '1px solid #e5e7eb' }}>
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setMenuOpen(false)}
                style={({ isActive }) => ({
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  backgroundColor: isActive ? orange : '#f9fafb',
                  color: isActive ? '#ffffff' : '#374151',
                  marginTop: '0.25rem',
                })}
              >
                {link.label}
              </NavLink>
            ))}
            <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{displayName}</span>
              <button
                onClick={signOut}
                style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </nav>
  );
}
