import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  iconColor?: string;
  iconBg?: string;
}

export default function StatsCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
}: StatsCardProps) {
  const isPositive = trend !== undefined && trend >= 0;

  return (
    <Card className="border-card-border" data-testid={`stats-card-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            {trend !== undefined && (
              <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${isPositive ? "text-green-600" : "text-red-500"}`}>
                {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>{Math.abs(trend)}%</span>
                {trendLabel && <span className="text-muted-foreground font-normal ml-0.5">{trendLabel}</span>}
              </div>
            )}
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
