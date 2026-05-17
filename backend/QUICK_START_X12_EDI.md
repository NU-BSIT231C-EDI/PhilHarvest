# EDI Refactoring Quick Start

## 📋 What's New

Your backend now natively handles X12 EDI transactions without any CSV conversions:

### ✅ Inbound (Receive from Partners)
- **EDI 850** - Purchase Orders from manufacturers
- **EDI 990** - Carrier responses to load tenders

### ✅ Outbound (Send to Partners)
- **EDI 855** - PO acknowledgments to manufacturers
- **EDI 204** - Load tenders to logistics partners
- **EDI 856** - Advanced ship notices (ASN) to manufacturers
- **EDI 810** - Invoices to manufacturers

---

## 🚀 Getting Started

### Step 1: Configure Partner Endpoints

Add these to your `.env` file:

```bash
# ============================================================
# MANUFACTURER PARTNER
# ============================================================
EDI_MANUFACTURER_NAME=Your Manufacturer Name
EDI_MANUFACTURER_CODE=MANU
EDI_MANUFACTURER_ENDPOINT_855=https://api.manufacturer.com/edi/855
EDI_MANUFACTURER_ENDPOINT_856=https://api.manufacturer.com/edi/856
EDI_MANUFACTURER_ENDPOINT_810=https://api.manufacturer.com/edi/810
EDI_MANUFACTURER_AUTH_TYPE=api_key
EDI_MANUFACTURER_API_KEY=your_api_key_here
EDI_MANUFACTURER_TIMEOUT=30
EDI_MANUFACTURER_RETRY_ATTEMPTS=3
EDI_MANUFACTURER_RETRY_DELAY=5

# ============================================================
# LOGISTICS PARTNER
# ============================================================
EDI_LOGISTICS_NAME=Your Logistics Partner
EDI_LOGISTICS_CODE=LOGI
EDI_LOGISTICS_ENDPOINT_204=https://api.logistics.com/edi/204
EDI_LOGISTICS_ENDPOINT_990=https://api.logistics.com/edi/responses
EDI_LOGISTICS_AUTH_TYPE=api_key
EDI_LOGISTICS_API_KEY=logistics_api_key_here
EDI_LOGISTICS_TIMEOUT=30
EDI_LOGISTICS_RETRY_ATTEMPTS=3
EDI_LOGISTICS_RETRY_DELAY=5

# ============================================================
# GLOBAL EDI SETTINGS
# ============================================================
EDI_X12_VERSION=004010
EDI_SENDER_ID=PHILHARVEST
EDI_SENDER_QUALIFIER=01
EDI_CONTROL_PREFIX=PH
```

### Step 2: Test Inbound Reception

Send a raw X12 EDI 850:

```bash
curl -X POST http://localhost:8000/api/edi/850/receive \
  -H "Content-Type: application/x-edi" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  --data-binary @path/to/valid-850.edi
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "message": "EDI 850 received and queued for processing",
  "transaction_id": "abc-123-def",
  "control_number": "PH850_001234567",
  "po_number": "PO123456"
}
```

### Step 3: Test Outbound Transmission

Send an acknowledgment to the manufacturer:

```bash
curl -X POST http://localhost:8000/api/edi/855/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "po_number": "PO123456",
    "po_date": "2026-05-17",
    "manufacturer_id": "MANU001",
    "acknowledgment_code": "AA",
    "line_acknowledgments": [
      {
        "line_number": "1",
        "acknowledgment_code": "AA",
        "accepted_quantity": 100,
        "quantity_uom": "EA"
      }
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "EDI 855 sent",
  "transaction_id": "xyz-789-abc",
  "control_number": "PH855_001234567",
  "status": "SENT"
}
```

---

## 📁 File Structure

