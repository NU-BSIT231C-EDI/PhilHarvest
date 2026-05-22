import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";
import { shipments } from "@/data/mockData";

export default function AdminDeliveryHistory() {
  const history = [...shipments].sort((a, b) => (b.pickupDate || "").localeCompare(a.pickupDate || ""));

  return (
    <DashboardLayout role="admin" title="Delivery History">
      <div className="p-6 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">Delivery History</h2>
          <p className="text-sm text-muted-foreground">All delivery records across the platform.</p>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Tracking #", "Seller", "Customer", "Driver", "Origin", "Destination", "Pickup", "Delivery", "Status"].map((h) => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((s) => (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-foreground whitespace-nowrap">{s.trackingNumber}</td>
                      <td className="py-3 px-4 text-xs text-foreground whitespace-nowrap">{s.sellerName}</td>
                      <td className="py-3 px-4 text-xs text-foreground whitespace-nowrap">{s.customerName}</td>
                      <td className="py-3 px-4 text-xs text-foreground">{s.driverName || "—"}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">{s.origin.split(",")[0]}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">{s.destination.split(",")[0]}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">{s.pickupDate || "—"}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">{s.deliveryDate || s.estimatedDelivery || "—"}</td>
                      <td className="py-3 px-4">
                        <Badge className={`text-xs ${
                          s.status === "delivered" ? "bg-green-100 text-green-700" :
                          s.status === "failed" ? "bg-red-100 text-red-700" :
                          s.status === "in_transit" ? "bg-yellow-100 text-yellow-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {s.status.replace("_", " ")}
                        </Badge>
                      </td>
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
