import { useRoute, useLocation, Link } from "wouter";
import { ArrowLeft, Edit, Plus, FileText, CheckCircle, Clock, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useContractStore } from "@/store";
import type { ContractStatus } from "@/types";

const statusColor: Record<ContractStatus, string> = {
  active:      "bg-green-100 text-green-700 border-green-200",
  approved:    "bg-blue-100 text-blue-700 border-blue-200",
  negotiating: "bg-yellow-100 text-yellow-700 border-yellow-200",
  pending:     "bg-orange-100 text-orange-700 border-orange-200",
  expired:     "bg-gray-100 text-gray-600 border-gray-200",
  draft:       "bg-slate-100 text-slate-600 border-slate-200",
  rejected:    "bg-red-100 text-red-700 border-red-200",
};

const statusFlow: ContractStatus[] = ["draft", "pending", "active", "expired"];

type MockEdiDoc = { type: string; ref: string; status: "sent" | "received" | "pending" | "failed"; date: string; desc: string };

const ediDocStyle: Record<MockEdiDoc["status"], string> = {
  sent:     "bg-green-100 text-green-700 border-green-200",
  received: "bg-blue-100 text-blue-700 border-blue-200",
  pending:  "bg-yellow-100 text-yellow-700 border-yellow-200",
  failed:   "bg-red-100 text-red-700 border-red-200",
};

const ediDocIcon: Record<MockEdiDoc["status"], React.ElementType> = {
  sent:    CheckCircle,
  received: CheckCircle,
  pending: Clock,
  failed:  XCircle,
};

function mockEdiHistory(contractNumber: string): MockEdiDoc[] {
  const base = contractNumber.replace("CTR-", "");
  return [
    { type: "850", ref: `PO-${base}-001`, status: "received", date: "2024-04-01", desc: "Purchase Order received from buyer" },
    { type: "855", ref: `ACK-${base}-001`, status: "sent",    date: "2024-04-02", desc: "PO Acknowledgment sent to buyer" },
    { type: "856", ref: `ASN-${base}-001`, status: "sent",    date: "2024-04-05", desc: "Advance Ship Notice sent" },
    { type: "810", ref: `INV-${base}-001`, status: "sent",    date: "2024-04-10", desc: "Invoice sent to buyer" },
    { type: "204", ref: `LT-${base}-001`,  status: "sent",    date: "2024-04-04", desc: "Load Tender sent to logistics" },
    { type: "990", ref: `LR-${base}-001`,  status: "received",date: "2024-04-04", desc: "Load Tender Response received" },
    { type: "850", ref: `PO-${base}-002`, status: "received", date: "2024-05-01", desc: "Purchase Order received from buyer" },
    { type: "855", ref: `ACK-${base}-002`, status: "sent",    date: "2024-05-02", desc: "PO Acknowledgment sent to buyer" },
    { type: "856", ref: `ASN-${base}-002`, status: "pending", date: "—",          desc: "Advance Ship Notice pending dispatch" },
  ];
}

const scheduleStatusStyle: Record<string, string> = {
  fulfilled: "bg-green-100 text-green-700",
  partial:   "bg-yellow-100 text-yellow-700",
  pending:   "bg-gray-100 text-gray-600",
  missed:    "bg-red-100 text-red-700",
};

