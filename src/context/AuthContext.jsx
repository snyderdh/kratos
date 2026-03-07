import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);

        // After magic link confirmation, save any pending profile data
        if (event === 'SIGNED_IN' && session) {
          const raw = localStorage.getItem('kratos-pending-profile');
          if (raw) {
            try {
              const { name, username } = JSON.parse(raw);
              await supabase.from('profiles').upsert({
                id: session.user.id,
                email: session.user.email,
                name,
                username,
              });
            } catch (err) {
              console.error('Failed to save profile:', err);
            } finally {
              localStorage.removeItem('kratos-pending-profile');
            }
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
