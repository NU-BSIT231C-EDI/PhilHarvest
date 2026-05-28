import { useState } from "react";
import { Package, Truck, CheckCircle2, Clock, XCircle, Search } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { shipments } from "@/data/mockData";
import type { ShipmentStatus } from "@/types";

const statusColor: Record<ShipmentStatus, string> = {
  pending: "bg-gray-100 text-gray-700 border-gray-200",
  picked_up: "bg-blue-100 text-blue-700 border-blue-200",
  in_transit: "bg-yellow-100 text-yellow-700 border-yellow-200",
  delivered: "bg-green-100 text-green-700 border-green-200",
  failed: "bg-red-100 text-red-700 border-red-200",
};

export default function AdminDeliveryManagement() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | "all">("all");

  const filtered = shipments.filter((s) => {
    const matchSearch =
      s.trackingNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.customerName.toLowerCase().includes(search.toLowerCase()) ||
      s.sellerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: shipments.length,
    inTransit: shipments.filter((s) => s.status === "in_transit").length,
    delivered: shipments.filter((s) => s.status === "delivered").length,
    pending: shipments.filter((s) => s.status === "pending").length,
    failed: shipments.filter((s) => s.status === "failed").length,
  };

  return (
    <DashboardLayout role="admin" title="Delivery Management">
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-foreground", bg: "bg-muted" },
            { label: "In Transit", value: stats.inTransit, color: "text-yellow-700", bg: "bg-yellow-50" },
            { label: "Delivered", value: stats.delivered, color: "text-green-700", bg: "bg-green-50" },
            { label: "Pending", value: stats.pending, color: "text-gray-700", bg: "bg-gray-50" },
            { label: "Failed", value: stats.failed, color: "text-red-700", bg: "bg-red-50" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className={`p-4 text-center ${s.bg} rounded-xl`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search shipments..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all", "pending", "picked_up", "in_transit", "delivered", "failed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  statusFilter === f ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary"
                }`}
              >
                {f === "all" ? "All" : f.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Tracking #", "Seller", "Customer", "Route", "Driver", "Weight", "Status", "Delivery Date"].map((h) => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors" data-testid={`row-shipment-${s.id}`}>
                      <td className="py-3 px-4 font-mono text-xs text-foreground">{s.trackingNumber}</td>
                      <td className="py-3 px-4 text-foreground text-xs">{s.sellerName}</td>
                      <td className="py-3 px-4 text-foreground text-xs">{s.customerName}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{s.origin.split(",")[0]} → {s.destination.split(",")[0]}</td>
                      <td className="py-3 px-4 text-xs text-foreground">{s.driverName || "—"}</td>
                      <td className="py-3 px-4 text-xs text-foreground">{s.weight} kg</td>
                      <td className="py-3 px-4">
                        <Badge className={`text-xs border ${statusColor[s.status]}`}>{s.status.replace("_", " ")}</Badge>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{s.deliveryDate || s.estimatedDelivery || "TBD"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="text-center text-muted-foreground py-8 text-sm">No shipments found.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
