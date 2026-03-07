import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';

function Spinner() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: `3px solid ${C.border}`,
        borderTop: `3px solid ${C.accent}`,
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function AuthGuard({ children }) {
  const { session, loading } = useAuth();

  if (loading) return <Spinner />;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}
