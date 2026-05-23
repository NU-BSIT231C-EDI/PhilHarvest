import { useState, useEffect, useCallback } from "react";
import { Send, Copy, Check, ChevronDown, Eye } from "lucide-react";
import { previewEdi, send856, send810, send855, send204, fetchTradingPartners, type TradingPartner } from "@/services/ediApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { useEdiPrefill } from "@/store/ediPrefill";

type DocType = "855" | "856" | "810" | "204";

const docTypes: { value: DocType; label: string; description: string }[] = [
  { value: "855", label: "855 — PO Acknowledgment", description: "Acknowledge a purchase order to the manufacturer" },
  { value: "856", label: "856 — Advance Ship Notice", description: "Notify a partner about an upcoming shipment" },
  { value: "810", label: "810 — Invoice", description: "Send an invoice for goods delivered" },
  { value: "204", label: "204 — Load Tender", description: "Tender a shipment load to a logistics carrier" },
];

const PHILHARVEST_ADDRESS = {
  street: "458 Mabini St., Brgy. Santo Nino",
  city: "General Santos City",
  state: "SC",
  postal_code: "9500",
  country: "PH",
};

interface LineItem855 { line_number: string; acknowledgment_code: string; accepted_quantity: string; quantity_uom: string; part_number: string; }
interface LineItem856 { line_number: string; part_number: string; part_description: string; shipped_quantity: string; quantity_uom: string; }
interface LineItem810 { line_number: string; po_line_number: string; part_number: string; part_description: string; invoiced_quantity: string; quantity_uom: string; unit_price: string; }
interface Stop204 { company_name: string; address: string; city: string; state: string; postal_code: string; country: string; }

const empty855Line = (n = 1): LineItem855 => ({ line_number: String(n), acknowledgment_code: "AA", accepted_quantity: "0", quantity_uom: "KG", part_number: "" });
const empty856Line = (n = 1): LineItem856 => ({ line_number: String(n), part_number: "", part_description: "", shipped_quantity: "0", quantity_uom: "KG" });
const empty810Line = (n = 1): LineItem810 => ({ line_number: String(n), po_line_number: String(n), part_number: "", part_description: "", invoiced_quantity: "0", quantity_uom: "KG", unit_price: "0.00" });

