"use client"
import { supabase, isSupabaseConfigured } from "@/db"
import { useEffect, useState } from "react"
import type { User, Session } from '@supabase/supabase-js'

// Helper to sync session to HTTP-only cookies for middleware
async function syncSessionToCookies(session: Session | null) {
  if (!session) {
    // Clear cookies on sign out
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to clear session cookies:', error);
    }
    return;
  }

  try {
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }),
    });
  } catch (error) {
    console.error('Failed to sync session to cookies:', error);
  }
}

// Auth client methods
export const authClient = {
  signUp: {
    email: async ({ email, password, name }: { email: string; password: string; name?: string }) => {
      if (!isSupabaseConfigured()) {
        return { 
          data: null, 
          error: new Error('⚠️ Supabase not configured. Please add your credentials to .env.local') 
        };
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split('@')[0],
            full_name: name || email.split('@')[0]
          }
          // Remove emailRedirectTo to avoid PKCE code verifier issues
          // Users need to verify email, then manually sign in
        }
      });

      // Note: If email confirmation is enabled in Supabase,
      // data.user will exist but data.session will be null
      // User needs to confirm email before they can sign in
      console.log('Signup response:', { 
        hasUser: !!data?.user, 
        hasSession: !!data?.session,
        error: error?.message 
      });

      return { data, error };
    }
  },
  
  signIn: {
    email: async ({ email, password }: { email: string; password: string }) => {
      if (!isSupabaseConfigured()) {
        return { 
          data: null, 
          error: new Error('⚠️ Supabase not configured. Please add your credentials to .env.local') 
        };
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      // Sync session to cookies if sign in was successful
      if (!error && data.session) {
        await syncSessionToCookies(data.session);
      }

      return { data, error };
    },
    
    google: async () => {
      if (!isSupabaseConfigured()) {
        return { 
          data: null, 
          error: new Error('⚠️ Supabase not configured. Please add your credentials to .env.local') 
        };
      }
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      return { data, error };
    }
  },
  
  signOut: async () => {
    if (!isSupabaseConfigured()) {
      return { error: null };
    }
    
    const { error } = await supabase.auth.signOut();

    // Clear cookies
    await syncSessionToCookies(null);

    return { error };
  },
  
  getSession: async () => {
    if (!isSupabaseConfigured()) {
      return { data: null, error: null };
    }
    
    const { data: { session }, error } = await supabase.auth.getSession();
    return { data: session, error };
  },
  
  getUser: async () => {
    if (!isSupabaseConfigured()) {
      return { data: null, error: null };
    }
    
    const { data: { user }, error } = await supabase.auth.getUser();
    return { data: user, error };
  }
};

interface SessionData {
  data: { user: User; session: Session } | null;
  isPending: boolean;
  error: any;
  refetch: () => void;
}

export function useSession(): SessionData {
   const [session, setSession] = useState<{ user: User; session: Session } | null>(null);
   const [isPending, setIsPending] = useState(true);
   const [error, setError] = useState<any>(null);

   const fetchSession = async () => {
      if (!isSupabaseConfigured()) {
        setSession(null);
        setError(new Error('⚠️ Supabase not configured. Add credentials to .env.local'));
        setIsPending(false);
        return;
      }
      
      try {
         const { data: { session: supabaseSession }, error: sessionError } = await supabase.auth.getSession();
         
         if (sessionError) throw sessionError;
         
         if (supabaseSession) {
           const { data: { user }, error: userError } = await supabase.auth.getUser();
           
           if (userError) throw userError;
           
           setSession(user ? { user, session: supabaseSession } : null);

           // Sync to cookies for middleware
           if (user && supabaseSession) {
             await syncSessionToCookies(supabaseSession);
           }
         } else {
           setSession(null);
         }
         
         setError(null);
      } catch (err) {
         setSession(null);
         setError(err);
      } finally {
         setIsPending(false);
      }
   };

   const refetch = () => {
      setIsPending(true);
      setError(null);
      fetchSession();
   };

   useEffect(() => {
      fetchSession();
      
      if (!isSupabaseConfigured()) {
        return;
      }
      
      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session) {
          supabase.auth.getUser().then(async ({ data: { user } }) => {
            setSession(user ? { user, session } : null);
            // Sync to cookies
            if (user && session) {
              await syncSessionToCookies(session);
            }
          });
        } else {
          setSession(null);
          // Clear cookies
          await syncSessionToCookies(null);
        }
      });

      return () => subscription.unsubscribe();
   }, []);

   return { data: session, isPending, error, refetch };
}
