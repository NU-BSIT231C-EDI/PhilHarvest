import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Truck, Phone, Clock, CheckCircle2, Package } from "lucide-react";
import { shipments } from "@/data/mockData";

const statusColor: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  picked_up: "bg-blue-100 text-blue-700",
  in_transit: "bg-yellow-100 text-yellow-700",
  delivered: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export default function ContractTracking() {
  const myShipments = shipments.filter((s) => s.customerId === "u2" || s.customerId === "u8");

  return (
    <DashboardLayout role="contract" title="Order Tracking">
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Shipment Tracking</h2>
          <p className="text-sm text-muted-foreground mt-1">Track your contract deliveries in real time.</p>
        </div>

        {myShipments.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No active shipments.</CardContent></Card>
        )}

        <div className="space-y-6">
          {myShipments.map((s) => (
            <Card key={s.id} className="overflow-hidden">
              <CardHeader className="bg-muted/30 pb-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{s.trackingNumber}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">{s.sellerName}</p>
                  </div>
                  <Badge className={`text-xs px-3 py-1 ${statusColor[s.status]}`}>
                    {s.status.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {/* Driver + Route */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
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
                <div className="relative bg-slate-100 border border-border rounded-xl h-40 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 opacity-20">
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id={`grid-${s.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
                          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#888" strokeWidth="0.5"/>
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill={`url(#grid-${s.id})`} />
                    </svg>
                  </div>
                  <div className="text-center z-10">
                    <MapPin className="w-8 h-8 text-primary mx-auto mb-1" />
                    <p className="text-sm font-medium text-foreground">Live Map View</p>
                    <p className="text-xs text-muted-foreground">{s.origin} → {s.destination}</p>
                  </div>
                </div>

                {/* Timeline */}
                {s.timeline && s.timeline.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Delivery Timeline</p>
                    <div className="space-y-2">
                      {s.timeline.map((ev, i) => (
                        <div key={i} className="flex gap-3 items-start">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                            i === s.timeline!.length - 1 ? "bg-primary" : "bg-green-100"
                          }`}>
                            <CheckCircle2 className={`w-3.5 h-3.5 ${i === s.timeline!.length - 1 ? "text-white" : "text-green-600"}`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{ev.status}</p>
                            <p className="text-xs text-muted-foreground">{ev.location} · {ev.timestamp}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Proof of Delivery */}
                {s.proofOfDeliveryImage && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Proof of Delivery</p>
                    <img
                      src={s.proofOfDeliveryImage}
                      alt="Proof of delivery"
                      className="h-24 rounded-lg object-cover border border-border"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
