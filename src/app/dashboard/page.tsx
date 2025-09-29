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
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import { AlertCircle, Clock } from "lucide-react";

const VOTE_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "abstain", label: "Abstain" },
];

type VoteStatus = {
  hasVoted: boolean;
  vote: string | null;
  message: string;
};

export default function DashboardPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const [choice, setChoice] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [voteStatus, setVoteStatus] = useState<VoteStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [strikes, setStrikes] = useState<number>(0);

  // Deadline: 10:00 PM (22:00) today
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22, 0, 0);
  const deadlineText = today.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }); // "10:00 PM"

  const isPastDeadline = now >= today;
  const isMidnightPassed = false; // Reset handled by date check in API

  useEffect(() => {
    if (sessionPending) return;

    if (!session?.user) {
      setLoading(false);
      return;
    }

    // Load strikes from local or API if needed
    const raw = localStorage.getItem("flexie_state");
    if (raw) {
      const data = JSON.parse(raw);
      setStrikes(data.strikes || 0);
    }

    fetchVoteStatus();
  }, [sessionPending, session]);

  const fetchVoteStatus = async () => {
    if (!session?.user) return;

    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("bearer_token");
      const res = await fetch("/api/votes/has-voted-today", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          toast.error("Please sign in to vote.");
          return;
        }
        throw new Error("Failed to check vote status");
      }

      const data = await res.json();
      setVoteStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      toast.error("Error checking vote status");
    } finally {
      setLoading(false);
    }
  };

  const submitVote = async () => {
    if (!choice) {
      toast.error("Please select a vote option");
      return;
    }

    if (isPastDeadline) {
      toast.error("Voting closed for today, come back tomorrow");
      return;
    }

    if (voteStatus?.hasVoted) {
      toast.error("You have already voted today");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const token = localStorage.getItem("bearer_token");
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vote: choice }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.code === "DUPLICATE_VOTE") {
          toast.error("You have already voted today");
        } else {
          toast.error(data.error || "Failed to submit vote");
        }
        return;
      }

      toast.success("Vote submitted successfully!");
      setChoice("");
      fetchVoteStatus(); // Refresh status
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      toast.error("Error submitting vote");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusMessage = () => {
    if (loading) return "Loading...";
    if (error) return `Error: ${error}`;
    if (voteStatus?.hasVoted) return "You have already voted today";
    if (isPastDeadline) return "Voting closed for today, come back tomorrow";
    return "Ready to vote";
  };

  if (sessionPending) {
    return (
      <TechShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div>Loading session...</div>
        </div>
      </TechShell>
    );
  }

  return (
    <TechShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Daily Voting</h1>
            <p className="text-muted-foreground">Submit your vote before {deadlineText}</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
            isPastDeadline ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
          }`}>
            <Clock className="h-4 w-4" />
            {isPastDeadline ? 'Closed' : 'Open'}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Vote Now</CardTitle>
            <CardDescription>{getStatusMessage()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Checking vote status...</div>
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
                <Button variant="outline" size="sm" onClick={fetchVoteStatus}>
                  Retry
                </Button>
              </div>
            ) : (
              <>
                <div className="grid gap-3">
                  <Label>Vote Option</Label>
                  <RadioGroup value={choice} onValueChange={setChoice} disabled={voteStatus?.hasVoted || isPastDeadline} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {VOTE_OPTIONS.map((option) => (
                      <label key={option.value} className={`flex items-center gap-3 rounded-md border p-3 cursor-pointer ${
                        (voteStatus?.hasVoted || isPastDeadline) 
                          ? 'opacity-50 cursor-not-allowed' 
                          : choice === option.value 
                            ? "bg-foreground/10 border-foreground/30"
                            : "hover:bg-foreground/5"
                      }`}>
                        <RadioGroupItem value={option.value} id={option.value} disabled={voteStatus?.hasVoted || isPastDeadline} />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Deadline: {deadlineText}</Label>
                    <p className="text-xs text-muted-foreground">Votes lock at 10:00 PM daily</p>
                  </div>
                </div>

                <Button 
                  onClick={submitVote} 
                  disabled={submitting || !choice || voteStatus?.hasVoted || isPastDeadline || loading}
                  className="w-full"
                >
                  {submitting ? "Submitting..." : voteStatus?.hasVoted ? "Already Voted" : isPastDeadline ? "Voting Closed" : "Submit Vote"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Strikes</CardTitle>
            <CardDescription>Track your compliance history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold tracking-tight">{strikes}</div>
            <p className="text-xs text-muted-foreground mt-2">Monitor your daily voting participation</p>
          </CardContent>
        </Card>
      </div>
    </TechShell>
  );
}