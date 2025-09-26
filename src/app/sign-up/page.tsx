"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TechShell from "@/components/TechShell";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (password !== confirmPassword) {
      toast.error("Passwords don't match.");
      setLoading(false);
      return;
    }
    try {
      const sanitizedEmail = email.trim().toLowerCase();
      const { error } = await authClient.signUp.email({ 
        email: sanitizedEmail, 
        name: name.trim(), 
        password: password.trim() 
      });
      if (error?.code) {
        const errorMap = {
          USER_ALREADY_EXISTS: "Email already registered",
        };
        toast.error(errorMap[error.code] || error.message || "Registration failed");
        return;
      }
      toast.success("Account created! Please check your email to verify.");
      router.push("/sign-in?registered=true");
    } catch (err) {
      toast.error("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TechShell>
      <div className="mx-auto max-w-md">
        <Card className="border-[oklch(1_0_0_/10%)] bg-[oklch(0.2_0_0)]/60 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="size-5 text-[oklch(0.696_0.17_240)]"/> Create account</CardTitle>
            <CardDescription>Join the Flex Academics community</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={register} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={name} onChange={(e)=>setName(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required placeholder="you@college.edu" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    autoComplete="new-password" 
                    value={password} 
                    onChange={(e)=>setPassword(e.target.value)} 
                    required 
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
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Input 
                    id="confirm-password" 
                    type={showConfirmPassword ? "text" : "password"} 
                    autoComplete="new-password" 
                    value={confirmPassword} 
                    onChange={(e)=>setConfirmPassword(e.target.value)} 
                    required 
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full">{loading? "Creating...":"Create account"}</Button>
            </form>
            <p className="mt-4 text-xs text-muted-foreground">
              Already have an account? <Link href="/sign-in" className="text-[oklch(0.696_0.17_240)] hover:underline">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </TechShell>
  );
}