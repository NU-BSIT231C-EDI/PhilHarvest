import { useState } from "react";
import { Plus, Building2, Edit, Trash2, Eye, EyeOff, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useToast } from "@/hooks/use-toast";

interface EdiCompany {
  id: string;
  name: string;
  address: string;
  zip: string;
  city: string;
  endpoint: string;
  token: string;
  active: boolean;
  docsSent: number;
  docsReceived: number;
}

const seed: EdiCompany[] = [
  { id: "ec1", name: "Puregold Price Club Inc.", address: "900 Romualdez St., Paco", zip: "1007", city: "Manila", endpoint: "https://edi.puregold.com.ph/api/v2/receive", token: "pgci_live_XkT9mV2nQ8sWpL3rYeHdBjFa", active: true, docsSent: 34, docsReceived: 28 },
  { id: "ec2", name: "Robinsons Supermarket", address: "Robinsons Galleria, EDSA cor. Ortigas Ave.", zip: "1600", city: "Quezon City", endpoint: "https://edi-gw.robinsons.com.ph/intake", token: "rsm_prod_AzNp7WxE1vKm4DqRuJcYtSbO", active: true, docsSent: 22, docsReceived: 19 },
  { id: "ec3", name: "SM Markets Philippines", address: "SM Mall of Asia Complex, Bay City", zip: "1300", city: "Pasay City", endpoint: "https://b2b.sm.com.ph/edi/endpoint", token: "smph_b2b_GhLn2TfPd5RsVjEwXcKqMiZo", active: true, docsSent: 18, docsReceived: 21 },
  { id: "ec4", name: "Metro Retail Stores Group", address: "GT Tower International, 6813 Ayala Ave.", zip: "1226", city: "Makati City", endpoint: "https://edi.metroretail.com.ph/recv", token: "mrsg_edi_CvYb8HpNe3TkWmJsLxQdFgUr", active: true, docsSent: 11, docsReceived: 14 },
  { id: "ec5", name: "LBC Express Inc.", address: "LBC Building, 290 Senator Gil Puyat Ave.", zip: "1200", city: "Makati City", endpoint: "https://api.lbcexpress.com/edi/v1/push", token: "lbc_edi_RtWq6MjDz9YeHnBvPsXcKaFl", active: false, docsSent: 6, docsReceived: 4 },
];

function maskToken(token: string) {
  return token.slice(0, 8) + "•".repeat(token.length - 12) + token.slice(-4);
}

const emptyForm = { name: "", address: "", zip: "", city: "", endpoint: "", token: "" };

