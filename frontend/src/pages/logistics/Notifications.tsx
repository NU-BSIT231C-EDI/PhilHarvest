import { useState } from "react";
import { Bell, Truck, Package, Settings, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/layouts/DashboardLayout";

const logisticsNotifications = [
  { id: "ln1", type: "delivery", title: "New Pickup Request", message: "Santos Family Farm has requested a pickup for order PO-2024-005. Pickup location: La Trinidad, Benguet.", read: false, time: "30 min ago" },
  { id: "ln2", type: "system", title: "Driver Rolando On Route", message: "Driver Rolando Diaz has started delivery for shipment PH-TRK-001234.", read: false, time: "1h ago" },
  { id: "ln3", type: "delivery", title: "Delivery Completed", message: "Shipment PH-TRK-001234 has been delivered to Ana Reyes successfully.", read: true, time: "2h ago" },
  { id: "ln4", type: "system", title: "New Route Available", message: "A new route from Cebu to Davao has been added to the system.", read: true, time: "Yesterday" },
  { id: "ln5", type: "delivery", title: "Delayed Shipment Alert", message: "Shipment PH-TRK-001237 from Cebu is 2 hours behind schedule.", read: false, time: "3h ago" },
];

const typeIcons: Record<string, React.ElementType> = { delivery: Truck, package: Package, system: Settings };

export default function LogisticsNotifications() {
  const [notifications, setNotifications] = useState(logisticsNotifications);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <DashboardLayout role="logistics" title="Notifications">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{unread} unread notifications</span>
          {unread > 0 && <Button variant="ghost" size="sm" className="gap-1.5 text-primary" onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))} data-testid="button-mark-all-read"><CheckCheck className="w-4 h-4" />Mark all read</Button>}
        </div>
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = typeIcons[n.type] || Bell;
            return (
              <div key={n.id} className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${n.read ? "border-border bg-background" : "border-primary/20 bg-primary/5"}`} data-testid={`notification-${n.id}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${n.read ? "bg-muted" : "bg-primary/10"}`}>
                  <Icon className={`w-4 h-4 ${n.read ? "text-muted-foreground" : "text-primary"}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold ${n.read ? "text-foreground" : "text-primary"}`}>{n.title}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">{n.time}</span>
                      {!n.read && <Badge className="w-2 h-2 p-0 rounded-full bg-primary" />}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
