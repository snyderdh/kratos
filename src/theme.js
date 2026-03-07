export const C = {
  bg: '#F7F5F0',
  surface: '#FFFFFF',
  border: '#E5E0D8',
  text: '#1C1917',
  textSecondary: '#78716C',
  accent: '#C2622A',
  accentMuted: '#F5EDE6',
  accentHover: '#A8501F',
};

export const FONTS = {
  heading: '"Cormorant Garamond", Georgia, serif',
  body: '"DM Sans", system-ui, sans-serif',
};

export const card = {
  backgroundColor: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: '12px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
};

export const btnPrimary = {
  backgroundColor: C.accent,
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  padding: '0.65rem 1.25rem',
  fontFamily: FONTS.body,
  fontWeight: 400,
  fontSize: '0.875rem',
  cursor: 'pointer',
  transition: 'background-color 0.15s',
};

export const btnSecondary = {
  backgroundColor: 'transparent',
  color: C.accent,
  border: `1px solid ${C.accent}`,
  borderRadius: '8px',
  padding: '0.65rem 1.25rem',
  fontFamily: FONTS.body,
  fontWeight: 400,
  fontSize: '0.875rem',
  cursor: 'pointer',
  transition: 'all 0.15s',
};

export const inputBase = {
  width: '100%',
  padding: '0.6rem 0.875rem',
  backgroundColor: 'transparent',
  border: `1px solid ${C.border}`,
  borderRadius: '8px',
  color: C.text,
  fontFamily: FONTS.body,
  fontSize: '0.875rem',
  outline: 'none',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box',
};

export const labelBase = {
  display: 'block',
  fontFamily: FONTS.body,
  fontSize: '0.65rem',
  fontWeight: 400,
  color: C.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '0.5rem',
};

export const tagBase = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '4px',
  border: `1px solid ${C.border}`,
  fontSize: '0.68rem',
  fontWeight: 400,
  color: C.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};
