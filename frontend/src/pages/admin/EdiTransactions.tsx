import { useEffect, useState, useCallback } from "react";
import { Search, Download, RefreshCw, ArrowRight, ChevronDown, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

interface Thread {
  po: EdiDoc;
  docs855: EdiDoc[];
  docs204: EdiDoc[];
  docs990: EdiDoc[];
  docs856: EdiDoc[];
  docs810: EdiDoc[];
}

interface ThreadState {
  can855: boolean;
  can204: boolean;
  can856: boolean;
  can810: boolean;
  isRejected: boolean;
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

const sendButtonStyle: Record<string, string> = {
  "855": "border-green-300 text-green-700 hover:bg-green-50",
  "856": "border-purple-300 text-purple-700 hover:bg-purple-50",
  "810": "border-amber-300 text-amber-700 hover:bg-amber-50",
  "204": "border-orange-300 text-orange-700 hover:bg-orange-50",
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

function build810Prefill(doc: EdiDoc): Record<string, unknown> {
  const d = doc.parsedData ?? {};
  const today = new Date().toISOString().slice(0, 10);
  const rawLines  = (d.line_items as Array<Record<string, unknown>> | undefined) ?? [];
  const rawBillTo = d.ship_to_address as Record<string, string> | null | undefined;
  return {
    invoice_number: `INV-${today}-001`,
    invoice_date:   today,
    po_number:      (d.po_number as string | undefined) ?? '',
    po_date:        (d.po_date   as string | undefined) ?? today,
    manufacturer_id: doc.partnerId,
    bill_to_name:   rawBillTo?.company_name ?? '',
    bill_to_address: {
      street:      rawBillTo?.street      ?? '',
      city:        rawBillTo?.city        ?? '',
      state:       rawBillTo?.state       ?? '',
      postal_code: rawBillTo?.postal_code ?? '',
      country:     rawBillTo?.country     ?? 'PH',
    },
    line_items: rawLines.map((li, i) => ({
      line_number:      String(li.line_number ?? i + 1),
      po_line_number:   String(li.line_number ?? i + 1),
      part_number:      (li.part_number      as string | undefined) ?? '',
      part_description: (li.part_description as string | undefined) ?? '',
      invoiced_quantity: Number(li.quantity ?? 0),
      quantity_uom:     (li.quantity_uom     as string | undefined) ?? 'EA',
      unit_price:       Number(li.unit_price ?? 0),
    })),
  };
}

// ── Thread building ──────────────────────────────────────────────────────────

function buildThreads(docs: EdiDoc[]): { threads: Thread[]; orphans: EdiDoc[] } {
  const inbound850s = docs
    .filter((d) => d.type === "850" && d.direction === "inbound")
    .sort((a, b) => b.date.localeCompare(a.date));

  const used = new Set<string>();
  inbound850s.forEach((d) => used.add(d.id));

  const threads: Thread[] = inbound850s.map((po) => {
    const poNum = po.parsedData?.po_number as string | undefined;

    function byPoNumber(d: EdiDoc) {
      if (used.has(d.id)) return false;
      const dPo = d.parsedData?.po_number as string | undefined;
      return !!poNum && !!dPo && dPo === poNum;
    }

    function byPartner(type: string) {
      return (d: EdiDoc) => !used.has(d.id) && d.type === type && d.partnerId === po.partnerId;
    }

    function take(filter: (d: EdiDoc) => boolean): EdiDoc[] {
      const found = docs.filter(filter);
      found.forEach((d) => used.add(d.id));
      return found;
    }

    return {
      po,
      docs855: take((d) => byPoNumber(d) && d.type === "855"),
      docs856: take((d) => byPoNumber(d) && d.type === "856"),
      docs810: take((d) => byPoNumber(d) && d.type === "810"),
      docs204: take(byPartner("204")),
      docs990: take(byPartner("990")),
    };
  });

  const orphans = docs.filter((d) => !used.has(d.id));
  return { threads, orphans };
}

function getThreadState(t: Thread): ThreadState {
  const latest855 = [...t.docs855].sort((a, b) => b.date.localeCompare(a.date))[0];
  const has855Delivered = latest855?.status === "delivered";
  const isRejected =
    has855Delivered &&
    (latest855?.parsedData?.acknowledgment_code as string | undefined) === "RE";
  const has856 = t.docs856.length > 0;

  return {
    can855: t.docs855.length === 0,
    can204: has855Delivered && !isRejected && t.docs204.length === 0,
    can856: has855Delivered && !isRejected && t.docs856.length === 0,
    can810: has856 && t.docs810.length === 0,
    isRejected,
  };
}

// ── Sub-components ───────────────────────────────────────────────────────────

function DocStep({
  docType, label, docs, canSend, onSend, onView, locked, inbound,
}: {
  docType: string;
  label: string;
  docs: EdiDoc[];
  canSend: boolean;
  onSend?: () => void;
  onView: (doc: EdiDoc) => void;
  locked?: boolean;
  inbound?: boolean;
}) {
  const lastDoc = docs[docs.length - 1];

  return (
    <div
      className={`flex items-center gap-3 px-5 py-2.5 text-sm ${locked ? "opacity-35 pointer-events-none" : ""}`}
    >
      <div className="w-3 shrink-0 flex flex-col items-center">
        <div className="w-px flex-1 bg-border" />
        <div className="w-1.5 h-1.5 rounded-full bg-border" />
        <div className="w-px flex-1 bg-border" />
      </div>

      <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold shrink-0 ${typeColors[docType] ?? "bg-muted"}`}>
        {docType}
      </span>

      <span className="text-xs text-foreground/70 flex-1">
        {label}
        {inbound && <span className="ml-1 text-xs text-muted-foreground">(received)</span>}
      </span>

      <div className="flex items-center gap-2 shrink-0">
        {lastDoc ? (
          <>
            <StatusBadge status={lastDoc.status} />
            <span className="text-xs text-muted-foreground whitespace-nowrap">{lastDoc.date}</span>
            <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => onView(lastDoc)}>
              View
            </Button>
          </>
        ) : canSend && onSend ? (
          <Button
            size="sm" variant="outline"
            className={`h-6 text-xs px-2 gap-0.5 ${sendButtonStyle[docType] ?? ""}`}
            onClick={onSend}
          >
            <ArrowRight className="w-3 h-3" />Send {docType}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground italic">Awaiting</span>
        )}
      </div>
    </div>
  );
}

function ThreadRow({
  thread, expanded, onToggle, onView, actions,
}: {
  thread: Thread;
  expanded: boolean;
  onToggle: () => void;
  onView: (doc: EdiDoc) => void;
  actions: {
    send855: (po: EdiDoc) => void;
    send204: (po: EdiDoc) => void;
    send856: (po: EdiDoc) => void;
    send810: (po: EdiDoc) => void;
  };
}) {
  const state = getThreadState(thread);
  const { po } = thread;
  const poNumber = po.parsedData?.po_number as string | undefined;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* 850 header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
        onClick={onToggle}
      >
        {expanded
          ? <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
          : <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />}

        <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold shrink-0 ${typeColors["850"]}`}>
          850
        </span>

        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-foreground">{po.company}</span>
          {poNumber && (
            <span className="text-xs text-muted-foreground ml-2 font-mono">PO# {poNumber}</span>
          )}
        </div>

        <StatusBadge status={po.status} />
        <span className="text-xs text-muted-foreground whitespace-nowrap">{po.date}</span>
        <Button
          size="sm" variant="ghost" className="h-6 text-xs px-2 shrink-0"
          onClick={(e) => { e.stopPropagation(); onView(po); }}
        >
          View
        </Button>
      </button>

      {/* Thread steps */}
      {expanded && (
        <div className="border-t border-border bg-muted/10 divide-y divide-border/40 pb-1">
          {state.isRejected && (
            <div className="px-5 py-2 bg-red-50 border-b border-red-200">
              <p className="text-xs text-red-700 font-medium">
                855 was rejected — subsequent steps are unavailable
              </p>
            </div>
          )}
          <DocStep
            docType="855" label="PO Acknowledgment"
            docs={thread.docs855} canSend={state.can855}
            onSend={() => actions.send855(po)} onView={onView}
          />
          <DocStep
            docType="204" label="Load Tender"
            docs={thread.docs204} canSend={state.can204}
            onSend={() => actions.send204(po)} onView={onView}
            locked={state.isRejected}
          />
          <DocStep
            docType="990" label="Load Tender Response"
            docs={thread.docs990} canSend={false}
            onView={onView} locked={state.isRejected} inbound
          />
          <DocStep
            docType="856" label="Advance Ship Notice"
            docs={thread.docs856} canSend={state.can856}
            onSend={() => actions.send856(po)} onView={onView}
            locked={state.isRejected}
          />
          <DocStep
            docType="810" label="Invoice"
            docs={thread.docs810} canSend={state.can810}
            onSend={() => actions.send810(po)} onView={onView}
            locked={state.isRejected || (!state.can810 && thread.docs810.length === 0 && thread.docs856.length === 0)}
          />
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function EdiTransactions() {
  const [allDocs, setAllDocs]   = useState<EdiDoc[]>([]);
  const [loading, setLoading]   = useState(true);
  const [retrying, setRetrying] = useState<number | null>(null);
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<EdiDoc | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
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
      toast({ title: "Retry queued", description: `Transaction ${doc.id} queued for retry.` });
      loadDocs();
    } catch (err: unknown) {
      toast({ title: "Retry failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setRetrying(null);
    }
  }

  function prefillAndGo(ediType: "855" | "856" | "810" | "204", body: Record<string, unknown>, sourceId: string) {
    setPrefill({ ediType, body, sourceDescription: `From 850 ${sourceId}` });
    navigate("/admin/edi/outbound");
  }

  const { threads, orphans } = buildThreads(allDocs);

  const filteredThreads = threads.filter((t) => {
    const q = search.toLowerCase();
    if (!q) return true;
    const poNum = (t.po.parsedData?.po_number as string | undefined) ?? "";
    return (
      t.po.company.toLowerCase().includes(q) ||
      t.po.id.toLowerCase().includes(q) ||
      poNum.toLowerCase().includes(q)
    );
  });

  function toggleThread(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const actions = {
    send855: (po: EdiDoc) => prefillAndGo("855", build855Prefill(po), po.id),
    send204: (po: EdiDoc) => prefillAndGo("204", build204Prefill(po), po.id),
    send856: (po: EdiDoc) => prefillAndGo("856", build856Prefill(po), po.id),
    send810: (po: EdiDoc) => prefillAndGo("810", build810Prefill(po), po.id),
  };

  return (
    <DashboardLayout role="admin" title="EDI Transaction Inbox">
      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by company or PO number…"
              className="pl-9" value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-edi"
            />
          </div>
          <Button variant="outline" size="icon" title="Refresh" onClick={loadDocs} disabled={loading} data-testid="button-refresh-edi">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {filteredThreads.length} purchase order{filteredThreads.length !== 1 ? "s" : ""} · auto-refreshes every 10s
        </p>

        {/* Threads */}
        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground">Loading transactions…</div>
        ) : filteredThreads.length === 0 && !loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground">No inbound purchase orders found.</div>
        ) : (
          <div className="space-y-3">
            {filteredThreads.map((thread) => (
              <ThreadRow
                key={thread.po.id}
                thread={thread}
                expanded={expanded.has(thread.po.id)}
                onToggle={() => toggleThread(thread.po.id)}
                onView={setSelected}
                actions={actions}
              />
            ))}
          </div>
        )}

        {/* Orphaned docs not linked to any 850 */}
        {orphans.length > 0 && !loading && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Other Documents
            </p>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  {orphans.map((doc) => (
                    <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-foreground">{doc.id}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold ${typeColors[doc.type] ?? "bg-muted"}`}>
                          {doc.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground">{doc.company}</td>
                      <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{doc.date}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setSelected(doc)} data-testid={`button-view-txn-${doc.id}`}>View</Button>
                          <Button size="icon" variant="ghost" className="w-7 h-7" disabled={!doc.raw} onClick={() => downloadRaw(doc)} data-testid={`button-dl-${doc.id}`}>
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                          {doc.backendStatus === "FAILED" && doc.direction === "outbound" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2 text-amber-700 border-amber-300 hover:bg-amber-50" disabled={retrying === doc.backendId} onClick={() => handleRetry(doc)} data-testid={`button-retry-${doc.id}`}>
                              <RefreshCw className={`w-3.5 h-3.5 ${retrying === doc.backendId ? "animate-spin" : ""}`} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detail dialog */}
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
                  <Button size="sm" variant="outline" className="gap-1.5" disabled={!selected.raw} onClick={() => downloadRaw(selected)} data-testid="button-download-doc">
                    <Download className="w-3.5 h-3.5" />Download
                  </Button>
                  {selected.backendStatus === "FAILED" && selected.direction === "outbound" && (
                    <Button size="sm" variant="outline" className="gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50" disabled={retrying === selected.backendId} onClick={() => handleRetry(selected)} data-testid="button-retry-doc">
                      <RefreshCw className={`w-3.5 h-3.5 ${retrying === selected.backendId ? "animate-spin" : ""}`} />
                      {retrying === selected.backendId ? "Retrying…" : "Retry"}
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
