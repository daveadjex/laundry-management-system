"use client";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "../../../components/ui/dialog";
import { api, ApiError } from "../../../lib/api";
import { CustomerOut } from "../../../lib/types";
import { Loader2, Search, UserPlus, Phone } from "lucide-react";

export default function CustomersPage() {
  const [customers, setCustomers] = React.useState<CustomerOut[]>([]);
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);

  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async (query?: string) => {
    setLoading(true);
    try {
      const data = await api.get<CustomerOut[]>(`/api/customers${query ? `?q=${encodeURIComponent(query)}` : ""}`);
      setCustomers(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not load customers");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    const t = setTimeout(() => load(q), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function addCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName || !phone) return;
    setSaving(true);
    try {
      await api.post("/api/customers", { full_name: fullName, phone, notes: notes || undefined });
      toast.success("Customer added");
      setFullName(""); setPhone(""); setNotes(""); setOpen(false);
      load(q);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not add customer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">Everyone who's dropped off laundry with you.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1"><UserPlus className="h-4 w-4" /> Add customer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a customer</DialogTitle>
              <DialogDescription>Their phone number is used for SMS updates and Mobile Money payments.</DialogDescription>
            </DialogHeader>
            <form onSubmit={addCustomer} className="space-y-3">
              <div className="space-y-1">
                <Label>Full name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required autoFocus />
              </div>
              <div className="space-y-1">
                <Label>Phone number</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="024xxxxxxx" required />
              </div>
              <div className="space-y-1">
                <Label>Notes (optional)</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. allergic to strong detergent" />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save customer</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Search by name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All customers</CardTitle>
          <CardDescription>{customers.length} on record</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : customers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No customers yet — add your first one above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell className="text-muted-foreground"><span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span></TableCell>
                    <TableCell className="text-muted-foreground">{c.notes || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
