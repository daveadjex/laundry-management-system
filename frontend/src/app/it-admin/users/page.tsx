"use client";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Badge } from "../../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../../components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "../../../components/ui/dialog";
import { useAuth } from "../../../lib/auth-context";
import { api, ApiError } from "../../../lib/api";
import { Role, UserOut } from "../../../lib/types";
import { Loader2, UserPlus, KeyRound, Pencil, Trash2 } from "lucide-react";

const ROLE_LABEL: Record<Role, string> = { it_admin: "IT Administrator", admin: "Owner / Admin", worker: "Shop Worker" };
const ROLE_VARIANT: Record<Role, "default" | "secondary" | "outline"> = { it_admin: "default", admin: "secondary", worker: "outline" };

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = React.useState<UserOut[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editUser, setEditUser] = React.useState<UserOut | null>(null);
  const [resetUser, setResetUser] = React.useState<UserOut | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await api.get<UserOut[]>("/api/users"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not load users");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  async function toggleActive(u: UserOut) {
    try {
      await api.patch(`/api/users/${u.id}`, { is_active: !u.is_active });
      toast.success(`${u.full_name} ${u.is_active ? "disabled" : "re-enabled"}`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update user");
    }
  }

  async function deleteUser(u: UserOut) {
    if (!confirm(`Delete ${u.full_name}'s account? This cannot be undone.`)) return;
    try {
      await api.del(`/api/users/${u.id}`);
      toast.success("User deleted");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not delete user");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users &amp; access</h1>
          <p className="text-sm text-muted-foreground">Create accounts, set roles, and manage privileges for the whole system.</p>
        </div>
        <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={load} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All accounts</CardTitle>
          <CardDescription>{users.length} accounts</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.username}</TableCell>
                    <TableCell className="text-muted-foreground">{u.phone || "—"}</TableCell>
                    <TableCell><Badge variant={ROLE_VARIANT[u.role]}>{ROLE_LABEL[u.role]}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? "success" : "destructive"}>{u.is_active ? "Active" : "Disabled"}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditUser(u)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setResetUser(u)}><KeyRound className="h-3.5 w-3.5" /></Button>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => toggleActive(u)}
                        disabled={u.username === me?.username}
                        title={u.is_active ? "Disable account" : "Re-enable account"}
                      >
                        {u.is_active ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        size="sm" variant="ghost" className="text-destructive"
                        onClick={() => deleteUser(u)}
                        disabled={u.username === me?.username}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EditUserDialog user={editUser} onOpenChange={(v) => !v && setEditUser(null)} onSaved={load} />
      <ResetPasswordDialog user={resetUser} onOpenChange={(v) => !v && setResetUser(null)} />
    </div>
  );
}

function CreateUserDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const [username, setUsername] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<Role>("worker");
  const [saving, setSaving] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/users", { username, full_name: fullName, phone: phone || undefined, password, role });
      toast.success(`Account created for ${fullName}`);
      setUsername(""); setFullName(""); setPhone(""); setPassword(""); setRole("worker");
      onOpenChange(false);
      onCreated();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create account");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-1"><UserPlus className="h-4 w-4" /> New account</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create an account</DialogTitle>
          <DialogDescription>They&apos;ll be asked to change this password on first login.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required autoFocus />
            </div>
            <div className="space-y-1">
              <Label>Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Phone (optional)</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Temporary password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Role / privileges</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="worker">Shop Worker</SelectItem>
                <SelectItem value="admin">Owner / Admin (view-only oversight)</SelectItem>
                <SelectItem value="it_admin">IT Administrator (full system access)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Create account</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({ user, onOpenChange, onSaved }: { user: UserOut | null; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [role, setRole] = React.useState<Role>("worker");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (user) { setFullName(user.full_name); setPhone(user.phone || ""); setRole(user.role); }
  }, [user]);

  if (!user) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await api.patch(`/api/users/${user.id}`, { full_name: fullName, phone: phone || undefined, role });
      toast.success("Account updated");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update account");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {user.full_name}</DialogTitle>
          <DialogDescription>Update their details or change their privileges.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Role / privileges</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="worker">Shop Worker</SelectItem>
                <SelectItem value="admin">Owner / Admin (view-only oversight)</SelectItem>
                <SelectItem value="it_admin">IT Administrator (full system access)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ user, onOpenChange }: { user: UserOut | null; onOpenChange: (v: boolean) => void }) {
  const [password, setPassword] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  if (!user) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await api.post(`/api/users/${user.id}/reset-password`, { new_password: password });
      toast.success(`Password reset for ${user.full_name}`);
      setPassword("");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not reset password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password for {user.full_name}</DialogTitle>
          <DialogDescription>They&apos;ll be asked to change it again on next login.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>New temporary password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoFocus />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Reset password</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
