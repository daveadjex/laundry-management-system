"use client";
import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { OrderStatusBadge } from "../../components/status-badge";
import { api, ApiError } from "../../lib/api";
import { DashboardOverview, formatGHS } from "../../lib/types";
import { Loader2, Wallet, ShoppingBasket, Clock, PackageCheck, Users, UserCheck } from "lucide-react";

export default function AdminOverviewPage() {
  const [data, setData] = React.useState<DashboardOverview | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api.get<DashboardOverview>("/api/dashboard/overview")
      .then(setData)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Could not load the dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!data) return null;

  const cards = [
    { label: "Revenue today", value: formatGHS(data.revenue_today), icon: Wallet },
    { label: "Revenue this week", value: formatGHS(data.revenue_week), icon: Wallet },
    { label: "Orders today", value: data.orders_today, icon: ShoppingBasket },
    { label: "Pending orders", value: data.pending_orders, icon: Clock },
    { label: "Ready for pickup", value: data.ready_orders, icon: PackageCheck },
    { label: "Total customers", value: data.total_customers, icon: Users },
    { label: "Active workers", value: data.active_workers, icon: UserCheck },
    { label: "All-time revenue", value: formatGHS(data.revenue_total), icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Shop overview</h1>
        <p className="text-sm text-muted-foreground">A live look at everything happening in the shop.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-semibold">{c.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent orders</CardTitle>
            <CardDescription>The latest activity in the shop.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recent_orders.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No orders yet.</p>
            ) : data.recent_orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{o.order_number}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatGHS(o.total_amount)}</span>
                  <OrderStatusBadge status={o.status} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Staff activity log</CardTitle>
            <CardDescription>Who did what, most recent first.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recent_activity.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nothing logged yet.</p>
            ) : data.recent_activity.map((a, i) => (
              <div key={i} className="rounded-md border px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{a.actor}</span>
                  <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground">{a.action}{a.details ? ` — ${a.details}` : ""}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
