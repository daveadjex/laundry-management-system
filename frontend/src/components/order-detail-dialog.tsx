"use client";
import * as React from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Separator } from "../components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { OrderStatusBadge } from "../components/status-badge";
import { api, ApiError } from "../lib/api";
import {
  CustomerOut, OrderOut, OrderStatus, PaymentOut, formatGHS, STATUS_LABEL,
} from "../lib/types";
import { Loader2, MessageSquareText, Smartphone, Banknote, RefreshCw } from "lucide-react";

const STATUS_FLOW: OrderStatus[] = ["received", "in_progress", "ready", "picked_up", "cancelled"];

export function OrderDetailDialog({
  order, customer, open, onOpenChange, onUpdated,
}: {
  order: OrderOut | null;
  customer: CustomerOut | undefined;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdated: () => void;
}) {
  const [payments, setPayments] = React.useState<PaymentOut[]>([]);
  const [loadingPayments, setLoadingPayments] = React.useState(false);
  const [statusValue, setStatusValue] = React.useState<OrderStatus>(order?.status || "received");
  const [savingStatus, setSavingStatus] = React.useState(false);

  const [cashAmount, setCashAmount] = React.useState("");
  const [savingCash, setSavingCash] = React.useState(false);

  const [momoAmount, setMomoAmount] = React.useState("");
  const [momoPhone, setMomoPhone] = React.useState("");
  const [momoProvider, setMomoProvider] = React.useState("mtn");
  const [savingMomo, setSavingMomo] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);

  const [message, setMessage] = React.useState("");
  const [sendingMsg, setSendingMsg] = React.useState(false);

  const loadPayments = React.useCallback(async () => {
    if (!order) return;
    setLoadingPayments(true);
    try {
      const data = await api.get<PaymentOut[]>(`/api/payments/order/${order.id}`);
      setPayments(data);
    } catch {
      // silent
    } finally {
      setLoadingPayments(false);
    }
  }, [order]);

  React.useEffect(() => {
    if (open && order) {
      setStatusValue(order.status);
      setCashAmount(String(order.total_amount));
      setMomoAmount(String(order.total_amount));
      setMomoPhone(customer?.phone || "");
      loadPayments();
    }
  }, [open, order, customer, loadPayments]);

  if (!order) return null;

  const totalPaid = payments.filter((p) => p.status === "success").reduce((s, p) => s + p.amount, 0);
  const balance = Math.max(0, order.total_amount - totalPaid);

  async function updateStatus() {
    if (!order) return;
    setSavingStatus(true);
    try {
      await api.patch(`/api/orders/${order.id}/status`, { status: statusValue });
      toast.success(`Order marked as ${STATUS_LABEL[statusValue]}`);
      onUpdated();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update status");
    } finally {
      setSavingStatus(false);
    }
  }

  async function recordCash() {
    if (!order) return;
    const amount = parseFloat(cashAmount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    setSavingCash(true);
    try {
      await api.post("/api/payments/cash", { order_id: order.id, amount });
      toast.success("Cash payment recorded — customer notified by SMS");
      loadPayments();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not record payment");
    } finally {
      setSavingCash(false);
    }
  }

  async function initiateMomo() {
    if (!order) return;
    const amount = parseFloat(momoAmount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    if (!momoPhone) { toast.error("Enter the customer's Mobile Money number"); return; }
    setSavingMomo(true);
    try {
      await api.post("/api/payments/momo/initiate", {
        order_id: order.id, amount, phone: momoPhone, provider: momoProvider,
      });
      toast.success("Charge sent — ask the customer to check their phone and enter their MoMo PIN");
      loadPayments();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not start the Mobile Money charge");
    } finally {
      setSavingMomo(false);
    }
  }

  async function verifyMomo(reference: string) {
    setVerifying(true);
    try {
      const p = await api.get<PaymentOut>(`/api/payments/momo/verify/${reference}`);
      toast.info(`Payment status: ${p.status}`);
      loadPayments();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not check status");
    } finally {
      setVerifying(false);
    }
  }

  async function sendMessage() {
    if (!order || !customer || !message.trim()) return;
    setSendingMsg(true);
    try {
      await api.post("/api/notifications/send", {
        customer_id: customer.id, order_id: order.id, message: message.trim(), type: "custom",
      });
      toast.success("SMS sent to customer");
      setMessage("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not send SMS");
    } finally {
      setSendingMsg(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {order.order_number} <OrderStatusBadge status={order.status} />
          </DialogTitle>
          <DialogDescription>
            {customer ? `${customer.full_name} · ${customer.phone}` : "Customer"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <p className="text-sm font-medium">Items</p>
          <div className="rounded-md border divide-y">
            {order.items.map((it) => (
              <div key={it.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{it.service_type}</p>
                  {it.description && <p className="text-xs text-muted-foreground">{it.description}</p>}
                </div>
                <div className="text-right text-muted-foreground">
                  {it.quantity} × {formatGHS(it.unit_price)}
                  <span className="ml-2 font-medium text-foreground">
                    {formatGHS(it.quantity * it.unit_price)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between px-1 pt-1 text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">{formatGHS(order.total_amount)}</span>
          </div>
          <div className="flex justify-between px-1 text-sm">
            <span className="text-muted-foreground">Paid</span>
            <span className="text-success">{formatGHS(totalPaid)}</span>
          </div>
          <div className="flex justify-between px-1 text-sm">
            <span className="text-muted-foreground">Balance</span>
            <span className={balance > 0 ? "font-semibold text-amber-700" : "font-semibold text-success"}>
              {formatGHS(balance)}
            </span>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-sm font-medium">Order status</p>
          <div className="flex gap-2">
            <Select value={statusValue} onValueChange={(v) => setStatusValue(v as OrderStatus)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_FLOW.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={updateStatus} disabled={savingStatus || statusValue === order.status}>
              {savingStatus && <Loader2 className="h-4 w-4 animate-spin" />} Update
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Marking an order "Ready for Pickup" automatically texts the customer.
          </p>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-sm font-medium">Take payment</p>
          <Tabs defaultValue="cash">
            <TabsList>
              <TabsTrigger value="cash" className="gap-1"><Banknote className="h-3.5 w-3.5" /> Cash</TabsTrigger>
              <TabsTrigger value="momo" className="gap-1"><Smartphone className="h-3.5 w-3.5" /> Mobile Money</TabsTrigger>
            </TabsList>
            <TabsContent value="cash" className="space-y-2">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Amount (GHS)</Label>
                  <Input type="number" step="0.01" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} />
                </div>
                <Button onClick={recordCash} disabled={savingCash}>
                  {savingCash && <Loader2 className="h-4 w-4 animate-spin" />} Record cash
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="momo" className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Amount (GHS)</Label>
                  <Input type="number" step="0.01" value={momoAmount} onChange={(e) => setMomoAmount(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Network</Label>
                  <Select value={momoProvider} onValueChange={setMomoProvider}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                      <SelectItem value="tel">Telecel Cash</SelectItem>
                      <SelectItem value="tgo">AirtelTigo Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Customer MoMo number</Label>
                  <Input value={momoPhone} onChange={(e) => setMomoPhone(e.target.value)} placeholder="024xxxxxxx" />
                </div>
              </div>
              <Button onClick={initiateMomo} disabled={savingMomo} className="w-full">
                {savingMomo && <Loader2 className="h-4 w-4 animate-spin" />} Charge Mobile Money
              </Button>
              <p className="text-xs text-muted-foreground">
                The customer's network will prompt them on their phone to enter their MoMo PIN to approve.
              </p>
            </TabsContent>
          </Tabs>
        </div>

        {payments.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium">Payment history</p>
            <div className="rounded-md border divide-y">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">
                      {p.method === "cash" ? "Cash" : `Mobile Money (${p.momo_provider?.toUpperCase()})`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleString()} {p.paystack_reference && `· ${p.paystack_reference}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={
                      p.status === "success" ? "text-success" : p.status === "failed" ? "text-destructive" : "text-amber-600"
                    }>
                      {p.status} — {formatGHS(p.amount)}
                    </span>
                    {p.status === "pending" && p.paystack_reference && (
                      <Button size="sm" variant="outline" onClick={() => verifyMomo(p.paystack_reference!)} disabled={verifying}>
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-1"><MessageSquareText className="h-4 w-4" /> Send a text to the customer</p>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Your order will be ready by 5pm today" rows={2} />
          <Button size="sm" variant="secondary" onClick={sendMessage} disabled={sendingMsg || !message.trim()}>
            {sendingMsg && <Loader2 className="h-4 w-4 animate-spin" />} Send SMS
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
