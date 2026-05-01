# 🔌 EDI API Integration Guide

**How external systems can send and receive EDI transactions with PhilHarvest**

This document is for **external partners** and **internal systems** that need to integrate with our EDI platform via **REST API**.

AS OF THIS MOMENT, the system has not yet been deployed, thus the following api examples are on localhost. Although, once it is deployed, the link lang naman ung mababago. Thank you for your patience.

---

## 📑 Quick Links

- [Authentication](#authentication) - How to authenticate requests
- [Rate Limiting](#rate-limiting) - Request limits & backoff strategy
- [Inbound API (850)](#inbound-api-send-purchase-orders) - Send purchase orders
- [Outbound API (Orders)](#outbound-api-get-purchase-orders) - Retrieve orders
- [Response Formats](#response-formats) - JSON structure reference
- [Error Handling](#error-handling) - What to do when things fail
- [Code Examples](#code-examples) - cURL, Python, JavaScript
- [Testing](#testing) - How to test before going live

---

## 🔐 Authentication

All API requests require **Bearer token authentication**.

### Get Your API Token

Contact PhilHarvest admin to receive your **Partner API Key**:
- Test environment: `partner_test_token_abc123`
- Production: `partner_prod_token_xxx` (custom per partner)

### Add Token to Requests

Include the token in the `Authorization` header:

```http
Authorization: Bearer partner_test_token_abc123
```

**Examples:**

```bash
# cURL
curl -H "Authorization: Bearer partner_test_token_abc123" \
  http://localhost:8000/api/edi/orders

# Python
import requests
headers = {"Authorization": "Bearer partner_test_token_abc123"}
response = requests.get("http://localhost:8000/api/edi/orders", headers=headers)

# JavaScript
fetch('http://localhost:8000/api/edi/orders', {
  headers: { 'Authorization': 'Bearer partner_test_token_abc123' }
})
```

### Missing/Invalid Token

**Response:** `401 Unauthorized`

```json
{
  "message": "Unauthorized",
  "error": "Invalid bearer token"
}
```

**Fix:** Verify token is correct and included in `Authorization` header.

---

## ⏱️ Rate Limiting

PhilHarvest enforces **100 requests per minute per partner** to ensure fair resource usage.

### How It Works

- **Limit:** 100 requests
- **Window:** 60 seconds (rolling)
- **Shared:** Across all your systems using the same API token
- **Backoff:** Use exponential backoff when limit is reached

### Rate Limit Headers

Every response includes:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1714547123
```

- `X-RateLimit-Limit`: Max requests per minute (100)
- `X-RateLimit-Remaining`: Requests left in current window (87)
- `X-RateLimit-Reset`: Unix timestamp when window resets (1714547123)

### When You Hit the Limit

**Response:** `429 Too Many Requests`

```json
{
  "message": "Too Many Requests",
  "retry_after": 45
}
```

### Recommended Backoff Strategy

```python
import time
import requests

def send_with_backoff(method, url, **kwargs):
    max_retries = 3
    backoff_seconds = [5, 30, 120]  # Exponential backoff
    
    for attempt in range(max_retries):
        response = requests.request(method, url, **kwargs)
        
        if response.status_code == 429:
            wait_time = backoff_seconds[attempt]
            print(f"Rate limited. Waiting {wait_time}s...")
            time.sleep(wait_time)
            continue
        
        return response
    
    raise Exception("Max retries exceeded")
```

---

## 📤 Inbound API (Send Purchase Orders)

### Endpoint

```http
POST /api/edi/850/receive
```

**Purpose:** Send a raw ANSI X12 850 purchase order for processing.

### Request Format

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `http://{api-host}/api/edi/850/receive` |
| **Content-Type** | `application/edi-x12` |
| **Authentication** | Bearer token (required) |
| **Body** | Raw X12 850 text |

### Request Example

```bash
curl -X POST http://localhost:8000/api/edi/850/receive \
  -H "Authorization: Bearer partner_test_token_abc123" \
  -H "Content-Type: application/edi-x12" \
  --data @purchase_order.edi
```

### X12 850 Payload Format

The request body should be a raw ANSI X12 850 document with these **required segments**:

```
ISA*00*          *00*          *ZZ*SENDERID        *ZZ*RECEIVERID      *240501*1200*U*00501*000000001*0*P*>
GS*PO*SENDERID*RECEIVERID*20240501*1200*1*X*005010
ST*850*0001
BEG*00*SA*PO-001*20240501
PO1*1*100*KG*125.50**VC*PRODUCT-SKU-001
CTT*1*100
SE*7*0001
GE*1*1
IEA*1*000000001
```

**Key Segments Explained:**

| Segment | Purpose | Example |
|---------|---------|---------|
| **ISA** | Interchange header | `ISA*00*...*240501*1200*U*00501*000000001*0*P*>` |
| **ISA13** | Control number (unique) | `000000001` |
| **GS** | Group header | `GS*PO*SENDER*RECEIVER*20240501*1200*1*X*005010` |
| **ST** | Transaction header | `ST*850*0001` |
| **BEG** | Beginning | `BEG*00*SA*PO-001*20240501` |
| **BEG03** | PO number | `PO-001` |
| **BEG05** | Order date | `20240501` (YYYYMMDD) |
| **PO1** | Line item | `PO1*1*100*KG*125.50**VC*PRODUCT-001` |
| **PO1-01** | Line number | `1` |
| **PO1-02** | Qty | `100` |
| **PO1-03** | Unit of measure | `KG` (KG, LB, EA, etc.) |
| **PO1-04** | Unit price | `125.50` |
| **PO1-07** | Product ID type | `VC` |
| **PO1-08** | Product code | `PRODUCT-001` |
| **CTT** | Line count | `CTT*1*100` |
| **SE** | Transaction trailer | `SE*7*0001` |
| **GE** | Group trailer | `GE*1*1` |
| **IEA** | Interchange trailer | `IEA*1*000000001` |

### Successful Response

**Status:** `202 Accepted`

```json
{
  "success": true,
  "message": "EDI transaction received and queued for processing",
  "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
  "control_number": "000000001",
  "po_number": "PO-001",
  "partner_id": "TESTPARTNER",
  "status": "PENDING",
  "expected_processing_time_ms": 2000,
  "timestamp": "2024-05-01T12:00:00Z"
}
```

### Response Fields

| Field | Description |
|-------|-------------|
| `transaction_id` | Unique transaction UUID (use for tracking) |
| `control_number` | X12 ISA13 value (your PO's unique identifier) |
| `po_number` | Extracted PO number from BEG segment |
| `status` | Current processing status (PENDING, VALIDATED, REJECTED, CONFIRMED) |
| `expected_processing_time_ms` | How long processing typically takes (2000 = 2 seconds) |
| `timestamp` | When the API received the request (ISO 8601) |

### Error Responses

**Status:** `400 Bad Request` - Malformed X12

```json
{
  "success": false,
  "error": "INVALID_EDI_FORMAT",
  "message": "Missing required BEG segment",
  "details": {
    "segment": "BEG",
    "reason": "BEG segment not found in transmission"
  }
}
```

**Status:** `409 Conflict` - Duplicate control number

```json
{
  "success": false,
  "error": "DUPLICATE_TRANSMISSION",
  "message": "Transaction with this control number already exists",
  "details": {
    "control_number": "000000001",
    "existing_transaction_id": "550e8400-e29b-41d4-a716-446655440000",
    "processing_status": "VALIDATED"
  }
}
```

**Status:** `401 Unauthorized` - Invalid token

```json
{
  "message": "Unauthorized",
  "error": "Invalid bearer token"
}
```

**Status:** `429 Too Many Requests` - Rate limit exceeded

```json
{
  "message": "Too Many Requests",
  "retry_after": 45
}
```

### Processing After 202

After receiving your EDI, PhilHarvest will:

1. **Queue** the transaction (status: `PENDING`)
2. **Parse** the X12 segments (validate format)
3. **Validate** business rules (pricing, inventory, partner whitelist)
4. **Create** purchase order + line items in database
5. **Update** status to `VALIDATED` or `REJECTED`
6. **Notify** your system via webhook (if configured)

**Total processing time:** Usually 1-3 seconds.

---

## 📥 Outbound API (Get Purchase Orders)

### List Orders Endpoint

```http
GET /api/edi/orders
```

**Purpose:** Retrieve paginated list of purchase orders.

### Request

```bash
curl "http://localhost:8000/api/edi/orders?page=1&per_page=20" \
  -H "Authorization: Bearer partner_test_token_abc123"
```

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number (1-indexed) |
| `per_page` | integer | `20` | Records per page (max 100) |
| `status` | string | (all) | Filter by status: `PENDING`, `VALIDATED`, `CONFIRMED`, `SHIPPED`, `INVOICED` |
| `partner_id` | string | (all) | Filter by partner |

### Successful Response

**Status:** `200 OK`

```json
{
  "data": [
    {
      "id": 1,
      "po_number": "PO-001-000000001",
      "partner_id": "TESTPARTNER",
      "status": "VALIDATED",
      "total_amount": 12550.00,
      "order_date": "2024-05-01",
      "delivery_date": "2024-05-08",
      "created_at": "2024-05-01T12:00:00Z",
      "items": [
        {
          "id": 1,
          "line_number": 1,
          "product_code": "PRODUCT-001",
          "product_name": "Tomatoes~Ripe~Grade A",
          "quantity": 100.00,
          "unit_of_measure": "KG",
          "unit_price": 125.50,
          "line_total": 12550.00
        }
      ]
    }
  ],
  "meta": {
    "total": 25,
    "per_page": 20,
    "current_page": 1,
    "last_page": 2,
    "from": 1,
    "to": 20
  }
}
```

### Response Structure

| Field | Type | Description |
|-------|------|-------------|
| `data` | array | List of PurchaseOrder objects |
| `data[].id` | integer | Internal PO ID |
| `data[].po_number` | string | PO reference number |
| `data[].partner_id` | string | Sender's partner ID |
| `data[].status` | string | Current status (PENDING, VALIDATED, CONFIRMED, SHIPPED, INVOICED) |
| `data[].total_amount` | float | Sum of all line items |
| `data[].order_date` | string | When order was placed (YYYY-MM-DD) |
| `data[].items` | array | Line item details |
| `data[].items[].line_number` | integer | Line sequence |
| `data[].items[].product_code` | string | SKU/product code |
| `data[].items[].quantity` | float | Ordered quantity |
| `data[].items[].unit_of_measure` | string | Unit (KG, LB, EA, etc.) |
| `data[].items[].unit_price` | float | Price per unit |
| `data[].items[].line_total` | float | `quantity * unit_price` |

---

### Get Single Order

```http
GET /api/edi/orders/{id}
```

**Request:**

```bash
curl "http://localhost:8000/api/edi/orders/1" \
  -H "Authorization: Bearer partner_test_token_abc123"
```

**Response:** Same structure as single order in list endpoint.

---

## 📋 Response Formats

### PurchaseOrder Object

```json
{
  "id": 1,
  "po_number": "PO-001-000000001",
  "partner_id": "TESTPARTNER",
  "status": "VALIDATED",
  "total_amount": "12550.00",
  "order_date": "2024-05-01",
  "delivery_date": "2024-05-08",
  "created_at": "2024-05-01T12:00:00Z",
  "updated_at": "2024-05-01T12:00:05Z"
}
```

### LineItem Object

```json
{
  "id": 1,
  "purchase_order_id": 1,
  "line_number": 1,
  "product_code": "PRODUCT-001",
  "product_name": "Tomatoes~Ripe~Grade A",
  "quantity": "100.00",
  "unit_of_measure": "KG",
  "unit_price": "125.50",
  "line_total": "12550.00",
  "created_at": "2024-05-01T12:00:00Z"
}
```

### Status Values

| Status | Meaning | Next Step |
|--------|---------|-----------|
| `PENDING` | Received, queued for processing | Waiting for validation |
| `VALIDATED` | Parsed & validated successfully | Ready for confirmation |
| `CONFIRMED` | Acknowledged by PhilHarvest | Awaiting fulfillment |
| `PARTIAL` | Partially fulfilled | Some items shipped |
| `SHIPPED` | All items shipped | Advance Ship Notice (856) sent |
| `INVOICED` | Invoice (810) generated | Order complete |
| `REJECTED` | Validation failed | Check error details |

---

## ❌ Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| `200` | Success | Process response normally |
| `202` | Accepted | Async processing started, check status later |
| `400` | Bad Request | Fix your request (malformed EDI, missing fields) |
| `401` | Unauthorized | Check API token |
| `409` | Conflict | Duplicate control number, use different ISA13 |
| `429` | Rate Limited | Wait and retry with backoff |
| `500` | Server Error | Contact support |

### Error Response Format

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "field": "value",
    "reason": "explanation"
  }
}
```

### Common Error Codes

| Error Code | Cause | Solution |
|------------|-------|----------|
| `INVALID_EDI_FORMAT` | X12 segments malformed | Validate X12 syntax |
| `MISSING_REQUIRED_SEGMENT` | BEG, PO1, or other required segment missing | Add missing segment |
| `DUPLICATE_TRANSMISSION` | ISA13 already exists | Use unique ISA13 per transmission |
| `INVALID_BEARER_TOKEN` | Token missing or invalid | Check Authorization header |
| `INVALID_PARTNER` | Unknown partner ID | Register partner first |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Implement backoff |

---

## 💻 Code Examples

### Python - Send EDI 850

```python
import requests
from datetime import datetime

def send_purchase_order(po_number, lines):
    """Send a purchase order via EDI API"""
    
    # Build X12 850
    control_num = str(int(datetime.now().timestamp()) % 1000000000).zfill(9)
    
    edi_payload = f"""ISA*00*          *00*          *ZZ*TESTPARTNER  *ZZ*PHILHARVEST    *240501*1200*U*00501*{control_num}*0*P*>
GS*PO*TESTPARTNER*PHILHARVEST*20240501*1200*1*X*005010
ST*850*0001
BEG*00*SA*{po_number}*20240501
"""
    
    # Add line items
    for i, line in enumerate(lines, 1):
        edi_payload += f"PO1*{i}*{line['qty']}*{line['uom']}*{line['price']}**VC*{line['product_code']}\n"
    
    qty_total = sum(l['qty'] for l in lines)
    edi_payload += f"""CTT*{len(lines)}*{qty_total}
SE*{len(edi_payload.split(chr(10))) + 2}*0001
GE*1*1
IEA*1*{control_num}"""
    
    # Send to API
    response = requests.post(
        "http://localhost:8000/api/edi/850/receive",
        headers={
            "Authorization": "Bearer partner_test_token_abc123",
            "Content-Type": "application/edi-x12"
        },
        data=edi_payload
    )
    
    return response.json()

# Example usage
lines = [
    {"qty": 100, "uom": "KG", "price": 125.50, "product_code": "PROD-001"},
    {"qty": 50, "uom": "LB", "price": 45.00, "product_code": "PROD-002"}
]
result = send_purchase_order("PO-001", lines)
print(f"Transaction ID: {result['transaction_id']}")
print(f"Status: {result['status']}")
```

### JavaScript - Get Purchase Orders

```javascript
async function getPurchaseOrders() {
  const response = await fetch('http://localhost:8000/api/edi/orders?page=1&per_page=20', {
    headers: {
      'Authorization': 'Bearer partner_test_token_abc123'
    }
  });
  
  const data = await response.json();
  
  console.log(`Total orders: ${data.meta.total}`);
  console.log(`Current page: ${data.meta.current_page}`);
  
  data.data.forEach(order => {
    console.log(`\nPO: ${order.po_number} - Status: ${order.status} - Total: ₱${order.total_amount}`);
    
    order.items.forEach(item => {
      console.log(`  - ${item.product_name}: ${item.quantity} ${item.unit_of_measure} @ ₱${item.unit_price}`);
    });
  });
}

getPurchaseOrders();
```

### Bash/cURL - Send EDI with Backoff

```bash
#!/bin/bash

API_URL="http://localhost:8000/api/edi/850/receive"
TOKEN="partner_test_token_abc123"
EDI_FILE="purchase_order.edi"

send_with_retry() {
  local attempt=1
  local max_attempts=3
  local backoff=(5 30 120)
  
  while [ $attempt -le $max_attempts ]; do
    response=$(curl -s -w "\n%{http_code}" \
      -X POST "$API_URL" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/edi-x12" \
      --data @"$EDI_FILE")
    
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "202" ] || [ "$http_code" = "200" ]; then
      echo "✓ Success: $http_code"
      echo "$body" | jq .
      return 0
    elif [ "$http_code" = "429" ]; then
      wait_time=${backoff[$((attempt-1))]}
      echo "⏱ Rate limited. Waiting ${wait_time}s..."
      sleep $wait_time
      ((attempt++))
    else
      echo "✗ Error $http_code: $body"
      return 1
    fi
  done
  
  echo "✗ Max retries exceeded"
  return 1
}

send_with_retry
```

---

## 🧪 Testing

### Test Environment

**Base URL:** `http://localhost:8000`
**Test Token:** `partner_test_token_abc123`

### Test Checklist

1. **Authentication Test**
   ```bash
   # Should fail with 401
   curl http://localhost:8000/api/edi/orders
   
   # Should succeed with 200
   curl -H "Authorization: Bearer partner_test_token_abc123" \
     http://localhost:8000/api/edi/orders
   ```

2. **Send EDI Test**
   ```bash
   # Send test PO
   curl -X POST http://localhost:8000/api/edi/850/receive \
     -H "Authorization: Bearer partner_test_token_abc123" \
     -H "Content-Type: application/edi-x12" \
     --data @tests/fixtures/edi/valid-850.edi
   
   # Should return 202 with transaction_id
   ```

3. **Retrieve Orders Test**
   ```bash
   # Get orders
   curl -H "Authorization: Bearer partner_test_token_abc123" \
     http://localhost:8000/api/edi/orders
   
   # Should return 200 with orders list
   ```

4. **Rate Limit Test**
   ```bash
   # Send 101 requests rapidly
   for i in {1..101}; do
     curl -s -H "Authorization: Bearer partner_test_token_abc123" \
       http://localhost:8000/api/edi/orders > /dev/null
   done
   
   # Request 101 should return 429
   ```

5. **Error Handling Test**
   ```bash
   # Send malformed EDI
   echo "INVALID" | curl -X POST http://localhost:8000/api/edi/850/receive \
     -H "Authorization: Bearer partner_test_token_abc123" \
     -H "Content-Type: application/edi-x12" \
     --data @-
   
   # Should return 400 with error details
   ```

---

## 📞 Support & Contact

For integration issues, contact PhilHarvest support:
- **Issues:** https://github.com/philharvest/edi-platform/issues

---

**Last Updated:** May 1, 2026
**API Version:** 1.0  
**Spec Version:** ANSI X12 005010
