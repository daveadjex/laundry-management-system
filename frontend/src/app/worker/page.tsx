"use client";
import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "../../lib/auth-context";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { OrderStatusBadge } from "../../components/status-badge";
import { OrderDetailDialog } from "../../components/order-detail-dialog";
import { api, ApiError } from "../../lib/api";
import { CustomerOut, OrderOut, formatGHS } from "../../lib/types";
import { Loader2, Plus, PackageCheck, Clock, ShoppingBasket } from "lucide-react";

export default function WorkerHomePage() {
  const { user } = useAuth();
  const [orders, setOrders] = React.useState<OrderOut[]>([]);
  const [customers, setCustomers] = React.useState<Record<string, CustomerOut>>({});
  const [loading, setLoading] = React.useState(true);
  const [activeOrder, setActiveOrder] = React.useState<OrderOut | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [orderData, customerData] = await Promise.all([
        api.get<OrderOut[]>("/api/orders"),
        api.get<CustomerOut[]>("/api/customers"),
      ]);
      setOrders(orderData);
      const map: Record<string, CustomerOut> = {};
      customerData.forEach((c) => { map[c.id] = c; });
      setCustomers(map);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not load today's orders");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const todayStr = new Date().toDateString();
  const ordersToday = orders.filter((o) => new Date(o.created_at).toDateString() === todayStr);
  const pending = orders.filter((o) => o.status === "received" || o.status === "in_progress");
  const ready = orders.filter((o) => o.status === "ready");

  function openOrder(o: OrderOut) {
    setActiveOrder(o);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Good day, {user?.fullName?.split(" ")[0]}</h1>
          <p className="text-sm text-muted-foreground">Here's what's happening in the shop today.</p>
        </div>
        <Button asChild className="gap-1">
          <Link href="/worker/new-order"><Plus className="h-4 w-4" /> New order</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Orders today</CardTitle>
            <ShoppingBasket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-semibold">{ordersToday.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">In progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-semibold">{pending.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ready for pickup</CardTitle>
            <PackageCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-semibold">{ready.length}</div></CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ready for pickup</CardTitle>
              <CardDescription>Customers who need to come collect &amp; pay.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {ready.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nothing ready right now.</p>
              ) : ready.map((o) => (
                <button
                  key={o.id}
                  onClick={() => openOrder(o)}
                  className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left hover:bg-accent"
                >
                  <div>
                    <p className="text-sm font-medium">{customers[o.customer_id]?.full_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{o.order_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatGHS(o.total_amount)}</p>
                    <OrderStatusBadge status={o.status} />
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Being washed</CardTitle>
              <CardDescription>Orders received but not yet ready.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {pending.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">All caught up.</p>
              ) : pending.map((o) => (
                <button
                  key={o.id}
                  onClick={() => openOrder(o)}
                  className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left hover:bg-accent"
                >
                  <div>
                    <p className="text-sm font-medium">{customers[o.customer_id]?.full_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{o.order_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatGHS(o.total_amount)}</p>
                    <OrderStatusBadge status={o.status} />
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

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
