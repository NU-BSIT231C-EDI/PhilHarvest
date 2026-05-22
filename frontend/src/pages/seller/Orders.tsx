import { useState } from "react";
import { Search, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/layouts/DashboardLayout";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { orders } from "@/data/mockData";
import type { OrderStatus } from "@/types";

const allOrders = orders;

export default function SellerOrders() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orderStatuses, setOrderStatuses] = useState<Record<string, OrderStatus>>(() =>
    Object.fromEntries(allOrders.map((o) => [o.id, o.status]))
  );

  const filtered = allOrders.filter((o) => {
    const matchSearch = o.poNumber.toLowerCase().includes(search.toLowerCase()) || o.customerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || orderStatuses[o.id] === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <DashboardLayout role="seller" title="Orders Management">
      <div className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search orders..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Package} title="No orders found" />
        ) : (
          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {["Order #", "Customer", "Date", "Items", "Amount", "Status", "Update Status"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-order-${o.id}`}>
                      <td className="px-4 py-3 font-bold">{o.poNumber}</td>
                      <td className="px-4 py-3 text-muted-foreground">{o.customerName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{o.orderDate}</td>
                      <td className="px-4 py-3"><Badge variant="secondary" className="text-xs">{o.items.length} items</Badge></td>
                      <td className="px-4 py-3 font-bold text-primary">₱{o.totalAmount.toLocaleString()}</td>
                      <td className="px-4 py-3"><StatusBadge status={orderStatuses[o.id]} /></td>
                      <td className="px-4 py-3">
                        <Select value={orderStatuses[o.id]} onValueChange={(v) => setOrderStatuses((prev) => ({ ...prev, [o.id]: v as OrderStatus }))}>
                          <SelectTrigger className="h-8 w-36 text-xs" data-testid={`select-order-status-${o.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["pending", "processing", "confirmed", "shipped", "delivered", "cancelled"].map((s) => (
                              <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace("_", " ")}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
