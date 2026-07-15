"use client";
import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../../components/ui/select";
import { OrderStatusBadge } from "../../../components/status-badge";
import { OrderDetailDialog } from "../../../components/order-detail-dialog";
import { api, ApiError } from "../../../lib/api";
import { CustomerOut, OrderOut, OrderStatus, formatGHS } from "../../../lib/types";
import { Loader2, Eye, Plus } from "lucide-react";

const FILTERS: { label: string; value: OrderStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Received", value: "received" },
  { label: "In Progress", value: "in_progress" },
  { label: "Ready", value: "ready" },
  { label: "Picked Up", value: "picked_up" },
  { label: "Cancelled", value: "cancelled" },
];

export default function WorkerOrdersPage() {
  const [orders, setOrders] = React.useState<OrderOut[]>([]);
  const [customers, setCustomers] = React.useState<Record<string, CustomerOut>>({});
  const [filter, setFilter] = React.useState<OrderStatus | "all">("all");
  const [loading, setLoading] = React.useState(true);
  const [activeOrder, setActiveOrder] = React.useState<OrderOut | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [orderData, customerData] = await Promise.all([
        api.get<OrderOut[]>(filter === "all" ? "/api/orders" : `/api/orders?status=${filter}`),
        api.get<CustomerOut[]>("/api/customers"),
      ]);
      setOrders(orderData);
      const map: Record<string, CustomerOut> = {};
      customerData.forEach((c) => { map[c.id] = c; });
      setCustomers(map);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not load orders");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  React.useEffect(() => { load(); }, [load]);

  function openOrder(o: OrderOut) {
    setActiveOrder(o);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">Track laundry through to pickup and payment.</p>
        </div>
        <Button asChild className="gap-1">
          <Link href="/worker/new-order"><Plus className="h-4 w-4" /> New order</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={filter === f.value ? "default" : "outline"}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Order list</CardTitle>
          <CardDescription>{orders.length} orders</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : orders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No orders in this view yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                    <TableCell className="font-medium">{customers[o.customer_id]?.full_name || "—"}</TableCell>
                    <TableCell><OrderStatusBadge status={o.status} /></TableCell>
                    <TableCell>{formatGHS(o.total_amount)}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(o.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="gap-1" onClick={() => openOrder(o)}>
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <OrderDetailDialog
        order={activeOrder}
        customer={activeOrder ? customers[activeOrder.customer_id] : undefined}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUpdated={load}
      />
    </div>
  );
}
