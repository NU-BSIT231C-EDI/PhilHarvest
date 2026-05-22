import { useState } from "react";
import { Search, MapPin, Package, Truck, CheckCircle, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import DashboardLayout from "@/layouts/DashboardLayout";
import StatusBadge from "@/components/shared/StatusBadge";
import { shipments } from "@/data/mockData";

const statusSteps = ["pending", "picked_up", "in_transit", "delivered"] as const;
const stepIcons = [Clock, Package, Truck, CheckCircle];

export default function ShipmentTracking() {
  const [search, setSearch] = useState("");
  const [tracked, setTracked] = useState<typeof shipments[0] | null>(null);

  function handleSearch() {
    const found = shipments.find((s) => s.trackingNumber.toLowerCase().includes(search.toLowerCase()) || s.orderId.toLowerCase().includes(search.toLowerCase()));
    setTracked(found || null);
  }

  return (
    <DashboardLayout role="logistics" title="Shipment Tracking">
      <div className="p-6 space-y-5">
        {/* Search */}
        <Card className="border-card-border">
          <CardContent className="p-5">
            <p className="font-semibold text-foreground mb-3">Track a Shipment</p>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Enter tracking number or order ID..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} data-testid="input-tracking-search" />
              </div>
              <Button onClick={handleSearch} data-testid="button-track">Track</Button>
            </div>
            {search && !tracked && <p className="text-sm text-muted-foreground mt-3">No shipment found. Try: PH-TRK-001234</p>}
          </CardContent>
        </Card>

        {/* Tracked Shipment */}
        {tracked && (
          <Card className="border-card-border" data-testid="card-tracked-shipment">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-foreground">{tracked.trackingNumber}</p>
                  <p className="text-sm text-muted-foreground">Order: {tracked.orderId}</p>
                </div>
                <StatusBadge status={tracked.status} />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-muted-foreground">From</p><p className="font-medium">{tracked.origin}</p></div>
                <div><p className="text-xs text-muted-foreground">To</p><p className="font-medium">{tracked.destination}</p></div>
                <div><p className="text-xs text-muted-foreground">Seller</p><p className="font-medium">{tracked.sellerName}</p></div>
                <div><p className="text-xs text-muted-foreground">Customer</p><p className="font-medium">{tracked.customerName}</p></div>
                {tracked.driverName && <div><p className="text-xs text-muted-foreground">Driver</p><p className="font-medium">{tracked.driverName}</p></div>}
                <div><p className="text-xs text-muted-foreground">Weight</p><p className="font-medium">{tracked.weight} kg</p></div>
              </div>
              {/* Timeline */}
              <div className="pt-2">
                <div className="flex items-center justify-between relative">
                  <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted" />
                  <div className="absolute top-4 left-0 h-0.5 bg-primary" style={{ width: `${(statusSteps.indexOf(tracked.status as any) / (statusSteps.length - 1)) * 100}%` }} />
                  {statusSteps.map((step, i) => {
                    const Icon = stepIcons[i];
                    const isActive = statusSteps.indexOf(tracked.status as any) >= i;
                    return (
                      <div key={step} className="flex flex-col items-center gap-1 relative z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs text-muted-foreground capitalize hidden sm:block">{step.replace("_", " ")}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Shipments */}
        <div>
          <h3 className="font-semibold text-foreground mb-3">All Shipments</h3>
          <div className="space-y-2">
            {shipments.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3 bg-card border border-card-border rounded-xl hover:shadow-sm transition-shadow cursor-pointer" onClick={() => { setSearch(s.trackingNumber); setTracked(s); }} data-testid={`row-shipment-${s.id}`}>
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{s.trackingNumber}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.origin} → {s.destination}</p>
                </div>
                <StatusBadge status={s.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
