import { useState } from "react";
import { Handshake, CheckCircle, XCircle, MessageSquare, Clock, TrendingUp } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useContractStore } from "@/store";
import type { Contract, ContractStatus } from "@/types";

const statusColor: Record<ContractStatus, string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  approved: "bg-blue-100 text-blue-700 border-blue-200",
  negotiating: "bg-yellow-100 text-yellow-700 border-yellow-200",
  pending: "bg-orange-100 text-orange-700 border-orange-200",
  expired: "bg-gray-100 text-gray-600 border-gray-200",
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

export default function SellerContractManagement() {
  const { contracts, updateContractStatus } = useContractStore();
  const myContracts = contracts.filter((c) => c.sellerId === "s1");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [action, setAction] = useState<"accept" | "reject" | "negotiate">("accept");
  const [notes, setNotes] = useState("");

  function openAction(contract: Contract, act: "accept" | "reject" | "negotiate") {
    setSelectedContract(contract);
    setAction(act);
    setNotes("");
    setDialogOpen(true);
  }

  function handleConfirm() {
    if (!selectedContract) return;
    const statusMap: Record<string, ContractStatus> = {
      accept: "approved",
      reject: "rejected",
      negotiate: "negotiating",
    };
    updateContractStatus(selectedContract.id, statusMap[action], notes);
    setDialogOpen(false);
  }

  const pending = myContracts.filter((c) => c.status === "pending");
  const active = myContracts.filter((c) => c.status === "active");
  const negotiating = myContracts.filter((c) => c.status === "negotiating");
  const totalValue = active.reduce((s, c) => s + c.totalContractValue, 0);

  return (
    <DashboardLayout role="seller" title="Contract Management">
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Pending Review", value: pending.length, icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
            { label: "Active Contracts", value: active.length, icon: Handshake, color: "text-green-600", bg: "bg-green-50" },
            { label: "Negotiating", value: negotiating.length, icon: MessageSquare, color: "text-yellow-600", bg: "bg-yellow-50" },
            { label: "Total Value", value: `₱${(totalValue / 1000).toFixed(0)}K`, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center`}>
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

        {/* Pending Contracts */}
        {pending.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                Pending Review ({pending.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pending.map((c) => (
                <div key={c.id} className="border border-orange-200 bg-orange-50/40 rounded-xl p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                    <div>
                      <p className="font-bold text-foreground">{c.contractNumber}</p>
                      <p className="text-sm text-muted-foreground">From: {c.companyName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Submitted: {c.createdAt.split("T")[0]}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-foreground">₱{c.totalContractValue.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{c.duration} months · {c.paymentTerms}</p>
                    </div>
                  </div>
                  <div className="mb-4 space-y-1">
                    {c.products.map((p, i) => (
                      <p key={i} className="text-sm text-foreground/80">
                        • {p.productName} — {p.quantity.toLocaleString()} {p.unit}/month @ ₱{p.unitPrice}/{p.unit}
                      </p>
                    ))}
                  </div>
                  {c.additionalNotes && (
                    <div className="bg-white border border-border rounded-lg p-3 mb-4">
                      <p className="text-xs text-muted-foreground">Buyer notes:</p>
                      <p className="text-sm text-foreground">{c.additionalNotes}</p>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700" onClick={() => openAction(c, "accept")} data-testid={`button-accept-${c.id}`}>
                      <CheckCircle className="w-3.5 h-3.5" /> Accept
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 border-yellow-300 text-yellow-700 hover:bg-yellow-50" onClick={() => openAction(c, "negotiate")} data-testid={`button-negotiate-${c.id}`}>
                      <MessageSquare className="w-3.5 h-3.5" /> Negotiate
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50" onClick={() => openAction(c, "reject")} data-testid={`button-reject-${c.id}`}>
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* All Contracts Table */}
        <Card>
          <CardHeader><CardTitle className="text-base">All Contracts</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {myContracts.map((c) => (
              <div key={c.id} className="border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-foreground">{c.contractNumber}</p>
                    <Badge className={`text-xs border ${statusColor[c.status]}`}>{c.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.companyName} · {c.startDate} to {c.endDate}</p>
                  {c.status === "active" && (
                    <div className="flex items-center gap-2 mt-2">
                      <Progress value={c.deliveryCompletionPercent} className="h-1.5 w-24" />
                      <span className="text-xs text-muted-foreground">{c.deliveryCompletionPercent}%</span>
                    </div>
                  )}
                  {c.negotiationNotes && (
                    <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-1 rounded">{c.negotiationNotes}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-foreground">₱{c.totalContractValue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{c.paymentTerms}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "accept" ? "Accept Contract" : action === "reject" ? "Reject Contract" : "Start Negotiation"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {action === "accept" && "This will approve the contract and mark it as active."}
              {action === "reject" && "This will reject the contract request."}
              {action === "negotiate" && "This will move the contract to negotiation status."}
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes or counteroffer details..."
                rows={3}
                data-testid="textarea-action-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleConfirm}
              className={action === "reject" ? "bg-destructive hover:bg-destructive/90" : ""}
              data-testid="button-confirm-action"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
