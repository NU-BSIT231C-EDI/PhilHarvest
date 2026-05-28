import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, CheckCircle, Package } from "lucide-react";
import { shipments } from "@/data/mockData";

export default function AdminProofOfDelivery() {
  const delivered = shipments.filter((s) => s.status === "delivered");

  return (
    <DashboardLayout role="admin" title="Proof of Delivery">
      <div className="p-6 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">Proof of Delivery Records</h2>
          <p className="text-sm text-muted-foreground">{delivered.length} completed deliveries with POD.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {delivered.map((s) => (
            <Card key={s.id} className="overflow-hidden">
              {s.proofOfDeliveryImage ? (
                <div className="h-44 overflow-hidden">
                  <img src={s.proofOfDeliveryImage} alt="Proof" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-44 bg-muted/50 flex items-center justify-center">
                  <Camera className="w-10 h-10 text-muted-foreground/40" />
                </div>
              )}
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-xs font-semibold text-foreground">{s.trackingNumber}</p>
                  <Badge className="bg-green-100 text-green-700 text-xs gap-1">
                    <CheckCircle className="w-3 h-3" /> Delivered
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{s.sellerName} → {s.customerName}</p>
                <p className="text-xs text-muted-foreground">Driver: {s.driverName || "N/A"}</p>
                <p className="text-xs text-muted-foreground">Delivered: {s.deliveryDate || "—"}</p>
              </CardContent>
            </Card>
          ))}

          {delivered.length === 0 && (
            <div className="col-span-3 text-center py-12 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No proof of delivery records yet.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
