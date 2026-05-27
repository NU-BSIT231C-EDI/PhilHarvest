import { useState, useEffect, useCallback } from "react";
import {
  Building2, Plus, Search, Edit, Trash2, Eye, EyeOff,
  Copy, Check, RefreshCw, Users, ShoppingCart, Factory, Truck,
  Archive, ArchiveRestore, Package,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import {
  fetchTradingPartners,
  createTradingPartner,
  updateTradingPartner,
  deleteTradingPartner,
  archiveTradingPartner,
  unarchiveTradingPartner,
  type TradingPartner,
} from "@/services/ediApi";
import { fetchProducts, type ApiProduct } from "@/services/productsApi";

const ROLE_META: Record<TradingPartner["edi_role"], { label: string; color: string; icon: React.ElementType; chart: string }> = {
  BY: { label: "Buyer",         color: "bg-blue-100 text-blue-700 border-blue-200",       icon: ShoppingCart, chart: "#3b82f6" },
  SE: { label: "Manufacturer",  color: "bg-green-100 text-green-700 border-green-200",    icon: Factory,      chart: "#22c55e" },
  SF: { label: "Ship From",     color: "bg-purple-100 text-purple-700 border-purple-200", icon: Truck,        chart: "#a855f7" },
  ST: { label: "Ship To",       color: "bg-orange-100 text-orange-700 border-orange-200", icon: Truck,        chart: "#f97316" },
};

const EDI_ROLES = [
  { value: "BY", label: "BY — Buyer" },
  { value: "SE", label: "SE — Selling Party / Manufacturer" },
  { value: "SF", label: "SF — Ship From" },
  { value: "ST", label: "ST — Ship To" },
];

const emptyForm = {
  label:             "",
  isa_receiver_id:   "",
  company_name:      "",
  edi_role:          "BY" as TradingPartner["edi_role"],
  address_line_1:    "",
  address_line_2:    "",
  city:              "",
  state:             "",
  postal_code:       "",
  country:           "PH",
  po_number_format:  "PO-{number}",
  default_currency:  "PHP",
  api_endpoint:      "",
  auth_token:        "",
  excluded_skus_raw: "",
};
type FormState = typeof emptyForm;

function maskToken(token: string) {
  if (!token) return "—";
  return token.slice(0, 8) + "•".repeat(Math.max(token.length - 12, 4)) + token.slice(-4);
}

export default function ContractMonitoring() {
  const [partners, setPartners]         = useState<TradingPartner[]>([]);
  const [products, setProducts]         = useState<ApiProduct[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [search, setSearch]             = useState("");
  const [roleFilter, setRoleFilter]     = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [editTarget, setEditTarget]     = useState<TradingPartner | null>(null);
  const [form, setForm]                 = useState<FormState>(emptyForm);
  const [revealedId, setRevealedId]     = useState<number | null>(null);
  const [copiedId, setCopiedId]         = useState<number | null>(null);

  // SKU management dialog
  const [skuDialogPartner, setSkuDialogPartner] = useState<TradingPartner | null>(null);
  const [skuApproved, setSkuApproved]           = useState<Set<string>>(new Set());
  const [skuSaving, setSkuSaving]               = useState(false);

  const { toast } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([fetchTradingPartners(), fetchProducts({ per_page: 500 })])
      .then(([pts, page]) => { setPartners(pts); setProducts(page.data); })
      .catch((err) => toast({ title: "Failed to load data", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  function field<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openAdd() {
    setEditTarget(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(p: TradingPartner) {
    setEditTarget(p);
    setForm({
      label:             p.label,
      isa_receiver_id:   p.isa_receiver_id.trim(),
      company_name:      p.company_name,
      edi_role:          p.edi_role,
      address_line_1:    p.address_line_1,
      address_line_2:    p.address_line_2 ?? "",
      city:              p.city,
      state:             p.state ?? "",
      postal_code:       p.postal_code,
      country:           p.country,
      po_number_format:  p.po_number_format,
      default_currency:  p.default_currency,
      api_endpoint:      p.api_endpoint,
      auth_token:        "",
      excluded_skus_raw: (p.excluded_skus ?? []).join(", "),
    });
    setDialogOpen(true);
  }

  function openSkuDialog(p: TradingPartner) {
    setSkuDialogPartner(p);
    const excluded = new Set((p.excluded_skus ?? []).map((s) => s.trim().toUpperCase()));
    // approved = all product SKUs NOT in excluded_skus
    const approved = new Set(
      products
        .filter((prod) => prod.sku && !excluded.has(prod.sku.trim().toUpperCase()))
        .map((prod) => prod.sku.trim().toUpperCase())
    );
    setSkuApproved(approved);
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
      const excludedSkus = form.excluded_skus_raw
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const { excluded_skus_raw: _raw, ...rest } = form;
      void _raw;
      const payload = { ...rest, label: rest.label || rest.company_name, excluded_skus: excludedSkus } as Omit<TradingPartner, "id" | "auth_token_masked" | "n1_segments" | "created_at" | "updated_at">;
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

  async function handleSaveSkus() {
    if (!skuDialogPartner) return;
    setSkuSaving(true);
    try {
      // excluded = all product SKUs NOT in the approved set
      const excludedSkus = products
        .filter((prod) => prod.sku && !skuApproved.has(prod.sku.trim().toUpperCase()))
        .map((prod) => prod.sku.trim());
      await updateTradingPartner(skuDialogPartner.id, { excluded_skus: excludedSkus });
      toast({ title: "Approved SKUs saved", description: `${skuDialogPartner.company_name} can now trade ${skuApproved.size} product(s).` });
      setSkuDialogPartner(null);
      load();
    } catch (err: unknown) {
      toast({ title: "Save failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setSkuSaving(false);
    }
  }

  async function handleArchive(p: TradingPartner) {
    try {
      await archiveTradingPartner(p.id);
      toast({ title: "Partner archived", description: `${p.company_name} has been archived and will no longer send/receive EDI.` });
      load();
    } catch (err: unknown) {
      toast({ title: "Archive failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  }

  async function handleUnarchive(p: TradingPartner) {
    try {
      await unarchiveTradingPartner(p.id);
      toast({ title: "Partner restored", description: `${p.company_name} has been restored.` });
      load();
    } catch (err: unknown) {
      toast({ title: "Restore failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  }

  async function handleDelete(p: TradingPartner) {
    if (!confirm(`Permanently delete "${p.company_name}"? This cannot be undone.`)) return;
    try {
      await deleteTradingPartner(p.id);
      toast({ title: "Partner deleted", description: `${p.company_name} has been permanently removed.` });
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

  const displayToken = (p: TradingPartner) =>
    revealedId === p.id ? p.auth_token : (p.auth_token_masked ?? maskToken(p.auth_token));

  const activePartners   = partners.filter((p) => !p.is_archived);
  const archivedPartners = partners.filter((p) => p.is_archived);

  const filtered = (showArchived ? archivedPartners : activePartners).filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.company_name.toLowerCase().includes(q) || p.isa_receiver_id.toLowerCase().includes(q) || p.city.toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || p.edi_role === roleFilter;
    return matchSearch && matchRole;
  });

  const byRole = (role: TradingPartner["edi_role"]) => activePartners.filter((p) => p.edi_role === role).length;

  const pieData = (["BY", "SE", "SF", "ST"] as const)
    .map((r) => ({ name: ROLE_META[r].label, value: byRole(r), fill: ROLE_META[r].chart }))
    .filter((d) => d.value > 0);

  function PartnerCard({ p }: { p: TradingPartner }) {
    const meta = ROLE_META[p.edi_role];
    const approvedCount = products.length - (p.excluded_skus?.length ?? 0);
    return (
      <div key={p.id} className={`border border-border rounded-xl p-4 ${p.is_archived ? "opacity-60 bg-muted/30" : ""}`} data-testid={`card-partner-${p.id}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-foreground">{p.company_name}</p>
                <Badge className={`text-xs border ${meta.color}`}>{meta.label}</Badge>
                <Badge variant="secondary" className="text-xs font-mono">{p.isa_receiver_id.trim()}</Badge>
                {p.is_archived && <Badge variant="outline" className="text-xs text-muted-foreground">Archived</Badge>}
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
                  <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono truncate max-w-xs">{displayToken(p)}</code>
                  <button className="text-muted-foreground hover:text-foreground transition-colors" onClick={() => setRevealedId(revealedId === p.id ? null : p.id)} title={revealedId === p.id ? "Hide token" : "Show token"}>
                    {revealedId === p.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button className="text-muted-foreground hover:text-foreground transition-colors" onClick={() => copyToken(p)} title="Copy token">
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
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16 shrink-0">SKUs</span>
                  <span className="text-xs text-foreground">
                    {products.length === 0 ? "—" : `${approvedCount} / ${products.length} approved`}
                  </span>
                  <button
                    className="text-xs text-primary hover:underline flex items-center gap-0.5"
                    onClick={() => openSkuDialog(p)}
                  >
                    <Package className="w-3 h-3" /> Manage
                  </button>
                </div>
                {p.created_at && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">Since</span>
                    <span className="text-xs text-muted-foreground">{p.created_at.slice(0, 10)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!p.is_archived && (
              <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => openEdit(p)} title="Edit" data-testid={`button-edit-partner-${p.id}`}>
                <Edit className="w-3.5 h-3.5" />
              </Button>
            )}
            {p.is_archived ? (
              <Button size="icon" variant="ghost" className="w-8 h-8 text-green-600 hover:text-green-700" onClick={() => handleUnarchive(p)} title="Restore partner">
                <ArchiveRestore className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button size="icon" variant="ghost" className="w-8 h-8 text-amber-600 hover:text-amber-700" onClick={() => handleArchive(p)} title="Archive partner">
                <Archive className="w-3.5 h-3.5" />
              </Button>
            )}
            {p.is_archived && (
              <Button size="icon" variant="ghost" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => handleDelete(p)} title="Permanently delete" data-testid={`button-delete-partner-${p.id}`}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout role="admin" title="Contract Monitoring">
      <div className="p-6 space-y-6">

        {/* Stats — active partners only */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Active Partners",   value: activePartners.length,             icon: Users,        bg: "bg-slate-100", color: "text-slate-600" },
            { label: "Buyers",            value: byRole("BY"),                       icon: ShoppingCart, bg: "bg-blue-50",   color: "text-blue-600"  },
            { label: "Manufacturers",     value: byRole("SE"),                       icon: Factory,      bg: "bg-green-50",  color: "text-green-600" },
            { label: "Logistics / Other", value: byRole("SF") + byRole("ST"),        icon: Truck,        bg: "bg-purple-50", color: "text-purple-600" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Role distribution chart */}
        {pieData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Partners by EDI Role</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Partner list */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base">Trading Partners</CardTitle>
                {archivedPartners.length > 0 && (
                  <button
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${showArchived ? "bg-amber-100 text-amber-700 border-amber-300" : "text-muted-foreground border-border hover:border-amber-300 hover:text-amber-700"}`}
                    onClick={() => setShowArchived((v) => !v)}
                  >
                    {showArchived ? "Showing archived" : `${archivedPartners.length} archived`}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" className="w-8 h-8" onClick={load} disabled={loading} title="Refresh">
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                </Button>
                {!showArchived && (
                  <Button size="sm" className="gap-2" onClick={openAdd} data-testid="button-add-partner">
                    <Plus className="w-3.5 h-3.5" />Add Partner
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by company, ISA ID, city…" value={search}
                  onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-48 h-8 text-sm">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {EDI_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Loading partners…</div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center">
                <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">
                  {showArchived ? "No archived partners" : "No partners match your filters"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {!showArchived && (activePartners.length === 0 ? "Add your first trading partner to get started." : "Try adjusting the search or role filter.")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((p) => <PartnerCard key={p.id} p={p} />)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add / Edit partner dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
              <Input className="mt-1" placeholder="900 Romualdez St., Paco" value={form.address_line_1} onChange={(e) => field("address_line_1", e.target.value)} />
            </div>
            <div>
              <Label>Address Line 2</Label>
              <Input className="mt-1" placeholder="Suite / Unit (optional)" value={form.address_line_2} onChange={(e) => field("address_line_2", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>City <span className="text-destructive">*</span></Label>
                <Input className="mt-1" placeholder="Manila" value={form.city} onChange={(e) => field("city", e.target.value)} />
              </div>
              <div>
                <Label>State / Province</Label>
                <Input className="mt-1" placeholder="SC" maxLength={3} value={form.state} onChange={(e) => field("state", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Postal Code <span className="text-destructive">*</span></Label>
                <Input className="mt-1" placeholder="1007" value={form.postal_code} onChange={(e) => field("postal_code", e.target.value)} />
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
              <Input className="mt-1 font-mono text-xs" placeholder="https://edi.company.com/receive" value={form.api_endpoint} onChange={(e) => field("api_endpoint", e.target.value)} />
            </div>
            <div>
              <Label>Auth Token {!editTarget && <span className="text-destructive">*</span>}</Label>
              <Input className="mt-1 font-mono text-xs" placeholder={editTarget ? "Leave blank to keep current token" : "Paste token here"} value={form.auth_token} onChange={(e) => field("auth_token", e.target.value)} />
            </div>
            <div>
              <Label>Excluded SKUs</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">
                Items this partner is <strong>not</strong> permitted to order. Comma or line-separated. Leave blank for no restrictions.
              </p>
              <textarea
                className="w-full min-h-20 rounded-md border border-input bg-background px-3 py-2 text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                placeholder={"SKU-APF-001, SKU-APF-002"}
                value={form.excluded_skus_raw}
                onChange={(e) => field("excluded_skus_raw", e.target.value)}
                data-testid="input-excluded-skus"
              />
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saving} data-testid="button-save-partner">
              {saving ? "Saving…" : editTarget ? "Update Partner" : "Add Partner"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approved SKUs dialog */}
      <Dialog open={!!skuDialogPartner} onOpenChange={(open) => { if (!open) setSkuDialogPartner(null); }}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Approved SKUs — {skuDialogPartner?.company_name}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-1 mb-3">
            Check the products this partner is <strong>approved</strong> to trade with you. Unchecked items will be auto-rejected on 855 and excluded from 846 updates.
          </p>
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No products found.</p>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between pb-2 border-b border-border mb-2">
                <span className="text-xs text-muted-foreground">{skuApproved.size} of {products.length} approved</span>
                <div className="flex gap-2">
                  <button className="text-xs text-primary hover:underline" onClick={() => setSkuApproved(new Set(products.map((p) => p.sku.trim().toUpperCase())))}>
                    Select all
                  </button>
                  <button className="text-xs text-muted-foreground hover:underline" onClick={() => setSkuApproved(new Set())}>
                    Clear all
                  </button>
                </div>
              </div>
              {products.map((prod) => {
                const key = prod.sku.trim().toUpperCase();
                return (
                  <label key={prod.id} className="flex items-center gap-3 py-2 px-1 rounded hover:bg-muted/40 cursor-pointer">
                    <Checkbox
                      checked={skuApproved.has(key)}
                      onCheckedChange={(checked) => {
                        setSkuApproved((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add(key); else next.delete(key);
                          return next;
                        });
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{prod.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{prod.sku}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{prod.unit_of_measure}</span>
                  </label>
                );
              })}
            </div>
          )}
          <div className="flex gap-2 pt-2 border-t border-border mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setSkuDialogPartner(null)}>Cancel</Button>
            <Button className="flex-1" onClick={handleSaveSkus} disabled={skuSaving}>
              {skuSaving ? "Saving…" : "Save Approved SKUs"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
