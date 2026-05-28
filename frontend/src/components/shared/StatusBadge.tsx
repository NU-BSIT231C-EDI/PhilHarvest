import { Badge } from "@/components/ui/badge";
import type { OrderStatus, ShipmentStatus, DriverStatus } from "@/types";

type StatusType = OrderStatus | ShipmentStatus | DriverStatus | "active" | "inactive" | "pending" | "suspended" | "paid" | "failed" | "validated" | "error";

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  processing: { label: "Processing", className: "bg-blue-100 text-blue-800 border-blue-200" },
  confirmed: { label: "Confirmed", className: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  shipped: { label: "Shipped", className: "bg-purple-100 text-purple-800 border-purple-200" },
  out_for_delivery: { label: "Out for Delivery", className: "bg-orange-100 text-orange-800 border-orange-200" },
  delivered: { label: "Delivered", className: "bg-green-100 text-green-800 border-green-200" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800 border-red-200" },
  picked_up: { label: "Picked Up", className: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  in_transit: { label: "In Transit", className: "bg-purple-100 text-purple-800 border-purple-200" },
  failed: { label: "Failed", className: "bg-red-100 text-red-800 border-red-200" },
  available: { label: "Available", className: "bg-green-100 text-green-800 border-green-200" },
  on_route: { label: "On Route", className: "bg-blue-100 text-blue-800 border-blue-200" },
  off_duty: { label: "Off Duty", className: "bg-gray-100 text-gray-600 border-gray-200" },
  active: { label: "Active", className: "bg-green-100 text-green-800 border-green-200" },
  inactive: { label: "Inactive", className: "bg-gray-100 text-gray-600 border-gray-200" },
  suspended: { label: "Suspended", className: "bg-red-100 text-red-800 border-red-200" },
  paid: { label: "Paid", className: "bg-green-100 text-green-800 border-green-200" },
  validated: { label: "Validated", className: "bg-teal-100 text-teal-800 border-teal-200" },
  error: { label: "Error", className: "bg-red-100 text-red-800 border-red-200" },
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-600 border-gray-200" };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.className} ${className}`}
      data-testid={`status-badge-${status}`}
    >
      {config.label}
    </span>
  );
}
