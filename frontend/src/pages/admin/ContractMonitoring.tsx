import { useState, useEffect, useCallback } from "react";
import {
  Building2, Plus, Search, Edit, Trash2, Eye, EyeOff,
  Copy, Check, RefreshCw, Users, ShoppingCart, Factory, Truck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import {
  fetchTradingPartners,
  createTradingPartner,
  updateTradingPartner,
  deleteTradingPartner,
  type TradingPartner,
} from "@/services/ediApi";

const ROLE_META: Record<TradingPartner["edi_role"], { label: string; color: string; icon: React.ElementType; chart: string }> = {
  BY: { label: "Buyer",         color: "bg-blue-100 text-blue-700 border-blue-200",    icon: ShoppingCart, chart: "#3b82f6" },
  SE: { label: "Manufacturer",  color: "bg-green-100 text-green-700 border-green-200", icon: Factory,      chart: "#22c55e" },
  SF: { label: "Ship From",     color: "bg-purple-100 text-purple-700 border-purple-200", icon: Truck,     chart: "#a855f7" },
  ST: { label: "Ship To",       color: "bg-orange-100 text-orange-700 border-orange-200", icon: Truck,     chart: "#f97316" },
};

const EDI_ROLES = [
  { value: "BY", label: "BY — Buyer" },
  { value: "SE", label: "SE — Selling Party / Manufacturer" },
  { value: "SF", label: "SF — Ship From" },
  { value: "ST", label: "ST — Ship To" },
];

const emptyForm = {
  label:           "",
  isa_receiver_id: "",
  company_name:    "",
  edi_role:        "BY" as TradingPartner["edi_role"],
  address_line_1:  "",
  address_line_2:  "",
  city:            "",
  state:           "",
  postal_code:     "",
  country:         "PH",
  po_number_format: "PO-{number}",
  default_currency: "PHP",
  api_endpoint:    "",
  auth_token:      "",
};
type FormState = typeof emptyForm;

function maskToken(token: string) {
  if (!token) return "—";
  return token.slice(0, 8) + "•".repeat(Math.max(token.length - 12, 4)) + token.slice(-4);
}

export default function ContractMonitoring() {
  const [partners, setPartners]     = useState<TradingPartner[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [search, setSearch]         = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TradingPartner | null>(null);
  const [form, setForm]             = useState<FormState>(emptyForm);
  const [revealedId, setRevealedId] = useState<number | null>(null);
  const [copiedId, setCopiedId]     = useState<number | null>(null);
  const { toast } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    fetchTradingPartners()
      .then(setPartners)
      .catch((err) => toast({ title: "Failed to load partners", description: err.message, variant: "destructive" }))
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
      label:            p.label,
      isa_receiver_id:  p.isa_receiver_id.trim(),
      company_name:     p.company_name,
      edi_role:         p.edi_role,
      address_line_1:   p.address_line_1,
      address_line_2:   p.address_line_2 ?? "",
      city:             p.city,
      state:            p.state ?? "",
      postal_code:      p.postal_code,
      country:          p.country,
      po_number_format: p.po_number_format,
      default_currency: p.default_currency,
      api_endpoint:     p.api_endpoint,
      auth_token:       "",
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
      const payload = { ...form, label: form.label || form.company_name } as Omit<TradingPartner, "id" | "auth_token_masked" | "n1_segments" | "created_at" | "updated_at">;
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

  const displayToken = (p: TradingPartner) =>
    revealedId === p.id ? p.auth_token : (p.auth_token_masked ?? maskToken(p.auth_token));

  const filtered = partners.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.company_name.toLowerCase().includes(q) || p.isa_receiver_id.toLowerCase().includes(q) || p.city.toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || p.edi_role === roleFilter;
    return matchSearch && matchRole;
  });

  // Stats
  const byRole = (role: TradingPartner["edi_role"]) => partners.filter((p) => p.edi_role === role).length;

  const pieData = (["BY", "SE", "SF", "ST"] as const)
    .map((r) => ({ name: ROLE_META[r].label, value: byRole(r), fill: ROLE_META[r].chart }))
    .filter((d) => d.value > 0);

  return (
    <DashboardLayout role="admin" title="Contract Monitoring">
      <div className="p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Partners",    value: partners.length, icon: Users,        bg: "bg-slate-100",   color: "text-slate-600" },
            { label: "Buyers",            value: byRole("BY"),    icon: ShoppingCart, bg: "bg-blue-50",     color: "text-blue-600"  },
            { label: "Manufacturers",     value: byRole("SE"),    icon: Factory,      bg: "bg-green-50",    color: "text-green-600" },
            { label: "Logistics / Other", value: byRole("SF") + byRole("ST"), icon: Truck, bg: "bg-purple-50", color: "text-purple-600" },
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
              <CardTitle className="text-base">Trading Partners</CardTitle>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" className="w-8 h-8" onClick={load} disabled={loading} title="Refresh">
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                </Button>
                <Button size="sm" className="gap-2" onClick={openAdd} data-testid="button-add-partner">
                  <Plus className="w-3.5 h-3.5" />Add Partner
                </Button>
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
                <p className="text-sm font-medium text-foreground">No partners match your filters</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {partners.length === 0 ? "Add your first trading partner to get started." : "Try adjusting the search or role filter."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((p) => {
                  const meta = ROLE_META[p.edi_role];
                  return (
                    <div key={p.id} className="border border-border rounded-xl p-4" data-testid={`card-partner-${p.id}`}>
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
                                <button
                                  className="text-muted-foreground hover:text-foreground transition-colors"
                                  onClick={() => setRevealedId(revealedId === p.id ? null : p.id)}
                                  title={revealedId === p.id ? "Hide token" : "Show token"}
                                >
                                  {revealedId === p.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  className="text-muted-foreground hover:text-foreground transition-colors"
                                  onClick={() => copyToken(p)}
                                  title="Copy token"
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
                          <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => openEdit(p)} data-testid={`button-edit-partner-${p.id}`}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => handleDelete(p)} data-testid={`button-delete-partner-${p.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add / Edit dialog */}
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
            <Button className="w-full" onClick={handleSave} disabled={saving} data-testid="button-save-partner">
              {saving ? "Saving…" : editTarget ? "Update Partner" : "Add Partner"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
