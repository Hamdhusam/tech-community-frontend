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

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await authClient.signUp.email({ email, name, password });
      if (error?.code) {
        alert(error.code);
        return;
      }
      router.push("/sign-in?registered=true");
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
                <Input id="password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
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