export default function ContractDetail() {
  const [, params] = useRoute("/admin/contracts/:id");
  const [, navigate] = useLocation();
  const { contracts } = useContractStore();

  const contract = contracts.find((c) => c.id === params?.id);

  if (!contract) {
    return (
      <DashboardLayout role="admin" title="Contract Detail">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
          <FileText className="w-12 h-12 text-muted-foreground" />
          <p className="font-semibold text-foreground">Contract not found</p>
          <p className="text-sm text-muted-foreground">The contract ID "{params?.id}" does not exist.</p>
          <Button variant="outline" onClick={() => navigate("/admin/contracts")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Contracts
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const isEditable  = contract.status === "draft";
  const isExpired   = contract.status === "expired";
  const currentFlowIdx = statusFlow.indexOf(contract.status as ContractStatus);
  const ediHistory  = mockEdiHistory(contract.contractNumber);

  return (
    <DashboardLayout role="admin" title={`Contract ${contract.contractNumber}`}>
      <div className="p-6 space-y-5">
        {/* Top bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link href="/admin/contracts">
            <Button variant="ghost" size="sm" className="gap-1 -ml-2">
              <ArrowLeft className="w-4 h-4" /> Back to Contracts
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            {isEditable && (
              <Button size="sm" className="gap-2" onClick={() => navigate(`/admin/onboarding?edit=${contract.id}`)} data-testid="button-edit-contract">
                <Edit className="w-3.5 h-3.5" /> Edit
              </Button>
            )}
            {isExpired && (
              <Button size="sm" className="gap-2" onClick={() => navigate("/admin/onboarding")} data-testid="button-new-from-expired">
                <Plus className="w-3.5 h-3.5" /> Create New Contract
              </Button>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Left — main info */}
          <div className="lg:col-span-2 space-y-5">
            {/* Summary */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-xs text-muted-foreground">Contract Number</p>
                    <p className="font-bold text-xl text-foreground font-mono">{contract.contractNumber}</p>
                    <p className="text-sm text-muted-foreground mt-1">{contract.companyName}</p>
                  </div>
                  <Badge className={`text-sm border capitalize px-3 py-1 ${statusColor[contract.status]}`}>
                    {contract.status}
                  </Badge>
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                  {[
                    { label: "Supplier",        value: contract.sellerName },
                    { label: "Buyer",           value: contract.customerName },
                    { label: "Duration",        value: `${contract.duration} month${contract.duration !== 1 ? "s" : ""}` },
                    { label: "Start Date",      value: contract.startDate },
                    { label: "End Date",        value: contract.endDate },
                    { label: "Payment Terms",   value: contract.paymentTerms },
                  ].map((f) => (
                    <div key={f.label}>
                      <p className="text-xs text-muted-foreground">{f.label}</p>
                      <p className="font-medium text-foreground mt-0.5">{f.value}</p>
                    </div>
                  ))}
                </div>

                {contract.additionalNotes && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm text-foreground">{contract.additionalNotes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Products */}
            <Card>
              <CardHeader><CardTitle className="text-base">Committed Products</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["Product", "Qty / Month", "Unit", "Unit Price", "Monthly Value"].map((h) => (
                          <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {contract.products.map((p, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2.5 px-3 font-medium">{p.productName}</td>
                          <td className="py-2.5 px-3">{p.quantity.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-muted-foreground">{p.unit}</td>
                          <td className="py-2.5 px-3">₱{p.unitPrice.toLocaleString()}</td>
                          <td className="py-2.5 px-3 font-semibold">₱{(p.quantity * p.unitPrice).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border">
                        <td colSpan={4} className="py-2.5 px-3 font-bold text-right text-xs uppercase tracking-wide text-muted-foreground">Total Contract Value</td>
                        <td className="py-2.5 px-3 font-bold text-primary">₱{contract.totalContractValue.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Delivery Schedule
                  <span className="text-xs font-normal text-muted-foreground">{contract.deliveryCompletionPercent}% complete</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Progress value={contract.deliveryCompletionPercent} className="h-2 mb-3" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {contract.deliverySchedule.map((d, i) => (
                    <div key={i} className={`rounded-lg px-3 py-2 text-xs ${scheduleStatusStyle[d.status] ?? "bg-muted"}`}>
                      <p className="font-semibold">{d.month}</p>
                      <p>{d.quantity.toLocaleString()} {d.unit}</p>
                      <p className="capitalize mt-0.5 opacity-80">{d.status}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* EDI Transaction History */}
            <Card>
              <CardHeader><CardTitle className="text-base">EDI Transaction History</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {ediHistory.map((tx, i) => {
                    const Icon = ediDocIcon[tx.status];
                    return (
                      <div key={i} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                        <Icon className={`w-4 h-4 shrink-0 ${tx.status === "failed" ? "text-red-500" : tx.status === "pending" ? "text-yellow-500" : "text-green-500"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{tx.desc}</p>
                          <p className="text-xs text-muted-foreground font-mono">{tx.ref}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={`text-xs border font-mono ${ediDocStyle[tx.status]}`}>{tx.type}</Badge>
                          <span className="text-xs text-muted-foreground w-20 text-right">{tx.date}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right — status panel */}
          <div className="space-y-5">
            <Card>
              <CardHeader><CardTitle className="text-base">Status Flow</CardTitle></CardHeader>
              <CardContent className="space-y-0">
                {statusFlow.map((s, i) => {
                  const isCompleted = currentFlowIdx >= i;
                  const isCurrent   = currentFlowIdx === i;
                  return (
                    <div key={s} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                          isCurrent ? "bg-primary text-primary-foreground" :
                          isCompleted ? "bg-secondary/30 text-secondary" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {isCompleted && !isCurrent ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                        </div>
                        {i < statusFlow.length - 1 && (
                          <div className={`w-0.5 h-8 mt-1 ${isCompleted && i < currentFlowIdx ? "bg-secondary/40" : "bg-muted"}`} />
                        )}
                      </div>
                      <div className="pb-6">
                        <p className={`text-sm font-semibold capitalize ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>{s}</p>
                        <p className="text-xs text-muted-foreground">
                          {s === "draft"   && "Saved, not yet submitted"}
                          {s === "pending" && "Awaiting admin review"}
                          {s === "active"  && "Checkout unlocked for buyer"}
                          {s === "expired" && "Contract ended, checkout blocked"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Financials</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contract Value</span>
                  <span className="font-bold">₱{contract.totalContractValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Status</span>
                  <Badge className="capitalize text-xs">{contract.paymentStatus}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Terms</span>
                  <span className="font-medium">{contract.paymentTerms}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between"><span>Created</span><span>{contract.createdAt.split("T")[0]}</span></div>
                {contract.approvedAt && <div className="flex justify-between"><span>Approved</span><span>{contract.approvedAt.split("T")[0]}</span></div>}
                <div className="flex justify-between"><span>Last Updated</span><span>{contract.updatedAt.split("T")[0]}</span></div>
              </CardContent>
            </Card>

            {isExpired && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Contract Expired
                </p>
                <p className="text-xs text-muted-foreground mt-1">This contract cannot be edited. Create a new contract to continue supply.</p>
                <Button size="sm" className="mt-3 w-full gap-2" variant="outline" onClick={() => navigate("/admin/onboarding")} data-testid="button-create-new">
                  <Plus className="w-3.5 h-3.5" /> Create New Contract
                </Button>
              </div>
            )}

            {!isEditable && !isExpired && (
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5" />
                  Editing is only available for contracts in <strong>Draft</strong> status.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
