"use client";
import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { isSupabaseConfigured } from "@/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import TechShell from "@/components/TechShell";
import { Shield, Sparkles, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authClient.signIn.email({
        email,
        password,
      });
      if (res.error) {
        alert("Invalid email or password. Please try again.");
      } else {
        // Sign in successful, redirect to dashboard
        router.push("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!isSupabaseConfigured()) {
      alert("⚠️ Supabase not configured yet. Please add your Supabase credentials to .env.local first.");
      return;
    }
    
    setGoogleLoading(true);
    
    const { data, error } = await authClient.signIn.google();
    
    if (error) {
      setGoogleLoading(false);
      if (error.message.includes('not enabled')) {
        alert("Google OAuth not enabled in Supabase. Go to Authentication → Providers in your Supabase dashboard and enable Google.");
      } else {
        alert(`Google sign-in error: ${error.message}`);
      }
    }
    // If successful, Supabase will redirect to Google login
  };

  return (
    <TechShell>
      <div className="mx-auto max-w-md">
        <Card className="border-[oklch(1_0_0_/10%)] bg-[oklch(0.2_0_0)]/60 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-[oklch(0.696_0.17_240)]"/> Sign in to Flex Academics
            </CardTitle>
            <CardDescription>Access your Flexie dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Email/Password Login Form */}
            <form onSubmit={handleEmailLogin} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  placeholder="you@college.edu" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <label className="inline-flex items-center gap-2 select-none cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={remember} 
                    onChange={(e) => setRemember(e.target.checked)} 
                    className="accent-[oklch(0.696_0.17_240)]" 
                  />
                  Remember me
                </label>
                <Link href="#" className="hover:underline">Forgot password?</Link>
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                <Mail className="size-4 mr-2" />
                {loading ? "Signing in..." : "Sign in with Email"}
              </Button>
            </form>

            <Separator className="my-4">
              <span className="px-2 text-xs text-muted-foreground">OR</span>
            </Separator>

            {/* Google OAuth Button */}
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleGoogle}
              disabled={googleLoading}
            >
              <Shield className="size-4 mr-2" /> 
              {googleLoading ? "Redirecting..." : "Continue with Google"}
            </Button>

            <p className="mt-4 text-xs text-center text-muted-foreground">
              Don&apos;t have an account? <Link href="/sign-up" className="text-[oklch(0.696_0.17_240)] hover:underline">Register as Flexie</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </TechShell>
  );
}