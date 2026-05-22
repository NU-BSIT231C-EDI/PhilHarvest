import { useState } from "react";
import { useLocation } from "wouter";
import { Save, Send, Info } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useContractStore } from "@/store";
import type { Contract } from "@/types";

const paymentTermsOptions = [
  "Net 15 days",
  "Net 30 days",
  "Net 45 days",
  "Net 60 days",
  "50% upfront, 50% on delivery",
  "Monthly invoicing",
  "Upon delivery",
];

const durationOptions = [1, 3, 6, 9, 12, 18, 24];

const mockProducts = [
  { id: "p1", name: "Benguet Tomatoes", unit: "kg", price: 75 },
  { id: "p5", name: "Pechay (Bok Choy)", unit: "kg", price: 35 },
  { id: "p6", name: "Carabao Mangoes", unit: "kg", price: 160 },
  { id: "p9", name: "Kamote (Sweet Potato)", unit: "kg", price: 45 },
  { id: "p13", name: "Dinorado Rice", unit: "25kg sack", price: 1700 },
  { id: "p7", name: "Lakatan Bananas", unit: "kg", price: 50 },
];

const mockSellers = [
  { id: "s1", name: "Santos Family Farm" },
  { id: "s2", name: "Dela Cruz Organic Garden" },
  { id: "s3", name: "Visayas Fresh Produce" },
  { id: "s4", name: "Mindanao Root Crops Farm" },
  { id: "s5", name: "Ilocos Norte Agri Coop" },
];

interface ProductLine {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export default function ContractRequest() {
  const [, navigate] = useLocation();
  const { addContract, saveDraft } = useContractStore();

  const [form, setForm] = useState({
    companyName: "FreshMart Philippines Inc.",
    sellerId: "s1",
    duration: "6",
    paymentTerms: "Net 30 days",
    additionalNotes: "",
  });

  const [productLines, setProductLines] = useState<ProductLine[]>([
    { productId: "p1", productName: "Benguet Tomatoes", quantity: 500, unit: "kg", unitPrice: 75 },
  ]);

  const addProductLine = () => {
    setProductLines([...productLines, { productId: "", productName: "", quantity: 100, unit: "kg", unitPrice: 0 }]);
  };

  const removeProductLine = (i: number) => {
    setProductLines(productLines.filter((_, idx) => idx !== i));
  };

  const updateProductLine = (i: number, updates: Partial<ProductLine>) => {
    setProductLines(productLines.map((pl, idx) => (idx === i ? { ...pl, ...updates } : pl)));
  };

  const totalValue = productLines.reduce((sum, pl) => sum + pl.quantity * pl.unitPrice * parseInt(form.duration || "1"), 0);

  const sellerName = mockSellers.find((s) => s.id === form.sellerId)?.name || "";

  function handleSubmit() {
    const startDate = new Date().toISOString().split("T")[0];
    const endDate = new Date(Date.now() + parseInt(form.duration) * 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const contract: Contract = {
      id: `ctr-${Date.now()}`,
      contractNumber: `CTR-${new Date().getFullYear()}-${Math.floor(Math.random() * 900) + 100}`,
      customerId: "u8",
      customerName: "FreshMart Philippines Inc.",
      companyName: form.companyName,
      sellerId: form.sellerId,
      sellerName,
      products: productLines.map((pl) => ({
        productId: pl.productId,
        productName: pl.productName,
        quantity: pl.quantity,
        unit: pl.unit,
        unitPrice: pl.unitPrice,
      })),
      totalContractValue: totalValue,
      startDate,
      endDate,
      duration: parseInt(form.duration),
      deliverySchedule: Array.from({ length: parseInt(form.duration) }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() + i);
        return {
          month: d.toLocaleString("en-PH", { month: "long", year: "numeric" }),
          quantity: productLines.reduce((s, pl) => s + pl.quantity, 0),
          unit: "kg",
          status: "pending" as const,
        };
      }),
      paymentTerms: form.paymentTerms,
      status: "pending",
      deliveryCompletionPercent: 0,
      paymentStatus: "pending",
      additionalNotes: form.additionalNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addContract(contract);
    navigate("/contract/contracts");
  }

