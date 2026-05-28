import { Link } from "wouter";
import { FileCheck, TrendingUp, Package, AlertTriangle, ArrowRight, Clock, CheckCircle2, RefreshCw } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useContractStore } from "@/store";

const statusColor: Record<string, string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  approved: "bg-blue-100 text-blue-700 border-blue-200",
  negotiating: "bg-yellow-100 text-yellow-700 border-yellow-200",
  pending: "bg-orange-100 text-orange-700 border-orange-200",
  expired: "bg-gray-100 text-gray-700 border-gray-200",
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

function getRemainingMonths(endDate: string) {
  const end = new Date(endDate);
  const now = new Date();
  const diff = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
  return Math.max(0, diff);
}

export default function ContractDashboard() {
  const { contracts } = useContractStore();
  const myContracts = contracts.filter((c) => c.customerId === "u8");

  const activeContracts = myContracts.filter((c) => c.status === "active");
  const pendingContracts = myContracts.filter((c) => ["pending", "negotiating", "approved"].includes(c.status));
  const totalValue = myContracts.filter((c) => c.status === "active").reduce((sum, c) => sum + c.totalContractValue, 0);
  const expiringSoon = myContracts.filter((c) => c.status === "active" && getRemainingMonths(c.endDate) <= 2);

  return (
    <DashboardLayout role="contract" title="Contract Dashboard">
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Active Contracts", value: activeContracts.length, icon: FileCheck, color: "text-green-600", bg: "bg-green-50" },
            { label: "Pending / Negotiating", value: pendingContracts.length, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
            { label: "Total Contract Value", value: `₱${(totalValue / 1000).toFixed(0)}K`, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Expiring Soon", value: expiringSoon.length, icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Active Contracts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Active Contracts</CardTitle>
              <Link href="/contract/contracts">
                <Button variant="ghost" size="sm" className="gap-1 text-primary text-xs">
                  View All <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeContracts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No active contracts</p>
              )}
              {activeContracts.map((c) => (
                <div key={c.id} className="border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm text-foreground">{c.contractNumber}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.sellerName}</p>
                    </div>
                    <Badge className={`text-xs border ${statusColor[c.status]}`}>{c.status}</Badge>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                      <span>Delivery Progress</span>
                      <span>{c.deliveryCompletionPercent}%</span>
                    </div>
                    <Progress value={c.deliveryCompletionPercent} className="h-1.5" />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{getRemainingMonths(c.endDate)} months remaining</span>
                    <span className="font-medium text-foreground">₱{c.totalContractValue.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions + Pending */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {[
                  { label: "New Contract Request", icon: FileCheck, href: "/contract/contracts/new", color: "bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200" },
                  { label: "View Renewals", icon: RefreshCw, href: "/contract/renewals", color: "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200" },
                  { label: "Track Deliveries", icon: Package, href: "/contract/tracking", color: "bg-green-50 hover:bg-green-100 text-green-700 border-green-200" },
                  { label: "Delivery History", icon: CheckCircle2, href: "/contract/history", color: "bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200" },
                ].map((a) => (
                  <Link key={a.label} href={a.href}>
                    <button className={`w-full border rounded-xl p-4 flex flex-col items-center gap-2 text-center transition-colors ${a.color}`} data-testid={`button-quick-${a.label.toLowerCase().replace(/\s+/g, "-")}`}>
                      <a.icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{a.label}</span>
                    </button>
                  </Link>
                ))}
              </CardContent>
            </Card>

            {pendingContracts.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Pending Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingContracts.map((c) => (
                    <div key={c.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{c.contractNumber}</p>
                        <p className="text-xs text-muted-foreground">{c.sellerName}</p>
                      </div>
                      <Badge className={`text-xs border ${statusColor[c.status]}`}>{c.status}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
