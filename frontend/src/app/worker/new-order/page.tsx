"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../../components/ui/select";
import { Separator } from "../../../components/ui/separator";
import { api, ApiError } from "../../../lib/api";
import { CustomerOut, formatGHS } from "../../../lib/types";
import { Loader2, Plus, Trash2, Search, UserPlus, CheckCircle2 } from "lucide-react";

const SERVICE_PRESETS = ["Wash & Fold", "Wash & Iron", "Dry Clean", "Ironing Only", "Duvet / Beddings", "Starching", "Other"];

interface LineItem {
  key: string;
  service_type: string;
  description: string;
  quantity: number;
  unit_price: number;
}

function newLine(): LineItem {
  return { key: crypto.randomUUID(), service_type: "Wash & Fold", description: "", quantity: 1, unit_price: 0 };
}

export default function NewOrderPage() {
  const router = useRouter();
  const [customers, setCustomers] = React.useState<CustomerOut[]>([]);
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<CustomerOut | null>(null);
  const [addingNew, setAddingNew] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newPhone, setNewPhone] = React.useState("");

  const [items, setItems] = React.useState<LineItem[]>([newLine()]);
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    api.get<CustomerOut[]>("/api/customers").then(setCustomers).catch(() => {});
  }, []);

  const filtered = React.useMemo(() => {
    if (!query) return customers.slice(0, 6);
    const q = query.toLowerCase();
    return customers.filter((c) => c.full_name.toLowerCase().includes(q) || c.phone.includes(q)).slice(0, 6);
  }, [customers, query]);

  const total = items.reduce((s, it) => s + it.quantity * it.unit_price, 0);

  function updateLine(key: string, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }
  function removeLine(key: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.key !== key) : prev));
  }

  async function submit() {
    let customerId = selected?.id;

    if (!customerId) {
      if (!addingNew || !newName || !newPhone) {
        toast.error("Pick an existing customer or add a new one");
        return;
      }
    }

    const validItems = items.filter((it) => it.service_type && it.quantity > 0 && it.unit_price >= 0);
    if (validItems.length === 0) {
      toast.error("Add at least one item with a price");
      return;
    }

    setSubmitting(true);
    try {
      if (!customerId) {
        const created = await api.post<CustomerOut>("/api/customers", { full_name: newName, phone: newPhone });
        customerId = created.id;
      }
      const order = await api.post<{ id: string; order_number: string }>("/api/orders", {
        customer_id: customerId,
        items: validItems.map((it) => ({
          service_type: it.service_type,
          description: it.description || undefined,
          quantity: it.quantity,
          unit_price: it.unit_price,
        })),
        notes: notes || undefined,
      });
      toast.success(`Order ${order.order_number} created — customer notified by SMS`);
      router.push("/worker/orders");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create the order");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New order</h1>
        <p className="text-sm text-muted-foreground">Take in laundry, price the items, and we&apos;ll text the customer a receipt.</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Customer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {selected ? (
            <div className="flex items-center justify-between rounded-md border bg-accent/40 px-3 py-2">
              <div>
                <p className="font-medium">{selected.full_name}</p>
                <p className="text-sm text-muted-foreground">{selected.phone}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Change</Button>
            </div>
          ) : addingNew ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Full name</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="024xxxxxxx" />
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setAddingNew(false)}>Cancel — search existing instead</Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Search by name or phone" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <div className="divide-y rounded-md border">
                {filtered.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-muted-foreground">No matches.</p>
                ) : filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <span className="font-medium">{c.full_name}</span>
                    <span className="text-muted-foreground">{c.phone}</span>
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setAddingNew(true)}>
                <UserPlus className="h-3.5 w-3.5" /> New customer instead
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Items</CardTitle>
          <CardDescription>Add each service being done for this order.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((it) => (
            <div key={it.key} className="grid grid-cols-12 items-end gap-2 rounded-md border p-3">
              <div className="col-span-4 space-y-1">
                <Label className="text-xs">Service</Label>
                <Select value={it.service_type} onValueChange={(v) => updateLine(it.key, { service_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_PRESETS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-4 space-y-1">
                <Label className="text-xs">Description</Label>
                <Input value={it.description} onChange={(e) => updateLine(it.key, { description: e.target.value })} placeholder="e.g. 3 shirts, 2 trousers" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Qty</Label>
                <Input type="number" min={1} value={it.quantity} onChange={(e) => updateLine(it.key, { quantity: Number(e.target.value) })} />
              </div>
              <div className="col-span-1 space-y-1">
                <Label className="text-xs">Price</Label>
                <Input type="number" min={0} step="0.5" value={it.unit_price} onChange={(e) => updateLine(it.key, { unit_price: Number(e.target.value) })} />
              </div>
              <div className="col-span-1 flex justify-end">
                <Button variant="ghost" size="icon" onClick={() => removeLine(it.key)} disabled={items.length === 1}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setItems((p) => [...p, newLine()])}>
            <Plus className="h-3.5 w-3.5" /> Add item
          </Button>

          <Separator />
          <div className="space-y-1">
            <Label className="text-xs">Notes for this order (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g. light starch, handle with care" />
          </div>

          <div className="flex items-center justify-between rounded-md bg-accent/40 px-3 py-2">
            <span className="text-sm font-medium">Order total</span>
            <span className="text-lg font-semibold">{formatGHS(total)}</span>
          </div>

          <Button className="w-full gap-1" size="lg" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Create order
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
