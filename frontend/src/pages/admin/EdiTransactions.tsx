import { useEffect, useState, useCallback } from "react";
import { Search, Download, RefreshCw, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DashboardLayout from "@/layouts/DashboardLayout";
import StatusBadge from "@/components/shared/StatusBadge";
import {
  fetchTransactions,
  retryTransmission,
  typeLabel,
  mapStatus,
  formatDate,
  type BackendTransaction,
} from "@/services/ediApi";
import { useEdiPrefill } from "@/store/ediPrefill";
import { useToast } from "@/hooks/use-toast";

type DocStatus = "delivered" | "pending" | "validated" | "error";

interface EdiDoc {
  id: string;
  type: string;
  label: string;
  company: string;
  direction: "inbound" | "outbound";
  status: DocStatus;
  date: string;
  isaControl: string;
  raw?: string;
  parsedData?: Record<string, unknown> | null;
  backendId: number;
  backendStatus: string;
  partnerId: string;
}

const typeColors: Record<string, string> = {
  "850": "bg-blue-50 text-blue-700 border-blue-200",
  "855": "bg-green-50 text-green-700 border-green-200",
  "856": "bg-purple-50 text-purple-700 border-purple-200",
  "810": "bg-amber-50 text-amber-700 border-amber-200",
  "997": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "204": "bg-orange-50 text-orange-700 border-orange-200",
  "990": "bg-teal-50 text-teal-700 border-teal-200",
};

function mapTransaction(t: BackendTransaction): EdiDoc {
  return {
    id:            `EDI-${String(t.id).padStart(4, '0')}`,
    type:          t.transaction_type,
    label:         typeLabel(t.transaction_type),
    company:       t.partner_id,
    direction:     t.direction,
    status:        mapStatus(t.status),
    date:          formatDate(t.created_at),
    isaControl:    t.control_number,
    raw:           t.payload_preview || undefined,
    parsedData:    t.parsed_data,
    backendId:     t.id,
    backendStatus: t.status,
    partnerId:     t.partner_id,
  };
}

function downloadRaw(doc: EdiDoc) {
  if (!doc.raw) return;
  const blob = new Blob([doc.raw], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: `${doc.id}.edi` });
  a.click();
  URL.revokeObjectURL(url);
}

const PHILHARVEST_ADDRESS = {
  street: "458 Mabini St., Brgy. Santo Nino",
  city: "General Santos City",
  state: "SC",
  postal_code: "9500",
  country: "PH",
};

function build856Prefill(doc: EdiDoc): Record<string, unknown> {
  const d = doc.parsedData ?? {};
  const today = new Date().toISOString().slice(0, 10);
  const rawShipTo = d.ship_to_address as Record<string, string> | null | undefined;
  const rawLines  = (d.line_items as Array<Record<string, unknown>> | undefined) ?? [];

  return {
    asn_number: `ASN-${today}-001`,
    po_number:  (d.po_number  as string | undefined) ?? '',
    po_date:    (d.po_date    as string | undefined) ?? today,
    manufacturer_id: doc.partnerId,
    ship_date: today,
    ship_from_address: PHILHARVEST_ADDRESS,
    ship_to_address: {
      company_name: rawShipTo?.company_name ?? '',
      street:       rawShipTo?.street       ?? '',
      city:         rawShipTo?.city         ?? '',
      state:        rawShipTo?.state        ?? '',
      postal_code:  rawShipTo?.postal_code  ?? '',
      country:      rawShipTo?.country      ?? 'PH',
    },
    boxes: [{
      box_number: '1',
      line_items: rawLines.map((li, i) => ({
        line_number:      String(li.line_number ?? i + 1),
        part_number:      (li.part_number      as string | undefined) ?? '',
        part_description: (li.part_description as string | undefined) ?? '',
        shipped_quantity: Number(li.quantity ?? 0),
        quantity_uom:     (li.quantity_uom     as string | undefined) ?? 'EA',
      })),
    }],
  };
}

function build204Prefill(doc: EdiDoc): Record<string, unknown> {
  const d = doc.parsedData ?? {};
  const today = new Date().toISOString().slice(0, 10);
  const rawShipTo = d.ship_to_address as Record<string, string> | null | undefined;

  return {
    load_tender_id: `LOAD-${today}-001`,
    consignee_company_name: rawShipTo?.company_name ?? '',
    consignee_address: {
      street:      rawShipTo?.street      ?? '',
      city:        rawShipTo?.city        ?? '',
      state:       rawShipTo?.state       ?? '',
      postal_code: rawShipTo?.postal_code ?? '',
      country:     rawShipTo?.country     ?? 'PH',
    },
    pickup_date:   today,
    delivery_date: (d.delivery_date as string | undefined) ?? (d.shipping_date as string | undefined) ?? today,
  };
}

