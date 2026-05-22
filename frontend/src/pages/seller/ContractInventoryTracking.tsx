import { useLocation } from "wouter";
import { PackageSearch } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useContractStore } from "@/store";
import type { Contract } from "@/types";

const SELLER_ID = "s1";

type DeliveryStatus = "on_track" | "low" | "delayed";

function productStatus(required: number, remaining: number, hasMissed: boolean): DeliveryStatus {
  if (hasMissed) return "delayed";
  if (required > 0 && remaining / required <= 0.25) return "low";
  return "on_track";
}

function contractStatus(contract: Contract): DeliveryStatus {
  const hasMissed = contract.deliverySchedule.some((d) => d.status === "missed");
  const statuses = contract.products.map((p) => {
    const required  = p.quantity * contract.duration;
    const delivered = Math.round(required * contract.deliveryCompletionPercent / 100);
    const remaining = required - delivered;
    return productStatus(required, remaining, hasMissed);
  });
  if (statuses.includes("delayed"))  return "delayed";
  if (statuses.includes("low"))      return "low";
  return "on_track";
}

const statusStyle: Record<DeliveryStatus, { badge: string; label: string }> = {
  on_track: { badge: "bg-green-100 text-green-700 border-green-200",   label: "On Track" },
  low:      { badge: "bg-yellow-100 text-yellow-700 border-yellow-200", label: "Low" },
  delayed:  { badge: "bg-red-100 text-red-700 border-red-200",         label: "Delayed" },
};

export default function ContractInventoryTracking() {
  const [, navigate] = useLocation();
  const { contracts } = useContractStore();
  const active = contracts.filter((c) => c.sellerId === SELLER_ID && ["active", "approved"].includes(c.status));

  const rows = active.flatMap((c) => {
    const hasMissed = c.deliverySchedule.some((d) => d.status === "missed");
    return c.products.map((p) => {
      const required  = p.quantity * c.duration;
      const delivered = Math.round(required * c.deliveryCompletionPercent / 100);
      const remaining = required - delivered;
      const pct       = required > 0 ? Math.round((delivered / required) * 100) : 0;
      return {
        contractId:     c.id,
        contractNumber: c.contractNumber,
        buyer:          c.companyName,
        product:        p.productName,
        unit:           p.unit,
        required,
        delivered,
        remaining,
        pct,
        status: productStatus(required, remaining, hasMissed),
      };
    });
  });

  return (
    <DashboardLayout role="seller" title="Contract Inventory">
      <div className="p-6 space-y-6">

        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Active Contracts",  value: active.length },
            { label: "On Track",          value: rows.filter((r) => r.status === "on_track").length },
            { label: "Needs Attention",   value: rows.filter((r) => r.status !== "on_track").length },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {active.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <PackageSearch className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No active contracts</p>
              <p className="text-xs text-muted-foreground mt-1">Inventory commitments will appear here once you have active supply contracts.</p>
            </CardContent>
          </Card>
        ) : (
          /* Group rows by contract */
          active.map((c) => {
            const cRows  = rows.filter((r) => r.contractId === c.id);
            const cStatus = contractStatus(c);
            return (
              <Card key={c.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-base">
                      <button
                        className="font-mono text-sm hover:underline text-foreground"
                        onClick={() => navigate(`/seller/contracts/${c.id}`)}
                      >
                        {c.contractNumber}
                      </button>
                      <span className="ml-2 font-normal text-muted-foreground text-sm">— {c.companyName}</span>
                    </CardTitle>
                    <Badge className={`text-xs border ${statusStyle[cStatus].badge}`}>
                      {statusStyle[cStatus].label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {["Product", "Required", "Delivered", "Remaining", "Progress", "Status"].map((h) => (
                            <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {cRows.map((r, i) => (
                          <tr key={i} className="border-b border-border/50">
                            <td className="py-3 px-3 font-medium">{r.product}</td>
                            <td className="py-3 px-3 text-muted-foreground">{r.required.toLocaleString()} {r.unit}</td>
                            <td className="py-3 px-3 text-muted-foreground">{r.delivered.toLocaleString()} {r.unit}</td>
                            <td className="py-3 px-3 font-medium">{r.remaining.toLocaleString()} {r.unit}</td>
                            <td className="py-3 px-3 w-36">
                              <Progress value={r.pct} className="h-1.5 mb-0.5" />
                              <span className="text-xs text-muted-foreground">{r.pct}%</span>
                            </td>
                            <td className="py-3 px-3">
                              <Badge className={`text-xs border ${statusStyle[r.status].badge}`}>
                                {statusStyle[r.status].label}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
}
