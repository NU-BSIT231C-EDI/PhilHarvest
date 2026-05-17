# Native X12 EDI Architecture - Implementation Guide

## Overview

This refactored backend implements a **native X12 EDI architecture** that passes raw `.edi`/`.x12` string payloads directly through API endpoints. The system has been completely decoupled from CSV conversions and now handles all B2B integration through industry-standard EDI formats.

## Architecture Components

### 1. Configuration System

#### Partner Registry (`config/edi-partners.php`)

Centralized configuration for all partner endpoints and authentication methods:

```php
return [
    'manufacturer' => [
        'endpoints' => [
            '855' => env('EDI_MANUFACTURER_ENDPOINT_855'),  // PO Acknowledgment
            '856' => env('EDI_MANUFACTURER_ENDPOINT_856'),  // ASN
            '810' => env('EDI_MANUFACTURER_ENDPOINT_810'),  // Invoice
        ],
        'authentication' => [
            'type' => env('EDI_MANUFACTURER_AUTH_TYPE', 'api_key'),
            'api_key' => env('EDI_MANUFACTURER_API_KEY'),
        ],
        'retry' => [
            'max_attempts' => env('EDI_MANUFACTURER_RETRY_ATTEMPTS', 3),
            'delay_seconds' => env('EDI_MANUFACTURER_RETRY_DELAY', 5),
        ],
    ],
    'logistics' => [
        'endpoints' => [
            '204' => env('EDI_LOGISTICS_ENDPOINT_204'),  // Motor Carrier Load Tender
        ],
        // ... similar configuration
    ],
];
```

#### Environment Variables (`.env`)

All endpoints and credentials are externalized:

```bash
# Manufacturer Partner
EDI_MANUFACTURER_ENDPOINT_855=https://api.manufacturer.com/edi/855
EDI_MANUFACTURER_ENDPOINT_856=https://api.manufacturer.com/edi/856
EDI_MANUFACTURER_ENDPOINT_810=https://api.manufacturer.com/edi/810
EDI_MANUFACTURER_AUTH_TYPE=api_key
EDI_MANUFACTURER_API_KEY=your_api_key_here

# Logistics Partner
EDI_LOGISTICS_ENDPOINT_204=https://api.logistics.com/edi/204
EDI_LOGISTICS_AUTH_TYPE=api_key
EDI_LOGISTICS_API_KEY=logistics_api_key_here

# Global Settings
EDI_X12_VERSION=004010
EDI_SENDER_ID=PHILHARVEST
EDI_CONTROL_PREFIX=PH
```

**Benefits:**
- No hardcoded endpoints in business logic
- Easy environment-specific configuration (dev, staging, prod)
- Secure credential management
- Dynamic partner addition without code changes

---

## API Endpoints

### INBOUND TRANSACTIONS

#### 1. EDI 850 - Purchase Order (from Manufacturer)

**Endpoint:** `POST /api/edi/850/receive`

**Request:**
- Content-Type: `application/x-edi`
- Body: Raw X12 EDI string

```
ISA*00*00*00*01*MANUFACTURER    *01*PHILHARVEST   *210517*0101*U*00401*000000001*0*P*:*~
GS*PO*MANUFACTURER*PHILHARVEST*20260517*010101*1*X*004010*~
ST*850*0001*~
BEG*00*SA*PO123456*20260517*~
...
SE*25*0001*~
GE*1*1*~
IEA*1*000000001*~
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "message": "EDI 850 received and queued for processing",
  "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
  "control_number": "PH850_001234567",
  "po_number": "PO123456"
}
```

**Processing:**
- Validates X12 format (checks for ISA segment and segment terminators)
- Parses using `Edi850Parser` → produces `Edi850PurchaseOrderDto`
- Creates transaction record in database
- Dispatches async `ProcessEdiInboundJob` for business logic processing

#### 2. EDI 990 - Response to Load Tender (from Logistics Partner)

**Endpoint:** `POST /api/edi/990/receive`

**Request:**
- Raw X12 EDI string with carrier response

**Response (202 Accepted):**
```json
{
  "success": true,
  "message": "EDI 990 received and queued for processing",
  "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
  "control_number": "PH990_001234567",
  "response_code": "AA",
  "is_accepted": true
}
```

---

### OUTBOUND TRANSACTIONS

#### 1. EDI 855 - Purchase Order Acknowledgment (to Manufacturer)

