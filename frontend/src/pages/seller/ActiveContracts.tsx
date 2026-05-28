import { useLocation } from "wouter";
import { Handshake } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContractStore } from "@/store";
import type { Contract, ContractStatus } from "@/types";

const SELLER_ID = "s1";

const statusColor: Record<ContractStatus, string> = {
  active:      "bg-green-100 text-green-700 border-green-200",
  approved:    "bg-blue-100 text-blue-700 border-blue-200",
  negotiating: "bg-yellow-100 text-yellow-700 border-yellow-200",
  pending:     "bg-orange-100 text-orange-700 border-orange-200",
  expired:     "bg-gray-100 text-gray-600 border-gray-200",
  draft:       "bg-slate-100 text-slate-600 border-slate-200",
  rejected:    "bg-red-100 text-red-700 border-red-200",
};

function ContractRow({ c, onNavigate }: { c: Contract; onNavigate: (id: string) => void }) {
  return (
    <div
      className="border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => onNavigate(c.id)}
      data-testid={`row-contract-${c.id}`}
    >
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-mono text-sm font-semibold text-foreground">{c.contractNumber}</p>
          <Badge className={`text-xs border capitalize ${statusColor[c.status]}`}>{c.status}</Badge>
        </div>
        <p className="text-sm text-foreground">{c.companyName}</p>
        <p className="text-xs text-muted-foreground">{c.startDate} → {c.endDate} · {c.duration} months</p>
        <div className="space-y-0.5">
          {c.products.map((p, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              {p.productName}: {p.quantity.toLocaleString()} {p.unit}/month
            </p>
          ))}
        </div>
        {c.status === "active" && (
          <div className="flex items-center gap-2 mt-1">
            <Progress value={c.deliveryCompletionPercent} className="h-1.5 w-28" />
            <span className="text-xs text-muted-foreground">{c.deliveryCompletionPercent}% delivered</span>
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-foreground">₱{c.totalContractValue.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">{c.paymentTerms}</p>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="py-16 text-center">
        <Handshake className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-medium">{label}</p>
      </CardContent>
    </Card>
  );
}

export default function ActiveContracts() {
  const [, navigate] = useLocation();
  const { contracts } = useContractStore();
  const myContracts = contracts.filter((c) => c.sellerId === SELLER_ID);

  const active  = myContracts.filter((c) => ["active", "approved", "negotiating"].includes(c.status));
  const expired = myContracts.filter((c) => ["expired", "rejected"].includes(c.status));

  return (
    <DashboardLayout role="seller" title="Active Contracts">
      <div className="p-6">
        <Tabs defaultValue="active">
          <TabsList className="mb-4">
            <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
            <TabsTrigger value="expired">Expired ({expired.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {active.length === 0 ? (
              <EmptyState label="No active contracts" />
            ) : (
              <div className="space-y-3">
                {active.map((c) => (
                  <ContractRow key={c.id} c={c} onNavigate={(id) => navigate(`/seller/contracts/${id}`)} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="expired">
            {expired.length === 0 ? (
              <EmptyState label="No expired contracts" />
            ) : (
              <div className="space-y-3">
                {expired.map((c) => (
                  <ContractRow key={c.id} c={c} onNavigate={(id) => navigate(`/seller/contracts/${id}`)} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
