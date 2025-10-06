"use client"
import { PropsWithChildren, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ModeToggle } from "./theme/ModeToggle";
import { LogOut, Menu, PieChart, Shield, Timer, User } from "lucide-react";
import { useSession, authClient } from "@/lib/auth-client";

export default function TechShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { data: session, isPending, refetch } = useSession();
  const [open, setOpen] = useState(false);

  const nav = [
    { href: "/dashboard", label: "Dashboard", icon: Timer },
    { href: "/visualizations", label: "Visualizations", icon: PieChart },
    { href: "/admin", label: "Admin", icon: Shield },
  ];

  const signOut = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem("bearer_token") : "";
    await authClient.signOut({
      fetchOptions: { headers: { Authorization: `Bearer ${token}` } },
    });
    if (typeof window !== 'undefined') {
      localStorage.removeItem("bearer_token");
      window.location.href = "/";
    }
  };

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_100%_-10%,oklch(0.2_0.2_260/.6),transparent_60%),radial-gradient(900px_400px_at_-10%_10%,oklch(0.3_0.25_240/.35),transparent_50%)]">
      <header className="sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-[var(--border)]">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button aria-label="Menu" onClick={() => setOpen((v) => !v)} className="md:hidden p-2 rounded hover:bg-foreground/10">
              <Menu className="size-5" />
            </button>
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <img src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/document-uploads/image-1759730933070.png" alt="Flexie logo" className="size-5 object-contain" />
              <span>Flexie</span>
              <span className="text-xs text-muted-foreground hidden sm:inline">Tech Community</span>
            </Link>
            <Separator orientation="vertical" className="mx-3 hidden md:inline" />
            <nav className="hidden md:flex items-center gap-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm transition-colors",
                    pathname === item.href ? "bg-foreground/10" : "hover:bg-foreground/10"
                  )}
                >
                  <span className="inline-flex items-center gap-2"><item.icon className="size-4" />{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {!isPending && session?.user ? (
              <>
                <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="size-4" />
                  <span className="truncate max-w-[160px]">{session.user.name || session.user.email}</span>
                </div>
                <ModeToggle />
                <Button size="sm" variant="outline" onClick={signOut}>
                  <LogOut className="size-4 mr-1" /> Sign out
                </Button>
              </>
            ) : (
              <>
                <ModeToggle />
                <Button asChild size="sm">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
              </>
            )}
          </div>
        </div>
        {/* Mobile nav */}
        {open && (
          <div className="md:hidden border-t border-[var(--border)]">
            <nav className="container mx-auto px-4 py-2 grid gap-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm transition-colors",
                    pathname === item.href ? "bg-foreground/10" : "hover:bg-foreground/10"
                  )}
                >
                  <span className="inline-flex items-center gap-2"><item.icon className="size-4" />{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}