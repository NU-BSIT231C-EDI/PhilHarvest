import { useState } from "react";
import { Truck, Plus, Package, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DashboardLayout from "@/layouts/DashboardLayout";
import StatusBadge from "@/components/shared/StatusBadge";
import { shipments as initialShipments } from "@/data/mockData";
import type { Shipment } from "@/types";
import { useToast } from "@/hooks/use-toast";

const seedShipments = initialShipments.filter((s) => s.sellerId === "s1" || s.sellerId === "s2");

export default function Shipments() {
  const [open, setOpen] = useState(false);
  const [shipments, setShipments] = useState<Shipment[]>(seedShipments);
  const { toast } = useToast();

  const [form, setForm] = useState({
    orderRef: "",
    pickupDate: "",
    weight: "",
    instructions: "",
    destination: "",
  });

  function handleField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    if (!form.orderRef.trim() || !form.pickupDate || !form.weight) {
      toast({
        title: "Missing fields",
        description: "Please fill in Order Reference, Pickup Date, and Weight.",
        variant: "destructive",
      });
      return;
    }

    const newShipment: Shipment = {
      id: `sh-${Date.now()}`,
      orderId: form.orderRef.trim(),
      trackingNumber: `PH-TRK-${Math.floor(100000 + Math.random() * 900000)}`,
      sellerId: "s1",
      sellerName: "Santos Family Farm",
      customerId: "u1",
      customerName: "Pending Assignment",
      origin: "La Trinidad, Benguet",
      destination: form.destination.trim() || "Metro Manila",
      status: "pending",
      pickupDate: form.pickupDate,
      weight: Number(form.weight),
      notes: form.instructions.trim() || undefined,
    };

    setShipments((prev) => [newShipment, ...prev]);
    setForm({ orderRef: "", pickupDate: "", weight: "", instructions: "", destination: "" });
    setOpen(false);
    toast({
      title: "Pickup requested",
      description: `Tracking number ${newShipment.trackingNumber} has been created.`,
    });
  }

  return (
    <DashboardLayout role="seller" title="Shipment Requests">
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{shipments.length} shipment{shipments.length !== 1 ? "s" : ""} total</p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-request-shipment">
                <Plus className="w-4 h-4" />Request Pickup
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Request Logistics Pickup</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Order Reference <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="e.g. PO-2024-008"
                    className="mt-1"
                    value={form.orderRef}
                    onChange={(e) => handleField("orderRef", e.target.value)}
                    data-testid="input-order-ref"
                  />
                </div>
                <div>
                  <Label>Pickup Date <span className="text-destructive">*</span></Label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={form.pickupDate}
                    onChange={(e) => handleField("pickupDate", e.target.value)}
                    data-testid="input-pickup-date"
                  />
                </div>
                <div>
                  <Label>Total Weight (kg) <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    placeholder="50"
                    min={1}
                    className="mt-1"
                    value={form.weight}
                    onChange={(e) => handleField("weight", e.target.value)}
                    data-testid="input-weight"
                  />
                </div>
                <div>
                  <Label>Destination</Label>
                  <Input
                    placeholder="e.g. Quezon City, Metro Manila"
                    className="mt-1"
                    value={form.destination}
                    onChange={(e) => handleField("destination", e.target.value)}
                    data-testid="input-destination"
                  />
                </div>
                <div>
                  <Label>Special Instructions</Label>
                  <Input
                    placeholder="Handle with care..."
                    className="mt-1"
                    value={form.instructions}
                    onChange={(e) => handleField("instructions", e.target.value)}
                    data-testid="input-instructions"
                  />
                </div>
                <Button className="w-full gap-2" onClick={handleSubmit} data-testid="button-submit-request">
                  <CheckCircle className="w-4 h-4" />Submit Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {shipments.length === 0 ? (
          <div className="bg-card border border-card-border rounded-xl p-12 text-center">
            <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No shipments yet. Request a pickup to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shipments.map((s) => (
              <Card key={s.id} className="border-card-border" data-testid={`card-shipment-${s.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                        <Truck className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm">{s.trackingNumber}</p>
                        <p className="text-xs text-muted-foreground">Order: {s.orderId}</p>
                        <p className="text-xs text-muted-foreground">{s.origin} → {s.destination}</p>
                        {s.pickupDate && (
                          <p className="text-xs text-muted-foreground">Pickup: {s.pickupDate}</p>
                        )}
                        {s.notes && (
                          <p className="text-xs text-muted-foreground italic mt-0.5">Note: {s.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <StatusBadge status={s.status} />
                      <p className="text-xs text-muted-foreground mt-1">{s.weight} kg</p>
                      {s.driverName && <p className="text-xs text-muted-foreground">Driver: {s.driverName}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