**Endpoint:** `POST /api/edi/855/send`

**Request:**
```json
{
  "po_number": "PO123456",
  "po_date": "2026-05-17",
  "manufacturer_id": "MANU001",
  "acknowledgment_code": "AA",
  "rejection_reason": null,
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

**Processing:**
1. Validates input data
2. Builds `Edi855PurchaseOrderAckDto` with line item acknowledgments
3. Generates raw X12 string using `Edi855Generator`
4. Transmits to manufacturer endpoint via `OutboundEdiTransmissionService`
5. Stores transaction record with delivery status

**Response (200 OK or 202 Accepted):**
```json
{
  "success": true,
  "message": "EDI 855 sent",
  "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
  "control_number": "PH855_001234567",
  "status": "SENT"
}
```

#### 2. EDI 204 - Motor Carrier Load Tender (to Logistics Partner)

**Endpoint:** `POST /api/edi/204/send`

**Request:**
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
  "ship_to_address": { ... },
  "shipments": [
    {
      "shipment_number": "SHIP001",
      "shipment_type": "TL",
      "weight": 25000,
      "weight_uom": "LB",
      "line_items": [...]
    }
  ],
  "pickup_date": "2026-05-18",
  "delivery_date": "2026-05-20"
}
```

**Processing:**
1. Builds `Edi204MotorCarrierLoadTenderDto` with shipment details
2. Generates X12 string using `Edi204Generator`
3. Transmits to logistics partner endpoint
4. Stores transaction for tracking

#### 3. EDI 856 - Advance Ship Notice / ASN (to Manufacturer)

**Endpoint:** `POST /api/edi/856/send`

**Request:**
```json
{
  "asn_number": "ASN001",
  "po_number": "PO123456",
  "po_date": "2026-05-17",
  "manufacturer_id": "MANU001",
  "ship_date": "2026-05-18",
  "ship_from_address": { ... },
  "ship_to_address": { ... },
  "carrier_code": "CARRIER001",
  "tracking_number": "TRK123456789",
  "boxes": [
    {
      "box_number": "BOX001",
      "weight": 50,
      "weight_uom": "LB",
      "package_type": "CTN",
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

#### 4. EDI 810 - Invoice (to Manufacturer)

**Endpoint:** `POST /api/edi/810/send`

**Request:**
```json
{
  "invoice_number": "INV001",
  "invoice_date": "2026-05-17",
  "po_number": "PO123456",
  "po_date": "2026-05-15",
  "manufacturer_id": "MANU001",
  "bill_to_name": "Manufacturer Inc",
  "bill_to_address": { ... },
  "ship_from_address": { ... },
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
  "total_amount": 2500.00,
  "tax_amount": 200.00
}
```

---

### TRANSACTION MANAGEMENT

#### Get Inbound Transaction Status

**Endpoint:** `GET /api/edi/transactions/inbound/{id}`

**Response:**
```json
{
  "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
  "transaction_type": "850",
  "control_number": "PH850_001234567",
  "partner_id": "MANU001",
  "status": "PROCESSED",
  "created_at": "2026-05-17T10:30:00Z",
  "updated_at": "2026-05-17T10:35:00Z"
}
```

#### Get Outbound Transmission Status

**Endpoint:** `GET /api/edi/transmissions/{controlNumber}`

**Response:**
```json
{
  "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
  "transaction_type": "855",
  "control_number": "PH855_001234567",
  "partner_id": "MANUFACTURER",
  "status": "SENT",
  "created_at": "2026-05-17T10:30:00Z",
  "updated_at": "2026-05-17T10:32:00Z",
  "error_message": null
}
```

#### Retry Failed Transmission

**Endpoint:** `POST /api/edi/transmissions/{transactionId}/retry`

**Response:**
```json
{
  "success": true,
  "message": "Transmission retry initiated",
  "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "RETRYING"
}
```

---

## Core Services

### 1. Parsers (Inbound)

**Location:** `app/Services/Edi/Parsers/`

#### `Edi850Parser`
- **Input:** Raw X12 850 string
- **Output:** `Edi850PurchaseOrderDto`
- **Parsing Logic:**
  - Tokenizes on segment terminator (`~`) and field separator (`*`)
  - Extracts ISA (interchange header), BEG (PO details), DTM (dates), N1 (names), PO1 (line items)
  - Validates and formats data according to X12 specifications

#### `Edi990Parser`
- **Input:** Raw X12 990 string
- **Output:** `Edi990ResponseDto`
- **Parsing Logic:**
  - Extracts carrier response code (AA=Accept, RE=Reject)
  - Parses dates with DTM qualifiers (137=response date, 063=pickup, 076=delivery)
  - Handles rejection reasons from NTE segments

### 2. Generators (Outbound)

**Location:** `app/Services/Edi/Generators/`

#### `Edi855Generator`, `Edi204Generator`, `Edi856Generator`, `Edi810Generator`
- **Input:** Respective DTO objects
- **Output:** Raw X12 EDI string
- **Features:**
  - Generates complete X12 envelopes (ISA, GS, ST, transaction-specific segments)
  - Handles segment and field formatting per X12 specifications
  - Generates unique control numbers with configurable prefixes

### 3. Outbound Transmission Service

**Location:** `app/Services/Edi/OutboundEdiTransmissionService.php`

**Responsibilities:**
- **Dynamic Endpoint Resolution:** Fetches target URLs from `config/edi-partners.php` at runtime
- **Authentication:** Supports API Key, Basic Auth, and OAuth token types
- **HTTP Transmission:** Posts raw X12 strings as `application/x-edi` content type
- **Retry Logic:** Automatic exponential backoff on failures (configurable per partner)
- **Transaction Logging:** Records all transmission attempts with status

**Key Methods:**
```php
$service->send855($x12Payload, $poNumber);      // → EdiTransaction
$service->send204($x12Payload, $loadTenderId);  // → EdiTransaction
$service->send856($x12Payload, $asnNumber);     // → EdiTransaction
$service->send810($x12Payload, $invoiceNumber); // → EdiTransaction

