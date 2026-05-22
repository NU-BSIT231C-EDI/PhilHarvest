import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Truck, Phone, Clock, CheckCircle2 } from "lucide-react";
import { shipments } from "@/data/mockData";

export default function AdminShipmentTracking() {
  const active = shipments.filter((s) => !["delivered", "failed"].includes(s.status));

  return (
    <DashboardLayout role="admin" title="Shipment Tracking">
      <div className="p-6 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">Live Shipment Tracking</h2>
          <p className="text-sm text-muted-foreground">{active.length} active shipments being monitored.</p>
        </div>

        {active.map((s) => (
          <Card key={s.id}>
            <CardHeader className="pb-3 bg-muted/30">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-mono">{s.trackingNumber}</CardTitle>
                  <p className="text-sm text-muted-foreground">{s.sellerName} → {s.customerName}</p>
                </div>
                <Badge className={`text-xs px-3 ${
                  s.status === "in_transit" ? "bg-yellow-100 text-yellow-700" :
                  s.status === "picked_up" ? "bg-blue-100 text-blue-700" :
                  "bg-gray-100 text-gray-700"
                }`}>
                  {s.status.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid sm:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Driver</p>
                    <p className="font-medium text-foreground">{s.driverName || "Not assigned"}</p>
                  </div>
                </div>
                {s.driverPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Contact</p>
                      <p className="font-medium text-foreground">{s.driverPhone}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Route</p>
                    <p className="font-medium text-foreground text-xs">{s.origin} → {s.destination}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Est. Delivery</p>
                    <p className="font-medium text-foreground">{s.estimatedDelivery || "TBD"}</p>
                  </div>
                </div>
              </div>

              {/* Map placeholder */}
              <div className="relative bg-slate-100 border border-border rounded-xl h-32 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id={`grid-admin-${s.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#888" strokeWidth="0.5"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill={`url(#grid-admin-${s.id})`} />
                  </svg>
                </div>
                <div className="text-center z-10">
                  <MapPin className="w-7 h-7 text-primary mx-auto mb-1" />
                  <p className="text-xs font-medium text-foreground">{s.origin} → {s.destination}</p>
                  <p className="text-xs text-muted-foreground">OpenStreetMap placeholder</p>
                </div>
              </div>

              {s.timeline && s.timeline.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Timeline</p>
                  <div className="space-y-1.5">
                    {s.timeline.map((ev, i) => (
                      <div key={i} className="flex gap-2 items-start text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-foreground font-medium">{ev.status}</span>
                        <span className="text-muted-foreground">— {ev.location} · {ev.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