  function handleSaveDraft() {
    saveDraft({ ...form, products: productLines } as unknown as Partial<Contract>);
    alert("Draft saved successfully.");
  }

  return (
    <DashboardLayout role="contract" title="New Contract Request">
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <Info className="w-5 h-5 text-blue-600 shrink-0" />
          <p className="text-sm text-blue-800">
            Your contract request will go through our review process: <span className="font-semibold">Draft → Pending → Negotiating → Approved → Active</span>
          </p>
        </div>

        {/* Company Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Company Information</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Company Name</Label>
              <Input
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                placeholder="Enter company name"
                data-testid="input-company-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Preferred Supplier</Label>
              <Select value={form.sellerId} onValueChange={(v) => setForm({ ...form, sellerId: v })}>
                <SelectTrigger data-testid="select-supplier">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {mockSellers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products Needed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Products Needed</CardTitle>
            <Button variant="outline" size="sm" onClick={addProductLine} data-testid="button-add-product-line">
              + Add Product
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {productLines.map((pl, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end border border-border rounded-lg p-3">
                <div className="col-span-12 sm:col-span-5 space-y-1">
                  <Label className="text-xs">Product</Label>
                  <Select
                    value={pl.productId}
                    onValueChange={(v) => {
                      const p = mockProducts.find((mp) => mp.id === v);
                      if (p) updateProductLine(i, { productId: v, productName: p.name, unit: p.unit, unitPrice: p.price });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockProducts.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-4 sm:col-span-2 space-y-1">
                  <Label className="text-xs">Qty / Month</Label>
                  <Input
                    type="number"
                    min={1}
                    value={pl.quantity}
                    onChange={(e) => updateProductLine(i, { quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="col-span-4 sm:col-span-2 space-y-1">
                  <Label className="text-xs">Unit</Label>
                  <Input value={pl.unit} readOnly className="bg-muted" />
                </div>
                <div className="col-span-4 sm:col-span-2 space-y-1">
                  <Label className="text-xs">Unit Price (₱)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={pl.unitPrice}
                    onChange={(e) => updateProductLine(i, { unitPrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="col-span-12 sm:col-span-1 flex sm:justify-end">
                  {productLines.length > 1 && (
                    <button onClick={() => removeProductLine(i)} className="text-destructive text-xs hover:underline">Remove</button>
                  )}
                </div>
              </div>
            ))}

            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Estimated Total Contract Value</p>
                <p className="text-xl font-bold text-foreground">₱{totalValue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">over {form.duration} months</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contract Terms */}
        <Card>
          <CardHeader><CardTitle className="text-base">Contract Terms</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Contract Duration (months)</Label>
              <Select value={form.duration} onValueChange={(v) => setForm({ ...form, duration: v })}>
                <SelectTrigger data-testid="select-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((d) => (
                    <SelectItem key={d} value={String(d)}>{d} months</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Payment Terms</Label>
              <Select value={form.paymentTerms} onValueChange={(v) => setForm({ ...form, paymentTerms: v })}>
                <SelectTrigger data-testid="select-payment-terms">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentTermsOptions.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Additional Notes</Label>
              <Textarea
                value={form.additionalNotes}
                onChange={(e) => setForm({ ...form, additionalNotes: e.target.value })}
                placeholder="Special requirements, delivery instructions, quality standards..."
                rows={3}
                data-testid="textarea-notes"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" className="gap-2" onClick={handleSaveDraft} data-testid="button-save-draft">
            <Save className="w-4 h-4" /> Save Draft
          </Button>
          <Button className="gap-2" onClick={handleSubmit} data-testid="button-submit-contract">
            <Send className="w-4 h-4" /> Submit Contract Request
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
