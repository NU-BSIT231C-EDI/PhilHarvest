import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { ArrowLeft, ArrowRight, CheckCircle, Building2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { createTradingPartner, updateTradingPartner, type TradingPartner } from "@/services/ediApi";
import { useContractStore } from "@/store";
import { fetchProducts, type ApiProduct } from "@/services/productsApi";
import type { Contract, ContractStatus, Product } from "@/types";

function apiToProduct(p: ApiProduct): Product {
  return {
    id: String(p.id),
    name: p.name,
    category: p.category ?? "other",
    description: p.description ?? "",
    price: parseFloat(p.unit_price),
    unit: p.unit_of_measure,
    stock: p.stock_quantity,
    sellerId: p.seller_name ?? "unknown",
    sellerName: p.seller_name ?? "Unknown Seller",
    sellerRegion: "Philippines",
    images: p.image_url ? [p.image_url] : [],
    rating: 0,
    reviewCount: 0,
    status: p.is_active ? "active" : "inactive",
    featured: false,
    createdAt: p.created_at,
  };
}

interface DerivedSeller { id: string; farmName: string; province: string }

// ─── Types ───────────────────────────────────────────────────────────────────

const EDI_ROLES: { value: TradingPartner["edi_role"]; label: string }[] = [
  { value: "BY", label: "BY — Buyer" },
  { value: "SE", label: "SE — Selling Party" },
  { value: "SF", label: "SF — Ship From" },
  { value: "ST", label: "ST — Ship To" },
];

interface Step1Form {
  company_name: string; label: string; isa_receiver_id: string;
  edi_role: TradingPartner["edi_role"];
  address_line_1: string; address_line_2: string;
  city: string; state: string; postal_code: string; country: string;
  po_number_format: string; default_currency: string;
  api_endpoint: string; auth_token: string;
}

type ProductOverride = { included: boolean; quantity: string; agreedPrice: string };

interface Step2Form {
  startDate: string; endDate: string;
  allSellers: boolean; authorizedSellers: string[];
  products: Record<string, ProductOverride>;
  paymentTerms: string; deliverySchedule: string;
  maxPoQuantity: string; notes: string;
}

const emptyStep1: Step1Form = {
  company_name: "", label: "", isa_receiver_id: "", edi_role: "BY",
  address_line_1: "", address_line_2: "", city: "", state: "", postal_code: "", country: "PH",
  po_number_format: "PO-{number}", default_currency: "PHP", api_endpoint: "", auth_token: "",
};

const emptyStep2: Step2Form = {
  startDate: "", endDate: "", allSellers: true, authorizedSellers: [],
  products: {},
  paymentTerms: "Net 30", deliverySchedule: "Monthly", maxPoQuantity: "", notes: "",
};

function generateId(): string {
  return "ctr-" + Math.random().toString(36).slice(2, 10);
}

function generateContractNumber(existing: Contract[]): string {
  const year  = new Date().getFullYear();
  const taken = existing.map((c) => c.contractNumber);
  let   n     = existing.length + 1;
  let   num   = `CTR-${year}-${String(n).padStart(3, "0")}`;
  while (taken.includes(num)) {
    n++;
    num = `CTR-${year}-${String(n).padStart(3, "0")}`;
  }
  return num;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminOnboarding() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const editId = params.get("edit");

  const { toast } = useToast();
  const { contracts, addContract, updateContract } = useContractStore();
  const [allStoreProducts, setAllStoreProducts] = useState<Product[]>([]);
  const [sellers, setSellers] = useState<DerivedSeller[]>([]);

  useEffect(() => {
    fetchProducts({ per_page: 200 }).then((page) => {
      const prods = page.data.map(apiToProduct);
      setAllStoreProducts(prods);
      const seen = new Map<string, DerivedSeller>();
      for (const p of prods) {
        if (!seen.has(p.sellerId)) {
          seen.set(p.sellerId, { id: p.sellerId, farmName: p.sellerName, province: "Philippines" });
        }
      }
      setSellers(Array.from(seen.values()));
    }).catch(() => {});
  }, []);

  const [step, setStep]         = useState<1 | 2>(1);
  const [saving, setSaving]     = useState(false);
  const [s1, setS1]             = useState<Step1Form>(emptyStep1);
  const [s2, setS2]             = useState<Step2Form>(emptyStep2);
  const [s1errors, setS1Errors] = useState<Partial<Record<keyof Step1Form, string>>>({});
  const [s2errors, setS2Errors] = useState<Partial<Record<string, string>>>({});

  const availableProducts = (
    s2.allSellers
      ? allStoreProducts
      : allStoreProducts.filter((p) => s2.authorizedSellers.includes(p.sellerId))
  ).filter((p) => p.status === "active");

  // Pre-fill when editing a draft
  const editingContract = editId ? contracts.find((c) => c.id === editId) : null;
  useEffect(() => {
    if (!editingContract) return;
    setS1((prev) => ({ ...prev, company_name: editingContract.companyName }));
    setS2({
      startDate: editingContract.startDate,
      endDate:   editingContract.endDate,
      allSellers: false,
      authorizedSellers: [editingContract.sellerId],
      products: Object.fromEntries(
        editingContract.products.map((p) => [
          p.productId,
          { included: true, quantity: String(p.quantity), agreedPrice: String(p.unitPrice) },
        ])
      ),
      paymentTerms:     editingContract.paymentTerms,
      deliverySchedule: "Monthly",
      maxPoQuantity:    "",
      notes:            editingContract.additionalNotes ?? "",
    });
  }, [editId]);

  // ─── Step 1 validation ─────────────────────────────────────────────────────
  function validateStep1(): boolean {
    const errs: typeof s1errors = {};
    if (!s1.company_name.trim()) errs.company_name = "Required";
    if (!s1.isa_receiver_id.trim()) errs.isa_receiver_id = "Required";
    if (!s1.address_line_1.trim()) errs.address_line_1 = "Required";
    if (!s1.city.trim()) errs.city = "Required";
    if (!s1.postal_code.trim()) errs.postal_code = "Required";
    if (!s1.country.trim()) errs.country = "Required";
    if (!s1.api_endpoint.trim()) errs.api_endpoint = "Required";
    if (!editingContract && !s1.auth_token.trim()) errs.auth_token = "Required for new partners";
    setS1Errors(errs);
    return Object.keys(errs).length === 0;
  }

  // ─── Step 2 validation ─────────────────────────────────────────────────────
  function validateStep2(): boolean {
    const errs: typeof s2errors = {};
    if (!s2.startDate) errs.startDate = "Required";
    if (!s2.endDate)   errs.endDate   = "Required";
    if (s2.startDate && s2.endDate && s2.endDate <= s2.startDate) {
      errs.endDate = "End date must be after start date";
    }
    if (!s2.allSellers && s2.authorizedSellers.length === 0) {
      errs.sellers = "Select at least one seller";
    }
    const hasValidProduct = availableProducts.some(
      (p) => s2.products[p.id]?.included && s2.products[p.id]?.quantity?.trim() && s2.products[p.id]?.agreedPrice?.trim()
    );
    if (!hasValidProduct) errs.products = "Select at least one product and fill in qty and price";
    // One active contract per company
    if (!editingContract) {
      const conflict = contracts.find(
        (c) => c.companyName.toLowerCase() === s1.company_name.toLowerCase() && c.status === "active"
      );
      if (conflict) errs.company = `${s1.company_name} already has an active contract (${conflict.contractNumber})`;
    }
    setS2Errors(errs);
    return Object.keys(errs).length === 0;
  }

  // ─── Save ──────────────────────────────────────────────────────────────────
  async function handleSave(finalStatus: ContractStatus) {
    if (!validateStep2()) return;
    setSaving(true);
    try {
      // Step 1: create/update trading partner via API
      const tpPayload = {
        ...s1,
        label: s1.label || s1.company_name,
      } as Omit<TradingPartner, "id" | "auth_token_masked" | "n1_segments" | "created_at" | "updated_at">;

      if (editingContract) {
        // If editing, skip partner creation (user may not want to recreate)
      } else {
        await createTradingPartner(tpPayload);
      }

      // Step 2: build contract and save to store
      const validProducts = availableProducts
        .filter((p) => s2.products[p.id]?.included && s2.products[p.id]?.quantity?.trim())
        .map((p) => ({
          productId:   p.id,
          productName: p.name,
          quantity:    Number(s2.products[p.id].quantity),
          unit:        p.unit,
          unitPrice:   Number(s2.products[p.id].agreedPrice || p.price),
        }));
      const totalValue = validProducts.reduce(
        (sum, p) => sum + p.quantity * p.unitPrice, 0
      );

      const sellerIds   = s2.allSellers ? sellers.map((s) => s.id) : s2.authorizedSellers;
      const sellerId    = sellerIds[0] ?? "unknown";
      const sellerName  = sellers.find((s) => s.id === sellerId)?.farmName ?? sellerId ?? "Unknown";

      const duration = Math.max(1, Math.round(
        (new Date(s2.endDate).getTime() - new Date(s2.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
      ));

      const contractData: Contract = {
        id:                     editingContract?.id ?? generateId(),
        contractNumber:         editingContract?.contractNumber ?? generateContractNumber(contracts),
        customerId:             "u-new",
        customerName:           s1.company_name,
        companyName:            s1.company_name,
        sellerId,
        sellerName,
        products: validProducts,
        totalContractValue:     totalValue,
        startDate:              s2.startDate,
        endDate:                s2.endDate,
        duration,
        deliverySchedule:       [],
        paymentTerms:           s2.paymentTerms,
        status:                 finalStatus,
        additionalNotes:        s2.notes,
        deliveryCompletionPercent: 0,
        paymentStatus:          "pending",
        createdAt:              editingContract?.createdAt ?? new Date().toISOString(),
        updatedAt:              new Date().toISOString(),
      };

      if (editingContract) {
        updateContract(editingContract.id, contractData);
      } else {
        addContract(contractData);
      }

      toast({
        title: finalStatus === "draft" ? "Draft saved" : "Contract submitted",
        description: finalStatus === "draft"
          ? `${contractData.contractNumber} saved as draft.`
          : `${contractData.contractNumber} submitted for review.`,
      });
      navigate(`/admin/contracts/${contractData.id}`);
    } catch (err: unknown) {
      toast({ title: "Save failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  // ─── Step 1 helpers ────────────────────────────────────────────────────────
  function f1<K extends keyof Step1Form>(key: K, value: Step1Form[K]) {
    setS1((p) => ({ ...p, [key]: value }));
    if (s1errors[key]) setS1Errors((p) => { const e = { ...p }; delete e[key]; return e; });
  }

  // ─── Step 2 helpers ────────────────────────────────────────────────────────
  function toggleProductIncluded(productId: string) {
    setS2((p) => ({
      ...p,
      products: {
        ...p.products,
        [productId]: {
          included:    !(p.products[productId]?.included ?? false),
          quantity:    p.products[productId]?.quantity ?? "",
          agreedPrice: p.products[productId]?.agreedPrice ?? "",
        },
      },
    }));
    if (s2errors.products) setS2Errors((p) => { const e = { ...p }; delete e.products; return e; });
  }

  function updateProductOverride(productId: string, key: "quantity" | "agreedPrice", value: string) {
    setS2((p) => ({
      ...p,
      products: {
        ...p.products,
        [productId]: {
          included:    p.products[productId]?.included ?? false,
          quantity:    p.products[productId]?.quantity ?? "",
          agreedPrice: p.products[productId]?.agreedPrice ?? "",
          [key]: value,
        },
      },
    }));
    if (s2errors.products) setS2Errors((p) => { const e = { ...p }; delete e.products; return e; });
  }

  function toggleSeller(id: string) {
    setS2((p) => ({
      ...p,
      authorizedSellers: p.authorizedSellers.includes(id)
        ? p.authorizedSellers.filter((s) => s !== id)
        : [...p.authorizedSellers, id],
    }));
    if (s2errors.sellers) setS2Errors((p) => { const e = { ...p }; delete e.sellers; return e; });
  }

  // ─── Progress indicator ────────────────────────────────────────────────────
  const steps = [
    { n: 1, icon: Building2, label: "Company Details" },
    { n: 2, icon: FileText,  label: "Contract Setup" },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout role="admin" title={editingContract ? `Edit ${editingContract.contractNumber}` : "Company Onboarding"}>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Back */}
        <button onClick={() => navigate("/admin/onboarding")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Step indicator */}
        <div className="flex items-center gap-0">
          {steps.map((s, i) => {
            const done    = step > s.n;
            const current = step === s.n;
            const Icon    = s.icon;
            return (
              <div key={s.n} className="flex items-center flex-1">
                <div className={`flex items-center gap-2 ${i === 0 ? "" : "ml-2"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    done ? "bg-secondary text-white" : current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {done ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-sm font-medium ${current ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
                </div>
                {i < steps.length - 1 && <div className="flex-1 h-px bg-border mx-4" />}
              </div>
            );
          })}
        </div>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Step 1 — Company Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Company Name <span className="text-destructive">*</span></Label>
                  <Input className="mt-1" placeholder="Puregold Price Club Inc." value={s1.company_name} onChange={(e) => f1("company_name", e.target.value)} data-testid="input-company-name" />
                  {s1errors.company_name && <p className="text-xs text-destructive mt-1">{s1errors.company_name}</p>}
                </div>
                <div>
                  <Label>Label (short)</Label>
                  <Input className="mt-1" placeholder="Defaults to company name" value={s1.label} onChange={(e) => f1("label", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>ISA Receiver ID <span className="text-destructive">*</span></Label>
                  <Input className="mt-1 font-mono text-xs" placeholder="SERMACROPS" maxLength={15} value={s1.isa_receiver_id} onChange={(e) => f1("isa_receiver_id", e.target.value)} data-testid="input-isa-receiver-id" />
                  {s1errors.isa_receiver_id && <p className="text-xs text-destructive mt-1">{s1errors.isa_receiver_id}</p>}
                </div>
                <div>
                  <Label>EDI Role <span className="text-destructive">*</span></Label>
                  <Select value={s1.edi_role} onValueChange={(v) => f1("edi_role", v as TradingPartner["edi_role"])}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{EDI_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Address Line 1 <span className="text-destructive">*</span></Label>
                <Input className="mt-1" placeholder="900 Romualdez St., Paco" value={s1.address_line_1} onChange={(e) => f1("address_line_1", e.target.value)} data-testid="input-company-address" />
                {s1errors.address_line_1 && <p className="text-xs text-destructive mt-1">{s1errors.address_line_1}</p>}
              </div>
              <div>
                <Label>Address Line 2</Label>
                <Input className="mt-1" placeholder="Suite / Unit (optional)" value={s1.address_line_2} onChange={(e) => f1("address_line_2", e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>City <span className="text-destructive">*</span></Label>
                  <Input className="mt-1" placeholder="Manila" value={s1.city} onChange={(e) => f1("city", e.target.value)} />
                  {s1errors.city && <p className="text-xs text-destructive mt-1">{s1errors.city}</p>}
                </div>
                <div>
                  <Label>State / Province</Label>
                  <Input className="mt-1" placeholder="SC" maxLength={3} value={s1.state} onChange={(e) => f1("state", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Postal Code <span className="text-destructive">*</span></Label>
                  <Input className="mt-1" placeholder="1007" value={s1.postal_code} onChange={(e) => f1("postal_code", e.target.value)} />
                  {s1errors.postal_code && <p className="text-xs text-destructive mt-1">{s1errors.postal_code}</p>}
                </div>
                <div>
                  <Label>Country <span className="text-destructive">*</span></Label>
                  <Input className="mt-1" placeholder="PH" maxLength={2} value={s1.country} onChange={(e) => f1("country", e.target.value.toUpperCase())} />
                  {s1errors.country && <p className="text-xs text-destructive mt-1">{s1errors.country}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>PO Number Format <span className="text-destructive">*</span></Label>
                  <Input className="mt-1 font-mono text-xs" placeholder="PO-{number}" value={s1.po_number_format} onChange={(e) => f1("po_number_format", e.target.value)} />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Input className="mt-1 font-mono text-xs" placeholder="PHP" maxLength={3} value={s1.default_currency} onChange={(e) => f1("default_currency", e.target.value.toUpperCase())} />
                </div>
              </div>

              <div>
                <Label>EDI Endpoint URL <span className="text-destructive">*</span></Label>
                <Input className="mt-1 font-mono text-xs" placeholder="https://edi.company.com/receive" value={s1.api_endpoint} onChange={(e) => f1("api_endpoint", e.target.value)} data-testid="input-company-endpoint" />
                {s1errors.api_endpoint && <p className="text-xs text-destructive mt-1">{s1errors.api_endpoint}</p>}
              </div>

              <div>
                <Label>Auth Token {!editingContract && <span className="text-destructive">*</span>}</Label>
                <Input className="mt-1 font-mono text-xs" placeholder={editingContract ? "Leave blank to keep current token" : "Paste token here"} value={s1.auth_token} onChange={(e) => f1("auth_token", e.target.value)} data-testid="input-company-token" />
                {s1errors.auth_token && <p className="text-xs text-destructive mt-1">{s1errors.auth_token}</p>}
              </div>

              <div className="flex justify-end pt-2">
                <Button className="gap-2" onClick={() => { if (validateStep1()) setStep(2); }} data-testid="button-step-next">
                  Next <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Step 2 — Contract Setup</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date <span className="text-destructive">*</span></Label>
                  <Input type="date" className="mt-1" value={s2.startDate}
                    onChange={(e) => { setS2((p) => ({ ...p, startDate: e.target.value })); setS2Errors((p) => { const e2 = { ...p }; delete e2.startDate; delete e2.endDate; return e2; }); }}
                    data-testid="input-start-date" />
                  {s2errors.startDate && <p className="text-xs text-destructive mt-1">{s2errors.startDate}</p>}
                </div>
                <div>
                  <Label>End Date <span className="text-destructive">*</span></Label>
                  <Input type="date" className="mt-1" value={s2.endDate}
                    onChange={(e) => { setS2((p) => ({ ...p, endDate: e.target.value })); setS2Errors((p) => { const e2 = { ...p }; delete e2.endDate; return e2; }); }}
                    data-testid="input-end-date" />
                  {s2errors.endDate && <p className="text-xs text-destructive mt-1">{s2errors.endDate}</p>}
                </div>
              </div>

              {/* Authorized Sellers */}
              <div>
                <Label>Authorized Sellers <span className="text-destructive">*</span></Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={s2.allSellers} onCheckedChange={(v) => setS2((p) => ({ ...p, allSellers: !!v, authorizedSellers: [] }))} />
                      <span className="text-sm">All Sellers</span>
                    </label>
                    <Button
                      type="button" size="sm" variant="outline"
                      className="h-7 text-xs px-2.5"
                      disabled={availableProducts.length === 0}
                      onClick={() => {
                        setS2((p) => ({
                          ...p,
                          products: Object.fromEntries(
                            availableProducts.map((prod) => [
                              prod.id,
                              {
                                included:    true,
                                quantity:    p.products[prod.id]?.quantity ?? "",
                                agreedPrice: p.products[prod.id]?.agreedPrice ?? "",
                              },
                            ])
                          ),
                        }));
                        if (s2errors.products) setS2Errors((p) => { const e = { ...p }; delete e.products; return e; });
                      }}
                    >
                      All Products
                    </Button>
                    <Button
                      type="button" size="sm" variant="outline"
                      className="h-7 text-xs px-2.5"
                      disabled={availableProducts.length === 0}
                      onClick={() => {
                        setS2((p) => ({
                          ...p,
                          products: Object.fromEntries(
                            availableProducts.map((prod) => [
                              prod.id,
                              {
                                included:    p.products[prod.id]?.included ?? false,
                                quantity:    "250",
                                agreedPrice: "25",
                              },
                            ])
                          ),
                        }));
                      }}
                    >
                      Default Qty &amp; Price
                    </Button>
                  </div>
                  {!s2.allSellers && (
                    <div className="border border-border rounded-lg p-3 space-y-2">
                      {sellers.map((sel) => (
                        <label key={sel.id} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={s2.authorizedSellers.includes(sel.id)}
                            onCheckedChange={() => toggleSeller(sel.id)}
                          />
                          <span className="text-sm">{sel.farmName}</span>
                          <span className="text-xs text-muted-foreground">({sel.province})</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {s2errors.sellers && <p className="text-xs text-destructive mt-1">{s2errors.sellers}</p>}
                {s2errors.company && <p className="text-xs text-destructive mt-1">{s2errors.company}</p>}
              </div>

              {/* Products */}
              <div>
                <Label>Products <span className="text-destructive">*</span></Label>
                {availableProducts.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {!s2.allSellers && s2.authorizedSellers.length === 0
                      ? "Select a seller above to see their available products."
                      : "No active products found for the selected seller(s)."}
                  </p>
                ) : (
                  <div className="mt-2 border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="w-8 px-3 py-2" />
                          <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Product</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unit</th>
                          <th className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Qty / Mo</th>
                          <th className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Price (₱)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {availableProducts.map((product) => {
                          const override = s2.products[product.id];
                          const included = override?.included ?? false;
                          return (
                            <tr key={product.id} className={included ? "bg-primary/5" : "hover:bg-muted/20 transition-colors"}>
                              <td className="px-3 py-2.5">
                                <Checkbox checked={included} onCheckedChange={() => toggleProductIncluded(product.id)} />
                              </td>
                              <td className="px-3 py-2.5">
                                <p className="font-medium leading-tight">{product.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">{product.category.replace("-", " ")} · {product.sellerName}</p>
                              </td>
                              <td className="px-3 py-2.5 text-muted-foreground">{product.unit}</td>
                              <td className="px-3 py-2.5">
                                <Input
                                  type="number" min={0} placeholder="500"
                                  value={override?.quantity ?? ""}
                                  disabled={!included}
                                  onChange={(e) => updateProductOverride(product.id, "quantity", e.target.value)}
                                  className="h-7 text-sm w-24 ml-auto"
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <Input
                                  type="number" min={0} placeholder={String(product.price)}
                                  value={override?.agreedPrice ?? ""}
                                  disabled={!included}
                                  onChange={(e) => updateProductOverride(product.id, "agreedPrice", e.target.value)}
                                  className="h-7 text-sm w-24 ml-auto"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {s2errors.products && <p className="text-xs text-destructive mt-1">{s2errors.products}</p>}
              </div>

              {/* Terms */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Payment Terms</Label>
                  <Select value={s2.paymentTerms} onValueChange={(v) => setS2((p) => ({ ...p, paymentTerms: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Net 15">Net 15</SelectItem>
                      <SelectItem value="Net 30">Net 30</SelectItem>
                      <SelectItem value="Net 60">Net 60</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Delivery Schedule</Label>
                  <Select value={s2.deliverySchedule} onValueChange={(v) => setS2((p) => ({ ...p, deliverySchedule: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Weekly">Weekly</SelectItem>
                      <SelectItem value="Biweekly">Biweekly</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Max PO Quantity per 850</Label>
                <Input className="mt-1" type="number" min={0} placeholder="e.g. 1000" value={s2.maxPoQuantity}
                  onChange={(e) => setS2((p) => ({ ...p, maxPoQuantity: e.target.value }))} />
                <p className="text-xs text-muted-foreground mt-1">Leave blank for no limit.</p>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea className="mt-1" rows={3} placeholder="Special terms, delivery instructions, contact preferences…"
                  value={s2.notes} onChange={(e) => setS2((p) => ({ ...p, notes: e.target.value }))} />
              </div>

              {/* Status flow preview */}
              <div className="rounded-xl bg-muted/40 border border-border p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Status flow after submission</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {(["Draft", "Pending", "Active", "Expired"] as const).map((s, i, arr) => (
                    <div key={s} className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs capitalize">{s}</Badge>
                      {i < arr.length - 1 && <span className="text-muted-foreground text-xs">→</span>}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Active = buyer checkout unlocked · Expired = checkout blocked</p>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <Button variant="outline" className="gap-2" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleSave("draft")} disabled={saving} data-testid="button-save-draft">
                    Save Draft
                  </Button>
                  <Button onClick={() => handleSave("pending")} disabled={saving} data-testid="button-submit-contract">
                    {saving ? "Saving…" : "Submit for Review"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
