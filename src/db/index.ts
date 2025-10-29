import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Dummy credentials for when Supabase is not configured
const DUMMY_URL = 'https://xxxxxxxxxxxxxxxxxxx.supabase.co';
const DUMMY_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4eHh4eHh4eHh4eHh4eHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDk3MDkxNjAsImV4cCI6MTk2NTI4NTE2MH0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

// Check if credentials are properly configured (not placeholder values)
const isConfigured = 
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== DUMMY_URL &&
  !supabaseUrl.includes('[YOUR-PROJECT-REF]') && 
  !supabaseAnonKey.includes('[YOUR-ANON-KEY]') &&
  supabaseUrl.startsWith('https://') &&
  supabaseUrl.endsWith('.supabase.co');

// Create Supabase client only if properly configured
export const supabase = isConfigured 
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true, // Enable session persistence in localStorage
        autoRefreshToken: true, // Automatically refresh tokens
        detectSessionInUrl: true, // Detect session from URL (for OAuth)
        flowType: 'pkce' // Use PKCE flow instead of implicit
      }
    })
  : createClient(DUMMY_URL, DUMMY_KEY, {
      auth: { 
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

// Server-side Supabase client (with service role key for admin operations)
export function createSupabaseServerClient() {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!isConfigured || !supabaseServiceKey) {
    if (typeof window === 'undefined') {
      console.warn('⚠️  Supabase not configured. Add credentials to .env.local');
    }
    return createClient(DUMMY_URL, DUMMY_KEY, {
      auth: { 
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
  }
  
  return createClient(supabaseUrl!, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Helper to check if Supabase is configured
export function isSupabaseConfigured() {
  return isConfigured;
}

export type Database = typeof supabase;