import { useState } from "react";
import { Send, Copy, RefreshCw, Check, ChevronDown } from "lucide-react";
import { sendRaw850, send856, send810 } from "@/services/ediApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useToast } from "@/hooks/use-toast";

const companies = [
  { id: "ec1", name: "Puregold Price Club Inc.", code: "PUREGOLD" },
  { id: "ec2", name: "Robinsons Supermarket", code: "ROBINSON" },
  { id: "ec3", name: "SM Markets Philippines", code: "SMMARKETS" },
  { id: "ec4", name: "Metro Retail Stores Group", code: "METRO-RTL" },
  { id: "ec5", name: "LBC Express Inc.", code: "LBCEXPRES" },
];

type DocType = "850" | "856" | "810" | "997";

const docTypes: { value: DocType; label: string; description: string }[] = [
  { value: "850", label: "850 — Purchase Order", description: "Send a purchase order to a trading partner" },
  { value: "856", label: "856 — Advance Ship Notice", description: "Notify a partner about an upcoming shipment" },
  { value: "810", label: "810 — Invoice", description: "Send an invoice for goods delivered" },
  { value: "997", label: "997 — Functional Acknowledgment", description: "Acknowledge receipt of an EDI document" },
];

function buildISA(senderCode: string, receiverCode: string, controlNum: string): string {
  const today = new Date();
  const date = today.toISOString().slice(2, 10).replace(/-/g, "");
  const time = today.toTimeString().slice(0, 5).replace(":", "");
  return `ISA*00*          *00*          *ZZ*${senderCode.padEnd(15)}*ZZ*${receiverCode.padEnd(15)}*${date}*${time}*^*00501*${controlNum.padStart(9, "0")}*0*P*>`;
}

function build850(senderCode: string, receiverCode: string, ctrl: string, poNum: string, items: LineItem[]): string {
  const isa = buildISA(senderCode, receiverCode, ctrl);
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const segments = [
    isa,
    `GS*PO*${senderCode}*${receiverCode}*${today}*${new Date().toTimeString().slice(0, 4).replace(":", "")}*${ctrl}*X*005010`,
    `ST*850*0001`,
    `BEG*00*SA*${poNum}**${today}`,
    `REF*DP*001`,
    `N1*BT*${receiverCode}*92*${receiverCode}-001`,
    ...items.map((it, i) => `PO1*${i + 1}*${it.qty}*${it.unit}*${it.price}**BP*${it.sku}`),
    `CTT*${items.length}`,
    `SE*${9 + items.length}*0001`,
    `GE*1*${ctrl}`,
    `IEA*1*${ctrl.padStart(9, "0")}`,
  ];
  return segments.join("~\n") + "~";
}

function build856(senderCode: string, receiverCode: string, ctrl: string, shipId: string, poNum: string): string {
  const isa = buildISA(senderCode, receiverCode, ctrl);
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return [
    isa,
    `GS*SH*${senderCode}*${receiverCode}*${today}*${new Date().toTimeString().slice(0, 4).replace(":", "")}*${ctrl}*X*005010`,
    `ST*856*0001`,
    `BSN*00*${shipId}*${today}*0000*0001`,
    `HL*1**S`,
    `TD1*CTN*1***G*50*KG`,
    `TD5**2*PHIL-LOGISTICS`,
    `N1*SF*PHILHARVEST CORP*92*PHILHARVEST`,
    `N1*ST*${receiverCode}*92*${receiverCode}-001`,
    `HL*2*1*O`,
    `PRF*${poNum}***${today}`,
    `HL*3*2*I`,
    `LIN*1*BP*PRODUCT-001`,
    `SN1*1*100*KG`,
    `CTT*3`,
    `SE*14*0001`,
    `GE*1*${ctrl}`,
    `IEA*1*${ctrl.padStart(9, "0")}`,
  ].join("~\n") + "~";
}

function build810(senderCode: string, receiverCode: string, ctrl: string, invNum: string, poNum: string, amount: string): string {
  const isa = buildISA(senderCode, receiverCode, ctrl);
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return [
    isa,
    `GS*IN*${senderCode}*${receiverCode}*${today}*${new Date().toTimeString().slice(0, 4).replace(":", "")}*${ctrl}*X*005010`,
    `ST*810*0001`,
    `BIG*${today}*${invNum}*${today}*${poNum}`,
    `N1*SE*PHILHARVEST CORP*92*PHILHARVEST`,
    `N1*BY*${receiverCode}*92*${receiverCode}-001`,
    `IT1*1*1*EA*${amount}**BP*INVOICE-ITEM-001`,
    `TDS*${Math.round(Number(amount) * 100)}`,
    `CTT*1`,
    `SE*9*0001`,
    `GE*1*${ctrl}`,
    `IEA*1*${ctrl.padStart(9, "0")}`,
  ].join("~\n") + "~";
}

