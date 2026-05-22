import { useState } from "react";
import { Link } from "wouter";
import { Package, Search, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import DashboardLayout from "@/layouts/DashboardLayout";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { orders } from "@/data/mockData";

export default function CustomerOrders() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const myOrders = orders.filter((o) => o.customerId === "u1");
  const filtered = myOrders.filter((o) => {
    const matchSearch = o.poNumber.toLowerCase().includes(search.toLowerCase()) || o.sellerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <DashboardLayout role="customer" title="My Orders">
      <div className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search orders..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search-orders" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-order-status">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Package} title="No orders found" description="Try adjusting your search or filter." />
        ) : (
          <div className="space-y-3">
            {filtered.map((order) => (
              <Card key={order.id} className="border-card-border hover:shadow-sm transition-shadow" data-testid={`card-order-${order.id}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-foreground text-sm" data-testid={`text-po-${order.id}`}>{order.poNumber}</p>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{order.sellerName} · Ordered {order.orderDate}</p>
                      <p className="text-xs text-muted-foreground">{order.items.length} item(s) · {order.paymentMethod}</p>
                    </div>
                    <div className="flex items-center gap-3 sm:ml-auto">
                      <p className="text-base font-bold text-primary" data-testid={`text-amount-${order.id}`}>₱{order.totalAmount.toLocaleString()}</p>
                      <Link href={`/customer/orders/${order.id}`}>
                        <Button size="sm" variant="outline" className="gap-1.5" data-testid={`button-view-order-${order.id}`}>
                          <Eye className="w-3.5 h-3.5" /> View
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
