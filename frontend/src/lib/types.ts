export type Role = "it_admin" | "admin" | "worker";

export type OrderStatus = "received" | "in_progress" | "ready" | "picked_up" | "cancelled";

export interface UserOut {
  id: string;
  username: string;
  full_name: string;
  phone: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface CustomerOut {
  id: string;
  full_name: string;
  phone: string;
  notes: string | null;
  created_at: string;
}

export interface OrderItemOut {
  id: string;
  service_type: string;
  description: string | null;
  quantity: number;
  unit_price: number;
}

export interface OrderOut {
  id: string;
  order_number: string;
  customer_id: string;
  status: OrderStatus;
  total_amount: number;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  ready_at: string | null;
  picked_up_at: string | null;
  items: OrderItemOut[];
}

export type PaymentMethod = "cash" | "paystack_momo";
export type PaymentStatus = "pending" | "success" | "failed";

export interface PaymentOut {
  id: string;
  order_id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  paystack_reference: string | null;
  momo_provider: string | null;
  momo_phone: string | null;
  display_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationOut {
  id: string;
  order_id: string | null;
  customer_id: string;
  type: string;
  message: string;
  phone: string;
  sent_successfully: boolean;
  created_at: string;
}

export interface DashboardOverview {
  total_orders: number;
  orders_today: number;
  pending_orders: number;
  ready_orders: number;
  revenue_today: number;
  revenue_week: number;
  revenue_total: number;
  total_customers: number;
  active_workers: number;
  recent_orders: {
    id: string;
    order_number: string;
    status: OrderStatus;
    total_amount: number;
    created_at: string;
  }[];
  recent_activity: {
    actor: string;
    action: string;
    details: string;
    created_at: string;
  }[];
}

export function formatGHS(amount: number): string {
  return `GHS ${amount.toFixed(2)}`;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  received: "Received",
  in_progress: "In Progress",
  ready: "Ready for Pickup",
  picked_up: "Picked Up",
  cancelled: "Cancelled",
};
