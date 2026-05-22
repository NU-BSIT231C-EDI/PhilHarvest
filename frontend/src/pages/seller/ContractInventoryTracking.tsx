import { PackageSearch, AlertTriangle, CheckCircle, TrendingDown } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useContractStore } from "@/store";

interface CommittedItem {
  productName: string;
  sku: string;
  committedQtyPerMonth: number;
  unit: string;
  stockOnHand: number;
  reorderPoint: number;
}

// Stock figures are mock — in production these would come from /api/products
const mockStock: Record<string, { onHand: number; reorderPoint: number }> = {
  "AGRI-TOMATO": { onHand: 1200, reorderPoint: 500 },
  "AGRI-MANGO":  { onHand: 240,  reorderPoint: 300 },
  "AGRI-PECHAY": { onHand: 900,  reorderPoint: 200 },
  "AGRI-CARROT": { onHand: 600,  reorderPoint: 250 },
};

function stockStatus(onHand: number, committed: number, reorder: number): "ok" | "low" | "critical" {
  if (onHand < committed) return "critical";
  if (onHand < reorder) return "low";
  return "ok";
}

const statusStyle = {
  ok:       { badge: "bg-green-100 text-green-700 border-green-200",  label: "OK" },
  low:      { badge: "bg-yellow-100 text-yellow-700 border-yellow-200", label: "Low" },
  critical: { badge: "bg-red-100 text-red-700 border-red-200",        label: "Critical" },
};

export default function ContractInventoryTracking() {
  const { contracts } = useContractStore();
  const active = contracts.filter((c) => c.sellerId === "s1" && c.status === "active");

  const allCommitted: CommittedItem[] = active.flatMap((c) =>
    c.products.map((p) => {
      const sku = `AGRI-${p.productName.split(" ")[0].toUpperCase()}`;
      const stock = mockStock[sku] ?? { onHand: 100, reorderPoint: 50 };
      return {
        productName: p.productName,
        sku,
        committedQtyPerMonth: p.quantity,
        unit: p.unit,
        stockOnHand: stock.onHand,
        reorderPoint: stock.reorderPoint,
      };
    })
  );

  const atRisk    = allCommitted.filter((i) => stockStatus(i.stockOnHand, i.committedQtyPerMonth, i.reorderPoint) !== "ok");
  const totalCommitValue = active.reduce((s, c) => s + c.totalContractValue, 0);

  return (
    <DashboardLayout role="seller" title="Contract Inventory Tracking">
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: "Active Contracts",      value: active.length,                      icon: CheckCircle,  color: "text-green-600",  bg: "bg-green-50" },
            { label: "Products at Risk",       value: atRisk.length,                      icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50" },
            { label: "Total Contract Value",   value: `₱${(totalCommitValue / 1000).toFixed(0)}K`, icon: TrendingDown,  color: "text-blue-600",   bg: "bg-blue-50" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {active.length === 0 ? (
          <Card>
            <CardContent className="p-12 flex flex-col items-center gap-3 text-center">
              <PackageSearch className="w-10 h-10 text-muted-foreground" />
              <p className="font-semibold text-foreground">No active contracts</p>
              <p className="text-sm text-muted-foreground">Inventory commitments will appear here once you have active supply contracts.</p>
            </CardContent>
          </Card>
        ) : (
          active.map((contract) => (
            <Card key={contract.id}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
                  <span>{contract.contractNumber} — {contract.companyName}</span>
                  <span className="text-xs font-normal text-muted-foreground">{contract.startDate} to {contract.endDate}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contract.products.map((p, idx) => {
                  const sku = `AGRI-${p.productName.split(" ")[0].toUpperCase()}`;
                  const stock = mockStock[sku] ?? { onHand: 100, reorderPoint: 50 };
                  const status = stockStatus(stock.onHand, p.quantity, stock.reorderPoint);
                  const fillPct = Math.min(100, Math.round((stock.onHand / Math.max(p.quantity, 1)) * 100));
                  const { badge, label } = statusStyle[status];

                  return (
                    <div key={idx} className="border border-border rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <p className="font-semibold text-sm text-foreground">{p.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            Committed: {p.quantity.toLocaleString()} {p.unit}/month · ₱{p.unitPrice}/{p.unit}
                          </p>
                        </div>
                        <Badge className={`text-xs border ${badge}`}>{label}</Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Stock on hand: {stock.onHand.toLocaleString()} {p.unit}</span>
                          <span>{fillPct}% of monthly commitment</span>
                        </div>
                        <Progress
                          value={fillPct}
                          className={`h-2 ${status === "critical" ? "[&>div]:bg-red-500" : status === "low" ? "[&>div]:bg-yellow-500" : ""}`}
                        />
                        {status === "critical" && (
                          <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Stock below monthly commitment — replenish immediately
                          </p>
                        )}
                        {status === "low" && (
                          <p className="text-xs text-yellow-700 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Stock below reorder point ({stock.reorderPoint.toLocaleString()} {p.unit})
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
