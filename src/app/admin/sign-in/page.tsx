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
import { Sparkles, Shield, Eye, EyeOff } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

function RegisteredBanner() {
  const params = useSearchParams();
  const registered = params.get("registered");
  if (!registered) return null;
  return (
    <div className="mb-3 text-xs text-[oklch(0.696_0.17_240)]">Registration successful. Please sign in as admin.</div>
  );
}

export default function AdminSignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const sanitizedEmail = email.trim().toLowerCase();
      const sanitizedPassword = password.trim();
      const { data, error } = await authClient.signIn.email({
        email: sanitizedEmail,
        password: sanitizedPassword,
        rememberMe: remember,
        callbackURL: "/admin",  // Ensure admin redirect on success
      });
      if (error?.code) {
        toast.error("Invalid email or password. Please try again.");
        return;
      }
      // Set bearer token after successful login
      if (data?.session?.token) {
        localStorage.setItem("bearer_token", data.session.token);
      }
      // Use full reload for proper session propagation to middleware
      window.location.href = "/admin";
    } catch (err) {
      toast.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    toast.info("Google OAuth is not configured for admin access yet.");
  };

  const handleQuickAdmin = async () => {
    try {
      setLoading(true);
      toast.info("Preparing admin account...");
      const res = await fetch("/api/fix-admin-credential", { cache: "no-store" });
      // Handle JSON success response (ok: true) or HTTP ok
      let isSuccess = res.ok;
      try {
        const data = await res.json();
        if (data?.ok) {
          isSuccess = true;
        } else if (data?.error) {
          toast.error(`Failed to prepare admin account: ${data.error}`);
          return;
        }
      } catch (_) {
        // no JSON body (e.g., empty) – rely on HTTP status
      }
      if (!isSuccess) {
        toast.error("Failed to prepare admin account");
        return;
      }
      const adminEmail = "archanaarchu200604@gmail.com";
      const adminPassword = "archanaarchu2006";
      setEmail(adminEmail);
      setPassword(adminPassword);

      const { data, error } = await authClient.signIn.email({
        email: adminEmail,
        password: adminPassword,
        rememberMe: true,
        callbackURL: "/admin",
      });
      if (error?.code) {
        toast.error("Admin sign-in failed. Try manually with prefilled credentials.");
        return;
      }
      if (data?.session?.token) {
        localStorage.setItem("bearer_token", data.session.token);
      }
      window.location.href = "/admin";
    } catch (_) {
      toast.error("Quick admin setup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TechShell>
      <div className="mx-auto max-w-md">
        <Card className="border-[oklch(1_0_0_/10%)] bg-[oklch(0.2_0_0)]/60 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="size-5 text-[oklch(0.696_0.17_240)]"/> Admin Sign In</CardTitle>
            <CardDescription>Access the admin panel</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={null}>
              <RegisteredBanner />
            </Suspense>
            <form onSubmit={handleLogin} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(e)=>setEmail(e.target.value)} required placeholder="admin@example.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    autoComplete="off" 
                    value={password} 
                    onChange={(e)=>setPassword(e.target.value)} 
                    required 
                    placeholder="admin123" 
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <label className="inline-flex items-center gap-2 select-none">
                  <input type="checkbox" checked={remember} onChange={(e)=>setRemember(e.target.checked)} className="accent-[oklch(0.696_0.17_240)]" />
                  Remember me
                </label>
                <Link href="/sign-in" className="hover:underline">User login?</Link>
              </div>
              <Button type="submit" disabled={loading} className="w-full">{loading ? "Signing in..." : "Admin Sign In"}</Button>
            </form>
            <Separator className="my-4" />
            <Button variant="outline" className="w-full" onClick={handleGoogle}>
              <Shield className="size-4 mr-2" /> Continue with Google (Admin)
            </Button>
            <Button variant="ghost" className="w-full mt-2 text-xs" onClick={handleQuickAdmin} disabled={loading}>
              <Shield className="size-4 mr-2" /> Quick create & sign in as Admin (dev)
            </Button>
          </CardContent>
        </Card>
      </div>
    </TechShell>
  );
}