function build855Prefill(doc: EdiDoc): Record<string, unknown> {
  const d = doc.parsedData ?? {};
  const today = new Date().toISOString().slice(0, 10);
  const rawLines = (d.line_items as Array<Record<string, unknown>> | undefined) ?? [];

  return {
    po_number:           (d.po_number as string | undefined) ?? '',
    po_date:             (d.po_date   as string | undefined) ?? today,
    manufacturer_id:     doc.partnerId,
    acknowledgment_code: 'AA',
    seller_address:      PHILHARVEST_ADDRESS,
    line_acknowledgments: rawLines.map((li, i) => ({
      line_number:         String(li.line_number ?? i + 1),
      acknowledgment_code: 'AA',
      accepted_quantity:   Number(li.quantity ?? 0),
      quantity_uom:        (li.quantity_uom as string | undefined) ?? 'EA',
      part_number:         (li.part_number  as string | undefined) ?? '',
    })),
  };
}

export default function EdiTransactions() {
  const [allDocs, setAllDocs]           = useState<EdiDoc[]>([]);
  const [loading, setLoading]           = useState(true);
  const [retrying, setRetrying]         = useState<number | null>(null);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter]     = useState("all");
  const [dirFilter, setDirFilter]       = useState("all");
  const [selected, setSelected]         = useState<EdiDoc | null>(null);
  const { toast } = useToast();
  const { setPrefill } = useEdiPrefill();
  const [, navigate] = useLocation();

  const loadDocs = useCallback(() => {
    setLoading(true);
    fetchTransactions()
      .then((data) => setAllDocs(data.map(mapTransaction)))
      .catch((err) => toast({ title: "Failed to load transactions", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  useEffect(() => {
    const id = window.setInterval(loadDocs, 10_000);
    return () => window.clearInterval(id);
  }, [loadDocs]);

  async function handleRetry(doc: EdiDoc) {
    setRetrying(doc.backendId);
    try {
      await retryTransmission(doc.backendId);
      toast({ title: "Retry queued", description: `Transaction ${doc.id} has been queued for retry.` });
      loadDocs();
    } catch (err: unknown) {
      toast({ title: "Retry failed", description: err instanceof Error ? err.message : 'Unknown error', variant: "destructive" });
    } finally {
      setRetrying(null);
    }
  }

  function goToOutboundWith204(doc: EdiDoc) {
    setPrefill({ ediType: "204", body: build204Prefill(doc), sourceDescription: `From 850 ${doc.id}` });
    setSelected(null);
    navigate("/admin/edi/outbound");
  }

  function goToOutboundWith856(doc: EdiDoc) {
    setPrefill({ ediType: "856", body: build856Prefill(doc), sourceDescription: `From 850 ${doc.id}` });
    setSelected(null);
    navigate("/admin/edi/outbound");
  }

  function goToOutboundWith855(doc: EdiDoc) {
    setPrefill({ ediType: "855", body: build855Prefill(doc), sourceDescription: `From 850 ${doc.id}` });
    setSelected(null);
    navigate("/admin/edi/outbound");
  }

  const filtered = allDocs.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch = !q || d.id.toLowerCase().includes(q) || d.company.toLowerCase().includes(q) || d.type.includes(q);
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    const matchType   = typeFilter   === "all" || d.type    === typeFilter;
    const matchDir    = dirFilter    === "all" || d.direction === dirFilter;
    return matchSearch && matchStatus && matchType && matchDir;
  });

  return (
    <DashboardLayout role="admin" title="EDI Transaction Inbox">
      <div className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by Doc ID, company, or type…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search-edi" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36" data-testid="select-edi-type"><SelectValue placeholder="Doc Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="850">850 — Purchase Order</SelectItem>
              <SelectItem value="855">855 — PO Acknowledgment</SelectItem>
              <SelectItem value="856">856 — Ship Notice</SelectItem>
              <SelectItem value="810">810 — Invoice</SelectItem>
              <SelectItem value="204">204 — Load Tender</SelectItem>
              <SelectItem value="990">990 — Load Tender Response</SelectItem>
              <SelectItem value="997">997 — Functional Ack.</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36" data-testid="select-edi-status"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dirFilter} onValueChange={setDirFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Direction" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="inbound">Inbound</SelectItem>
              <SelectItem value="outbound">Outbound</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" title="Refresh" onClick={loadDocs} disabled={loading} data-testid="button-refresh-edi">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">{filtered.length} document{filtered.length !== 1 ? "s" : ""} found · auto-refreshes every 10s</p>

        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Doc ID</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Company</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Direction</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">ISA Control</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Date</th>
                  <th className="text-right px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-6 text-center text-xs text-muted-foreground">Loading transactions…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-6 text-center text-xs text-muted-foreground">No transactions found.</td></tr>
                ) : filtered.map((doc) => (
                  <tr key={doc.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-txn-${doc.id}`}>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-foreground">{doc.id}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold ${typeColors[doc.type] ?? "bg-muted"}`}>{doc.type}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground max-w-37.5 truncate">{doc.company}</td>
                    <td className="px-4 py-3">
                      <Badge variant={doc.direction === "inbound" ? "secondary" : "outline"} className="text-xs">{doc.direction === "inbound" ? "Inbound" : "Outbound"}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{doc.isaControl}</td>
                    <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">{doc.date}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        {doc.type === "850" && doc.direction === "inbound" && (
                          <>
                            <Button size="sm" variant="outline" className="text-xs h-7 px-2 gap-0.5 border-purple-300 text-purple-700 hover:bg-purple-50" onClick={() => goToOutboundWith856(doc)} title="Pre-fill 856 ASN from this PO" data-testid={`button-send856-${doc.id}`}>
                              <ArrowRight className="w-3 h-3" />856
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs h-7 px-2 gap-0.5 border-green-300 text-green-700 hover:bg-green-50" onClick={() => goToOutboundWith855(doc)} title="Pre-fill 855 ACK from this PO" data-testid={`button-send855-${doc.id}`}>
                              <ArrowRight className="w-3 h-3" />855
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs h-7 px-2 gap-0.5 border-orange-300 text-orange-700 hover:bg-orange-50" onClick={() => goToOutboundWith204(doc)} title="Pre-fill 204 Load Tender from this PO" data-testid={`button-send204-${doc.id}`}>
                              <ArrowRight className="w-3 h-3" />204
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" className="text-xs h-7 px-2" onClick={() => setSelected(doc)} data-testid={`button-view-txn-${doc.id}`}>View</Button>
                        <Button size="icon" variant="ghost" className="w-7 h-7" title="Download" disabled={!doc.raw} onClick={() => downloadRaw(doc)} data-testid={`button-dl-${doc.id}`}>
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selected?.id}
                <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold ${typeColors[selected?.type ?? ""] ?? "bg-muted"}`}>
                  {selected?.type} — {selected?.label}
                </span>
              </DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs text-muted-foreground">Company</p><p className="font-medium">{selected.company}</p></div>
                  <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={selected.status} /></div>
                  <div><p className="text-xs text-muted-foreground">Direction</p><p className="font-medium capitalize">{selected.direction}</p></div>
                  <div><p className="text-xs text-muted-foreground">Date</p><p className="font-medium">{selected.date}</p></div>
                  <div><p className="text-xs text-muted-foreground">ISA Control #</p><p className="font-mono font-medium">{selected.isaControl}</p></div>
                </div>
                {selected.raw && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Raw EDI Payload</p>
                    <pre className="bg-muted text-xs p-3 rounded-lg font-mono break-all whitespace-pre-wrap text-foreground overflow-auto max-h-48">{selected.raw}</pre>
                  </div>
                )}
                <div className="flex gap-2 flex-wrap pt-1">
                  {selected.type === "850" && selected.direction === "inbound" && (
                    <>
                      <Button size="sm" className="gap-1.5 bg-purple-600 hover:bg-purple-700" onClick={() => goToOutboundWith856(selected)} data-testid="button-send856-dialog">
                        <ArrowRight className="w-3.5 h-3.5" />Send 856 ASN
                      </Button>
                      <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700" onClick={() => goToOutboundWith855(selected)} data-testid="button-send855-dialog">
                        <ArrowRight className="w-3.5 h-3.5" />Send 855 ACK
                      </Button>
                      <Button size="sm" className="gap-1.5 bg-orange-600 hover:bg-orange-700" onClick={() => goToOutboundWith204(selected)} data-testid="button-send204-dialog">
                        <ArrowRight className="w-3.5 h-3.5" />Send 204 Load Tender
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" className="gap-1.5" disabled={!selected.raw} onClick={() => downloadRaw(selected)} data-testid="button-download-doc">
                    <Download className="w-3.5 h-3.5" />Download
                  </Button>
                  {selected.backendStatus === 'FAILED' && selected.direction === 'outbound' && (
                    <Button size="sm" variant="outline" className="gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50" disabled={retrying === selected.backendId} onClick={() => handleRetry(selected)} data-testid="button-retry-doc">
                      <RefreshCw className={`w-3.5 h-3.5 ${retrying === selected.backendId ? 'animate-spin' : ''}`} />
                      {retrying === selected.backendId ? 'Retrying…' : 'Retry'}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
