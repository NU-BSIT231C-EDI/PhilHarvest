import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Truck, MapPin } from "lucide-react";
import { drivers } from "@/data/mockData";
import type { DriverStatus } from "@/types";

const statusColor: Record<DriverStatus, string> = {
  on_route: "bg-green-100 text-green-700",
  available: "bg-blue-100 text-blue-700",
  off_duty: "bg-gray-100 text-gray-600",
};

export default function AdminDriverMonitoring() {
  const onRoute = drivers.filter((d) => d.status === "on_route").length;
  const available = drivers.filter((d) => d.status === "available").length;

  return (
    <DashboardLayout role="admin" title="Driver Monitoring">
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "On Route", value: onRoute, color: "text-green-700" },
            { label: "Available", value: available, color: "text-blue-700" },
            { label: "Total Drivers", value: drivers.length, color: "text-foreground" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map((d) => (
            <Card key={d.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                      {d.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.phone}</p>
                    </div>
                  </div>
                  <Badge className={`text-xs ${statusColor[d.status]}`}>{d.status.replace("_", " ")}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{d.vehicle}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{d.region}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium text-foreground">{d.rating}</span>
                  </div>
                  <div className="text-muted-foreground">{d.deliveriesToday} today / {d.totalDeliveries} total</div>
                </div>
                <p className="text-xs text-muted-foreground">Plate: {d.plateNumber}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