function build997(senderCode: string, receiverCode: string, ctrl: string, ackCtrl: string): string {
  const isa = buildISA(senderCode, receiverCode, ctrl);
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return [
    isa,
    `GS*FA*${senderCode}*${receiverCode}*${today}*${new Date().toTimeString().slice(0, 4).replace(":", "")}*${ctrl}*X*005010`,
    `ST*997*0001`,
    `AK1*PO*${ackCtrl}`,
    `AK9*A*1*1*1`,
    `SE*4*0001`,
    `GE*1*${ctrl}`,
    `IEA*1*${ctrl.padStart(9, "0")}`,
  ].join("~\n") + "~";
}

interface LineItem { sku: string; qty: string; unit: string; price: string; }

export default function EdiOutbound() {
  const [docType, setDocType] = useState<DocType>("850");
  const [company, setCompany] = useState("");
  const [poNum, setPoNum] = useState(`PO-${Date.now().toString().slice(-6)}`);
  const [shipId, setShipId] = useState(`SHP-${Date.now().toString().slice(-6)}`);
  const [invNum, setInvNum] = useState(`INV-${Date.now().toString().slice(-6)}`);
  const [amount, setAmount] = useState("8500");
  const [ackCtrl, setAckCtrl] = useState("000000091");
  const [lineItems, setLineItems] = useState<LineItem[]>([{ sku: "TOMATO-001", qty: "200", unit: "KG", price: "85.00" }]);
  const [preview, setPreview] = useState("");
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const selectedCompany = companies.find((c) => c.id === company);
  const senderCode = "PHILHARVEST";
  const ctrlNum = `${Date.now().toString().slice(-6)}`;

  function generate() {
    if (!company) { toast({ title: "Select a company first", variant: "destructive" }); return; }
    const rc = selectedCompany?.code ?? "PARTNER";
    let edi = "";
    if (docType === "850") edi = build850(senderCode, rc, ctrlNum, poNum, lineItems);
    else if (docType === "856") edi = build856(senderCode, rc, ctrlNum, shipId, poNum);
    else if (docType === "810") edi = build810(senderCode, rc, ctrlNum, invNum, poNum, amount);
    else if (docType === "997") edi = build997(senderCode, rc, ctrlNum, ackCtrl);
    setPreview(edi);
    setSent(false);
  }

  function copyEdi() {
    navigator.clipboard.writeText(preview).then(() => {
      setCopied(true);
      toast({ title: "EDI payload copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleSend() {
    if (!preview) { toast({ title: "Generate the EDI document first", variant: "destructive" }); return; }
    if (!selectedCompany) { toast({ title: "Select a company first", variant: "destructive" }); return; }

    setSending(true);
    const today = new Date().toISOString().slice(0, 10);

    const philharvestAddress = {
      name: "PhilHarvest Corp", address: "Quezon City",
      city: "Quezon City", state: "Metro Manila", zip: "1100", country: "PH",
    };
    const partnerAddress = {
      name: selectedCompany.name, address: "Philippines",
      city: "Manila", state: "Metro Manila", zip: "1000", country: "PH",
    };

    try {
      if (docType === "850") {
        // 850 is submitted as an inbound raw X12 document
        const result = await sendRaw850(preview);
        toast({ title: "850 accepted", description: `Transaction ${result.transaction_id} · Control ${result.control_number}` });
        setSent(true);
      } else if (docType === "856") {
        const result = await send856({
          asn_number:        shipId,
          po_number:         poNum,
          po_date:           today,
          manufacturer_id:   "PHILHARVEST",
          ship_date:         today,
          ship_from_address: philharvestAddress,
          ship_to_address:   partnerAddress,
          boxes: [{
            box_number: "1",
            line_items: [{ line_number: "1", part_number: "PRODUCT-001", part_description: "Shipment item", quantity: 1, quantity_uom: "EA" }],
          }],
        });
        toast({ title: "856 sent", description: `Transaction ${result.transaction_id} · Status: ${result.status}` });
        setSent(true);
      } else if (docType === "810") {
        const result = await send810({
          invoice_number:    invNum,
          invoice_date:      today,
          po_number:         poNum,
          po_date:           today,
          manufacturer_id:   "PHILHARVEST",
          bill_to_name:      selectedCompany.name,
          bill_to_address:   partnerAddress,
          ship_from_address: philharvestAddress,
          line_items: [{
            line_number:       "1",
            po_line_number:    "1",
            part_number:       "INVOICE-ITEM-001",
            part_description:  "Invoice item",
            invoiced_quantity: 1,
            quantity_uom:      "EA",
            unit_price:        parseFloat(amount) || 0,
          }],
          total_amount: parseFloat(amount) || 0,
        });
        toast({ title: "810 sent", description: `Transaction ${result.transaction_id} · Status: ${result.status}` });
        setSent(true);
      } else if (docType === "997") {
        toast({ title: "997 not supported", description: "Functional Acknowledgments cannot be sent via this interface.", variant: "destructive" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Send failed", description: msg, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  function addLine() { setLineItems((p) => [...p, { sku: "", qty: "1", unit: "KG", price: "0.00" }]); }
  function removeLine(i: number) { setLineItems((p) => p.filter((_, idx) => idx !== i)); }
  function updateLine(i: number, k: keyof LineItem, v: string) { setLineItems((p) => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it)); }

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
                  <Select value={docType} onValueChange={(v) => { setDocType(v as DocType); setPreview(""); }} >
                    <SelectTrigger className="mt-1" data-testid="select-doc-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {docTypes.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">{docTypes.find((d) => d.value === docType)?.description}</p>
                </div>
                <div>
                  <Label>Trading Partner</Label>
                  <Select value={company} onValueChange={(v) => { setCompany(v); setPreview(""); }}>
                    <SelectTrigger className="mt-1" data-testid="select-partner"><SelectValue placeholder="Select company..." /></SelectTrigger>
                    <SelectContent>
                      {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Doc-specific fields */}
            {(docType === "850" || docType === "856" || docType === "810") && (
              <Card className="border-card-border">
                <CardHeader><CardTitle className="text-base">Reference Numbers</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {(docType === "850" || docType === "856" || docType === "810") && (
                    <div>
                      <Label>PO Number</Label>
                      <Input className="mt-1 font-mono text-sm" value={poNum} onChange={(e) => setPoNum(e.target.value)} data-testid="input-po-num" />
                    </div>
                  )}
                  {docType === "856" && (
                    <div>
                      <Label>Shipment ID</Label>
                      <Input className="mt-1 font-mono text-sm" value={shipId} onChange={(e) => setShipId(e.target.value)} data-testid="input-ship-id" />
                    </div>
                  )}
                  {docType === "810" && (
                    <>
                      <div>
                        <Label>Invoice Number</Label>
                        <Input className="mt-1 font-mono text-sm" value={invNum} onChange={(e) => setInvNum(e.target.value)} data-testid="input-inv-num" />
                      </div>
                      <div>
                        <Label>Total Amount (₱)</Label>
                        <Input className="mt-1" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="input-amount" />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {docType === "997" && (
              <Card className="border-card-border">
                <CardContent className="pt-5 space-y-3">
                  <div>
                    <Label>ISA Control # to Acknowledge</Label>
                    <Input className="mt-1 font-mono text-sm" value={ackCtrl} onChange={(e) => setAckCtrl(e.target.value)} data-testid="input-ack-ctrl" />
                  </div>
                </CardContent>
              </Card>
            )}

            {docType === "850" && (
              <Card className="border-card-border">
                <Collapsible defaultOpen>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer flex flex-row items-center justify-between">
                      <CardTitle className="text-base">Line Items</CardTitle>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-3">
                      {lineItems.map((it, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-4">
                            {i === 0 && <Label className="text-xs">SKU</Label>}
                            <Input className="mt-1 text-xs font-mono" value={it.sku} onChange={(e) => updateLine(i, "sku", e.target.value)} placeholder="TOMATO-001" data-testid={`input-sku-${i}`} />
                          </div>
                          <div className="col-span-2">
                            {i === 0 && <Label className="text-xs">Qty</Label>}
                            <Input className="mt-1 text-xs" type="number" value={it.qty} onChange={(e) => updateLine(i, "qty", e.target.value)} data-testid={`input-qty-${i}`} />
                          </div>
                          <div className="col-span-2">
                            {i === 0 && <Label className="text-xs">Unit</Label>}
                            <Input className="mt-1 text-xs" value={it.unit} onChange={(e) => updateLine(i, "unit", e.target.value)} data-testid={`input-unit-${i}`} />
                          </div>
                          <div className="col-span-3">
                            {i === 0 && <Label className="text-xs">Price (₱)</Label>}
                            <Input className="mt-1 text-xs" type="number" step="0.01" value={it.price} onChange={(e) => updateLine(i, "price", e.target.value)} data-testid={`input-price-${i}`} />
                          </div>
                          <div className="col-span-1 flex justify-end">
                            {lineItems.length > 1 && (
                              <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive" onClick={() => removeLine(i)} data-testid={`button-remove-line-${i}`}>
                                ×
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={addLine} className="w-full text-xs" data-testid="button-add-line">
                        + Add Line Item
                      </Button>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )}

            <Button className="w-full gap-2" onClick={generate} data-testid="button-generate-edi">
              <RefreshCw className="w-4 h-4" />Generate EDI Document
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
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={handleSend}
                      disabled={sent || sending}
                      data-testid="button-send-edi"
                    >
                      {sent
                        ? <Check className="w-3.5 h-3.5" />
                        : <Send className={`w-3.5 h-3.5 ${sending ? 'animate-pulse' : ''}`} />}
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
                    <p className="text-muted-foreground text-xs mt-1">Fill in the fields and click Generate</p>
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
