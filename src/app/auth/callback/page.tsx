"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/db';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [status, setStatus] = useState<string>('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for error in URL first
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        const errorParam = urlParams.get('error') || hashParams.get('error');
        const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');
        const errorCode = urlParams.get('error_code') || hashParams.get('error_code');

        if (errorParam) {
          console.error('Auth error:', { errorParam, errorDescription, errorCode });
          setError(errorDescription || errorParam);
          return;
        }

        // For email verification, just show success message
        const type = hashParams.get('type') || urlParams.get('type');
        
        if (type === 'email' || type === 'signup' || type === 'magiclink') {
          // This is an email confirmation - just show success
          setSuccess(true);
          setUserEmail(urlParams.get('email') || 'your email');
          setStatus('Email verified successfully!');
          return;
        }

        // Check if we have hash parameters (implicit flow - for OAuth)
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken && refreshToken) {
          setStatus('Verifying session...');
          // Set the session using the tokens from the hash
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('Error setting session:', sessionError);
            setError(sessionError.message);
            return;
          }

          if (data.session && data.user) {
            setUserEmail(data.user.email || '');

            // Regular OAuth login - verify user and redirect
            setStatus('Verifying user access...');
            const verifyResponse = await fetch('/api/auth/verify-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: data.user.id,
                accessToken: data.session.access_token
              }),
            });

            const verifyResult = await verifyResponse.json();

            if (!verifyResult.allowed) {
              // User not allowed - sign them out
              await supabase.auth.signOut();
              await fetch('/api/auth/session', { method: 'DELETE' });
              setError(verifyResult.message || 'This email is not registered. Please contact an administrator to get access.');
              return;
            }

            // Existing user - proceed with login
            setStatus('Setting up your session...');
            // Sync to cookies for middleware
            await fetch('/api/auth/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
              }),
            });

            // Redirect to dashboard
            router.push('/dashboard');
            return;
          }
        }

        // Check for code param (PKCE flow - usually for OAuth)
        const code = urlParams.get('code');

        if (code) {
          setStatus('Exchanging authentication code...');
          // Exchange code for session (PKCE flow)
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('Error exchanging code:', exchangeError);
            setError(exchangeError.message);
            return;
          }

          if (data.session && data.user) {
            setUserEmail(data.user.email || '');
            
            // Check if this is email verification (user just confirmed email)
            if (data.user.email_confirmed_at && !data.user.last_sign_in_at) {
              // Email just verified - show success without redirecting
              setSuccess(true);
              setStatus('Email verified successfully!');
              return;
            }

            // Regular login - verify user and redirect
            setStatus('Verifying user access...');
            const verifyResponse = await fetch('/api/auth/verify-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: data.user.id,
                accessToken: data.session.access_token
              }),
            });

            const verifyResult = await verifyResponse.json();

            if (!verifyResult.allowed) {
              // User not allowed - sign them out
              await supabase.auth.signOut();
              await fetch('/api/auth/session', { method: 'DELETE' });
              setError(verifyResult.message || 'This email is not registered. Please contact an administrator to get access.');
              return;
            }

            // Existing user - proceed with login
            setStatus('Setting up your session...');
            // Sync to cookies for middleware
            await fetch('/api/auth/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
              }),
            });

            router.push('/dashboard');
            return;
          }
        }

        // If we get here, something went wrong
        setError('No authentication data received');
      } catch (err) {
        console.error('Callback error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      }
    };

    handleCallback();
  }, [router]);

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full p-6 bg-card rounded-lg shadow-lg border border-green-500/50">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-green-500">✅ Email Verified Successfully!</h2>
            <p className="text-muted-foreground text-center">
              Your email <span className="font-semibold text-foreground">{userEmail}</span> has been verified.
            </p>
            <p className="text-sm text-muted-foreground text-center">
              You can now close this window and sign in to your account.
            </p>
            <button
              onClick={() => router.push('/sign-in')}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors mt-4"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full p-6 bg-card rounded-lg shadow-lg border border-border">
          <h2 className="text-2xl font-bold text-destructive mb-4">⚠️ Access Denied</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => router.push('/sign-in')}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full p-6 bg-card rounded-lg shadow-lg border border-border">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <h2 className="text-xl font-semibold">Completing sign in...</h2>
          <p className="text-sm text-muted-foreground">{status}</p>
        </div>
      </div>
    </div>
  );
}
