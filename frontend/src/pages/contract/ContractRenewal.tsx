import { useState } from "react";
import { useLocation } from "wouter";
import { RefreshCw, Calendar, MessageSquare, ChevronRight, CheckCircle } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useContractStore } from "@/store";

type RenewalType = "renew" | "extend" | "negotiate" | "modify";

export default function ContractRenewal() {
  const { contracts, updateContract } = useContractStore();
  const [, navigate] = useLocation();
  const myContracts = contracts.filter((c) => c.customerId === "u8" && ["active", "approved", "expired"].includes(c.status));

  const [selectedId, setSelectedId] = useState(myContracts[0]?.id || "");
  const [renewalType, setRenewalType] = useState<RenewalType>("renew");
  const [newDuration, setNewDuration] = useState("6");
  const [notes, setNotes] = useState("");
  const [success, setSuccess] = useState(false);

  const selected = contracts.find((c) => c.id === selectedId);

  function handleSubmit() {
    if (!selected) return;
    const extension = parseInt(newDuration) || 0;
    const newEndDate = new Date(selected.endDate);
    newEndDate.setMonth(newEndDate.getMonth() + extension);
    updateContract(selectedId, {
      status: renewalType === "negotiate" ? "negotiating" : "pending",
      endDate: newEndDate.toISOString().split("T")[0],
      duration: selected.duration + extension,
      negotiationNotes: notes || undefined,
    });
    setSuccess(true);
    setTimeout(() => navigate("/contract/contracts"), 2000);
  }

  if (success) {
    return (
      <DashboardLayout role="contract" title="Contract Renewal">
        <div className="p-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Renewal Request Submitted</h2>
          <p className="text-muted-foreground text-sm">Your contract renewal is being processed. Redirecting...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="contract" title="Contract Renewals">
      <div className="p-6 max-w-2xl space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Renew or Modify a Contract</h2>
          <p className="text-sm text-muted-foreground mt-1">Extend, renew, or request negotiation on existing contracts.</p>
        </div>

        {/* Select Contract */}
        <Card>
          <CardHeader><CardTitle className="text-base">Select Contract</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {myContracts.length === 0 && (
              <p className="text-sm text-muted-foreground">No eligible contracts for renewal.</p>
            )}
            {myContracts.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full border rounded-xl p-4 text-left flex items-center justify-between transition-all ${
                  selectedId === c.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
                data-testid={`button-select-renewal-${c.id}`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-foreground">{c.contractNumber}</p>
                    <Badge className="text-xs">{c.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.sellerName} · Ends {c.endDate}</p>
                </div>
                {selectedId === c.id && <CheckCircle className="w-5 h-5 text-primary shrink-0" />}
              </button>
            ))}
          </CardContent>
        </Card>

        {selected && (
          <>
            {/* Renewal Type */}
            <Card>
              <CardHeader><CardTitle className="text-base">Renewal Action</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {[
                  { type: "renew" as RenewalType, label: "Renew Contract", desc: "Same terms, new period", icon: RefreshCw },
                  { type: "extend" as RenewalType, label: "Extend Duration", desc: "Add months to current", icon: Calendar },
                  { type: "negotiate" as RenewalType, label: "Request Negotiation", desc: "Discuss new terms", icon: MessageSquare },
                  { type: "modify" as RenewalType, label: "Modify Schedule", desc: "Change delivery dates", icon: ChevronRight },
                ].map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => setRenewalType(opt.type)}
                    className={`border rounded-xl p-4 text-left transition-all ${
                      renewalType === opt.type ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    }`}
                    data-testid={`button-renewal-type-${opt.type}`}
                  >
                    <opt.icon className="w-5 h-5 text-primary mb-2" />
                    <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Duration + Notes */}
            <Card>
              <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Extension Period (months)</Label>
                  <Select value={newDuration} onValueChange={setNewDuration}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 3, 6, 9, 12, 18, 24].map((d) => (
                        <SelectItem key={d} value={String(d)}>{d} months</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    New end date: {(() => {
                      const d = new Date(selected.endDate);
                      d.setMonth(d.getMonth() + parseInt(newDuration));
                      return d.toISOString().split("T")[0];
                    })()}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Notes / Special Requests</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Price adjustment requests, delivery schedule changes, quality requirements..."
                    rows={3}
                    data-testid="textarea-renewal-notes"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => navigate("/contract/contracts")} data-testid="button-cancel-renewal">
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="gap-2" data-testid="button-submit-renewal">
                <RefreshCw className="w-4 h-4" /> Submit Renewal Request
              </Button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
