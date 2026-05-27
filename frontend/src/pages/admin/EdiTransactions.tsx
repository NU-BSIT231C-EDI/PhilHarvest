import { useEffect, useState, useCallback } from "react";
import { usePolling } from "@/hooks/use-polling";
import { Search, Download, RefreshCw, ArrowRight, ChevronDown, ChevronRight, Printer, Leaf, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DashboardLayout from "@/layouts/DashboardLayout";
import StatusBadge from "@/components/shared/StatusBadge";
import {
  fetchTransactions,
  fetchTradingPartners,
  retryTransmission,
  deleteTransaction,
  typeLabel,
  mapStatus,
  formatDate,
  type BackendTransaction,
  type TradingPartner,
} from "@/services/ediApi";
import { useEdiPrefill } from "@/store/ediPrefill";
import { useToast } from "@/hooks/use-toast";
import { fetchProducts } from "@/services/productsApi";

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
  docs861: EdiDoc[];
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
  "846": "bg-cyan-50 text-cyan-700 border-cyan-200",
  "850": "bg-blue-50 text-blue-700 border-blue-200",
  "855": "bg-green-50 text-green-700 border-green-200",
  "856": "bg-purple-50 text-purple-700 border-purple-200",
  "861": "bg-rose-50 text-rose-700 border-rose-200",
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

function build856Prefill(doc: EdiDoc, weightMap: Record<string, number>): Record<string, unknown> {
  const d = doc.parsedData ?? {};
  const today = new Date().toISOString().slice(0, 10);
  const rawShipTo = d.ship_to_address as Record<string, string> | null | undefined;
  const rawLines  = (d.line_items as Array<Record<string, unknown>> | undefined) ?? [];
  const totalWeightLb = rawLines.reduce((sum, li) => {
    const sku = (li.part_number as string | undefined) ?? '';
    const wlb = weightMap[sku] ?? 0;
    return sum + Number(li.quantity ?? 0) * wlb;
  }, 0);
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
    ...(totalWeightLb > 0 ? { total_weight: Math.round(totalWeightLb * 1000) / 1000 } : {}),
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

function build204Prefill(doc: EdiDoc, weightMap: Record<string, number>): Record<string, unknown> {
  const d = doc.parsedData ?? {};
  const today = new Date().toISOString().slice(0, 10);
  const rawShipTo = d.ship_to_address as Record<string, string> | null | undefined;
  const rawLines  = (d.line_items as Array<Record<string, unknown>> | undefined) ?? [];
  const poNum = (d.po_number as string | undefined) ?? extractPoFromX12(doc.raw);
  const totalWeightLb = rawLines.reduce((sum, li) => {
    const sku = (li.part_number as string | undefined) ?? '';
    const wlb = weightMap[sku] ?? 0;
    return sum + Number(li.quantity ?? 0) * wlb;
  }, 0);
  return {
    load_tender_id: `LOAD-${today}-001`,
    po_number: poNum ?? "",
    ...(totalWeightLb > 0 ? { shipment_weight: Math.round(totalWeightLb * 1000) / 1000 } : {}),
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

function build855Prefill(doc: EdiDoc, excludedSkus: string[] = []): Record<string, unknown> {
  const d = doc.parsedData ?? {};
  const today = new Date().toISOString().slice(0, 10);
  const rawLines = (d.line_items as Array<Record<string, unknown>> | undefined) ?? [];
  const excluded = new Set(excludedSkus.map((s) => s.trim().toUpperCase()));

  const lineAcks = rawLines.map((li, i) => {
    const sku = ((li.part_number as string | undefined) ?? '').trim().toUpperCase();
    const qty = Number(li.quantity ?? 0);
    const isExcluded = excluded.size > 0 && excluded.has(sku);
    return {
      line_number:         String(li.line_number ?? i + 1),
      acknowledgment_code: isExcluded ? 'RE' : 'AA',
      accepted_quantity:   isExcluded ? 0 : qty,
      ...(isExcluded ? { rejected_quantity: qty, rejection_reason: 'Item not covered by supply agreement' } : {}),
      quantity_uom:        (li.quantity_uom as string | undefined) ?? 'EA',
      part_number:         (li.part_number  as string | undefined) ?? '',
    };
  });

  const rejectedCount = lineAcks.filter((l) => l.acknowledgment_code === 'RE').length;
  const headerCode = rejectedCount === 0 ? 'AA' : rejectedCount === lineAcks.length ? 'RE' : 'IA';

  return {
    po_number:            (d.po_number as string | undefined) ?? '',
    po_date:              (d.po_date   as string | undefined) ?? today,
    manufacturer_id:      doc.partnerId,
    acknowledgment_code:  headerCode,
    seller_address:       PHILHARVEST_ADDRESS,
    line_acknowledgments: lineAcks,
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

// ── 850 Print & Visual View ─────────────────────────────────────────────────

function printPOWindow(doc: EdiDoc) {
  const d         = doc.parsedData ?? {};
  const poNumber  = (d.po_number as string | undefined) ?? doc.isaControl;
  const poDate    = (d.po_date   as string | undefined) ?? doc.date;
  const lineItems = (d.line_items as Array<Record<string, unknown>> | undefined) ?? [];
  const shipTo    = d.ship_to_address as Record<string, string> | undefined;
  const total     = lineItems.reduce((s, li) => s + Number(li.quantity ?? 0) * Number(li.unit_price ?? 0), 0);

  const lineRows = lineItems.map((li, i) => {
    const qty   = Number(li.quantity  ?? 0);
    const price = Number(li.unit_price ?? 0);
    return `<tr>
      <td>${String(li.line_number ?? i + 1)}</td>
      <td style="font-family:monospace">${String(li.part_number ?? "—")}</td>
      <td>${String(li.part_description ?? li.product_description ?? "—")}</td>
      <td style="text-align:right">${qty.toLocaleString()}</td>
      <td>${String(li.quantity_uom ?? "—")}</td>
      <td style="text-align:right">${price > 0 ? `&#8369;${price.toFixed(2)}` : "—"}</td>
      <td style="text-align:right">${price > 0 ? `&#8369;${(qty * price).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}</td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html><head><title>PO ${poNumber}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:40px}
  .hdr{display:flex;justify-content:space-between;margin-bottom:24px}
  .brand{font-size:18px;font-weight:bold;color:#16a34a}
  h1{font-size:22px;margin:0}
  .mono{font-family:monospace;font-weight:bold;font-size:13px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;border:1px solid #ddd;padding:12px;margin-bottom:16px;border-radius:6px}
  .lbl{font-size:10px;font-weight:bold;text-transform:uppercase;color:#888;margin-bottom:4px}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}
  th{background:#f5f5f5;text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;color:#666;border-bottom:1px solid #ddd}
  td{padding:8px 10px;border-bottom:1px solid #eee;font-size:11px}
  tfoot td{font-weight:bold;border-top:2px solid #ddd;background:#fafafa}
  .ftr{display:flex;justify-content:space-between;border-top:1px solid #ddd;padding-top:12px;font-size:10px;color:#888}
  @media print{body{margin:20px}}
</style></head><body>
<div class="hdr">
  <div>
    <div class="brand">PhilHarvest</div>
    <div style="font-size:10px;color:#888">Agricultural Marketplace</div>
    <div style="font-size:10px;color:#888">458 Mabini St., Brgy. Santo Nino</div>
    <div style="font-size:10px;color:#888">General Santos City, SC 9500, PH</div>
  </div>
  <div style="text-align:right">
    <h1>PURCHASE ORDER</h1>
    <div class="mono">PO# ${poNumber}</div>
    <div style="color:#888;font-size:10px">Date: ${poDate}</div>
    <div style="color:#888;font-size:10px">ISA Control: ${doc.isaControl}</div>
  </div>
</div>
<div class="grid">
  <div><div class="lbl">From (Buyer)</div><strong>${doc.company}</strong></div>
  <div><div class="lbl">Ship To</div>${shipTo
    ? `<strong>${shipTo.company_name ?? ""}</strong><br>${shipTo.street ?? ""}<br>${shipTo.city ?? ""}, ${shipTo.state ?? ""} ${shipTo.postal_code ?? ""}<br>${shipTo.country ?? ""}`
    : "Not specified"}</div>
</div>
<table>
  <thead><tr><th>#</th><th>Part #</th><th>Description</th><th style="text-align:right">Qty</th><th>UOM</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead>
  <tbody>${lineRows || '<tr><td colspan="7" style="text-align:center;color:#888">No line items in parsed data</td></tr>'}</tbody>
  ${total > 0 ? `<tfoot><tr><td colspan="6" style="text-align:right">TOTAL</td><td style="text-align:right">&#8369;${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr></tfoot>` : ""}
</table>
<div class="ftr">
  <div>
    ${d.payment_terms ? `<div><strong>Payment Terms:</strong> ${String(d.payment_terms)}</div>` : ""}
    ${d.delivery_date ? `<div><strong>Requested Delivery:</strong> ${String(d.delivery_date)}</div>` : ""}
  </div>
  <div style="text-align:right"><div>Received via EDI X12 850</div><div>${doc.date}</div></div>
</div>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 250);
}

function PurchaseOrderView({ doc }: { doc: EdiDoc }) {
  const d         = doc.parsedData ?? {};
  const poNumber  = (d.po_number as string | undefined) ?? doc.isaControl;
  const poDate    = (d.po_date   as string | undefined) ?? doc.date;
  const lineItems = (d.line_items as Array<Record<string, unknown>> | undefined) ?? [];
  const shipTo    = d.ship_to_address as Record<string, string> | undefined;
  const total     = lineItems.reduce((s, li) => s + Number(li.quantity ?? 0) * Number(li.unit_price ?? 0), 0);

  return (
    <div className="space-y-4 text-sm">
      {/* Letterhead */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <Leaf className="w-4 h-4 text-primary" />
            <span className="font-bold text-base text-primary">PhilHarvest</span>
          </div>
          <p className="text-xs text-muted-foreground">Agricultural Marketplace</p>
          <p className="text-xs text-muted-foreground">458 Mabini St., Brgy. Santo Nino</p>
          <p className="text-xs text-muted-foreground">General Santos City, SC 9500, PH</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-foreground tracking-tight">PURCHASE ORDER</h2>
          <p className="font-mono font-semibold text-sm text-foreground">PO# {poNumber}</p>
          <p className="text-xs text-muted-foreground">Date: {poDate}</p>
          <p className="text-xs text-muted-foreground">ISA Control: {doc.isaControl}</p>
        </div>
      </div>

      {/* From / Ship-To */}
      <div className="grid grid-cols-2 gap-4 border border-border rounded-lg p-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">From (Buyer)</p>
          <p className="font-semibold text-foreground">{doc.company}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Ship To</p>
          {shipTo ? (
            <>
              <p className="font-semibold text-foreground">{shipTo.company_name}</p>
              <p className="text-xs text-muted-foreground">{shipTo.street}</p>
              <p className="text-xs text-muted-foreground">{shipTo.city}, {shipTo.state} {shipTo.postal_code}</p>
              <p className="text-xs text-muted-foreground">{shipTo.country}</p>
            </>
          ) : <p className="text-xs text-muted-foreground italic">Not specified</p>}
        </div>
      </div>

      {/* Line items */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted">
            <tr>
              {["#", "Part #", "Description", "Qty", "UOM", "Unit Price", "Total"].map((h, i) => (
                <th key={h} className={`px-3 py-2 font-semibold text-muted-foreground uppercase ${i >= 3 ? "text-right" : "text-left"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lineItems.length > 0 ? lineItems.map((li, i) => {
              const qty   = Number(li.quantity   ?? 0);
              const price = Number(li.unit_price ?? 0);
              return (
                <tr key={i} className="hover:bg-muted/30">
                  <td className="px-3 py-2 text-muted-foreground">{String(li.line_number ?? i + 1)}</td>
                  <td className="px-3 py-2 font-mono">{String(li.part_number ?? "—")}</td>
                  <td className="px-3 py-2">{String(li.part_description ?? li.product_description ?? "—")}</td>
                  <td className="px-3 py-2 text-right">{qty.toLocaleString()}</td>
                  <td className="px-3 py-2">{String(li.quantity_uom ?? "—")}</td>
                  <td className="px-3 py-2 text-right">{price > 0 ? `₱${price.toFixed(2)}` : "—"}</td>
                  <td className="px-3 py-2 text-right font-medium">{price > 0 ? `₱${(qty * price).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}</td>
                </tr>
              );
            }) : (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground italic">No line items in parsed data</td></tr>
            )}
          </tbody>
          {total > 0 && (
            <tfoot className="border-t-2 border-border bg-muted/50">
              <tr>
                <td colSpan={6} className="px-3 py-2 text-right font-semibold text-muted-foreground text-xs uppercase">Total</td>
                <td className="px-3 py-2 text-right font-bold text-foreground">₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Footer meta */}
      <div className="flex justify-between text-xs text-muted-foreground border-t border-border pt-3">
        <div className="space-y-0.5">
          {!!d.payment_terms && <p><span className="font-medium text-foreground">Payment Terms:</span> {String(d.payment_terms)}</p>}
          {!!d.delivery_date && <p><span className="font-medium text-foreground">Requested Delivery:</span> {String(d.delivery_date)}</p>}
        </div>
        <div className="text-right">
          <p className="font-medium text-foreground">Received via EDI X12 850</p>
          <p>{doc.date}</p>
        </div>
      </div>
    </div>
  );
}

// ── 861 Print & Visual View ─────────────────────────────────────────────────

function printReceivingAdviceWindow(doc: EdiDoc) {
  const d      = doc.parsedData ?? {};
  const raNum  = (d.ra_number as string | undefined) ?? doc.isaControl;
  const poNum  = (d.po_number as string | undefined) ?? extractPoFromX12(doc.raw) ?? "—";
  const raDate = (d.ra_date   as string | undefined) ?? doc.date;
  const lines  = (d.line_items as Array<Record<string, unknown>> | undefined) ?? [];
  const buyer  = (d.buyer_id  as string | undefined) ?? doc.company;
  const vendor = (d.vendor_id as string | undefined) ?? "PhilHarvest";

  const lineRows = lines.map((li) => `<tr>
    <td>${String(li.line_number ?? "")}</td>
    <td style="font-family:monospace">${String(li.part_number ?? "—")}</td>
    <td style="text-align:right">${Number(li.qty_received ?? 0).toLocaleString()}</td>
    <td>${String(li.uom ?? "EA")}</td>
  </tr>`).join("");

  const html = `<!DOCTYPE html><html><head><title>RA ${raNum}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:40px}
  .hdr{display:flex;justify-content:space-between;margin-bottom:24px}
  .brand{font-size:18px;font-weight:bold;color:#16a34a}
  h1{font-size:22px;margin:0}
  .mono{font-family:monospace;font-weight:bold;font-size:13px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;border:1px solid #ddd;padding:12px;margin-bottom:16px;border-radius:6px}
  .lbl{font-size:10px;font-weight:bold;text-transform:uppercase;color:#888;margin-bottom:4px}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}
  th{background:#f5f5f5;text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;color:#666;border-bottom:1px solid #ddd}
  td{padding:8px 10px;border-bottom:1px solid #eee;font-size:11px}
  .ftr{display:flex;justify-content:space-between;border-top:1px solid #ddd;padding-top:12px;font-size:10px;color:#888}
  @media print{body{margin:20px}}
</style></head><body>
<div class="hdr">
  <div>
    <div class="brand">PhilHarvest</div>
    <div style="font-size:10px;color:#888">Agricultural Marketplace</div>
    <div style="font-size:10px;color:#888">458 Mabini St., Brgy. Santo Nino</div>
    <div style="font-size:10px;color:#888">General Santos City, SC 9500, PH</div>
  </div>
  <div style="text-align:right">
    <h1>RECEIVING ADVICE</h1>
    <div class="mono">RA# ${raNum}</div>
    <div style="color:#888;font-size:10px">PO Reference: ${poNum}</div>
    <div style="color:#888;font-size:10px">Date: ${raDate}</div>
    <div style="color:#888;font-size:10px">ISA Control: ${doc.isaControl}</div>
  </div>
</div>
<div class="grid">
  <div><div class="lbl">Received By (Buyer)</div><strong>${buyer}</strong></div>
  <div><div class="lbl">Supplier (Vendor)</div><strong>${vendor}</strong></div>
</div>
<table>
  <thead><tr><th>#</th><th>Part / SKU</th><th style="text-align:right">Qty Received</th><th>UOM</th></tr></thead>
  <tbody>${lineRows || '<tr><td colspan="4" style="text-align:center;color:#888">No line items</td></tr>'}</tbody>
</table>
<div class="ftr">
  <div><strong>Total lines:</strong> ${lines.length}</div>
  <div style="text-align:right"><div>Received via EDI X12 861</div><div>${doc.date}</div></div>
</div>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 250);
}

function ReceivingAdviceView({ doc }: { doc: EdiDoc }) {
  const d     = doc.parsedData ?? {};
  const raNum = (d.ra_number as string | undefined) ?? doc.isaControl;
  const poNum = (d.po_number as string | undefined) ?? extractPoFromX12(doc.raw) ?? "—";
  const raDate = (d.ra_date  as string | undefined) ?? doc.date;
  const lines = (d.line_items as Array<Record<string, unknown>> | undefined) ?? [];
  const buyer = (d.buyer_id  as string | undefined) ?? doc.company;
  const vendor = (d.vendor_id as string | undefined) ?? "PhilHarvest";

  return (
    <div className="space-y-4 text-sm">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <Leaf className="w-4 h-4 text-primary" />
            <span className="font-bold text-base text-primary">PhilHarvest</span>
          </div>
          <p className="text-xs text-muted-foreground">Agricultural Marketplace</p>
          <p className="text-xs text-muted-foreground">458 Mabini St., Brgy. Santo Nino</p>
          <p className="text-xs text-muted-foreground">General Santos City, SC 9500, PH</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-foreground tracking-tight">RECEIVING ADVICE</h2>
          <p className="font-mono font-semibold text-sm text-foreground">RA# {raNum}</p>
          <p className="text-xs text-muted-foreground">PO Reference: {poNum}</p>
          <p className="text-xs text-muted-foreground">Date: {raDate}</p>
          <p className="text-xs text-muted-foreground">ISA Control: {doc.isaControl}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border border-border rounded-lg p-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Received By (Buyer)</p>
          <p className="font-semibold text-foreground">{buyer}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Supplier (Vendor)</p>
          <p className="font-semibold text-foreground">{vendor}</p>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted">
            <tr>
              {["#", "Part / SKU", "Qty Received", "UOM"].map((h, i) => (
                <th key={h} className={`px-3 py-2 font-semibold text-muted-foreground uppercase ${i >= 2 ? "text-right" : "text-left"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lines.length > 0 ? lines.map((li, i) => (
              <tr key={i} className="hover:bg-muted/30">
                <td className="px-3 py-2 text-muted-foreground">{String(li.line_number ?? i + 1)}</td>
                <td className="px-3 py-2 font-mono">{String(li.part_number ?? "—")}</td>
                <td className="px-3 py-2 text-right">{Number(li.qty_received ?? 0).toLocaleString()}</td>
                <td className="px-3 py-2">{String(li.uom ?? "EA")}</td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground italic">No line items</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground border-t border-border pt-3">
        <p><span className="font-medium text-foreground">Total lines:</span> {lines.length}</p>
        <div className="text-right">
          <p className="font-medium text-foreground">Received via EDI X12 861</p>
          <p>{doc.date}</p>
        </div>
      </div>
    </div>
  );
}

// ── 990 Load Tender Response View ───────────────────────────────────────────

function LoadTenderResponseView({ doc }: { doc: EdiDoc }) {
  const d            = doc.parsedData ?? {};
  const responseCode = (d.response_code as string | undefined) ?? 'UN';
  const isAccepted   = ['A', 'AA'].includes(responseCode);
  const isDeclined   = ['D', 'RE'].includes(responseCode);
  const carrierName  = (d.carrier_name  as string | undefined) ?? doc.company;
  const carrierId    = (d.carrier_id    as string | undefined) ?? '—';
  const loadTenderId = (d.load_tender_id as string | undefined) ?? extractPoFromX12(doc.raw) ?? '—';
  const pickupDate   = (d.estimated_pickup_date   as string | undefined);
  const deliveryDate = (d.estimated_delivery_date as string | undefined);
  const rejectionReason = (d.rejection_reason as string | undefined);

  const bannerCls = isAccepted
    ? "bg-green-50 border-green-300 text-green-800"
    : isDeclined
    ? "bg-red-50 border-red-300 text-red-800"
    : "bg-muted border-border text-muted-foreground";

  const responseLabel = isAccepted ? "Accepted" : isDeclined ? "Declined" : `Unknown (${responseCode})`;

  return (
    <div className="space-y-4 text-sm">
      {/* Letterhead */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <Leaf className="w-4 h-4 text-primary" />
            <span className="font-bold text-base text-primary">PhilHarvest</span>
          </div>
          <p className="text-xs text-muted-foreground">Agricultural Marketplace</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-foreground tracking-tight">LOAD TENDER RESPONSE</h2>
          <p className="text-xs text-muted-foreground">ISA Control: {doc.isaControl}</p>
          <p className="text-xs text-muted-foreground">Received: {doc.date}</p>
        </div>
      </div>

      {/* Response banner */}
      <div className={`flex items-center gap-3 border rounded-lg px-4 py-3 ${bannerCls}`}>
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isAccepted ? "bg-green-500" : isDeclined ? "bg-red-500" : "bg-muted-foreground"}`} />
        <div>
          <p className="font-bold text-base">{responseLabel}</p>
          {rejectionReason && <p className="text-xs mt-0.5">{rejectionReason}</p>}
        </div>
        <span className="ml-auto font-mono text-xs font-bold opacity-60">{responseCode}</span>
      </div>

      {/* Carrier + reference info */}
      <div className="grid grid-cols-2 gap-4 border border-border rounded-lg p-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Carrier</p>
          <p className="font-semibold text-foreground">{carrierName}</p>
          <p className="text-xs text-muted-foreground font-mono">{carrierId}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Load Tender Reference</p>
          <p className="font-semibold text-foreground font-mono">{loadTenderId}</p>
        </div>
        {pickupDate && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Est. Pickup Date</p>
            <p className="font-semibold text-foreground">{pickupDate}</p>
          </div>
        )}
        {deliveryDate && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Est. Delivery Date</p>
            <p className="font-semibold text-foreground">{deliveryDate}</p>
          </div>
        )}
      </div>

      <div className="flex justify-end text-xs text-muted-foreground border-t border-border pt-3">
        <div className="text-right">
          <p className="font-medium text-foreground">Received via EDI X12 990</p>
          <p>{doc.date}</p>
        </div>
      </div>
    </div>
  );
}

// ── Thread building ──────────────────────────────────────────────────────────

// Extracts the PO number from a raw X12 payload.
// 850 stores it in BEG03 (BEG*{01}*{02}*{po_number}*...)
// 855 stores it in BAK03 (BAK*{01}*{02}*{po_number}*...)
function extractPoFromX12(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  // 850: BEG*xx*xx*{PO} (BEG03)
  // 855: BAK*xx*xx*{PO} (BAK03)
  let match = raw.match(/(?:BEG|BAK)\*[^*]*\*[^*]*\*([^*~\r\n]+)/);
  if (match?.[1]?.trim()) return match[1].trim();
  // 856: PRF*{PO} (PRF01)
  match = raw.match(/PRF\*([^*~\r\n]+)/);
  if (match?.[1]?.trim()) return match[1].trim();
  // 810: BIG*{date}*{inv}*{date}*{PO} (BIG04)
  match = raw.match(/BIG\*[^*]*\*[^*]*\*[^*]*\*([^*~\r\n]+)/);
  if (match?.[1]?.trim()) return match[1].trim();
  // 204: L11*{PO}*PO — only match when qualifier is PO, not CR/other
  match = raw.match(/L11\*([^*~\r\n]+)\*PO[^*~\r\n]*/);
  if (match?.[1]?.trim()) return match[1].trim();
  // 861: BRA*{ra_num}*{PO} (BRA02)
  match = raw.match(/BRA\*[^*]*\*([^*~\r\n]+)/);
  if (match?.[1]?.trim()) return match[1].trim();
  // 990: B1*{carrier}*{reference}*{code} — B1-02 is the load tender / PO reference
  match = raw.match(/B1\*[^*]*\*([^*~\r\n]+)/);
  if (match?.[1]?.trim()) return match[1].trim();
  return undefined;
}

function buildThreads(docs: EdiDoc[]): { threads: Thread[]; orphans: EdiDoc[] } {
  const inbound850s = docs
    .filter((d) => d.type === "850" && d.direction === "inbound")
    .sort((a, b) => b.date.localeCompare(a.date));

  const used = new Set<string>();
  inbound850s.forEach((d) => used.add(d.id));

  const threads: Thread[] = inbound850s.map((po) => {
    // Use parsedData.po_number first; fall back to parsing the raw X12.
    const poNum = (po.parsedData?.po_number as string | undefined) ?? extractPoFromX12(po.raw);

    // Match strictly by PO number. Both sides must have one and they must match.
    // No partner-only fallback — an unresolvable doc stays as an orphan.
    function byRelated(type: string) {
      return (d: EdiDoc) => {
        if (used.has(d.id) || d.type !== type) return false;
        if (d.partnerId !== po.partnerId) return false;
        const dPo = (d.parsedData?.po_number as string | undefined) ?? extractPoFromX12(d.raw);
        return !!poNum && !!dPo && dPo === poNum;
      };
    }

    // 204/990 go to a different partner (logistics), so skip the partnerId gate.
    function byPoOnly(type: string) {
      return (d: EdiDoc) => {
        if (used.has(d.id) || d.type !== type) return false;
        // 990 stores the PO reference in load_tender_id (B1[2]), not po_number
        const dPo = (d.parsedData?.po_number as string | undefined)
          ?? (d.parsedData?.load_tender_id as string | undefined)
          ?? extractPoFromX12(d.raw);
        return !!poNum && !!dPo && dPo === poNum;
      };
    }

    function take(filter: (d: EdiDoc) => boolean): EdiDoc[] {
      const found = docs.filter(filter);
      found.forEach((d) => used.add(d.id));
      return found;
    }

    return {
      po,
      docs855: take(byRelated("855")),
      docs856: take(byRelated("856")),
      docs861: take(byRelated("861")),
      docs810: take(byRelated("810")),
      docs204: take(byPoOnly("204")),
      docs990: take(byPoOnly("990")),
    };
  });

  const orphans = docs.filter((d) => !used.has(d.id));
  return { threads, orphans };
}

function getThreadState(t: Thread): ThreadState {
  const latest855 = [...t.docs855].sort((a, b) => b.date.localeCompare(a.date))[0];
  const has855Delivered = latest855?.status === "delivered";
  // parsedData is overwritten by the transmitter with {response_code, sent_at, endpoint}
  // so fall back to parsing BAK02 from the raw X12: BAK*00*{ackCode}*{PO}*{date}
  const ackCode855 =
    (latest855?.parsedData?.acknowledgment_code as string | undefined) ??
    latest855?.raw?.match(/BAK\*[^*]*\*([^*~\r\n]+)/)?.[1]?.trim();
  const isRejected = has855Delivered && ackCode855 === "RE";

  return {
    can855: t.docs855.length === 0,
    can204: has855Delivered && !isRejected && t.docs204.length === 0,
    can856: has855Delivered && !isRejected && t.docs856.length === 0,
    can810: has855Delivered && !isRejected && t.docs810.length === 0,
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
  thread, expanded, onToggle, onView, actions, onDelete, deleting,
}: {
  thread: Thread;
  expanded: boolean;
  onToggle: () => void;
  onView: (doc: EdiDoc) => void;
  onDelete: (thread: Thread) => void;
  deleting: boolean;
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

        {(() => {
          const isCompleted = thread.docs990.length > 0 && thread.docs810.length > 0;
          if (state.isRejected) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-200 shrink-0">Rejected</span>;
          if (isCompleted) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700 border border-green-200 shrink-0">Completed</span>;
          return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200 shrink-0">Active</span>;
        })()}
        <StatusBadge status={po.status} />
        <span className="text-xs text-muted-foreground whitespace-nowrap">{po.date}</span>
        <Button
          size="sm" variant="ghost" className="h-6 text-xs px-2 shrink-0"
          onClick={(e) => { e.stopPropagation(); onView(po); }}
        >
          View
        </Button>
        <Button
          size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(thread); }}
          disabled={deleting}
          title="Delete thread"
        >
          <Trash2 className="w-3.5 h-3.5" />
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
            locked={state.isRejected}
          />
          <DocStep
            docType="861" label="Receiving Advice"
            docs={thread.docs861} canSend={false}
            onView={onView} locked={state.isRejected} inbound
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
  const [weightMap, setWeightMap] = useState<Record<string, number>>({});
  const [partners, setPartners] = useState<TradingPartner[]>([]);
  const [deletingThread, setDeletingThread] = useState<string | null>(null);
  const { toast } = useToast();
  const { setPrefill } = useEdiPrefill();
  const [, navigate] = useLocation();

  useEffect(() => {
    fetchProducts({ per_page: 500 }).then((page) => {
      const map: Record<string, number> = {};
      for (const p of page.data) {
        if (p.sku && p.weight_kg != null) {
          map[p.sku] = Number(p.weight_kg) * 2.20462;
        }
      }
      setWeightMap(map);
    }).catch(() => {});
    fetchTradingPartners().then(setPartners).catch(() => {});
  }, []);

  const loadDocs = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    fetchTransactions()
      .then((data) => setAllDocs(data.map(mapTransaction)))
      .catch((err) => { if (!silent) toast({ title: "Failed to load transactions", description: err.message, variant: "destructive" }); })
      .finally(() => { if (!silent) setLoading(false); });
  }, [toast]);

  useEffect(() => { loadDocs(); }, [loadDocs]);
  usePolling(() => loadDocs(true), 10_000);

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

  async function handleDeleteThread(thread: Thread) {
    if (!window.confirm(`Delete this 850 thread (${(thread.po.parsedData?.po_number as string | undefined) ?? thread.po.id}) and all its related documents? This cannot be undone.`)) return;
    setDeletingThread(thread.po.id);
    const allDocs = [thread.po, ...thread.docs855, ...thread.docs204, ...thread.docs990, ...thread.docs856, ...thread.docs810, ...thread.docs861];
    try {
      await Promise.all(allDocs.map((d) => deleteTransaction(d.backendId)));
      toast({ title: "Thread deleted", description: `PO thread and ${allDocs.length} document(s) removed.` });
      loadDocs();
    } catch (err: unknown) {
      toast({ title: "Delete failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setDeletingThread(null);
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
    send855: (po: EdiDoc) => {
      const partner = partners.find(
        (p) => p.isa_receiver_id.trim().toUpperCase() === po.partnerId.trim().toUpperCase()
      );
      const excludedSkus = partner?.excluded_skus ?? [];
      prefillAndGo("855", build855Prefill(po, excludedSkus), po.id);
    },
    send204: (po: EdiDoc) => prefillAndGo("204", build204Prefill(po, weightMap), po.id),
    send856: (po: EdiDoc) => prefillAndGo("856", build856Prefill(po, weightMap), po.id),
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
          <Button variant="outline" size="icon" title="Refresh" onClick={() => loadDocs()} disabled={loading} data-testid="button-refresh-edi">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {filteredThreads.length} purchase order{filteredThreads.length !== 1 ? "s" : ""} · use the refresh button to reload
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
                onDelete={handleDeleteThread}
                deleting={deletingThread === thread.po.id}
                actions={actions}
              />
            ))}
          </div>
        )}

        {/* Orphaned docs not linked to any 850 */}
        {orphans.length > 0 && !loading && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              DOCUMENTS
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
          <DialogContent className={selected?.type === "850" || selected?.type === "861" || selected?.type === "990" ? "max-w-3xl" : "max-w-2xl"}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selected?.id}
                <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold ${typeColors[selected?.type ?? ""] ?? "bg-muted"}`}>
                  {selected?.type} — {selected?.label}
                </span>
              </DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-3 overflow-y-auto max-h-[75vh]">
                {selected.type === "850" ? (
                  <>
                    <PurchaseOrderView doc={selected} />
                    {selected.raw && (
                      <details className="group">
                        <summary className="text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground">
                          Show raw EDI payload
                        </summary>
                        <pre className="mt-2 bg-muted text-xs p-3 rounded-lg font-mono break-all whitespace-pre-wrap text-foreground overflow-auto max-h-[40vh]">{selected.raw}</pre>
                      </details>
                    )}
                    <div className="flex gap-2 flex-wrap pt-1 border-t border-border">
                      <Button size="sm" className="gap-1.5" onClick={() => printPOWindow(selected)} data-testid="button-print-po">
                        <Printer className="w-3.5 h-3.5" />Print PO
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5" disabled={!selected.raw} onClick={() => downloadRaw(selected)} data-testid="button-download-doc">
                        <Download className="w-3.5 h-3.5" />Download EDI
                      </Button>
                    </div>
                  </>
                ) : selected.type === "861" ? (
                  <>
                    <ReceivingAdviceView doc={selected} />
                    {selected.raw && (
                      <details className="group">
                        <summary className="text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground">
                          Show raw EDI payload
                        </summary>
                        <pre className="mt-2 bg-muted text-xs p-3 rounded-lg font-mono break-all whitespace-pre-wrap text-foreground overflow-auto max-h-[40vh]">{selected.raw}</pre>
                      </details>
                    )}
                    <div className="flex gap-2 flex-wrap pt-1 border-t border-border">
                      <Button size="sm" className="gap-1.5" onClick={() => printReceivingAdviceWindow(selected)} data-testid="button-print-ra">
                        <Printer className="w-3.5 h-3.5" />Print RA
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5" disabled={!selected.raw} onClick={() => downloadRaw(selected)} data-testid="button-download-doc">
                        <Download className="w-3.5 h-3.5" />Download EDI
                      </Button>
                    </div>
                  </>
                ) : selected.type === "990" ? (
                  <>
                    <LoadTenderResponseView doc={selected} />
                    {selected.raw && (
                      <details className="group">
                        <summary className="text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground">
                          Show raw EDI payload
                        </summary>
                        <pre className="mt-2 bg-muted text-xs p-3 rounded-lg font-mono break-all whitespace-pre-wrap text-foreground overflow-auto max-h-[40vh]">{selected.raw}</pre>
                      </details>
                    )}
                    <div className="flex gap-2 flex-wrap pt-1 border-t border-border">
                      <Button size="sm" variant="outline" className="gap-1.5" disabled={!selected.raw} onClick={() => downloadRaw(selected)} data-testid="button-download-doc">
                        <Download className="w-3.5 h-3.5" />Download EDI
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-xs text-muted-foreground">Company</p><p className="font-medium">{selected.company}</p></div>
                      <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={selected.status} /></div>
                      <div><p className="text-xs text-muted-foreground">Direction</p><p className="font-medium capitalize">{selected.direction}</p></div>
                      <div><p className="text-xs text-muted-foreground">Date</p><p className="font-medium">{selected.date}</p></div>
                      <div><p className="text-xs text-muted-foreground">ISA Control #</p><p className="font-mono font-medium">{selected.isaControl}</p></div>
                    </div>
                    {selected.raw && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Raw EDI Payload</p>
                        <pre className="bg-muted text-xs p-3 rounded-lg font-mono break-all whitespace-pre-wrap text-foreground overflow-auto max-h-[40vh]">{selected.raw}</pre>
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
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