export default function EdiCompanies() {
  const [companies, setCompanies] = useState<EdiCompany[]>(seed);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EdiCompany | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  function openAdd() {
    setEditTarget(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(c: EdiCompany) {
    setEditTarget(c);
    setForm({ name: c.name, address: c.address, zip: c.zip, city: c.city, endpoint: c.endpoint, token: c.token });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.name.trim() || !form.endpoint.trim() || !form.token.trim()) {
      toast({ title: "Missing required fields", description: "Name, Endpoint, and Token are required.", variant: "destructive" });
      return;
    }
    if (editTarget) {
      setCompanies((prev) => prev.map((c) => c.id === editTarget.id ? { ...c, ...form } : c));
      toast({ title: "Company updated", description: `${form.name} has been updated.` });
    } else {
      const newCo: EdiCompany = {
        id: `ec-${Date.now()}`,
        ...form,
        active: true,
        docsSent: 0,
        docsReceived: 0,
      };
      setCompanies((prev) => [newCo, ...prev]);
      toast({ title: "Company added", description: `${form.name} added as a trading partner.` });
    }
    setDialogOpen(false);
  }

  function handleDelete(id: string, name: string) {
    if (confirm(`Remove "${name}" from trading partners?`)) {
      setCompanies((prev) => prev.filter((c) => c.id !== id));
      toast({ title: "Company removed", description: `${name} has been removed.` });
    }
  }

  function toggleActive(id: string) {
    setCompanies((prev) => prev.map((c) => c.id === id ? { ...c, active: !c.active } : c));
  }

  function copyToken(id: string, token: string) {
    navigator.clipboard.writeText(token).then(() => {
      setCopiedId(id);
      toast({ title: "Token copied to clipboard" });
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function field(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <DashboardLayout role="admin" title="EDI Trading Partners">
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{companies.length} trading partner{companies.length !== 1 ? "s" : ""} configured</p>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={openAdd} data-testid="button-add-company">
                <Plus className="w-4 h-4" />Add Company
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editTarget ? "Edit Trading Partner" : "Add Trading Partner"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-1">
                <div>
                  <Label>Company Name <span className="text-destructive">*</span></Label>
                  <Input className="mt-1" placeholder="e.g. Puregold Price Club Inc." value={form.name} onChange={(e) => field("name", e.target.value)} data-testid="input-company-name" />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input className="mt-1" placeholder="Street address" value={form.address} onChange={(e) => field("address", e.target.value)} data-testid="input-company-address" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>ZIP Code</Label>
                    <Input className="mt-1" placeholder="1007" value={form.zip} onChange={(e) => field("zip", e.target.value)} data-testid="input-company-zip" />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input className="mt-1" placeholder="Manila" value={form.city} onChange={(e) => field("city", e.target.value)} data-testid="input-company-city" />
                  </div>
                </div>
                <div>
                  <Label>EDI Endpoint URL <span className="text-destructive">*</span></Label>
                  <Input className="mt-1 font-mono text-xs" placeholder="https://edi.company.com/receive" value={form.endpoint} onChange={(e) => field("endpoint", e.target.value)} data-testid="input-company-endpoint" />
                </div>
                <div>
                  <Label>API Token <span className="text-destructive">*</span></Label>
                  <Input className="mt-1 font-mono text-xs" placeholder="Paste token here" value={form.token} onChange={(e) => field("token", e.target.value)} data-testid="input-company-token" />
                </div>
                <Button className="w-full" onClick={handleSave} data-testid="button-save-company">
                  {editTarget ? "Update Company" : "Add Company"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          {companies.map((c) => (
            <Card key={c.id} className={`border-card-border transition-opacity ${!c.active ? "opacity-60" : ""}`} data-testid={`card-company-${c.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-foreground">{c.name}</p>
                        <Badge variant={c.active ? "default" : "secondary"} className="text-xs">
                          {c.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.address}, {c.city} {c.zip}</p>
                      <div className="mt-2 flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-16 shrink-0">Endpoint</span>
                          <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono truncate max-w-xs">{c.endpoint}</code>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-16 shrink-0">Token</span>
                          <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono truncate max-w-xs">
                            {revealedId === c.id ? c.token : maskToken(c.token)}
                          </code>
                          <button
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setRevealedId(revealedId === c.id ? null : c.id)}
                            title={revealedId === c.id ? "Hide token" : "Show token"}
                            data-testid={`button-reveal-${c.id}`}
                          >
                            {revealedId === c.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => copyToken(c.id, c.token)}
                            title="Copy token"
                            data-testid={`button-copy-token-${c.id}`}
                          >
                            {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-4 mt-2">
                        <span className="text-xs text-muted-foreground">Sent: <strong className="text-foreground">{c.docsSent}</strong></span>
                        <span className="text-xs text-muted-foreground">Received: <strong className="text-foreground">{c.docsReceived}</strong></span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => toggleActive(c.id)} title={c.active ? "Deactivate" : "Activate"} data-testid={`button-toggle-${c.id}`}>
                      {c.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => openEdit(c)} data-testid={`button-edit-company-${c.id}`}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => handleDelete(c.id, c.name)} data-testid={`button-delete-company-${c.id}`}>
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
