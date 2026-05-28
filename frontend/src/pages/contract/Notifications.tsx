import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, FileCheck, Truck, AlertTriangle, Info } from "lucide-react";
import { notifications } from "@/data/mockData";

const typeIcon: Record<string, React.ElementType> = {
  contract: FileCheck,
  edi: Bell,
  delivery: Truck,
  order: Truck,
  system: Info,
};
const typeColor: Record<string, string> = {
  contract: "bg-purple-100 text-purple-600",
  edi: "bg-blue-100 text-blue-600",
  delivery: "bg-green-100 text-green-600",
  order: "bg-green-100 text-green-600",
  system: "bg-gray-100 text-gray-600",
};

export default function ContractNotifications() {
  const myNotifs = notifications.filter((n) => n.userId === "u8");

  return (
    <DashboardLayout role="contract" title="Notifications">
      <div className="p-6 space-y-4 max-w-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Notifications</h2>
          <Badge className="bg-primary/10 text-primary">{myNotifs.filter((n) => !n.read).length} unread</Badge>
        </div>

        {myNotifs.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No notifications.</CardContent></Card>
        )}

        <div className="space-y-2">
          {myNotifs.map((n) => {
            const Icon = typeIcon[n.type] || Bell;
            const color = typeColor[n.type] || "bg-gray-100 text-gray-600";
            return (
              <div
                key={n.id}
                className={`border rounded-xl p-4 flex gap-3 transition-colors ${n.read ? "border-border bg-card" : "border-primary/30 bg-primary/5"}`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-semibold ${n.read ? "text-foreground" : "text-foreground"}`}>{n.title}</p>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{n.createdAt.split("T")[0]}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