```
app/
├── DTOs/Edi/
│   ├── Edi850PurchaseOrderDto.php
│   ├── Edi850LineItemDto.php
│   ├── Edi990ResponseDto.php
│   ├── Edi855PurchaseOrderAckDto.php
│   ├── Edi855LineAckDto.php
│   ├── Edi204MotorCarrierLoadTenderDto.php
│   ├── Edi204ShipmentDto.php
│   ├── Edi204ShipmentLineItemDto.php
│   ├── Edi856AdvanceShipNoticeDto.php
│   ├── Edi856BoxDto.php
│   ├── Edi856BoxLineItemDto.php
│   ├── Edi810InvoiceDto.php
│   └── Edi810LineItemDto.php
│
├── Services/Edi/
│   ├── Parsers/
│   │   ├── Edi850Parser.php          # Parse inbound 850
│   │   └── Edi990Parser.php          # Parse inbound 990
│   ├── Generators/
│   │   ├── Edi855Generator.php       # Generate outbound 855
│   │   ├── Edi204Generator.php       # Generate outbound 204
│   │   ├── Edi856Generator.php       # Generate outbound 856
│   │   └── Edi810Generator.php       # Generate outbound 810
│   └── OutboundEdiTransmissionService.php  # Handle endpoint transmission
│
├── Http/Controllers/Api/Edi/
│   ├── InboundX12Controller.php      # Receive raw X12 strings
│   └── OutboundX12Controller.php     # Generate and transmit X12 strings
│
└── Models/
    └── EdiTransaction.php            # Transaction logging

config/
└── edi-partners.php                  # Partner configuration (reads from .env)
```

---

## 🔄 Request/Response Examples

### Inbound: Receive EDI 850

**POST** `/api/edi/850/receive`
- **Content-Type:** `application/x-edi`
- **Body:** Raw X12 string starting with `ISA*`

### Inbound: Receive EDI 990

**POST** `/api/edi/990/receive`
- **Content-Type:** `application/x-edi`
- **Body:** Raw X12 string from carrier

### Outbound: Send EDI 855 (PO Acknowledgment)

**POST** `/api/edi/855/send`

```json
{
  "po_number": "PO123456",
  "po_date": "2026-05-17",
  "manufacturer_id": "MANU001",
  "acknowledgment_code": "AA",  // AA=Accept, RE=Reject, IA=Partial
  "line_acknowledgments": [
    {
      "line_number": "1",
      "acknowledgment_code": "AA",
      "accepted_quantity": 100,
      "quantity_uom": "EA",
      "estimated_delivery_date": "2026-06-01"
    }
  ]
}
```

### Outbound: Send EDI 204 (Load Tender)

**POST** `/api/edi/204/send`

```json
{
  "load_tender_id": "LOAD001",
  "shipper_company_name": "Phil Harvest Inc",
  "shipper_address": {
    "street": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "zip": "62701"
  },
  "carrier_code": "CARRIER001",
  "ship_to_address": {
    "company_name": "Destination",
    "street": "456 Oak Ave",
    "city": "Chicago",
    "state": "IL",
    "zip": "60601"
  },
  "shipments": [
    {
      "shipment_number": "SHIP001",
      "shipment_type": "TL",
      "weight": 25000,
      "weight_uom": "LB",
      "line_items": [...]
    }
  ]
}
```

### Outbound: Send EDI 856 (Advanced Ship Notice)

**POST** `/api/edi/856/send`

```json
{
  "asn_number": "ASN001",
  "po_number": "PO123456",
  "po_date": "2026-05-17",
  "manufacturer_id": "MANU001",
  "ship_date": "2026-05-18",
  "ship_from_address": {...},
  "ship_to_address": {...},
  "carrier_code": "CARRIER001",
  "tracking_number": "TRK123456789",
  "boxes": [
    {
      "box_number": "BOX001",
      "line_items": [
        {
          "line_number": "1",
          "po_line_number": "1",
          "part_number": "PART123",
          "part_description": "Widget",
          "shipped_quantity": 100,
          "quantity_uom": "EA"
        }
      ]
    }
  ]
}
```

### Outbound: Send EDI 810 (Invoice)

**POST** `/api/edi/810/send`

