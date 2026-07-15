import { Badge } from "../components/ui/badge";
import { OrderStatus, STATUS_LABEL } from "../lib/types";
import { cn } from "../lib/utils";

const STYLES: Record<OrderStatus, string> = {
  received: "bg-slate-100 text-slate-700 border-slate-200",
  in_progress: "bg-amber-100 text-amber-800 border-amber-200",
  ready: "bg-emerald-100 text-emerald-800 border-emerald-200",
  picked_up: "bg-sky-100 text-sky-800 border-sky-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STYLES[status])}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
