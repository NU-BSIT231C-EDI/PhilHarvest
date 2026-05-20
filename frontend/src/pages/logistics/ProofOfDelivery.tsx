import { useState } from "react";
import { Camera, CheckCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/layouts/DashboardLayout";
import StatusBadge from "@/components/shared/StatusBadge";
import { shipments } from "@/data/mockData";

const activeDeliveries = shipments.filter((s) => s.status === "in_transit" || s.status === "picked_up");

export default function ProofOfDelivery() {
  const [selected, setSelected] = useState(activeDeliveries[0]?.id || "");
  const [submitted, setSubmitted] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [notes, setNotes] = useState("");

  const shipment = shipments.find((s) => s.id === selected);

  if (submitted) {
    return (
      <DashboardLayout role="logistics" title="Proof of Delivery">
        <div className="p-6 flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-secondary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Delivery Confirmed!</h2>
            <p className="text-muted-foreground text-sm mb-5">Proof of delivery has been uploaded successfully.</p>
            <Button onClick={() => { setSubmitted(false); setRecipientName(""); setNotes(""); }} data-testid="button-new-pod">Submit Another</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="logistics" title="Proof of Delivery">
      <div className="p-6 space-y-5 max-w-xl">
        {/* Select Shipment */}
        <Card className="border-card-border">
          <CardContent className="p-5">
            <Label className="text-sm font-semibold mb-3 block">Select Shipment</Label>
            <div className="space-y-2">
              {activeDeliveries.map((s) => (
                <button key={s.id} onClick={() => setSelected(s.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors ${selected === s.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`} data-testid={`button-select-shipment-${s.id}`}>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{s.trackingNumber}</p>
                    <p className="text-xs text-muted-foreground">{s.customerName} · {s.destination}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {shipment && (
          <Card className="border-card-border">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-bold text-foreground">Delivery Confirmation</h3>
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Shipment:</span> <span className="font-medium">{shipment.trackingNumber}</span></p>
                <p><span className="text-muted-foreground">Deliver to:</span> <span className="font-medium">{shipment.customerName}</span></p>
                <p><span className="text-muted-foreground">Address:</span> <span className="font-medium">{shipment.destination}</span></p>
              </div>

              <div>
                <Label>Recipient Name</Label>
                <Input placeholder="Name of person who received the delivery" className="mt-1" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} data-testid="input-recipient-name" />
              </div>

              <div>
                <Label>Delivery Photo</Label>
                <div className="mt-1 border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Take photo or upload proof</p>
                  <Button variant="outline" size="sm" className="mt-2 gap-2" type="button" data-testid="button-upload-photo"><Upload className="w-3.5 h-3.5" />Upload Photo</Button>
                </div>
              </div>

              <div>
                <Label>Notes (optional)</Label>
                <Textarea placeholder="Any delivery notes..." className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} data-testid="textarea-notes" />
              </div>

              <Button className="w-full gap-2" onClick={() => setSubmitted(true)} data-testid="button-confirm-delivery">
                <CheckCircle className="w-4 h-4" /> Confirm Delivery
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
