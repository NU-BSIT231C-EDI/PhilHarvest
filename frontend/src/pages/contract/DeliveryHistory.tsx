import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Package } from "lucide-react";
import { shipments } from "@/data/mockData";

export default function ContractDeliveryHistory() {
  const history = shipments.filter((s) => ["delivered", "failed"].includes(s.status));

  return (
    <DashboardLayout role="contract" title="Delivery History">
      <div className="p-6 space-y-5 max-w-3xl">
        <div>
          <h2 className="text-xl font-bold text-foreground">Delivery History</h2>
          <p className="text-sm text-muted-foreground mt-1">Past deliveries for your supply contracts.</p>
        </div>

        {history.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No delivery history yet.</CardContent></Card>
        )}

        <div className="space-y-3">
          {history.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.status === "delivered" ? "bg-green-100" : "bg-red-100"}`}>
                      {s.status === "delivered" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <Package className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{s.trackingNumber}</p>
                      <p className="text-xs text-muted-foreground">{s.sellerName} → {s.destination}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Delivery Date</p>
                      <p className="text-sm font-medium text-foreground">{s.deliveryDate || "N/A"}</p>
                    </div>
                    <Badge className={s.status === "delivered" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                      {s.status}
                    </Badge>
                  </div>
                </div>
                {s.proofOfDeliveryImage && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-1">Proof of Delivery</p>
                    <img src={s.proofOfDeliveryImage} alt="POD" className="h-16 rounded-lg object-cover border border-border" />
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
