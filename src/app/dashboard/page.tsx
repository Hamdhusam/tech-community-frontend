"use client";
import { useEffect, useMemo, useState } from "react";
import TechShell from "@/components/TechShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, Clock, LogIn } from "lucide-react";
import Link from "next/link";

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
  const router = useRouter();
  const [choice, setChoice] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [voteStatus, setVoteStatus] = useState<VoteStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [strikes, setStrikes] = useState<number>(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Deadline: 10:00 PM (22:00) today
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22, 0, 0);
  const deadlineText = today.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }); // "10:00 PM"

  const isPastDeadline = now >= today;

  useEffect(() => {
    if (sessionPending) return;

    setIsAuthenticated(!!session?.user);

    if (session?.user) {
      // Load strikes from local or API if needed
      const raw = localStorage.getItem("flexie_state");
      if (raw) {
        const data = JSON.parse(raw);
        setStrikes(data.strikes || 0);
      }

      fetchVoteStatus();
    } else {
      // For unauth: set status to prompt sign-in, no API call
      setVoteStatus({ hasVoted: false, vote: null, message: "Sign in to vote" });
      setLoading(false);
    }
  }, [sessionPending, session, router]);

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
          setVoteStatus({ hasVoted: false, vote: null, message: "Session expired. Please sign in again." });
          return;
        }
        throw new Error("Failed to check vote status");
      }

      const data = await res.json();
      setVoteStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      toast.error("Error checking vote status");
      setVoteStatus({ hasVoted: false, vote: null, message: "Error checking status. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = () => {
    router.push("/sign-in?redirect=/dashboard");
  };

  const submitVote = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to vote.");
      handleSignIn();
      return;
    }

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
    if (!isAuthenticated) return "Sign in to vote";
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

  const isLocked = !isAuthenticated || voteStatus?.hasVoted || isPastDeadline;

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
                  <RadioGroup value={choice} onValueChange={setChoice} disabled={isLocked} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {VOTE_OPTIONS.map((option) => (
                      <label key={option.value} className={`flex items-center gap-3 rounded-md border p-3 cursor-pointer ${
                        isLocked 
                          ? 'opacity-50 cursor-not-allowed' 
                          : choice === option.value 
                            ? "bg-foreground/10 border-foreground/30"
                            : "hover:bg-foreground/5"
                      }`}>
                        <RadioGroupItem value={option.value} id={option.value} disabled={isLocked} />
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
                  onClick={isAuthenticated ? submitVote : handleSignIn} 
                  disabled={submitting || (!isAuthenticated && !choice) || (isAuthenticated && (!choice || voteStatus?.hasVoted || isPastDeadline)) || loading}
                  className="w-full"
                >
                  {isAuthenticated ? (
                    submitting ? "Submitting..." : voteStatus?.hasVoted ? "Already Voted" : isPastDeadline ? "Voting Closed" : "Submit Vote"
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 mr-2" />
                      Sign In to Vote
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {isAuthenticated && (
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
        )}
      </div>
    </TechShell>
  );
}