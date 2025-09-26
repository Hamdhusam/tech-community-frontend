"use client";
import { useEffect, useState } from 'react';
import { useSession } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Shield, User, Calendar, AlertCircle } from 'lucide-react';
import TechShell from '@/components/TechShell';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  strikes: number;
  recentAttendanceCount: number;
  createdAt: number;
}

interface AttendanceRecord {
  id: number;
  userId: string;
  submittedAt: number;
  confirmedNotion: boolean;
  notes?: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    strikes: number;
  };
}

export default function AdminDashboard() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [newStrikes, setNewStrikes] = useState(0);
  const [updating, setUpdating] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState<'admin' | 'user'>("user");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isPending && (!session || session.user.role !== 'admin')) {
      router.push('/dashboard');
      return;
    }

    fetchData();
  }, [session, isPending, router]);

  const fetchData = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('bearer_token') : null;
    if (!token) {
      setError('No auth token found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [usersRes, attendanceRes] = await Promise.all([
        fetch('/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/admin/attendance', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (!usersRes.ok || !attendanceRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const usersData = await usersRes.json();
      const attendanceData = await attendanceRes.json();

      setUsers(usersData);
      setAttendance(attendanceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (userId: string) => {
    if (!selectedUser) return;
    const token = localStorage.getItem('bearer_token');
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/update-role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (res.ok) {
        // Update local state
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        setSelectedUser(null);
        setNewRole('user');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update role');
      }
    } catch (err) {
      alert('Error updating role');
    } finally {
      setUpdating(false);
    }
  };

  const updateStrikes = async (userId: string) => {
    if (!selectedUser) return;
    const token = localStorage.getItem('bearer_token');
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/update-strikes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ strikes: newStrikes })
      });

      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, strikes: newStrikes } : u));
        setSelectedUser(null);
        setNewStrikes(0);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update strikes');
      }
    } catch (err) {
      alert('Error updating strikes');
    } finally {
      setUpdating(false);
    }
  };

  const createUser = async () => {
    const token = localStorage.getItem('bearer_token');
    if (!token) {
      setError('No auth token found');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: addName.trim(),
          email: addEmail.trim().toLowerCase(),
          password: addPassword,
          role: addRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create user');
        return;
      }
      setUsers((prev) => [data, ...prev]);
      setShowAddDialog(false);
      setAddName("");
      setAddEmail("");
      setAddPassword("");
      setAddRole('user');
    } catch (e) {
      setError('Error creating user');
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (user: User, type: 'role' | 'strikes') => {
    setSelectedUser(user);
    setNewRole(type === 'role' ? user.role : 'user');
    setNewStrikes(type === 'strikes' ? user.strikes : 0);
  };

  if (isPending || loading) {
    return (
      <TechShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">Loading admin dashboard...</div>
        </div>
      </TechShell>
    );
  }

  if (error) {
    return (
      <TechShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center text-destructive">Error: {error}</div>
        </div>
      </TechShell>
    );
  }

  return (
    <TechShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage users, attendance, and strikes</p>
          </div>
          <Button onClick={fetchData} variant="outline">
            <AlertCircle className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">
              <User className="mr-2 h-4 w-4" /> Users ({users.length})
            </TabsTrigger>
            <TabsTrigger value="attendance">
              <Calendar className="mr-2 h-4 w-4" /> Attendance ({attendance.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>View and edit user roles and strikes</CardDescription>
                  </div>
                  <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                        <DialogDescription>Create a new user or admin. Only admins can perform this action.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="add-name">Name</Label>
                          <Input id="add-name" value={addName} onChange={(e)=>setAddName(e.target.value)} placeholder="Jane Doe" />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="add-email">Email</Label>
                          <Input id="add-email" type="email" value={addEmail} onChange={(e)=>setAddEmail(e.target.value)} placeholder="jane@example.com" />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="add-password">Temporary Password</Label>
                          <Input id="add-password" type="password" value={addPassword} onChange={(e)=>setAddPassword(e.target.value)} placeholder="Min 8 characters" autoComplete="off" />
                        </div>
                        <div className="grid gap-2">
                          <Label>Role</Label>
                          <Select value={addRole} onValueChange={(v)=>setAddRole(v as 'admin' | 'user')}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={createUser} disabled={creating || !addName || !addEmail || !addPassword}>
                          {creating ? 'Creating...' : 'Create User'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Strikes</TableHead>
                      <TableHead>Recent Attendance (30d)</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'secondary' : 'default'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.strikes}</TableCell>
                        <TableCell>{user.recentAttendanceCount}</TableCell>
                        <TableCell className="space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => openEdit(user, 'role')}>
                                Edit Role
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Role for {selectedUser?.name}</DialogTitle>
                                <DialogDescription>Change the user role</DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="role">Role</Label>
                                  <Select value={newRole} onValueChange={(v) => setNewRole(v as 'admin' | 'user')}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="user">User</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button type="submit" onClick={() => updateRole(user.id)} disabled={updating}>
                                  {updating ? 'Updating...' : 'Update Role'}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => openEdit(user, 'strikes')}>
                                Edit Strikes
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Strikes for {selectedUser?.name}</DialogTitle>
                                <DialogDescription>Change the number of strikes</DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="strikes">Strikes</Label>
                                  <Input
                                    id="strikes"
                                    type="number"
                                    min="0"
                                    value={newStrikes}
                                    onChange={(e) => setNewStrikes(parseInt(e.target.value) || 0)}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button type="submit" onClick={() => updateStrikes(user.id)} disabled={updating}>
                                  {updating ? 'Updating...' : 'Update Strikes'}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Oversight</CardTitle>
                <CardDescription>View all attendance submissions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Submitted At</TableHead>
                      <TableHead>Notion Confirmed</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.user.name}</TableCell>
                        <TableCell>{new Date(record.submittedAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={record.confirmedNotion ? 'default' : 'secondary'}>
                            {record.confirmedNotion ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.notes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TechShell>
  );
}