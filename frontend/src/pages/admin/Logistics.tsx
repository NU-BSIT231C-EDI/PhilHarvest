import { Truck, Users, Map, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/layouts/DashboardLayout";
import StatsCard from "@/components/shared/StatsCard";
import StatusBadge from "@/components/shared/StatusBadge";
import { shipments, drivers, routes, logisticsStats } from "@/data/mockData";

export default function AdminLogistics() {
  return (
    <DashboardLayout role="admin" title="Logistics Monitoring">
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard label="Active Shipments" value={shipments.filter(s => s.status !== "delivered").length} icon={Truck} iconBg="bg-orange-50" iconColor="text-orange-600" />
          <StatsCard label="Total Drivers" value={drivers.length} icon={Users} iconBg="bg-blue-50" iconColor="text-blue-600" />
          <StatsCard label="Active Routes" value={routes.filter(r => r.status === "active").length} icon={Map} iconBg="bg-green-50" iconColor="text-green-600" />
          <StatsCard label="Pending Pickups" value={logisticsStats.pendingPickup} icon={Package} iconBg="bg-amber-50" iconColor="text-amber-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Shipments */}
          <Card className="border-card-border">
            <CardHeader><CardTitle className="text-base">Shipment Overview</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-2 text-xs text-muted-foreground font-medium">Tracking #</th>
                      <th className="text-left pb-2 text-xs text-muted-foreground font-medium">Route</th>
                      <th className="text-left pb-2 text-xs text-muted-foreground font-medium">Driver</th>
                      <th className="text-left pb-2 text-xs text-muted-foreground font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {shipments.map((s) => (
                      <tr key={s.id} data-testid={`row-shipment-${s.id}`}>
                        <td className="py-2.5 font-semibold text-xs">{s.trackingNumber}</td>
                        <td className="py-2.5 text-xs text-muted-foreground">{s.origin.split(",")[0]} → {s.destination.split(",")[0]}</td>
                        <td className="py-2.5 text-xs text-muted-foreground">{s.driverName || "—"}</td>
                        <td className="py-2.5"><StatusBadge status={s.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Drivers */}
          <Card className="border-card-border">
            <CardHeader><CardTitle className="text-base">Driver Status</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {drivers.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl" data-testid={`row-driver-${d.id}`}>
                    <div className="w-9 h-9 rounded-full bg-secondary/10 flex items-center justify-center text-xs font-bold text-secondary shrink-0">
                      {d.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.vehicle} · {d.plateNumber}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={d.status} />
                      <p className="text-xs text-muted-foreground mt-1">{d.deliveriesToday} today</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Routes */}
        <Card className="border-card-border">
          <CardHeader><CardTitle className="text-base">Active Routes</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Route Name", "Origin", "Destination", "Distance", "Est. Time", "Drivers", "Status"].map((h) => (
                      <th key={h} className="text-left pb-2 text-xs text-muted-foreground font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {routes.map((r) => (
                    <tr key={r.id} data-testid={`row-route-${r.id}`}>
                      <td className="py-2.5 font-semibold">{r.name}</td>
                      <td className="py-2.5 text-muted-foreground text-xs">{r.origin}</td>
                      <td className="py-2.5 text-muted-foreground text-xs">{r.destination}</td>
                      <td className="py-2.5 text-muted-foreground">{r.distanceKm} km</td>
                      <td className="py-2.5 text-muted-foreground">~{r.estimatedHours}h</td>
                      <td className="py-2.5 text-muted-foreground">{r.assignedDrivers}</td>
                      <td className="py-2.5"><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
