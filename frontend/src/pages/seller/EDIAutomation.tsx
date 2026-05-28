import { useState } from "react";
import { Zap, AlertTriangle, ShoppingCart, RefreshCw, CheckCircle2, FileText, Send, Clock } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ediTransactions, inventoryForecasts } from "@/data/mockData";
import type { EDITransaction } from "@/types";

const statusColor: Record<string, string> = {
  sent: "bg-blue-100 text-blue-700",
  received: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700",
  acknowledged: "bg-purple-100 text-purple-700",
};

const ediTypeColor: Record<string, string> = {
  "810": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "856": "bg-teal-100 text-teal-700 border-teal-200",
  "204": "bg-orange-100 text-orange-700 border-orange-200",
};

const ediTypeLabel: Record<string, string> = {
  "810": "Invoice",
  "856": "Shipment Notice",
  "204": "Load Tender",
};

export default function EDIAutomation() {
  const sellerTransactions = ediTransactions.filter((e) => e.senderId === "s1");
  const shortages = inventoryForecasts.filter((f) => f.forecastedShortage);

  const [sentPOs, setSentPOs] = useState<string[]>([]);
  const [sentEDIs, setSentEDIs] = useState<string[]>([]);

  function handleSendEDI(id: string) {
    setSentEDIs([...sentEDIs, id]);
  }

  function handleGeneratePO(productId: string) {
    setSentPOs([...sentPOs, productId]);
  }

  return (
    <DashboardLayout role="seller" title="EDI Automation">
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">EDI Automation Center</h2>
          <p className="text-sm text-muted-foreground mt-1">Simulated Electronic Data Interchange — all transactions are UI-only demonstrations.</p>
        </div>

        {/* Shortage Alerts + Auto PO */}
        {shortages.length > 0 && (
          <Card className="border-red-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" /> Automated Shortage Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {shortages.map((f) => (
                <div key={f.productId} className="border border-red-200 bg-red-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-foreground text-sm">{f.productName}</p>
                      <Badge className="bg-red-100 text-red-700 text-xs">Stock Shortage</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Current: {f.currentStock} {f.unit} · Demand: {f.projectedDemand} {f.unit} · Need: +{f.recommendedOrder} {f.unit}
                    </p>
                  </div>
                  {sentPOs.includes(f.productId) ? (
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-xs font-medium">Auto PO Generated (UI Only)</span>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="gap-1.5 bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => handleGeneratePO(f.productId)}
                      data-testid={`button-auto-po-${f.productId}`}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" /> Auto PO (Mock)
                    </Button>
                  )}
                </div>
              ))}

              <div className="border border-yellow-200 bg-yellow-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <RefreshCw className="w-4 h-4 text-yellow-600" />
                  <p className="font-semibold text-yellow-800 text-sm">Restock Recommendation</p>
                </div>
                <p className="text-sm text-yellow-700">
                  Based on active contracts and seasonal demand forecasts, it is recommended to restock{" "}
                  <strong>Kamote</strong> (+1,500 kg) and <strong>Dinorado Rice</strong> (+100 sacks) before June 2024 delivery cycles.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* EDI Transaction Log */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">EDI Transaction Log</CardTitle>
            <Badge className="bg-muted text-muted-foreground">{sellerTransactions.length} transactions</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {sellerTransactions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No EDI transactions yet.</p>
            )}
            {sellerTransactions.map((t) => (
              <EDIRow key={t.id} transaction={t} sent={sentEDIs.includes(t.id)} onSend={handleSendEDI} />
            ))}
          </CardContent>
        </Card>

        {/* EDI Types Info */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { type: "810", label: "EDI 810 – Invoice", desc: "Electronic billing for contract deliveries. Replaces paper invoices.", icon: FileText },
            { type: "856", label: "EDI 856 – Ship Notice", desc: "Advance Shipment Notice sent before delivery. Used for warehouse prep.", icon: Send },
            { type: "204", label: "EDI 204 – Load Tender", desc: "Carrier assignment and route confirmation for shipments.", icon: Zap },
          ].map((info) => (
            <Card key={info.type}>
              <CardContent className="p-5">
                <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center ${ediTypeColor[info.type].split(" ").slice(0, 1).join(" ")}`}>
                  <info.icon className={`w-5 h-5 ${ediTypeColor[info.type].split(" ").slice(1).join(" ")}`} />
                </div>
                <p className="font-semibold text-sm text-foreground">{info.label}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{info.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

function EDIRow({ transaction, sent, onSend }: { transaction: EDITransaction; sent: boolean; onSend: (id: string) => void }) {
  const ediTypeColor: Record<string, string> = {
    "810": "bg-indigo-100 text-indigo-700 border-indigo-200",
    "856": "bg-teal-100 text-teal-700 border-teal-200",
    "204": "bg-orange-100 text-orange-700 border-orange-200",
  };
  const ediTypeLabel: Record<string, string> = {
    "810": "Invoice",
    "856": "Shipment Notice",
    "204": "Load Tender",
  };
  const statusColor: Record<string, string> = {
    sent: "bg-blue-100 text-blue-700",
    received: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    failed: "bg-red-100 text-red-700",
    acknowledged: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <Badge className={`text-xs border font-mono ${ediTypeColor[transaction.ediType]}`}>
          EDI {transaction.ediType}
        </Badge>
        <div>
          <p className="text-sm font-semibold text-foreground">{transaction.transactionNumber}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{transaction.description}</p>
          <p className="text-xs text-muted-foreground mt-0.5">To: {transaction.receiverName} · {transaction.createdAt.split("T")[0]}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor[sent ? "sent" : transaction.status]}`}>
          {sent ? "sent" : transaction.status}
        </span>
        {(transaction.status === "pending" || transaction.status === "failed") && !sent && (
          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => onSend(transaction.id)} data-testid={`button-send-edi-${transaction.id}`}>
            <Send className="w-3 h-3" /> Send EDI
          </Button>
        )}
      </div>
    </div>
  );
}