$service->getTransmissionStatus($controlNumber);
$service->retryFailed($transaction);
```

---

## Data Transfer Objects (DTOs)

All transaction types have corresponding DTOs for type-safe data handling:

### Inbound DTOs
- `Edi850PurchaseOrderDto` + `Edi850LineItemDto`
- `Edi990ResponseDto`

### Outbound DTOs
- `Edi855PurchaseOrderAckDto` + `Edi855LineAckDto`
- `Edi204MotorCarrierLoadTenderDto` + `Edi204ShipmentDto` + `Edi204ShipmentLineItemDto`
- `Edi856AdvanceShipNoticeDto` + `Edi856BoxDto` + `Edi856BoxLineItemDto`
- `Edi810InvoiceDto` + `Edi810LineItemDto`

Each DTO provides:
- Immutable properties (constructor injection)
- `toArray()` method for serialization
- Helper methods (e.g., `isAccepted()` on 990 DTO)

---

## Controllers

### `InboundX12Controller`

**Methods:**
- `receive850(Request)` → Receives, parses, and queues 850 transactions
- `receive990(Request)` → Receives, parses, and queues 990 transactions
- `getTransactionStatus(id)` → Retrieves inbound transaction status

**Flow:**
1. Validate X12 format (checks ISA segment and terminators)
2. Parse using appropriate parser
3. Create `EdiTransaction` record
4. Dispatch `ProcessEdiInboundJob` for async handling

### `OutboundX12Controller`

**Methods:**
- `send855(Request)` → Generate and transmit 855
- `send204(Request)` → Generate and transmit 204
- `send856(Request)` → Generate and transmit 856
- `send810(Request)` → Generate and transmit 810
- `getTransmissionStatus(controlNumber)` → Get transmission status
- `retryTransmission(transactionId)` → Retry failed transmission

**Flow:**
1. Validate request input
2. Build DTO from request data
3. Generate X12 string using appropriate generator
4. Transmit via `OutboundEdiTransmissionService`
5. Return transmission status

---

## Database Schema

The `edi_transactions` table stores all EDI activity:

```sql
CREATE TABLE edi_transactions (
    id UUID PRIMARY KEY,
    transaction_type VARCHAR(10),           -- 850, 990, 855, 204, 856, 810
    control_number VARCHAR(50) UNIQUE,      -- ISA segment control number
    partner_id VARCHAR(50),                 -- MANUFACTURER, LOGISTICS, etc.
    inbound_format VARCHAR(10),             -- (legacy, now always null)
    outbound_format VARCHAR(10),            -- (legacy, now always null)
    raw_payload LONGTEXT,                   -- Original X12 string (inbound) or generated X12 (outbound)
    csv_payload LONGTEXT,                   -- (legacy, now always null)
    generated_x12_payload LONGTEXT,         -- Generated X12 for outbound
    parsed_data JSON,                       -- Structured data from DTO
    status VARCHAR(20),                     -- RECEIVED, PROCESSED, SENT, FAILED, RETRYING
    error_message TEXT,                     -- Error details on failure
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP NULL
);
```

---

## Setup Instructions

### 1. Update `.env` with Partner Configuration

```bash
# Copy .env.edi-partners template to .env and fill in actual endpoints
# Example for development:

