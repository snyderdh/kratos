import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const orange = '#FF6B2B';

function Spinner() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f6fa' }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: `3px solid #e5e7eb`,
        borderTop: `3px solid ${orange}`,
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
