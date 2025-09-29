"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import TechShell from "@/components/TechShell";
import { ModeToggle } from "@/components/theme/ModeToggle";
import { Shield, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";

function RegisteredBanner() {
  const params = useSearchParams();
  const registered = params.get("registered");
  if (!registered) return null;
  return (
    <div className="mb-3 text-xs text-[oklch(0.696_0.17_240)]">Registration successful. Please sign in.</div>
  );
}

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authClient.signIn.email({
        email,
        password,
        rememberMe: remember,
        callbackURL: "/dashboard",
      });
      if (res.error) {
        alert("Invalid email or password");
        return;
      }
      window.location.href = "/dashboard";
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    alert("Google OAuth not configured yet. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, then enable provider.");
  };

  return (
    <TechShell>
      <div className="mx-auto max-w-md">
        <Card className="border-[oklch(1_0_0_/10%)] bg-[oklch(0.2_0_0)]/60 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="size-5 text-[oklch(0.696_0.17_240)]"/> Sign in</CardTitle>
            <CardDescription>Access your Flexie dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={null}>
              <RegisteredBanner />
            </Suspense>
            <form onSubmit={handleLogin} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required placeholder="you@college.edu" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <label className="inline-flex items-center gap-2 select-none">
                  <input type="checkbox" checked={remember} onChange={(e)=>setRemember(e.target.checked)} className="accent-[oklch(0.696_0.17_240)]" />
                  Remember me
                </label>
                <Link href="#" className="hover:underline">Forgot password?</Link>
              </div>
              <Button type="submit" disabled={loading} className="w-full">{loading? "Signing in...":"Sign in"}</Button>
            </form>
            <Separator className="my-4" />
            <Button variant="outline" className="w-full" onClick={handleGoogle}>
              <Shield className="size-4 mr-2" /> Continue with Google
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">
              Don&apos;t have an account? <Link href="/sign-up" className="text-[oklch(0.696_0.17_240)] hover:underline">Create one</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </TechShell>
  );
}