```json
{
  "invoice_number": "INV001",
  "invoice_date": "2026-05-17",
  "po_number": "PO123456",
  "po_date": "2026-05-15",
  "manufacturer_id": "MANU001",
  "bill_to_name": "Manufacturer Inc",
  "bill_to_address": {...},
  "ship_from_address": {...},
  "payment_terms": "Net 30",
  "line_items": [
    {
      "line_number": "1",
      "po_line_number": "1",
      "part_number": "PART123",
      "part_description": "Widget",
      "invoiced_quantity": 100,
      "quantity_uom": "EA",
      "unit_price": 25.00
    }
  ],
  "subtotal_amount": 2500.00,
  "tax_amount": 200.00,
  "shipping_amount": 50.00,
  "total_amount": 2750.00
}
```

---

## 🔍 Check Transmission Status

**GET** `/api/edi/transmissions/{controlNumber}`

```json
{
  "transaction_id": "abc-123",
  "transaction_type": "855",
  "control_number": "PH855_001234567",
  "partner_id": "MANUFACTURER",
  "status": "SENT",
  "created_at": "2026-05-17T10:30:00Z",
  "updated_at": "2026-05-17T10:32:00Z",
  "error_message": null
}
```

**Possible Statuses:**
- `RECEIVED` - Inbound message received
- `PROCESSED` - Inbound message processed
- `PENDING` - Outbound message queued
- `SENT` - Successfully transmitted
- `RETRYING` - Currently retrying after failure
- `FAILED` - All retry attempts exhausted

---

## 🔄 Retry Failed Transmission

**POST** `/api/edi/transmissions/{transactionId}/retry`

```json
{
  "success": true,
  "message": "Transmission retry initiated",
  "transaction_id": "xyz-789",
  "status": "RETRYING"
}
```

---

## 🛠️ Key Services

### Parsing (Inbound)

```php
$parser = app(Edi850Parser::class);
$dto = $parser->parse($rawX12String);  // → Edi850PurchaseOrderDto
```

### Generation (Outbound)

```php
$generator = app(Edi855Generator::class);
$x12String = $generator->generate($dto);  // Raw X12 string
```

### Transmission

```php
$service = app(OutboundEdiTransmissionService::class);
$transaction = $service->send855($x12String, $poNumber);
// Returns EdiTransaction with status: SENT or FAILED
```

---

## ✅ Migration Checklist

- [ ] Update `.env` with all partner endpoints and API keys
- [ ] Test inbound 850 reception with sample file
- [ ] Test inbound 990 reception
- [ ] Test outbound 855 generation and transmission
- [ ] Test outbound 204 generation and transmission
- [ ] Test outbound 856 generation and transmission
- [ ] Test outbound 810 generation and transmission
- [ ] Verify retry mechanism on failed transmission
- [ ] Update client integrations to send raw X12
- [ ] Remove CSV-related endpoints from clients
- [ ] Configure monitoring for transmission failures

---

## 📞 Troubleshooting

### Invalid X12 Format Error
```
Error: Invalid X12 format - Payload does not appear to be valid X12 EDI
```
**Solution:** Ensure X12 starts with `ISA*` and contains segment terminators (`~`)

### Authentication Failed
```
Error: 401 Unauthorized on Partner Endpoint
```
**Solution:** Verify API key in `.env` matches what partner expects

### Timeout on Transmission
```
Error: Failed after 3 attempts: Connection timeout
```
**Solution:** Increase `EDI_MANUFACTURER_TIMEOUT` or `EDI_LOGISTICS_TIMEOUT` in `.env`

### Control Number Collision
```
Error: Duplicate control_number
```
**Solution:** Control numbers are auto-generated with timestamp; this shouldn't happen. Contact support if persistent.

---

## 📚 Additional Resources

- Full architecture doc: `X12_EDI_ARCHITECTURE.md`
- Sample X12 files: `tests/fixtures/edi/`
- X12 EDI Standard: https://www.edi.com/standards/x12/
- ANSI ASC X12 Documentation: https://www.disa.org/