EDI_MANUFACTURER_ENDPOINT_855=http://localhost:3001/edi/855
EDI_MANUFACTURER_ENDPOINT_856=http://localhost:3001/edi/856
EDI_MANUFACTURER_ENDPOINT_810=http://localhost:3001/edi/810
EDI_MANUFACTURER_AUTH_TYPE=api_key
EDI_MANUFACTURER_API_KEY=test_key_manufacturer_123

EDI_LOGISTICS_ENDPOINT_204=http://localhost:3002/edi/204
EDI_LOGISTICS_AUTH_TYPE=api_key
EDI_LOGISTICS_API_KEY=test_key_logistics_456
```

### 2. Configure Provider (if needed)

Register services in `config/app.php` or use auto-discovery.

### 3. Run Database Migrations

```bash
php artisan migrate
```

### 4. Test Endpoints

```bash
# Test inbound 850
curl -X POST http://localhost:8000/api/edi/850/receive \
  -H "Content-Type: application/x-edi" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  --data-binary @valid-850.edi

# Test outbound 855
curl -X POST http://localhost:8000/api/edi/855/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "po_number": "PO123456",
    "po_date": "2026-05-17",
    "manufacturer_id": "MANU001",
    "acknowledgment_code": "AA",
    "line_acknowledgments": [...]
  }'
```

---

## Migration from CSV

### What Changed

| Aspect | Before (CSV) | After (X12) |
|--------|--------------|------------|
| **Format** | Comma-separated text | X12 EDI segments (ISA, GS, ST, etc.) |
| **Content Type** | `text/csv` | `application/x-edi` |
| **Parsing** | Simple row/column splitting | Formal segment and field tokenization |
| **Endpoints** | Multiple CSV-specific routes | Unified X12 routes per transaction type |
| **Endpoints Config** | Hardcoded in code | Environment-based `config/edi-partners.php` |
| **Generated Output** | CSV strings | Standard X12 envelopes |
| **Validation** | Basic column count checks | Full ISA/GS/ST/SE envelope validation |

### Steps to Migrate

1. **Update Client Integrations:**
   - Change POST body from CSV to raw X12 string
   - Update Content-Type header to `application/x-edi`

2. **Configure Partner Endpoints:**
   - Add `.env` variables for all partner endpoints
   - Define authentication credentials per partner

3. **Update Business Logic:**
   - Replace CSV parsing logic with EDI inbound job handlers
   - Update outbound workflows to generate X12 via new generators

4. **Testing:**
   - Use sample X12 files from `backend/tests/fixtures/edi/`
   - Validate with trading partner test systems

---

## Sample X12 Files

Test files are available in `backend/tests/fixtures/edi/`:

- `valid-850.edi` - Valid purchase order
- `valid-855.edi` - Valid PO acknowledgment
- (Additional samples can be added)

---

## Troubleshooting

### Common Issues

**401 Unauthorized on Partner Endpoint**
- Check `EDI_MANUFACTURER_API_KEY` or `EDI_LOGISTICS_API_KEY` in `.env`
- Verify endpoint configuration matches partner's expectations

**Connection Timeout**
- Increase timeout in `config/edi-partners.php` (`timeout` key)
- Check partner endpoint availability

**Retry Exhausted**
- Use `POST /api/edi/transmissions/{id}/retry` endpoint
- Check error message in transaction record
- Review partner endpoint logs

**Parse Error on Inbound**
- Validate X12 format: must start with `ISA*` and contain `~` terminators
- Check for non-standard X12 variants

---

## Support & Future Enhancements

### Potential Additions

1. **Webhook Callbacks** - Notify external systems of EDI processing events
2. **X12 Validation Rules** - Formal X12 compliance checking per transaction type
3. **Multi-Partner Routing** - Support for multiple manufacturers/carriers
4. **EDI Reconciliation** - Matching inbound/outbound transactions
5. **SFTP Integration** - Direct file drops for partners without APIs

