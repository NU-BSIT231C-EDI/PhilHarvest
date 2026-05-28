import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Plus, Building2, Edit, Trash2, Eye, EyeOff, Copy, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import {
  fetchTradingPartners,
  createTradingPartner,
  updateTradingPartner,
  deleteTradingPartner,
  type TradingPartner,
} from "@/services/ediApi";

const EDI_ROLES = [
  { value: "BY", label: "BY — Buyer" },
  { value: "SE", label: "SE — Selling Party" },
  { value: "SF", label: "SF — Ship From" },
  { value: "ST", label: "ST — Ship To" },
];

const emptyForm = {
  label: "",
  isa_receiver_id: "",
  company_name: "",
  edi_role: "BY" as TradingPartner["edi_role"],
  address_line_1: "",
  address_line_2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "PH",
  po_number_format: "PO-{number}",
  default_currency: "PHP",
  api_endpoint: "",
  auth_token: "",
};

type FormState = typeof emptyForm;

function maskToken(token: string) {
  if (!token) return "—";
  return token.slice(0, 8) + "•".repeat(Math.max(token.length - 12, 4)) + token.slice(-4);
}

export default function EdiCompanies() {
  const [, navigate] = useLocation();
  const [partners, setPartners] = useState<TradingPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TradingPartner | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [revealedId, setRevealedId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const { toast } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    fetchTradingPartners()
      .then(setPartners)
      .catch((err) => toast({ title: "Failed to load partners", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditTarget(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(p: TradingPartner) {
    setEditTarget(p);
    setForm({
      label: p.label,
      isa_receiver_id: p.isa_receiver_id.trim(),
      company_name: p.company_name,
      edi_role: p.edi_role,
      address_line_1: p.address_line_1,
      address_line_2: p.address_line_2 ?? "",
      city: p.city,
      state: p.state ?? "",
      postal_code: p.postal_code,
      country: p.country,
      po_number_format: p.po_number_format,
      default_currency: p.default_currency,
      api_endpoint: p.api_endpoint,
      auth_token: "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.company_name.trim() || !form.isa_receiver_id.trim() || !form.api_endpoint.trim()) {
      toast({ title: "Missing required fields", description: "Company name, ISA Receiver ID, and Endpoint are required.", variant: "destructive" });
      return;
    }
    if (!editTarget && !form.auth_token.trim()) {
      toast({ title: "Auth token required", description: "Provide an auth token for the new partner.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, label: form.label || form.company_name } as Omit<TradingPartner, 'id' | 'auth_token_masked' | 'n1_segments' | 'created_at' | 'updated_at'>;
      if (editTarget) {
        if (!form.auth_token.trim()) delete (payload as Record<string, unknown>).auth_token;
        await updateTradingPartner(editTarget.id, payload);
        toast({ title: "Partner updated", description: `${form.company_name} has been updated.` });
      } else {
        await createTradingPartner(payload);
        toast({ title: "Partner added", description: `${form.company_name} added as a trading partner.` });
      }
      setDialogOpen(false);
      load();
    } catch (err: unknown) {
      toast({ title: "Save failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p: TradingPartner) {
    if (!confirm(`Remove "${p.company_name}" from trading partners?`)) return;
    try {
      await deleteTradingPartner(p.id);
      toast({ title: "Partner removed", description: `${p.company_name} has been removed.` });
      load();
    } catch (err: unknown) {
      toast({ title: "Delete failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  }

  function copyToken(p: TradingPartner) {
    navigator.clipboard.writeText(p.auth_token).then(() => {
      setCopiedId(p.id);
      toast({ title: "Token copied to clipboard" });
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function field<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const displayToken = (p: TradingPartner) =>
    revealedId === p.id ? p.auth_token : (p.auth_token_masked ?? maskToken(p.auth_token));

  return (
    <DashboardLayout role="admin" title="EDI Trading Partners">
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading…" : `${partners.length} trading partner${partners.length !== 1 ? "s" : ""} configured`}
            </p>
            <Button size="icon" variant="ghost" className="w-7 h-7" onClick={load} disabled={loading} title="Refresh">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <Button className="gap-2" onClick={() => navigate("/admin/onboarding")} data-testid="button-add-company">
            <Plus className="w-4 h-4" />Add Partner
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <div />
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editTarget ? "Edit Trading Partner" : "Add Trading Partner"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Company Name <span className="text-destructive">*</span></Label>
                    <Input className="mt-1" placeholder="Puregold Price Club Inc." value={form.company_name} onChange={(e) => field("company_name", e.target.value)} data-testid="input-company-name" />
                  </div>
                  <div>
                    <Label>Label (short)</Label>
                    <Input className="mt-1" placeholder="Defaults to company name" value={form.label} onChange={(e) => field("label", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>ISA Receiver ID <span className="text-destructive">*</span></Label>
                    <Input className="mt-1 font-mono text-xs" placeholder="SERMACROPS" maxLength={15} value={form.isa_receiver_id} onChange={(e) => field("isa_receiver_id", e.target.value)} data-testid="input-isa-receiver-id" />
                  </div>
                  <div>
                    <Label>EDI Role <span className="text-destructive">*</span></Label>
                    <Select value={form.edi_role} onValueChange={(v) => field("edi_role", v as TradingPartner["edi_role"])}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{EDI_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Address Line 1 <span className="text-destructive">*</span></Label>
                  <Input className="mt-1" placeholder="900 Romualdez St., Paco" value={form.address_line_1} onChange={(e) => field("address_line_1", e.target.value)} data-testid="input-company-address" />
                </div>
                <div>
                  <Label>Address Line 2</Label>
                  <Input className="mt-1" placeholder="Suite / Unit (optional)" value={form.address_line_2} onChange={(e) => field("address_line_2", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>City <span className="text-destructive">*</span></Label>
                    <Input className="mt-1" placeholder="Manila" value={form.city} onChange={(e) => field("city", e.target.value)} data-testid="input-company-city" />
                  </div>
                  <div>
                    <Label>State / Province</Label>
                    <Input className="mt-1" placeholder="SC" maxLength={3} value={form.state} onChange={(e) => field("state", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Postal Code <span className="text-destructive">*</span></Label>
                    <Input className="mt-1" placeholder="1007" value={form.postal_code} onChange={(e) => field("postal_code", e.target.value)} data-testid="input-company-zip" />
                  </div>
                  <div>
                    <Label>Country <span className="text-destructive">*</span></Label>
                    <Input className="mt-1" placeholder="PH" maxLength={2} value={form.country} onChange={(e) => field("country", e.target.value.toUpperCase())} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>PO Number Format <span className="text-destructive">*</span></Label>
                    <Input className="mt-1 font-mono text-xs" placeholder="PO-{number}" value={form.po_number_format} onChange={(e) => field("po_number_format", e.target.value)} />
                  </div>
                  <div>
                    <Label>Currency <span className="text-destructive">*</span></Label>
                    <Input className="mt-1 font-mono text-xs" placeholder="PHP" maxLength={3} value={form.default_currency} onChange={(e) => field("default_currency", e.target.value.toUpperCase())} />
                  </div>
                </div>
                <div>
                  <Label>EDI Endpoint URL <span className="text-destructive">*</span></Label>
                  <Input className="mt-1 font-mono text-xs" placeholder="https://edi.company.com/receive" value={form.api_endpoint} onChange={(e) => field("api_endpoint", e.target.value)} data-testid="input-company-endpoint" />
                </div>
                <div>
                  <Label>Auth Token {!editTarget && <span className="text-destructive">*</span>}</Label>
                  <Input className="mt-1 font-mono text-xs" placeholder={editTarget ? "Leave blank to keep current token" : "Paste token here"} value={form.auth_token} onChange={(e) => field("auth_token", e.target.value)} data-testid="input-company-token" />
                </div>
                <Button className="w-full" onClick={handleSave} disabled={saving} data-testid="button-save-company">
                  {saving ? "Saving…" : editTarget ? "Update Partner" : "Add Partner"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading && (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading trading partners…</div>
        )}

        <div className="space-y-4">
          {partners.map((p) => (
            <Card key={p.id} className="border-card-border" data-testid={`card-company-${p.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-foreground">{p.company_name}</p>
                        <Badge variant="outline" className="text-xs font-mono">{p.edi_role}</Badge>
                        <Badge variant="secondary" className="text-xs font-mono">{p.isa_receiver_id.trim()}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[p.address_line_1, p.city, p.postal_code, p.country].filter(Boolean).join(", ")}
                      </p>
                      <div className="mt-2 flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-16 shrink-0">Endpoint</span>
                          <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono truncate max-w-xs">{p.api_endpoint}</code>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-16 shrink-0">Token</span>
                          <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono truncate max-w-xs">
                            {displayToken(p)}
                          </code>
                          <button
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setRevealedId(revealedId === p.id ? null : p.id)}
                            title={revealedId === p.id ? "Hide token" : "Show token"}
                            data-testid={`button-reveal-${p.id}`}
                          >
                            {revealedId === p.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => copyToken(p)}
                            title="Copy token"
                            data-testid={`button-copy-token-${p.id}`}
                          >
                            {copiedId === p.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        {p.po_number_format && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-16 shrink-0">PO Format</span>
                            <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{p.po_number_format}</code>
                            <span className="text-xs text-muted-foreground">{p.default_currency}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => openEdit(p)} data-testid={`button-edit-company-${p.id}`}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => handleDelete(p)} data-testid={`button-delete-company-${p.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
