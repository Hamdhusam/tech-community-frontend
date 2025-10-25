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

// Real admin dataset from database
type AdminUser = {
  user_id: string;
  full_name: string;
  email: string;
  year_of_study: "I" | "II" | "III" | "IV";
  section: "A" | "B" | "C";
  branch: string;
  student_id: string;
  phone_number: string;
  strikes: number;
  status: "active" | "suspended";
  role: "participant" | "class_incharge" | "administrator";
  created_at: string;
};

export default function AdminPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  
  // ALL HOOKS MUST BE AT THE TOP - before any conditional returns
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("all-years");
  const [section, setSection] = useState("all-sections");
  const [status, setStatus] = useState("all-statuses");
  const [sMin, setSMin] = useState("");
  const [sMax, setSMax] = useState("");

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = query.trim().toLowerCase();
      const matchesQ = !q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.student_id.toLowerCase().includes(q);
      const matchesYear = year === "all-years" || u.year_of_study === (year as any);
      const matchesSec = section === "all-sections" || u.section === (section as any);
      const matchesStatus = status === "all-statuses" || u.status === (status as any);
      const minOk = sMin === "" || u.strikes >= Number(sMin);
      const maxOk = sMax === "" || u.strikes <= Number(sMax);
      return matchesQ && matchesYear && matchesSec && matchesStatus && minOk && maxOk;
    });
  }, [users, query, year, section, status, sMin, sMax]);

  // Fetch real users from database
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/users');
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
        } else {
          console.error('Failed to fetch users');
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we have a valid admin session
    const userRole = (session?.user as any)?.app_metadata?.role || (session?.user as any)?.role;
    if (session?.user && (userRole === "administrator" || userRole === "admin")) {
      fetchUsers();
    }
  }, [session]);

  // Redirect non-admins away from admin panel
  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      router.push("/sign-in");
      return;
    }
    // Only allow users with role === "administrator" or "admin"
    const userRole = (session.user as any)?.app_metadata?.role || (session.user as any)?.role;
    if (userRole !== "administrator" && userRole !== "admin") {
      router.push("/dashboard");
    }
  }, [session, isPending, router]);

  // NOW we can do conditional rendering
  if (isPending) {
    return (
      <TechShell>
        <div className="p-6">Checking access…</div>
      </TechShell>
    );
  }

  const userRole = (session?.user as any)?.app_metadata?.role || (session?.user as any)?.role;
  if (!session?.user || (userRole !== "administrator" && userRole !== "admin")) {
    return null; // Redirecting – render nothing
  }

  const toggleSuspend = async (userId: string) => {
    const user = users.find(u => u.user_id === userId);
    if (!user) return;
    
    const newStatus = user.status === "active" ? "suspended" : "active";
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, status: newStatus }),
      });
      
      if (response.ok) {
        setUsers((prev) => prev.map((u) => (u.user_id === userId ? { ...u, status: newStatus } : u)));
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const resetStrikes = async (userId: string) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, strikes: 0 }),
      });
      
      if (response.ok) {
        setUsers((prev) => prev.map((u) => (u.user_id === userId ? { ...u, strikes: 0 } : u)));
      }
    } catch (error) {
      console.error('Failed to reset strikes:', error);
    }
  };

  const exportCSV = () => {
    const headers = ["Name", "Email", "Student ID", "Year", "Section", "Branch", "Phone", "Strikes", "Status", "Role"];
    const rows = filtered.map((u) => [
      u.full_name, 
      u.email, 
      u.student_id, 
      u.year_of_study, 
      u.section, 
      u.branch, 
      u.phone_number, 
      String(u.strikes), 
      u.status, 
      u.role
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flex-academics-users-${Date.now()}.csv`;
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
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3">Loading participants...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No participants found. Students will appear here after they register.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Strikes</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((u)=> (
                      <TableRow key={u.user_id}>
                        <TableCell className="font-medium">{u.full_name}</TableCell>
                        <TableCell className="whitespace-nowrap">{u.email}</TableCell>
                        <TableCell>{u.student_id}</TableCell>
                        <TableCell>{u.year_of_study}</TableCell>
                        <TableCell>{u.section}</TableCell>
                        <TableCell className="whitespace-nowrap">{u.branch}</TableCell>
                        <TableCell>
                          <span className={u.strikes >= 3 ? "text-destructive font-bold" : ""}>{u.strikes}</span>
                        </TableCell>
                        <TableCell className={u.status === "active" ? "text-green-400" : "text-destructive"}>
                          {u.status}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button size="sm" variant="outline" onClick={()=>resetStrikes(u.user_id)} title="Reset strikes">
                            <ShieldAlert className="size-4"/>
                          </Button>
                          {u.status === "active" ? (
                            <Button size="sm" variant="destructive" onClick={()=>toggleSuspend(u.user_id)}>
                              <UserMinus className="size-4 mr-1"/>Suspend
                            </Button>
                          ) : (
                            <Button size="sm" variant="default" onClick={()=>toggleSuspend(u.user_id)}>
                              <UserPlus className="size-4 mr-1"/>Reactivate
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TechShell>
  );
}