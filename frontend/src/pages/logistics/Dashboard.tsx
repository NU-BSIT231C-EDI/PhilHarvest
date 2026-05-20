import { Link } from "wouter";
import { Truck, MapPin, Clock, CheckCircle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/layouts/DashboardLayout";
import StatsCard from "@/components/shared/StatsCard";
import StatusBadge from "@/components/shared/StatusBadge";
import { shipments, drivers, logisticsStats } from "@/data/mockData";

export default function LogisticsDashboard() {
  return (
    <DashboardLayout role="logistics" title="Logistics Dashboard">
      <div className="p-6 space-y-6">
        <div className="bg-gradient-to-r from-orange-50 to-primary/5 rounded-2xl p-6 border border-orange-200">
          <h2 className="text-xl font-bold text-foreground">Logistics Operations Center</h2>
          <p className="text-muted-foreground text-sm mt-1">Monday, May 18, 2024 · Metro Manila Hub</p>
          <div className="flex gap-3 mt-4">
            <Link href="/logistics/deliveries"><Button size="sm" className="gap-2" data-testid="button-manage-deliveries"><Truck className="w-4 h-4" />Manage Deliveries</Button></Link>
            <Link href="/logistics/drivers"><Button size="sm" variant="outline" className="gap-2" data-testid="button-assign-drivers"><MapPin className="w-4 h-4" />Assign Drivers</Button></Link>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard label="Deliveries Today" value={logisticsStats.deliveriesToday} icon={Truck} iconBg="bg-orange-50" iconColor="text-orange-600" />
          <StatsCard label="In Transit" value={logisticsStats.inTransit} icon={MapPin} iconBg="bg-blue-50" iconColor="text-blue-600" />
          <StatsCard label="Delivered This Week" value={logisticsStats.deliveredThisWeek} icon={CheckCircle} iconBg="bg-green-50" iconColor="text-green-600" />
          <StatsCard label="Pending Pickup" value={logisticsStats.pendingPickup} icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Active Shipments */}
          <Card className="border-card-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Active Shipments</CardTitle>
              <Link href="/logistics/tracking"><Button variant="ghost" size="sm" className="gap-1 text-primary text-xs">View All <ArrowRight className="w-3.5 h-3.5" /></Button></Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {shipments.filter((s) => s.status !== "delivered").map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl" data-testid={`row-shipment-${s.id}`}>
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <Truck className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{s.trackingNumber}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.origin} → {s.destination}</p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Driver Status */}
          <Card className="border-card-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Driver Status</CardTitle>
              <Link href="/logistics/drivers"><Button variant="ghost" size="sm" className="gap-1 text-primary text-xs">Manage <ArrowRight className="w-3.5 h-3.5" /></Button></Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {drivers.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl" data-testid={`row-driver-${d.id}`}>
                    <div className="w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center text-xs font-bold text-secondary shrink-0">
                      {d.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.vehicle} · {d.deliveriesToday} deliveries today</p>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