export default function EdiOutbound() {
  const today = new Date().toISOString().slice(0, 10);
  const { prefill, clearPrefill } = useEdiPrefill();

  const [docType, setDocType] = useState<DocType>("856");
  const [partners, setPartners] = useState<TradingPartner[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(true);
  const [selectedPartnerId, setSelectedPartnerId] = useState("");

  // 855
  const [poNumber855, setPoNumber855] = useState("PO-001");
  const [poDate855, setPoDate855] = useState(today);
  const [ackCode855, setAckCode855] = useState("AA");
  const [lines855, setLines855] = useState<LineItem855[]>([empty855Line()]);

  // 856
  const [asnNumber, setAsnNumber] = useState(`ASN-${today}-001`);
  const [poNumber856, setPoNumber856] = useState("PO-001");
  const [poDate856, setPoDate856] = useState(today);
  const [shipDate, setShipDate] = useState(today);
  const [carrierCode, setCarrierCode] = useState("");
  const [totalWeight, setTotalWeight] = useState("");
  const [shipToAddress, setShipToAddress] = useState({ company_name: "", street: "", city: "", state: "", postal_code: "", country: "PH" });
  const [lines856, setLines856] = useState<LineItem856[]>([empty856Line()]);

  // 810
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${today}-001`);
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [poNumber810, setPoNumber810] = useState("PO-001");
  const [poDate810, setPoDate810] = useState(today);
  const [billToName, setBillToName] = useState("");
  const [lines810, setLines810] = useState<LineItem810[]>([empty810Line()]);

  // 204
  const [loadTenderId, setLoadTenderId] = useState(`LOAD-${today}-001`);
  const [poNumber204, setPoNumber204] = useState("");
  const [shipmentWeight204, setShipmentWeight204] = useState("");
  const [pickupDate, setPickupDate] = useState(today);
  const [deliveryDate, setDeliveryDate] = useState(today);
  const [carrierName, setCarrierName] = useState("");
  const [stops204, setStops204] = useState<Stop204[]>([{ company_name: "", address: "", city: "", state: "", postal_code: "", country: "PH" }]);

  const [preview, setPreview] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const loadPartners = useCallback(() => {
    setPartnersLoading(true);
    fetchTradingPartners().then(setPartners).catch(() => {}).finally(() => setPartnersLoading(false));
  }, []);

  useEffect(() => { loadPartners(); }, [loadPartners]);

  // Apply prefill from EdiTransactions cross-page navigation
  useEffect(() => {
    if (!prefill) return;
    const p = prefill.body as Record<string, unknown>;
    setDocType(prefill.ediType as DocType);
    setSent(false);
    setPreview("");

    if (prefill.ediType === "855") {
      if (p.po_number) setPoNumber855(p.po_number as string);
      if (p.po_date) setPoDate855(p.po_date as string);
      if (p.acknowledgment_code) setAckCode855(p.acknowledgment_code as string);
      if (p.manufacturer_id) setSelectedPartnerId(String(p.manufacturer_id));
      const rawLines = (p.line_acknowledgments as Array<Record<string, unknown>> | undefined) ?? [];
      if (rawLines.length) setLines855(rawLines.map((l, i) => ({ ...empty855Line(i + 1), line_number: String(l.line_number ?? i + 1), acknowledgment_code: (l.acknowledgment_code as string) ?? "AA", accepted_quantity: String(l.accepted_quantity ?? 0), quantity_uom: (l.quantity_uom as string) ?? "KG", part_number: (l.part_number as string) ?? "" })));
    } else if (prefill.ediType === "856") {
      if (p.asn_number) setAsnNumber(p.asn_number as string);
      if (p.po_number) setPoNumber856(p.po_number as string);
      if (p.po_date) setPoDate856(p.po_date as string);
      if (p.ship_date) setShipDate(p.ship_date as string);
      if (p.manufacturer_id) setSelectedPartnerId(String(p.manufacturer_id));
      const rawShipTo = p.ship_to_address as Record<string, string> | undefined;
      if (rawShipTo) setShipToAddress({ company_name: rawShipTo.company_name ?? "", street: rawShipTo.street ?? "", city: rawShipTo.city ?? "", state: rawShipTo.state ?? "", postal_code: rawShipTo.postal_code ?? "", country: rawShipTo.country ?? "PH" });
      if (p.total_weight) setTotalWeight(String(p.total_weight));
      const rawBoxes = (p.boxes as Array<{ line_items: Array<Record<string, unknown>> }> | undefined) ?? [];
      const items = rawBoxes.flatMap((b) => b.line_items ?? []);
      if (items.length) setLines856(items.map((l, i) => ({ line_number: String(l.line_number ?? i + 1), part_number: (l.part_number as string) ?? "", part_description: (l.part_description as string) ?? "", shipped_quantity: String(l.shipped_quantity ?? 0), quantity_uom: (l.quantity_uom as string) ?? "KG" })));
    } else if (prefill.ediType === "810") {
      if (p.invoice_number) setInvoiceNumber(p.invoice_number as string);
      if (p.invoice_date)   setInvoiceDate(p.invoice_date as string);
      if (p.po_number)      setPoNumber810(p.po_number as string);
      if (p.po_date)        setPoDate810(p.po_date as string);
      if (p.manufacturer_id) setSelectedPartnerId(String(p.manufacturer_id));
      if (p.bill_to_name)   setBillToName(p.bill_to_name as string);
      const rawLines = (p.line_items as Array<Record<string, unknown>> | undefined) ?? [];
      if (rawLines.length) setLines810(rawLines.map((l, i) => ({
        ...empty810Line(i + 1),
        line_number:       String(l.line_number    ?? i + 1),
        po_line_number:    String(l.po_line_number ?? l.line_number ?? i + 1),
        part_number:       (l.part_number      as string) ?? '',
        part_description:  (l.part_description as string) ?? '',
        invoiced_quantity: String(l.invoiced_quantity ?? 0),
        quantity_uom:      (l.quantity_uom     as string) ?? 'KG',
        unit_price:        String(l.unit_price  ?? '0.00'),
      })));
    } else if (prefill.ediType === "204") {
      if (p.load_tender_id) setLoadTenderId(p.load_tender_id as string);
      if (p.po_number) setPoNumber204(p.po_number as string);
      if (p.shipment_weight) setShipmentWeight204(String(p.shipment_weight));
      if (p.pickup_date) setPickupDate(p.pickup_date as string);
      if (p.delivery_date) setDeliveryDate(p.delivery_date as string);
      const rawAddr = p.consignee_address as Record<string, string> | undefined;
      if (rawAddr || p.consignee_company_name) {
        setStops204([{
          company_name: (p.consignee_company_name as string) ?? rawAddr?.company_name ?? "",
          address: rawAddr?.street ?? "",
          city: rawAddr?.city ?? "",
          state: rawAddr?.state ?? "",
          postal_code: rawAddr?.postal_code ?? "",
          country: rawAddr?.country ?? "PH",
        }]);
      }
    }
    clearPrefill();
  }, [prefill, today, clearPrefill]);

  const selectedPartner = partners.find((p) => String(p.id) === selectedPartnerId || p.isa_receiver_id.trim() === selectedPartnerId);

  function buildPayload(): Record<string, unknown> {
    const p = selectedPartner;
    const partnerAddr = p ? { street: p.address_line_1, city: p.city, state: p.state ?? "", postal_code: p.postal_code, country: p.country } : {};

    if (docType === "855") return {
      po_number: poNumber855, po_date: poDate855,
      manufacturer_id: p?.isa_receiver_id.trim() ?? "",
      acknowledgment_code: ackCode855,
      manufacturer_address: partnerAddr,
      seller_address: PHILHARVEST_ADDRESS,
      line_acknowledgments: lines855.map((l) => ({ line_number: l.line_number, acknowledgment_code: l.acknowledgment_code, accepted_quantity: parseFloat(l.accepted_quantity) || 0, quantity_uom: l.quantity_uom, ...(l.part_number ? { part_number: l.part_number } : {}) })),
    };

    if (docType === "856") return {
      asn_number: asnNumber, po_number: poNumber856, po_date: poDate856,
      manufacturer_id: p?.isa_receiver_id.trim() ?? "",
      ship_date: shipDate,
      ...(carrierCode ? { carrier_code: carrierCode } : {}),
      ...(totalWeight ? { total_weight: parseFloat(totalWeight) } : {}),
      ship_from_address: PHILHARVEST_ADDRESS,
      ship_to_address: { company_name: shipToAddress.company_name || p?.company_name || "", street: shipToAddress.street || p?.address_line_1 || "", city: shipToAddress.city || p?.city || "", state: shipToAddress.state || p?.state || "", postal_code: shipToAddress.postal_code || p?.postal_code || "", country: shipToAddress.country || p?.country || "PH" },
      boxes: [{ box_number: "1", line_items: lines856.map((l) => ({ line_number: l.line_number, part_number: l.part_number, part_description: l.part_description, shipped_quantity: parseFloat(l.shipped_quantity) || 0, quantity_uom: l.quantity_uom })) }],
    };

    if (docType === "810") return {
      invoice_number: invoiceNumber, invoice_date: invoiceDate,
      po_number: poNumber810, po_date: poDate810,
      manufacturer_id: p?.isa_receiver_id.trim() ?? "",
      bill_to_name: billToName || p?.company_name || "",
      bill_to_address: partnerAddr,
      ship_from_address: PHILHARVEST_ADDRESS,
      line_items: lines810.map((l) => ({ line_number: l.line_number, po_line_number: l.po_line_number, part_number: l.part_number, part_description: l.part_description, invoiced_quantity: parseFloat(l.invoiced_quantity) || 0, quantity_uom: l.quantity_uom, unit_price: parseFloat(l.unit_price) || 0 })),
      total_amount: lines810.reduce((s, l) => s + (parseFloat(l.invoiced_quantity) || 0) * (parseFloat(l.unit_price) || 0), 0),
    };

    return {
      load_tender_id: loadTenderId,
      ...(poNumber204 ? { po_number: poNumber204 } : {}),
      ...(shipmentWeight204 ? { shipment_weight: parseFloat(shipmentWeight204) } : {}),
      shipper_company_name: "PHILHARVEST",
      shipper_address: PHILHARVEST_ADDRESS,
      carrier_code: p?.isa_receiver_id.trim() ?? "",
      ship_to_address: stops204[0]
        ? { company_name: stops204[0].company_name || p?.company_name || "", street: stops204[0].address, city: stops204[0].city, state: stops204[0].state || "", postal_code: stops204[0].postal_code, country: stops204[0].country || "PH" }
        : { company_name: "", street: "", city: "", state: "", postal_code: "", country: "PH" },
      pickup_date: pickupDate,
      delivery_date: deliveryDate,
      shipments: stops204.map((s, i) => ({
        shipment_number: `SHP-${String(i + 1).padStart(3, "0")}`,
        commodity: carrierName || p?.company_name || "General Freight",
      })),
    };
  }

  async function handlePreview() {
    if (!selectedPartnerId) { toast({ title: "Select a trading partner first", variant: "destructive" }); return; }
    setPreviewing(true);
    try {
      const x12 = await previewEdi(docType, buildPayload());
      setPreview(x12);
      setSent(false);
    } catch (err: unknown) {
      toast({ title: "Preview failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setPreviewing(false);
    }
  }

  function copyEdi() {
    navigator.clipboard.writeText(preview).then(() => { setCopied(true); toast({ title: "Copied to clipboard" }); setTimeout(() => setCopied(false), 2000); });
  }

  async function handleSend() {
    if (!preview) { toast({ title: "Generate a preview first", variant: "destructive" }); return; }
    setSending(true);
    try {
      const payload = buildPayload();
      let result: { transaction_id: number; control_number: string; status: string };
      if (docType === "855") result = await send855(payload);
      else if (docType === "856") result = await send856(payload as Parameters<typeof send856>[0]);
      else if (docType === "810") result = await send810(payload as Parameters<typeof send810>[0]);
      else result = await send204(payload);
      toast({ title: `${docType} sent`, description: `Transaction ${result.transaction_id} · Control ${result.control_number}` });
      setSent(true);
    } catch (err: unknown) {
      toast({ title: "Send failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  function resetForm(type: DocType) { setDocType(type); setPreview(""); setSent(false); }

  function updateLine<T>(setter: React.Dispatch<React.SetStateAction<T[]>>, i: number, patch: Partial<T>) {
    setter((prev) => prev.map((item, idx) => idx === i ? { ...item, ...patch } : item));
  }

  return (
    <DashboardLayout role="admin" title="EDI Outbound Builder">
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Builder */}
          <div className="space-y-4">
            <Card className="border-card-border">
              <CardHeader><CardTitle className="text-base">Document Setup</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Document Type</Label>
                  <Select value={docType} onValueChange={(v) => resetForm(v as DocType)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{docTypes.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">{docTypes.find((d) => d.value === docType)?.description}</p>
                </div>
                <div>
                  <Label>Trading Partner</Label>
                  <Select value={selectedPartnerId} onValueChange={(v) => { setSelectedPartnerId(v); setPreview(""); setSent(false); }}>
                    <SelectTrigger className="mt-1" data-testid="select-partner">
                      <SelectValue placeholder={partnersLoading ? "Loading partners…" : "Select partner…"} />
                    </SelectTrigger>
                    <SelectContent>
                      {partners.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.company_name} <span className="text-muted-foreground font-mono text-xs ml-1">({p.isa_receiver_id.trim()})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {docType === "855" && (
              <Card className="border-card-border">
                <CardHeader><CardTitle className="text-base">PO Acknowledgment</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>PO Number</Label><Input className="mt-1 font-mono text-sm" value={poNumber855} onChange={(e) => setPoNumber855(e.target.value)} /></div>
                    <div><Label>PO Date</Label><Input className="mt-1" type="date" value={poDate855} onChange={(e) => setPoDate855(e.target.value)} /></div>
                  </div>
                  <div>
                    <Label>Acknowledgment Code</Label>
                    <Select value={ackCode855} onValueChange={setAckCode855}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AA">AA — Accepted</SelectItem>
                        <SelectItem value="RE">RE — Rejected</SelectItem>
                        <SelectItem value="IA">IA — Item Accepted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger asChild>
                      <button className="flex items-center gap-2 text-sm font-medium w-full text-left"><ChevronDown className="w-4 h-4" />Line Acknowledgments ({lines855.length})</button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mt-2">
                      {lines855.map((l, i) => (
                        <div key={i} className="grid grid-cols-12 gap-1 items-end">
                          <div className="col-span-1"><Label className="text-xs">#</Label><Input className="mt-1 text-xs h-8" value={l.line_number} onChange={(e) => updateLine(setLines855, i, { line_number: e.target.value })} /></div>
                          <div className="col-span-2">
                            <Label className="text-xs">Code</Label>
                            <Select value={l.acknowledgment_code} onValueChange={(v) => updateLine(setLines855, i, { acknowledgment_code: v })}>
                              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent><SelectItem value="AA">AA</SelectItem><SelectItem value="RE">RE</SelectItem><SelectItem value="IA">IA</SelectItem></SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2"><Label className="text-xs">Qty</Label><Input className="mt-1 text-xs h-8" type="number" value={l.accepted_quantity} onChange={(e) => updateLine(setLines855, i, { accepted_quantity: e.target.value })} /></div>
                          <div className="col-span-2"><Label className="text-xs">UOM</Label><Input className="mt-1 text-xs h-8" value={l.quantity_uom} onChange={(e) => updateLine(setLines855, i, { quantity_uom: e.target.value })} /></div>
                          <div className="col-span-4"><Label className="text-xs">Part #</Label><Input className="mt-1 text-xs h-8 font-mono" value={l.part_number} onChange={(e) => updateLine(setLines855, i, { part_number: e.target.value })} /></div>
                          <div className="col-span-1 flex items-end pb-1">
                            {lines855.length > 1 && <button className="text-destructive text-lg leading-none" onClick={() => setLines855((p) => p.filter((_, idx) => idx !== i))}>×</button>}
                          </div>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setLines855((p) => [...p, empty855Line(p.length + 1)])}>+ Add Line</Button>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            )}

            {docType === "856" && (
              <Card className="border-card-border">
                <CardHeader><CardTitle className="text-base">Advance Ship Notice</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>ASN Number</Label><Input className="mt-1 font-mono text-sm" value={asnNumber} onChange={(e) => setAsnNumber(e.target.value)} /></div>
                    <div><Label>Ship Date</Label><Input className="mt-1" type="date" value={shipDate} onChange={(e) => setShipDate(e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>PO Number</Label><Input className="mt-1 font-mono text-sm" value={poNumber856} onChange={(e) => setPoNumber856(e.target.value)} /></div>
                    <div><Label>PO Date</Label><Input className="mt-1" type="date" value={poDate856} onChange={(e) => setPoDate856(e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Carrier Code</Label><Input className="mt-1 font-mono text-sm" placeholder="Optional" value={carrierCode} onChange={(e) => setCarrierCode(e.target.value)} /></div>
                    <div><Label>Total Weight (LB)</Label><Input className="mt-1" type="number" placeholder="Optional" value={totalWeight} onChange={(e) => setTotalWeight(e.target.value)} /></div>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-2">Ship-To Override (auto-filled from partner)</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Input className="text-xs h-8" placeholder="Company name" value={shipToAddress.company_name} onChange={(e) => setShipToAddress((a) => ({ ...a, company_name: e.target.value }))} />
                      <Input className="text-xs h-8" placeholder="Street address" value={shipToAddress.street} onChange={(e) => setShipToAddress((a) => ({ ...a, street: e.target.value }))} />
                      <Input className="text-xs h-8" placeholder="City" value={shipToAddress.city} onChange={(e) => setShipToAddress((a) => ({ ...a, city: e.target.value }))} />
                      <Input className="text-xs h-8" placeholder="Postal code" value={shipToAddress.postal_code} onChange={(e) => setShipToAddress((a) => ({ ...a, postal_code: e.target.value }))} />
                    </div>
                  </div>
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger asChild>
                      <button className="flex items-center gap-2 text-sm font-medium w-full text-left"><ChevronDown className="w-4 h-4" />Box Line Items ({lines856.length})</button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mt-2">
                      {lines856.map((l, i) => (
                        <div key={i} className="grid grid-cols-12 gap-1 items-end">
                          <div className="col-span-1"><Label className="text-xs">#</Label><Input className="mt-1 text-xs h-8" value={l.line_number} onChange={(e) => updateLine(setLines856, i, { line_number: e.target.value })} /></div>
                          <div className="col-span-3"><Label className="text-xs">Part #</Label><Input className="mt-1 text-xs h-8 font-mono" value={l.part_number} onChange={(e) => updateLine(setLines856, i, { part_number: e.target.value })} /></div>
                          <div className="col-span-3"><Label className="text-xs">Description</Label><Input className="mt-1 text-xs h-8" value={l.part_description} onChange={(e) => updateLine(setLines856, i, { part_description: e.target.value })} /></div>
                          <div className="col-span-2"><Label className="text-xs">Qty</Label><Input className="mt-1 text-xs h-8" type="number" value={l.shipped_quantity} onChange={(e) => updateLine(setLines856, i, { shipped_quantity: e.target.value })} /></div>
                          <div className="col-span-2"><Label className="text-xs">UOM</Label><Input className="mt-1 text-xs h-8" value={l.quantity_uom} onChange={(e) => updateLine(setLines856, i, { quantity_uom: e.target.value })} /></div>
                          <div className="col-span-1 flex items-end pb-1">
                            {lines856.length > 1 && <button className="text-destructive text-lg leading-none" onClick={() => setLines856((p) => p.filter((_, idx) => idx !== i))}>×</button>}
                          </div>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setLines856((p) => [...p, empty856Line(p.length + 1)])}>+ Add Line</Button>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            )}

            {docType === "810" && (
              <Card className="border-card-border">
                <CardHeader><CardTitle className="text-base">Invoice</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Invoice Number</Label><Input className="mt-1 font-mono text-sm" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} /></div>
                    <div><Label>Invoice Date</Label><Input className="mt-1" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>PO Number</Label><Input className="mt-1 font-mono text-sm" value={poNumber810} onChange={(e) => setPoNumber810(e.target.value)} /></div>
                    <div><Label>PO Date</Label><Input className="mt-1" type="date" value={poDate810} onChange={(e) => setPoDate810(e.target.value)} /></div>
                  </div>
                  <div><Label>Bill-To Name</Label><Input className="mt-1" placeholder="Defaults to partner company name" value={billToName} onChange={(e) => setBillToName(e.target.value)} /></div>
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger asChild>
                      <button className="flex items-center gap-2 text-sm font-medium w-full text-left"><ChevronDown className="w-4 h-4" />Line Items ({lines810.length})</button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mt-2">
                      {lines810.map((l, i) => (
                        <div key={i} className="grid grid-cols-12 gap-1 items-end">
                          <div className="col-span-1"><Label className="text-xs">#</Label><Input className="mt-1 text-xs h-8" value={l.line_number} onChange={(e) => updateLine(setLines810, i, { line_number: e.target.value })} /></div>
                          <div className="col-span-3"><Label className="text-xs">Part #</Label><Input className="mt-1 text-xs h-8 font-mono" value={l.part_number} onChange={(e) => updateLine(setLines810, i, { part_number: e.target.value })} /></div>
                          <div className="col-span-2"><Label className="text-xs">Qty</Label><Input className="mt-1 text-xs h-8" type="number" value={l.invoiced_quantity} onChange={(e) => updateLine(setLines810, i, { invoiced_quantity: e.target.value })} /></div>
                          <div className="col-span-2"><Label className="text-xs">UOM</Label><Input className="mt-1 text-xs h-8" value={l.quantity_uom} onChange={(e) => updateLine(setLines810, i, { quantity_uom: e.target.value })} /></div>
                          <div className="col-span-2"><Label className="text-xs">Unit Price</Label><Input className="mt-1 text-xs h-8" type="number" step="0.01" value={l.unit_price} onChange={(e) => updateLine(setLines810, i, { unit_price: e.target.value })} /></div>
                          <div className="col-span-2 flex items-end pb-1">
                            {lines810.length > 1 && <button className="text-destructive text-lg leading-none" onClick={() => setLines810((p) => p.filter((_, idx) => idx !== i))}>×</button>}
                          </div>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setLines810((p) => [...p, empty810Line(p.length + 1)])}>+ Add Line</Button>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            )}

            {docType === "204" && (
              <Card className="border-card-border">
                <CardHeader><CardTitle className="text-base">Load Tender</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Load Tender ID</Label><Input className="mt-1 font-mono text-sm" value={loadTenderId} onChange={(e) => setLoadTenderId(e.target.value)} /></div>
                    <div><Label>PO Number</Label><Input className="mt-1 font-mono text-sm" placeholder="Links to 850 thread" value={poNumber204} onChange={(e) => setPoNumber204(e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Total Weight (LB)</Label><Input className="mt-1" type="number" placeholder="Auto-filled from inventory" value={shipmentWeight204} onChange={(e) => setShipmentWeight204(e.target.value)} /></div>
                    <div><Label>Carrier Name</Label><Input className="mt-1" placeholder="Defaults to partner name" value={carrierName} onChange={(e) => setCarrierName(e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Pickup Date</Label><Input className="mt-1" type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} /></div>
                    <div><Label>Delivery Date</Label><Input className="mt-1" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} /></div>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-2">Consignee / Delivery Stop</p>
                    {stops204.map((s, i) => (
                      <div key={i} className="space-y-1 mb-3">
                        <div className="grid grid-cols-12 gap-1 items-end">
                          <div className="col-span-5"><Label className="text-xs">Company Name *</Label><Input className="mt-1 text-xs h-8" placeholder="Consignee company name" value={s.company_name} onChange={(e) => setStops204((p) => p.map((x, idx) => idx === i ? { ...x, company_name: e.target.value } : x))} /></div>
                          <div className="col-span-6"><Label className="text-xs">Address</Label><Input className="mt-1 text-xs h-8" value={s.address} onChange={(e) => setStops204((p) => p.map((x, idx) => idx === i ? { ...x, address: e.target.value } : x))} /></div>
                          <div className="col-span-1 flex items-end pb-1">
                            {stops204.length > 1 && <button className="text-destructive text-lg leading-none" onClick={() => setStops204((p) => p.filter((_, idx) => idx !== i))}>×</button>}
                          </div>
                        </div>
                        <div className="grid grid-cols-12 gap-1">
                          <div className="col-span-4"><Label className="text-xs">City</Label><Input className="mt-1 text-xs h-8" value={s.city} onChange={(e) => setStops204((p) => p.map((x, idx) => idx === i ? { ...x, city: e.target.value } : x))} /></div>
                          <div className="col-span-2"><Label className="text-xs">State *</Label><Input className="mt-1 text-xs h-8" placeholder="e.g. SC" value={s.state} onChange={(e) => setStops204((p) => p.map((x, idx) => idx === i ? { ...x, state: e.target.value } : x))} /></div>
                          <div className="col-span-3"><Label className="text-xs">Postal</Label><Input className="mt-1 text-xs h-8" value={s.postal_code} onChange={(e) => setStops204((p) => p.map((x, idx) => idx === i ? { ...x, postal_code: e.target.value } : x))} /></div>
                          <div className="col-span-3"><Label className="text-xs">Country</Label><Input className="mt-1 text-xs h-8" value={s.country} onChange={(e) => setStops204((p) => p.map((x, idx) => idx === i ? { ...x, country: e.target.value } : x))} /></div>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setStops204((p) => [...p, { company_name: "", address: "", city: "", state: "", postal_code: "", country: "PH" }])}>+ Add Stop</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button className="w-full gap-2" onClick={handlePreview} disabled={previewing} data-testid="button-generate-edi">
              <Eye className={`w-4 h-4 ${previewing ? 'animate-pulse' : ''}`} />
              {previewing ? "Generating preview…" : "Generate Preview"}
            </Button>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <Card className="border-card-border h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">EDI Preview</CardTitle>
                {preview && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={copyEdi} data-testid="button-copy-edi">
                      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                    <Button size="sm" className="gap-1.5" onClick={handleSend} disabled={sent || sending} data-testid="button-send-edi">
                      {sent ? <Check className="w-3.5 h-3.5" /> : <Send className={`w-3.5 h-3.5 ${sending ? 'animate-pulse' : ''}`} />}
                      {sent ? "Sent" : sending ? "Sending…" : "Send"}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {preview ? (
                  <pre className="bg-muted rounded-xl p-4 text-xs font-mono text-foreground overflow-auto whitespace-pre-wrap break-all leading-relaxed" style={{ minHeight: "400px" }}>
                    {preview}
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: "400px" }}>
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-3">
                      <Send className="w-8 h-8 text-primary/50" />
                    </div>
                    <p className="text-muted-foreground text-sm font-medium">EDI payload will appear here</p>
                    <p className="text-muted-foreground text-xs mt-1">Select a partner, fill in the fields, then click Generate Preview</p>
                    <p className="text-primary/60 text-xs mt-0.5">Preview uses the same backend generator as actual sends</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
