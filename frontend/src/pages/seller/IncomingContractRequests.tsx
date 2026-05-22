import { useState } from "react";
import { CheckCircle, XCircle, Inbox } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useContractStore } from "@/store";
import type { Contract } from "@/types";

const SELLER_ID = "s1";

export default function IncomingContractRequests() {
  const { contracts, updateContractStatus } = useContractStore();
  const incoming = contracts.filter((c) => c.sellerId === SELLER_ID && c.status === "pending");
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAction(contract: Contract, action: "approved" | "rejected") {
    setLoading(contract.id + action);
    try {
      await fetch(`/api/contracts/${contract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
    } catch {
      // offline — proceed with store update
    } finally {
      updateContractStatus(contract.id, action);
      setLoading(null);
    }
  }

  return (
    <DashboardLayout role="seller" title="Incoming Contract Requests">
      <div className="p-6 space-y-4">
        {incoming.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Inbox className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No pending requests</p>
              <p className="text-xs text-muted-foreground mt-1">New contract requests from buyers will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          incoming.map((c) => (
            <Card key={c.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{c.companyName}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">{c.contractNumber}</p>
                  </div>
                  <Badge className="bg-orange-100 text-orange-700 border border-orange-200 w-fit">Pending Review</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="font-medium">{c.duration} months</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Value</p>
                    <p className="font-medium">₱{c.totalContractValue.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Deliveries</p>
                    <p className="font-medium">{c.deliverySchedule.length} scheduled</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Terms</p>
                    <p className="font-medium">{c.paymentTerms}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Products</p>
                  <div className="space-y-1">
                    {c.products.map((p, i) => (
                      <p key={i} className="text-sm text-foreground/80">
                        • {p.productName} — {p.quantity.toLocaleString()} {p.unit}/month @ ₱{p.unitPrice}/{p.unit}
                      </p>
                    ))}
                  </div>
                </div>

                {c.additionalNotes && (
                  <div className="bg-muted/50 border border-border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-0.5">Buyer notes</p>
                    <p className="text-sm text-foreground">{c.additionalNotes}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="gap-1.5 bg-green-600 hover:bg-green-700"
                    onClick={() => handleAction(c, "approved")}
                    disabled={loading !== null}
                    data-testid={`button-accept-${c.id}`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    {loading === c.id + "approved" ? "Accepting..." : "Accept"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => handleAction(c, "rejected")}
                    disabled={loading !== null}
                    data-testid={`button-reject-${c.id}`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    {loading === c.id + "rejected" ? "Rejecting..." : "Reject"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
