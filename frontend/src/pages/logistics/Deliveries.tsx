import { useState } from "react";
import { Search, Truck, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import DashboardLayout from "@/layouts/DashboardLayout";
import StatusBadge from "@/components/shared/StatusBadge";
import { shipments, drivers } from "@/data/mockData";
import type { ShipmentStatus } from "@/types";

export default function DeliveryManagement() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignedDrivers, setAssignedDrivers] = useState<Record<string, string>>(() =>
    Object.fromEntries(shipments.map((s) => [s.id, s.driverId || ""]))
  );

  const availableDrivers = drivers.filter((d) => d.status !== "off_duty");

  const filtered = shipments.filter((s) => {
    const matchSearch = s.trackingNumber.toLowerCase().includes(search.toLowerCase()) || s.customerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <DashboardLayout role="logistics" title="Delivery Management">
      <div className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search shipments..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-status">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="picked_up">Picked Up</SelectItem>
              <SelectItem value="in_transit">In Transit</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {filtered.map((s) => (
            <Card key={s.id} className="border-card-border" data-testid={`card-shipment-${s.id}`}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <Truck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">{s.trackingNumber}</p>
                      <p className="text-xs text-muted-foreground">{s.sellerName} → {s.customerName}</p>
                      <p className="text-xs text-muted-foreground">{s.origin} → {s.destination}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge status={s.status} />
                    <span className="text-xs text-muted-foreground">{s.weight} kg</span>
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <Select value={assignedDrivers[s.id]} onValueChange={(v) => setAssignedDrivers((prev) => ({ ...prev, [s.id]: v }))}>
                        <SelectTrigger className="h-8 w-40 text-xs" data-testid={`select-driver-${s.id}`}>
                          <SelectValue placeholder="Assign driver" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableDrivers.map((d) => <SelectItem key={d.id} value={d.id} className="text-xs">{d.name} ({d.vehicle})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
