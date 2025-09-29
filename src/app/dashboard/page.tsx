"use client";
import { useEffect, useMemo, useState } from "react";
import TechShell from "@/components/TechShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, Clock, LogIn } from "lucide-react";
import Link from "next/link";

type SubmissionStatus = {
  hasSubmitted: boolean;
  message: string;
};

export default function DashboardPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const router = useRouter();
  const [attendanceClass, setAttendanceClass] = useState<string>("");
  const [fileAcademics, setFileAcademics] = useState<string>("");
  const [qdOfficial, setQdOfficial] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [strikes, setStrikes] = useState<number>(0);
  const [submissionsCount, setSubmissionsCount] = useState<number>(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Deadline: 10:00 PM (22:00) today
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22, 0, 0);
  const deadlineText = today.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }); // "10:00 PM"

  const isPastDeadline = now >= today;

  useEffect(() => {
    if (sessionPending) return;

    setIsAuthenticated(!!session?.user);
    setStrikes(session?.user?.strikes || 0);

    if (session?.user) {
      fetchSubmissionStatus();
      fetchSubmissionsCount();
    } else {
      // For unauth: set status to prompt sign-in, no API call
      setSubmissionStatus({ hasSubmitted: false, message: "Sign in to submit" });
      setLoading(false);
      setStrikes(0);
      setSubmissionsCount(0);
    }
  }, [sessionPending, session, router]);

  const fetchSubmissionStatus = async () => {
    if (!session?.user) return;

    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("bearer_token");
      const res = await fetch("/api/submissions/has-submitted-today", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          toast.error("Please sign in to submit.");
          setSubmissionStatus({ hasSubmitted: false, message: "Session expired. Please sign in again." });
          return;
        }
        throw new Error("Failed to check submission status");
      }

      const data = await res.json();
      setSubmissionStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      toast.error("Error checking submission status");
      setSubmissionStatus({ hasSubmitted: false, message: "Error checking status. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissionsCount = async () => {
    if (!session?.user) return;

    try {
      const token = localStorage.getItem("bearer_token");
      const res = await fetch("/api/submissions", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setSubmissionsCount(data.length);
      }
    } catch (err) {
      console.error("Error fetching submissions count");
    }
  };

  const handleSignIn = () => {
    router.push("/sign-in?redirect=/dashboard");
  };

  const submitSubmission = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to submit.");
      handleSignIn();
      return;
    }

    if (isPastDeadline) {
      toast.error("Submissions closed for today, come back tomorrow");
      return;
    }

    if (submissionStatus?.hasSubmitted) {
      toast.error("You have already submitted today");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const token = localStorage.getItem("bearer_token");
      const submissionData = {
        attendanceClass: attendanceClass.trim() || null,
        fileAcademics: fileAcademics.trim() || null,
        qdOfficial: qdOfficial.trim() || null,
      };

      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submissionData),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.code === "DUPLICATE_SUBMISSION") {
          toast.error("You have already submitted today");
        } else {
          toast.error(data.error || "Failed to submit");
        }
        return;
      }

      toast.success("Submission successful!");
      setAttendanceClass("");
      setFileAcademics("");
      setQdOfficial("");
      fetchSubmissionStatus(); // Refresh status
      fetchSubmissionsCount(); // Refresh count
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      toast.error("Error submitting");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusMessage = () => {
    if (loading) return "Loading...";
    if (error) return `Error: ${error}`;
    if (!isAuthenticated) return "Sign in to submit";
    if (submissionStatus?.hasSubmitted) return "Already submitted today";
    if (isPastDeadline) return "Submissions closed for today, come back tomorrow";
    return "Ready to submit";
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

  const isLocked = !isAuthenticated || submissionStatus?.hasSubmitted || isPastDeadline;
  const hasAnyContent = attendanceClass.trim() || fileAcademics.trim() || qdOfficial.trim();

  return (
    <TechShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Daily Submission</h1>
            <p className="text-muted-foreground">Submit before {deadlineText}</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
            isPastDeadline ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
          }`}>
            <Clock className="h-4 w-4" />
            {isPastDeadline ? 'Closed' : 'Open'}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Submit Daily Report</CardTitle>
              <CardDescription>{getStatusMessage()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Checking submission status...</div>
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                  <Button variant="outline" size="sm" onClick={fetchSubmissionStatus}>
                    Retry
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid gap-3">
                    <Label htmlFor="attendanceClass">Attendance Class</Label>
                    <Input
                      id="attendanceClass"
                      placeholder="e.g., Present - Class attended"
                      value={attendanceClass}
                      onChange={(e) => setAttendanceClass(e.target.value)}
                      disabled={isLocked}
                    />
                  </div>

                  <div className="grid gap-3">
                    <Label htmlFor="fileAcademics">File Academics</Label>
                    <Textarea
                      id="fileAcademics"
                      placeholder="e.g., Completed assignments, notes taken"
                      value={fileAcademics}
                      onChange={(e) => setFileAcademics(e.target.value)}
                      disabled={isLocked}
                      rows={3}
                    />
                  </div>

                  <div className="grid gap-3">
                    <Label htmlFor="qdOfficial">QD Official</Label>
                    <Textarea
                      id="qdOfficial"
                      placeholder="e.g., QD tasks completed, official updates"
                      value={qdOfficial}
                      onChange={(e) => setQdOfficial(e.target.value)}
                      disabled={isLocked}
                      rows={3}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Deadline: {deadlineText}</Label>
                      <p className="text-xs text-muted-foreground">Submissions lock at 10:00 PM daily</p>
                    </div>
                  </div>

                  <Button 
                    onClick={isAuthenticated ? submitSubmission : handleSignIn} 
                    disabled={submitting || (!isAuthenticated && !hasAnyContent) || (isAuthenticated && (!hasAnyContent || submissionStatus?.hasSubmitted || isPastDeadline)) || loading}
                    className="w-full"
                  >
                    {isAuthenticated ? (
                      submitting ? "Submitting..." : submissionStatus?.hasSubmitted ? "Already Submitted" : isPastDeadline ? "Submissions Closed" : "Submit Report"
                    ) : (
                      <>
                        <LogIn className="h-4 w-4 mr-2" />
                        Sign In to Submit
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stats for submissions</CardTitle>
              <CardDescription>Track your participation</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-2">
              <div className="text-center">
                <div className="text-3xl font-bold">{strikes}</div>
                <p className="text-xs text-muted-foreground mt-1">Strikes</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{submissionsCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Submissions</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TechShell>
  );
}