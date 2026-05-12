# CSV Exchange - Quick Reference Guide

## TL;DR - CSV Support for EDI

PhilHarvest now supports CSV format for EDI file exchange. You can:
- **Send CSV files** → System converts to X12 → Processes normally
- **Receive data as CSV** → System sends back CSV
- **Keep audit trail** → Both CSV and X12 stored automatically

## Quick Start

### 1. Upload CSV File

```bash
curl -X POST http://api.yourdomain.com/api/edi/csv/upload \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -F "file=@purchase_order.csv" \
  -F "transaction_type=850"
```

### 2. Expected CSV Format for PO (850)

```csv
Transaction_Type,Control_Number,PO_Number,Order_Date,Delivery_Date,Partner_Name,Partner_Address,Partner_City,Partner_State,Partner_Zip,Line_Number,Item_Number,Quantity,Unit_Of_Measure,Unit_Price,Description
850,123456789,PO001,20240510,20240515,My Company,123 Main St,Springfield,IL,62701,1,SKU001,100,EA,10.50,Widget
850,123456789,PO001,20240510,20240515,My Company,123 Main St,Springfield,IL,62701,2,SKU002,50,EA,20.00,Gadget
```

### 3. Download CSV Response

```bash
curl -X GET http://api.yourdomain.com/api/edi/transactions/123/csv \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -o order_response.csv
```

## API Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/edi/850/receive` | Send X12 or CSV (auto-detect) |
| POST | `/api/edi/csv/upload` | Upload CSV file with type selector |
| GET | `/api/edi/transactions/{id}` | View transaction details |
| GET | `/api/edi/transactions/{id}/csv` | Download CSV |
| GET | `/api/edi/orders` | List all POs |
| GET | `/api/edi/orders/{id}` | View specific PO |

## Workflow

```
You send CSV
    ↓
System validates
    ↓
Converts CSV → X12
    ↓
Creates database records
    ↓
Stores BOTH formats for audit
    ↓
Process complete!
```

## Key Features

✅ **Automatic Format Detection** - Send X12 or CSV, system figures it out  
✅ **Dual Storage** - Both CSV and X12 kept for compliance  
✅ **Source of Truth** - Database records are definitive  
✅ **Bidirectional** - Can send/receive either format  
✅ **Backward Compatible** - Existing X12 workflows still work  

## Common Tasks

### View Transaction Status
```bash
curl http://api.yourdomain.com/api/edi/transactions/123 \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

### Check Available Formats
Transaction details show:
- `has_raw_x12`: Whether original/raw X12 exists
- `has_csv`: Whether CSV exists
- `has_generated_x12`: Whether X12 was generated from CSV
- `inbound_format`: What format was received (X12 or CSV)
- `outbound_format`: What format will be sent (X12, CSV, or BOTH)

### Get Order Details
```bash
curl http://api.yourdomain.com/api/edi/orders/123 \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

## Troubleshooting

**Q: How do I know if my CSV was processed?**  
A: Check transaction status with `GET /api/edi/transactions/{id}` - look for `status: VALIDATED`

**Q: Can I still use X12?**  
A: Yes! Send to `/api/edi/850/receive` with X12 content - auto-detection handles it

**Q: What if I need the X12 version later?**  
A: It's automatically stored! Get it from the transaction record

**Q: How big can CSV files be?**  
A: Up to 10MB - recommend keeping under 5MB for optimal performance

**Q: Do I need to convert CSV to X12 myself?**  
A: No! System does it automatically

## Response Examples

### Success Response (202 Accepted)
```json
{
  "message": "CSV file accepted",
  "transaction_id": 123,
  "control_number": "PO_PO001",
  "format": "CSV",
  "status": "PENDING"
}
```

### Transaction Details
```json
{
  "id": 123,
  "transaction_type": "850",
  "status": "VALIDATED",
  "inbound_format": "CSV",
  "has_raw_x12": true,
  "has_csv": true,
  "download_urls": {
    "csv": "/api/edi/transactions/123/csv"
  }
}
```

## Format Specifications

### 850 (Purchase Order) - Required Columns
- `Transaction_Type`: Always "850"
- `PO_Number`: Your PO number
- `Order_Date`: YYYYMMDD format
- `Item_Number`: SKU or item code
- `Quantity`: Number of units
- `Unit_Price`: Price per unit
- `Description`: Product description

### 855 (Order Confirmation) - Required Columns
- `Transaction_Type`: Always "855"
- `PO_Number`: Reference PO
- `Accepted_Quantity`: Confirmed quantity
- `Status_Code`: "A" (accepted) or "R" (rejected)

### 856 (Shipment Notice) - Required Columns
- `Transaction_Type`: Always "856"
- `Shipment_Number`: Unique shipment ID
- `Ship_Date`: YYYYMMDD format
- `Item_Number`: SKU shipped
- `Shipped_Quantity`: Units shipped

### 810 (Invoice) - Required Columns
- `Transaction_Type`: Always "810"
- `Invoice_Number`: Invoice ID
- `Invoice_Date`: YYYYMMDD format
- `Line_Number`: Line item number
- `Quantity`: Units invoiced
- `Unit_Price`: Price per unit

## Need Help?

- Check `/CSV_FORMAT_EXCHANGE.md` for detailed documentation
- Review test cases in `tests/Feature/Edi/CsvIntegrationTest.php`
- Contact support with transaction ID for debugging
