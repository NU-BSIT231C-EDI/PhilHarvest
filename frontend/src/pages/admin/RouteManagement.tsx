import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Users } from "lucide-react";
import { routes } from "@/data/mockData";

export default function AdminRouteManagement() {
  return (
    <DashboardLayout role="admin" title="Route Management">
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Delivery Routes</h2>
            <p className="text-sm text-muted-foreground">{routes.filter((r) => r.status === "active").length} active routes</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {routes.map((r) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <p className="font-semibold text-sm text-foreground leading-tight">{r.name}</p>
                  <Badge className={r.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                    {r.status}
                  </Badge>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{r.origin}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
                    <span>{r.destination}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="text-center">
                    <p className="text-sm font-bold text-foreground">{r.distanceKm} km</p>
                    <p className="text-xs text-muted-foreground">Distance</p>
                  </div>
                  <div className="text-center border-x border-border">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <p className="text-sm font-bold text-foreground">{r.estimatedHours}h</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Est. Time</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <p className="text-sm font-bold text-foreground">{r.assignedDrivers}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Drivers</p>
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
