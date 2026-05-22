import { useLocation, useParams } from "wouter";
import { ArrowLeft, Building2, Calendar, CreditCard, Package } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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

const scheduleStatusColor = {
  fulfilled: "bg-green-100 text-green-700",
  partial:   "bg-yellow-100 text-yellow-700",
  pending:   "bg-gray-100 text-gray-600",
  missed:    "bg-red-100 text-red-700",
};

type EdiDirection = "received" | "sent";

function mockEdiHistory(contractNumber: string) {
  return [
    { id: "e1", type: "850", direction: "received" as EdiDirection, description: "Purchase Order received from buyer", date: "2024-03-15", status: "acknowledged" },
    { id: "e2", type: "855", direction: "sent" as EdiDirection,     description: "Purchase Order Acknowledgment sent", date: "2024-03-16", status: "sent" },
    { id: "e3", type: "990", direction: "received" as EdiDirection, description: "Load Tender Response received",       date: "2024-03-20", status: "received" },
    { id: "e4", type: "856", direction: "sent" as EdiDirection,     description: "Advance Ship Notice sent",           date: "2024-04-01", status: "sent" },
    { id: "e5", type: "810", direction: "sent" as EdiDirection,     description: "Invoice sent",                       date: "2024-04-05", status: "sent" },
  ].map((e) => ({ ...e, contractNumber }));
}

export default function SellerContractDetail() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const { contracts } = useContractStore();
  const contract = contracts.find((c) => c.id === params.id);

  if (!contract) {
    return (
      <DashboardLayout role="seller" title="Contract Detail">
        <div className="p-6 text-center py-20">
          <p className="text-muted-foreground">Contract not found.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/seller/contracts/active")}>
            Back to Contracts
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const ediHistory = mockEdiHistory(contract.contractNumber);
  const totalQty = contract.products.reduce((s, p) => s + p.quantity * contract.duration, 0);
  const deliveredQty = Math.round(totalQty * contract.deliveryCompletionPercent / 100);

  return (
    <DashboardLayout role="seller" title="Contract Detail">
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-start gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate("/seller/contracts/active")} className="gap-1.5 shrink-0">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-foreground font-mono">{contract.contractNumber}</h2>
              <Badge className={`text-xs border capitalize ${statusColor[contract.status]}`}>{contract.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{contract.companyName}</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Buyer",          value: contract.companyName,                                icon: Building2,  color: "text-blue-600",   bg: "bg-blue-50" },
            { label: "Contract Period", value: `${contract.startDate} → ${contract.endDate}`,     icon: Calendar,   color: "text-purple-600", bg: "bg-purple-50" },
            { label: "Payment Terms",  value: contract.paymentTerms,                              icon: CreditCard, color: "text-green-600",  bg: "bg-green-50" },
            { label: "Total Value",    value: `₱${contract.totalContractValue.toLocaleString()}`, icon: Package,    color: "text-orange-600", bg: "bg-orange-50" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-sm font-semibold text-foreground break-words">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Products & Pricing */}
        <Card>
          <CardHeader><CardTitle className="text-base">Products & Pricing</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Product", "Qty/Month", "Unit Price", "Duration", "Line Total"].map((h) => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contract.products.map((p, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2.5 px-3 font-medium">{p.productName}</td>
                      <td className="py-2.5 px-3">{p.quantity.toLocaleString()} {p.unit}</td>
                      <td className="py-2.5 px-3">₱{p.unitPrice}/{p.unit}</td>
                      <td className="py-2.5 px-3">{contract.duration} months</td>
                      <td className="py-2.5 px-3 font-semibold">
                        ₱{(p.quantity * p.unitPrice * contract.duration).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="py-2.5 px-3 text-right text-xs font-semibold text-muted-foreground">TOTAL</td>
                    <td className="py-2.5 px-3 font-bold text-foreground">₱{contract.totalContractValue.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Progress */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Delivery Progress</CardTitle>
              <span className="text-sm text-muted-foreground">
                {deliveredQty.toLocaleString()} / {totalQty.toLocaleString()} units
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Progress value={contract.deliveryCompletionPercent} className="h-2 flex-1" />
              <span className="text-sm font-semibold text-foreground w-10 text-right">
                {contract.deliveryCompletionPercent}%
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {contract.deliverySchedule.map((d, i) => (
                <div key={i} className={`rounded-lg px-3 py-2 ${scheduleStatusColor[d.status]}`}>
                  <p className="text-xs font-semibold">{d.month}</p>
                  <p className="text-xs">{d.quantity.toLocaleString()} {d.unit}</p>
                  <p className="text-xs capitalize opacity-80">{d.status}</p>
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
              {ediHistory.map((e) => (
                <div key={e.id} className="flex items-center gap-3 border border-border rounded-lg px-4 py-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    e.direction === "received" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                  }`}>
                    {e.type}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{e.description}</p>
                    <p className="text-xs text-muted-foreground">{e.date}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge className={`text-xs ${
                      e.direction === "received" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-green-50 text-green-700 border-green-200"
                    } border capitalize`}>
                      {e.direction}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}
