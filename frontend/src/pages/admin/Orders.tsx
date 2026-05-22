import { useState } from "react";
import { Search, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/layouts/DashboardLayout";
import StatusBadge from "@/components/shared/StatusBadge";
import { orders } from "@/data/mockData";

export default function AdminOrders() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = orders.filter((o) => {
    const matchSearch = o.poNumber.toLowerCase().includes(search.toLowerCase()) || o.customerName.toLowerCase().includes(search.toLowerCase()) || o.sellerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalRevenue = filtered.reduce((s, o) => s + o.totalAmount, 0);

  return (
    <DashboardLayout role="admin" title="Order Monitoring">
      <div className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by order #, customer, or seller..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-status"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {["pending", "processing", "confirmed", "shipped", "out_for_delivery", "delivered", "cancelled"].map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-2 shrink-0" data-testid="button-export"><Download className="w-4 h-4" />Export</Button>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">{filtered.length} orders found</span>
          <span className="text-muted-foreground">·</span>
          <span className="font-bold text-primary">Total: ₱{totalRevenue.toLocaleString()}</span>
        </div>

        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["Order #", "Customer", "Seller", "Date", "Items", "Payment", "Status", "Amount"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-order-${o.id}`}>
                    <td className="px-4 py-3 font-bold">{o.poNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">{o.customerName}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{o.sellerName}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{o.orderDate}</td>
                    <td className="px-4 py-3"><Badge variant="secondary" className="text-xs">{o.items.length}</Badge></td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex flex-col gap-0.5">
                        <span>{o.paymentMethod}</span>
                        <StatusBadge status={o.paymentStatus} className="text-xs" />
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 font-bold text-primary">₱{o.totalAmount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
