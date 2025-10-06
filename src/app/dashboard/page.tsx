"use client";
import { useEffect, useMemo, useState } from "react";
import TechShell from "@/components/TechShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useCountdown } from "@/lib/hooks/useCountdown";

const ATTENDANCE_OPTIONS = [
  { value: "attending-classes", label: "Attending Classes" },
  { value: "flex-academics", label: "Flex Academics" },
  { value: "official-duty-od", label: "OD (Official Duty)" },
  { value: "leave-absent", label: "Leave/Absent" },
];

type Submission = {
  choice: string;
  notion: boolean;
  submittedAt: number;
};

export default function DashboardPage() {
  const { hours, minutes, seconds, overdue } = useCountdown(22, 0);
  const [choice, setChoice] = useState<string>("");
  const [notion, setNotion] = useState<boolean>(false);
  const [strikes, setStrikes] = useState<number>(0);
  const [todaySubmitted, setTodaySubmitted] = useState<boolean>(false);

  useEffect(() => {
    const raw = localStorage.getItem("flexie_state");
    if (raw) {
      const data = JSON.parse(raw);
      setStrikes(data.strikes || 0);
      // Reset daily submission flag at midnight
      const today = new Date().toDateString();
      if (data.lastDate !== today) {
        setTodaySubmitted(false);
        localStorage.setItem("flexie_state", JSON.stringify({ ...data, lastDate: today }));
      } else {
        setTodaySubmitted(!!data.todaySubmitted);
      }
    } else {
      localStorage.setItem("flexie_state", JSON.stringify({ strikes: 0, lastDate: new Date().toDateString(), todaySubmitted: false }));
    }
  }, []);

  const submit = () => {
    if (overdue) return;
    if (!choice) {
      alert("Please select an attendance choice");
      return;
    }
    const payload: Submission = { choice, notion, submittedAt: Date.now() };
    // Mock persistence
    const raw = localStorage.getItem("flexie_state");
    const data = raw ? JSON.parse(raw) : { strikes: 0 };
    const newStrikes = data.strikes + (choice ? 0 : 1) + (notion ? 0 : 1);
    localStorage.setItem(
      "flexie_state",
      JSON.stringify({
        ...data,
        lastDate: new Date().toDateString(),
        todaySubmitted: true,
        lastSubmission: payload,
        strikes: data.strikes,
      })
    );
    setTodaySubmitted(true);
    alert("Submission saved locally for demo.");
  };

  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  const deadlineText = overdue ? "Too Late" : `${h12}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <TechShell>
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Daily Submission</CardTitle>
            <CardDescription>Submit your plan for tomorrow before 10:00 PM</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-3">
              <Label>Attendance Choice</Label>
              <RadioGroup value={choice} onValueChange={setChoice} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ATTENDANCE_OPTIONS.map((o) => (
                  <label key={o.value} className={`flex items-center gap-3 rounded-md border p-3 cursor-pointer ${choice===o.value?"bg-foreground/10 border-foreground/30":"hover:bg-foreground/5"}`}>
                    <RadioGroupItem value={o.value} id={o.value} />
                    <span>{o.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Notion Updated?</Label>
                <p className="text-xs text-muted-foreground">Confirm you updated your Notion daily plan</p>
              </div>
              <Switch checked={notion} onCheckedChange={setNotion} aria-label="Notion updated" />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Deadline</div>
              <div className={`font-mono ${overdue?"text-destructive":"text-[oklch(0.646_0.222_240)]"}`}>{deadlineText}</div>
            </div>
            <Button onClick={submit} disabled={overdue || todaySubmitted} className="w-full">
              {todaySubmitted ? "Already submitted" : overdue ? "Locked" : "Submit"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Strikes</CardTitle>
            <CardDescription>Automated penalties for missed submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold tracking-tight">{strikes}</div>
            <p className="text-xs text-muted-foreground mt-2">5: Warning • 8: Final warning • 10: Suspension</p>
          </CardContent>
        </Card>
      </div>
    </TechShell>
  );
}