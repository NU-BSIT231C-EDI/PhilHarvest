import { useState } from "react";
import { Bell, Package, Truck, MessageSquare, Settings, Star, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/layouts/DashboardLayout";
import EmptyState from "@/components/shared/EmptyState";
import { notifications as allNotifications } from "@/data/mockData";
import type { Notification } from "@/types";

const typeIcons: Record<string, React.ElementType> = {
  order: Package,
  delivery: Truck,
  message: MessageSquare,
  system: Settings,
  review: Star,
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

export default function CustomerNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(allNotifications.filter((n) => n.userId === "u1"));

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <DashboardLayout role="customer" title="Notifications">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-muted-foreground">{unread} unread</span>
          </div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="gap-1.5 text-primary" onClick={markAllRead} data-testid="button-mark-all-read">
              <CheckCheck className="w-4 h-4" /> Mark all as read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications" description="You're all caught up!" />
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const Icon = typeIcons[n.type] || Bell;
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 p-4 rounded-xl border transition-colors cursor-pointer hover:bg-muted/50 ${n.read ? "border-border bg-background" : "border-primary/20 bg-primary/5"}`}
                  data-testid={`notification-${n.id}`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${n.read ? "bg-muted" : "bg-primary/10"}`}>
                    <Icon className={`w-4 h-4 ${n.read ? "text-muted-foreground" : "text-primary"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold ${n.read ? "text-foreground" : "text-primary"}`}>{n.title}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                        {!n.read && <Badge className="w-2 h-2 p-0 rounded-full bg-primary shrink-0" />}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
