import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data ?? null);
  }

  useEffect(() => {
    // Load existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) fetchProfile(session.user.id);
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
          fetchProfile(session.user.id);
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  function refreshProfile() {
    const userId = session?.user?.id;
    if (userId) return fetchProfile(userId);
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
