import { Component } from 'react';
import { C, FONTS } from '../theme';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: C.bg, padding: '2rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
          <div style={{ fontSize: '1rem', fontWeight: 400, color: C.text, marginBottom: '0.5rem', fontFamily: FONTS.heading }}>
            Something went wrong
          </div>
          <div style={{ fontSize: '0.82rem', color: C.textSecondary, fontWeight: 300, marginBottom: '1.5rem', maxWidth: '320px', lineHeight: 1.6, fontFamily: FONTS.body }}>
            This page failed to load. Your workout data is safe.
          </div>
          <a
            href="/"
            style={{
              padding: '0.625rem 1.25rem', borderRadius: '8px',
              backgroundColor: '#C2622A', color: '#fff',
              textDecoration: 'none', fontSize: '0.875rem', fontWeight: 400,
              fontFamily: FONTS.body,
            }}
          >
            Go Home
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}
