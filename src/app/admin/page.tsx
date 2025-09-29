"use client";
import { useEffect, useMemo, useState } from "react";
import TechShell from "@/components/TechShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, RefreshCcw, ShieldAlert, UserMinus, UserPlus } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

// Mock admin dataset
type AdminUser = {
  id: number;
  name: string;
  email: string;
  year: "I" | "II" | "III" | "IV";
  section: "A" | "B" | "C";
  strikes: number;
  status: "active" | "suspended";
};

const seedUsers: AdminUser[] = Array.from({ length: 24 }).map((_, i) => {
  const years = ["I", "II", "III", "IV"] as const;
  const sections = ["A", "B", "C"] as const;
  return {
    id: i + 1,
    name: `Participant ${i + 1}`,
    email: `student${i + 1}@college.edu`,
    year: years[i % years.length],
    section: sections[i % sections.length],
    strikes: Math.floor(Math.random() * 11),
    status: Math.random() > 0.15 ? "active" : "suspended",
  };
});

export default function AdminPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  // Redirect non-admins away from admin panel
  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      router.push("/sign-in");
      return;
    }
    // Only allow users with role === "admin"
    if ((session.user as any)?.role !== "admin") {
      router.push("/dashboard");
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <TechShell>
        <div className="p-6">Checking access…</div>
      </TechShell>
    );
  }

  if (!session?.user || (session.user as any)?.role !== "admin") {
    return null; // Redirecting – render nothing
  }

  const [users, setUsers] = useState<AdminUser[]>(seedUsers);
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("all-years");
  const [section, setSection] = useState("all-sections");
  const [status, setStatus] = useState("all-statuses");
  const [sMin, setSMin] = useState("");
  const [sMax, setSMax] = useState("");

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = query.trim().toLowerCase();
      const matchesQ = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchesYear = year === "all-years" || u.year === (year as any);
      const matchesSec = section === "all-sections" || u.section === (section as any);
      const matchesStatus = status === "all-statuses" || u.status === (status as any);
      const minOk = sMin === "" || u.strikes >= Number(sMin);
      const maxOk = sMax === "" || u.strikes <= Number(sMax);
      return matchesQ && matchesYear && matchesSec && matchesStatus && minOk && maxOk;
    });
  }, [users, query, year, section, status, sMin, sMax]);

  const toggleSuspend = (id: number) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: u.status === "active" ? "suspended" : "active" } : u)));
  };

  const resetStrikes = (id: number) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, strikes: 0 } : u)));
  };

  const exportCSV = () => {
    const headers = ["Name", "Email", "Year", "Section", "Strikes", "Status"];
    const rows = filtered.map((u) => [u.name, u.email, u.year, u.section, String(u.strikes), u.status]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <TechShell>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Admin Dashboard</CardTitle>
            <CardDescription>Manage users, strikes, and statuses</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid sm:grid-cols-6 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <Label>Search</Label>
                <Input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="name or email" />
              </div>
              <div className="space-y-1">
                <Label>Year</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger><SelectValue placeholder="Year"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-years">All Years</SelectItem>
                    <SelectItem value="I">I</SelectItem>
                    <SelectItem value="II">II</SelectItem>
                    <SelectItem value="III">III</SelectItem>
                    <SelectItem value="IV">IV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Section</Label>
                <Select value={section} onValueChange={setSection}>
                  <SelectTrigger><SelectValue placeholder="Section"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-sections">All Sections</SelectItem>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue placeholder="Status"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-statuses">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Strike min</Label>
                <Input inputMode="numeric" value={sMin} onChange={(e)=>setSMin(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label>Strike max</Label>
                <Input inputMode="numeric" value={sMax} onChange={(e)=>setSMax(e.target.value)} placeholder="10" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={()=>{setQuery("");setYear("all-years");setSection("all-sections");setStatus("all-statuses");setSMin("");setSMax("");}}>
                <RefreshCcw className="size-4 mr-2"/>Reset
              </Button>
              <Button onClick={exportCSV}><Download className="size-4 mr-2"/>Export CSV</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Participants</CardTitle>
            <CardDescription>Actions: suspend/reactivate, reset strikes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Strikes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u)=> (
                    <TableRow key={u.id}>
                      <TableCell>{u.name}</TableCell>
                      <TableCell className="whitespace-nowrap">{u.email}</TableCell>
                      <TableCell>{u.year}</TableCell>
                      <TableCell>{u.section}</TableCell>
                      <TableCell>{u.strikes}</TableCell>
                      <TableCell className={u.status === "active" ? "text-green-400" : "text-destructive"}>{u.status}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={()=>resetStrikes(u.id)} title="Reset strikes">
                          <ShieldAlert className="size-4"/>
                        </Button>
                        {u.status === "active" ? (
                          <Button size="sm" variant="destructive" onClick={()=>toggleSuspend(u.id)}>
                            <UserMinus className="size-4 mr-1"/>Suspend
                          </Button>
                        ) : (
                          <Button size="sm" variant="default" onClick={()=>toggleSuspend(u.id)}>
                            <UserPlus className="size-4 mr-1"/>Reactivate
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </TechShell>
  );
}