"use client";
import Link from "next/link";
import TechShell from "@/components/TechShell";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <TechShell>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-30 bg-[radial-gradient(600px_300px_at_10%_-10%,var(--chart-1)/.8,transparent_60%),radial-gradient(700px_350px_at_110%_30%,var(--chart-2)/.6,transparent_60%)]" />
        <div className="grid lg:grid-cols-2 gap-8 items-center py-14">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <span className="size-1.5 rounded-full bg-[var(--chart-2)]" /> Byte Bash Blitz
            </p>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight">Flex Academics Community</h1>
            <p className="text-muted-foreground max-w-prose">
              Submit your daily plan before 10 PM, track strikes, and visualize cohort trends. Built for tech-savvy learners with a futuristic UI.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-[var(--chart-1)] hover:bg-[var(--chart-1)/.9]">
                <Link href="/sign-up">Get started</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/visualizations">See trends</Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="aspect-[4/3] w-full rounded-xl overflow-hidden border bg-background/40 backdrop-blur">
              <img
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/document-uploads/image-1758778860794.png"
                alt="Basher community logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 text-xs text-muted-foreground">
              <div className="p-3 rounded-lg border bg-background/50">Attendance before 22:00</div>
              <div className="p-3 rounded-lg border bg-background/50">Notion confirmation</div>
              <div className="p-3 rounded-lg border bg-background/50">Strike automation</div>
              <div className="p-3 rounded-lg border bg-background/50">Visual analytics</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: "Multi-auth", desc: "Email/password and Google OAuth (when configured)." },
            { title: "Deadline aware", desc: "Countdown to 10 PM and lock after deadline." },
            { title: "Admin controls", desc: "Suspend/reactivate and reset strikes quickly." },
          ].map((f) => (
            <div key={f.title} className="p-6 rounded-xl border bg-background/60 backdrop-blur">
              <h3 className="font-medium mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </TechShell>
  );
}