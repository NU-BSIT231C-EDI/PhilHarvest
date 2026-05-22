import { History, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/layouts/DashboardLayout";
import StatusBadge from "@/components/shared/StatusBadge";
import { shipments } from "@/data/mockData";

export default function DeliveryHistory() {
  return (
    <DashboardLayout role="logistics" title="Delivery History">
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="gap-2" data-testid="button-export"><Download className="w-4 h-4" />Export History</Button>
        </div>

        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["Tracking #", "Seller", "Customer", "Origin", "Destination", "Driver", "Weight", "Status", "Pickup", "Delivery"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shipments.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-history-${s.id}`}>
                    <td className="px-4 py-3 font-semibold">{s.trackingNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{s.sellerName}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{s.customerName}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{s.origin}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{s.destination}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.driverName || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.weight} kg</td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{s.pickupDate || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{s.deliveryDate || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
