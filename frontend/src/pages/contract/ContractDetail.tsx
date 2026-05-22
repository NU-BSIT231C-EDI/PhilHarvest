import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Download, CheckCircle, Clock, XCircle, RefreshCw, Upload, FileText, AlertTriangle } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useContractStore } from "@/store";
import type { ContractStatus } from "@/types";

const statusColor: Record<ContractStatus, string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  approved: "bg-blue-100 text-blue-700 border-blue-200",
  negotiating: "bg-yellow-100 text-yellow-700 border-yellow-200",
  pending: "bg-orange-100 text-orange-700 border-orange-200",
  expired: "bg-gray-100 text-gray-700 border-gray-200",
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

const deliveryStatusColor: Record<string, string> = {
  fulfilled: "bg-green-100 text-green-700",
  partial: "bg-yellow-100 text-yellow-700",
  pending: "bg-gray-100 text-gray-600",
  missed: "bg-red-100 text-red-700",
};

const workflowSteps: ContractStatus[] = ["draft", "pending", "negotiating", "approved", "active", "expired"];

export default function ContractDetail() {
  const [, params] = useRoute("/contract/contracts/:id");
  const [, navigate] = useLocation();
  const { contracts, updateContract } = useContractStore();

  const contract = contracts.find((c) => c.id === params?.id);

  const [signatureFile, setSignatureFile] = useState<string | null>(null);

  if (!contract) {
    return (
      <DashboardLayout role="contract" title="Contract Detail">
        <div className="p-6 text-center text-muted-foreground">Contract not found.</div>
      </DashboardLayout>
    );
  }

  const currentStepIndex = workflowSteps.indexOf(contract.status);

  function handleUploadSignature(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setSignatureFile(dataUrl);
        updateContract(contract!.id, { eSignatureImage: dataUrl });
      };
      reader.readAsDataURL(file);
    }
  }

  return (
    <DashboardLayout role="contract" title={`Contract ${contract.contractNumber}`}>
      <div className="p-6 space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/contract/contracts")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Contracts
          </button>
          <Button variant="outline" size="sm" className="gap-2" data-testid="button-download-pdf">
            <Download className="w-4 h-4" /> Download PDF
          </Button>
        </div>

        {/* Header Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-bold text-foreground">{contract.contractNumber}</h2>
                  <Badge className={`text-xs border ${statusColor[contract.status]}`}>{contract.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Supplier: {contract.sellerName}</p>
                <p className="text-sm text-muted-foreground">Created: {contract.createdAt.split("T")[0]}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total Contract Value</p>
                <p className="text-2xl font-bold text-foreground">₱{contract.totalContractValue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{contract.duration} months</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Progress */}
        <Card>
          <CardHeader><CardTitle className="text-base">Contract Workflow Status</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-0 overflow-x-auto pb-2">
              {workflowSteps.map((step, i) => {
                const isDone = i < currentStepIndex;
                const isCurrent = i === currentStepIndex;
                const isExpired = step === "expired";
                return (
                  <div key={step} className="flex items-center">
                    <div className="flex flex-col items-center gap-1 min-w-[80px]">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                        isDone ? "bg-green-500 border-green-500 text-white" :
                        isCurrent && !isExpired ? "bg-primary border-primary text-primary-foreground" :
                        "bg-card border-border text-muted-foreground"
                      }`}>
                        {isDone ? <CheckCircle className="w-4 h-4" /> : i + 1}
                      </div>
                      <span className={`text-xs text-center capitalize ${isCurrent ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                        {step}
                      </span>
                    </div>
                    {i < workflowSteps.length - 1 && (
                      <div className={`h-0.5 w-8 mx-1 mb-4 ${i < currentStepIndex ? "bg-green-500" : "bg-border"}`} />
                    )}
                  </div>
                );
              })}
            </div>
            {contract.negotiationNotes && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-yellow-800 mb-1">Negotiation Notes</p>
                <p className="text-sm text-yellow-700">{contract.negotiationNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Products */}
        <Card>
          <CardHeader><CardTitle className="text-base">Products Contracted</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-xs text-muted-foreground font-medium">Product</th>
                    <th className="text-right py-2 text-xs text-muted-foreground font-medium">Qty / Month</th>
                    <th className="text-right py-2 text-xs text-muted-foreground font-medium">Unit Price</th>
                    <th className="text-right py-2 text-xs text-muted-foreground font-medium">Monthly Value</th>
                  </tr>
                </thead>
                <tbody>
                  {contract.products.map((p, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2.5 font-medium text-foreground">{p.productName}</td>
                      <td className="py-2.5 text-right text-muted-foreground">{p.quantity.toLocaleString()} {p.unit}</td>
                      <td className="py-2.5 text-right text-muted-foreground">₱{p.unitPrice}</td>
                      <td className="py-2.5 text-right font-medium text-foreground">₱{(p.quantity * p.unitPrice).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Schedule */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Delivery Schedule</CardTitle>
            <span className="text-sm text-muted-foreground">{contract.deliveryCompletionPercent}% complete</span>
          </CardHeader>
          <CardContent>
            <Progress value={contract.deliveryCompletionPercent} className="h-2 mb-4" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {contract.deliverySchedule.map((ds, i) => (
                <div key={i} className="flex items-center justify-between border border-border rounded-lg p-2.5">
                  <div>
                    <p className="text-xs font-medium text-foreground">{ds.month}</p>
                    <p className="text-xs text-muted-foreground">{ds.quantity.toLocaleString()} {ds.unit}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${deliveryStatusColor[ds.status]}`}>
                    {ds.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* E-Signature */}
        <Card>
          <CardHeader><CardTitle className="text-base">Digital Contract Signing</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Payment Terms</p>
                <p className="text-sm text-muted-foreground">{contract.paymentTerms}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Contract Period</p>
                <p className="text-sm text-muted-foreground">{contract.startDate} to {contract.endDate}</p>
              </div>
            </div>

            {contract.additionalNotes && (
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Additional Notes</p>
                <p className="text-sm text-muted-foreground">{contract.additionalNotes}</p>
              </div>
            )}

            <div className="border-t border-border pt-4">
              <p className="text-sm font-semibold text-foreground mb-2">E-Signature</p>
              {(signatureFile || contract.eSignatureImage) ? (
                <div className="space-y-2">
                  <img
                    src={signatureFile || contract.eSignatureImage}
                    alt="E-Signature"
                    className="h-20 border border-border rounded-lg object-contain bg-white p-2"
                  />
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Signature uploaded
                  </p>
                </div>
              ) : (
                <div>
                  <label className="flex items-center gap-2 border-2 border-dashed border-border rounded-xl p-4 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors w-fit">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Upload signature image (PNG/JPG)</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadSignature} data-testid="input-signature-upload" />
                  </label>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
