# PhilHarvest — EDI X12 Outbound Segment Mapping

> **Standard:** X12 005010  
> **Sender:** PHILHARVEST  
> **Primary Receiver:** SERMACROPS  
> **Segment terminator:** `~`  &nbsp; **Field separator:** `*`

---

## EDI 855 — Purchase Order Acknowledgment

**Direction:** PhilHarvest → SERMACROPS  
**Trigger:** Inbound 850 received and reviewed  
**GS Functional ID:** `PR`

| Segment | ID / Qualifier | Description | Notes |
|---------|---------------|-------------|-------|
| ISA | — | Interchange Control Header | ISA06 = `PHILHARVEST`, ISA08 = `SERMACROPS` |
| GS | `PR` | Functional Group Header | Date (YYYYMMDD), Time (HHmmss) |
| ST | `855` | Transaction Set Header | Control `0001` |
| BAK | — | Beginning Segment for Ack | BAK01=`00` (Original), BAK02=ack code (`AA`/`IA`/`RE`), BAK03=PO#, BAK04=PO date |
| DTM | `137` | Acknowledged Date | Format YYYYMMDD |
| NTE | `ZZ` | Rejection Reason | Only present when BAK02=`RE`; max 80 chars |
| DTM | `010` | Estimated Ship Date | Only present when provided |
| N1 | `BY` | Buyer (SERMACROPS) | N102 = Manufacturer ID |
| N3 | — | Buyer Street Address | |
| N4 | — | Buyer City/State/Postal/Country | |
| N1 | `SE` | Selling Party (PhilHarvest) | N102 = `PHILHARVEST` |
| N3 | — | Seller Street Address | |
| N4 | — | Seller City/State/Postal/Country | |
| *(repeat per line item)* | | | |
| PO1 | — | Baseline Item Data | PO101=line#, PO102=accepted qty, PO103=UOM, PO104=price, PO106=`VN`, PO107=part# |
| ACK | — | Line Item Acknowledgment | ACK01=ack code, ACK02=qty, ACK03=UOM |
| DTM | `017` | Estimated Delivery Date per Line | Optional; only when provided |
| CTT | — | Transaction Totals | CTT01 = total line count |
| SE | — | Transaction Set Trailer | SE01 = segment count (ST to SE inclusive) |
| GE | — | Functional Group Trailer | GE01=`1`, GE02=group control# |
| IEA | — | Interchange Control Trailer | IEA01=`1`, IEA02=ISA control# |

### Acknowledgment Codes (BAK02 / ACK01)

| Code | Meaning |
|------|---------|
| `AA` | Accept — all items accepted |
| `IA` | Accept Partial — some items accepted, some rejected |
| `RE` | Reject — all items rejected |

---

## EDI 846 — Inventory Advice

**Direction:** PhilHarvest → SERMACROPS  
**Trigger:** Stock update via "Send Stock Update" on Inventory page  
**GS Functional ID:** `IB`

| Segment | ID / Qualifier | Description | Notes |
|---------|---------------|-------------|-------|
| ISA | — | Interchange Control Header | ISA06 = `PHILHARVEST`, ISA08 = `SERMACROPS` |
| GS | `IB` | Functional Group Header | Inventory Inquiry/Advice |
| ST | `846` | Transaction Set Header | Control `0001` |
| BIA | — | Beginning Segment for Inventory Advice | BIA01=`00` (Original), BIA02=`MB` (Inventory Advice), BIA03=reference#, BIA04=date |
| REF | `IA` | Inventory Reference | REF02 = Vendor/Sender ID (`PHILHARVEST`) |
| N1 | `WH` | Warehouse Name | N102 = `PHILHARVEST WAREHOUSE` |
| *(repeat per item)* | | | |
| LIN | — | Item Identification | LIN01=line#, LIN02=`UP` (UPC, if present), LIN03=UPC value, LIN04=`VN`, LIN05=SKU |
| QTY | `33` | Quantity On Hand / Available | QTY02=quantity, QTY03=UOM |
| UIT | — | Unit of Measure | UIT01=UOM |
| CTT | — | Transaction Totals | CTT01 = total line count |
| SE | — | Transaction Set Trailer | |
| GE | — | Functional Group Trailer | |
| IEA | — | Interchange Control Trailer | |

### Notes
- Only items **not** in the trading partner's `excluded_skus` list are included.
- `QTY*33` qualifier = Quantity On Hand / Available (X12 standard).
- UPC is optional — included in LIN only when the product has a UPC.

---

## EDI 856 — Advance Ship Notice (ASN)

**Direction:** PhilHarvest → SERMACROPS  
**Trigger:** Sent after 855 (AA) and before physical shipment  
**GS Functional ID:** `SH`

| Segment | ID / Qualifier | Description | Notes |
|---------|---------------|-------------|-------|
| ISA | — | Interchange Control Header | ISA06 = `PHILHARVEST`, ISA08 = `SERMACROPS` |
| GS | `SH` | Functional Group Header | Ship Notice / Manifest |
| ST | `856` | Transaction Set Header | Control `0001` |
| BSN | — | Beginning Segment for ASN | BSN01=`00` (Original), BSN02=ASN#, BSN03=ship date, BSN04=time |
| HL | `S` | Shipment Level Hierarchy | HL01=`1`, HL03=`S` |
| TD5 | — | Carrier Details | TD504=`ZZ`, TD505=carrier code |
| DTM | `011` | Ship Date | Format YYYYMMDD |
| W12 | `LB` | Gross Weight | W1201=`LB`, W1202=weight; only present when weight > 0 |
| PKG | `F` | Package Count | PKG02 = number of boxes |
| N1 | `SF` | Ship From (PhilHarvest) | N102 = `PHILHARVEST` |
| N3 | — | Ship-From Street Address | |
| N4 | — | Ship-From City/State/Postal/Country | |
| N1 | `ST` | Ship To (SERMACROPS) | N102 = company name from partner record |
| N3 | — | Ship-To Street Address | |
| N4 | — | Ship-To City/State/Postal/Country | |
| HL | `O` | Order Level Hierarchy | HL01=`2`, HL02=`1` (parent=shipment), HL03=`O` |
| PRF | — | Purchase Order Reference | PRF01 = PO number from the original 850 |
| *(repeat per line item)* | | | |
| LIN | `VN` | Item Identification | LIN01=seq#, LIN02=`VN`, LIN03=part# |
| SN1 | — | Item Detail (Shipment) | SN102=shipped qty, SN103=UOM |
| CTT | — | Transaction Totals | CTT01 = total line count |
| SE | — | Transaction Set Trailer | |
| GE | — | Functional Group Trailer | |
| IEA | — | Interchange Control Trailer | |

---

## EDI 810 — Invoice

**Direction:** PhilHarvest → SERMACROPS  
**Trigger:** Sent after goods are shipped (following 856)  
**GS Functional ID:** `IN`

| Segment | ID / Qualifier | Description | Notes |
|---------|---------------|-------------|-------|
| ISA | — | Interchange Control Header | ISA06 = `PHILHARVEST`, ISA08 = `SERMACROPS` |
| GS | `IN` | Functional Group Header | Invoice Information |
| ST | `810` | Transaction Set Header | Control `0001` |
| BIG | — | Beginning Segment for Invoice | BIG01=invoice date, BIG02=invoice#, BIG03=PO date, BIG04=PO# |
| N1 | `BT` | Bill To | N102 = bill-to company name |
| N3 | — | Bill-To Street Address | |
| N4 | — | Bill-To City/State/Postal | |
| N1 | `SF` | Ship From (PhilHarvest) | N102 = `PHILHARVEST` |
| N3 | — | Ship-From Street Address | |
| N4 | — | Ship-From City/State/Postal | |
| ITD | — | Payment Terms | Only present when payment terms are specified |
| DTM | `002` | Delivery Date | Format YYYYMMDD |
| *(repeat per line item)* | | | |
| IT1 | — | Invoice Line Item | IT101=line#, IT102=qty, IT103=UOM, IT104=unit price, IT106=part# |
| TDS | — | Total Invoice Amount | TDS01 = total amount (decimal) |
| TXI | `TX` | Tax Information | Only present when tax amount > 0 |
| AMT | `1` | Subtotal Amount | Only present when subtotal is available |
| CTT | — | Transaction Totals | CTT01 = total line count |
| SE | — | Transaction Set Trailer | |
| GE | — | Functional Group Trailer | |
| IEA | — | Interchange Control Trailer | |

---

## Common Envelope Segments (All Outbound)

| Segment | Field | Value |
|---------|-------|-------|
| ISA01 | Auth Info Qualifier | `00` |
| ISA03 | Security Info Qualifier | `00` |
| ISA05 | Sender ID Qualifier | `ZZ` |
| ISA06 | Sender ID | `PHILHARVEST` (padded to 15 chars) |
| ISA07 | Receiver ID Qualifier | `ZZ` |
| ISA08 | Receiver ID | `SERMACROPS` (padded to 15 chars) |
| ISA11 | Repetition Separator | `^` |
| ISA12 | Version | `00501` |
| ISA15 | Usage Indicator | `P` (Production) |
| ISA16 | Component Element Separator | `:` |

---

## EDI Flow Summary

```
SERMACROPS                          PhilHarvest
    |                                   |
    |-------- 850 Purchase Order ------>|
    |                                   |
    |<------- 855 PO Acknowledgment ----|  (AA / IA / RE)
    |                                   |
    |<------- 846 Inventory Advice -----|  (on stock update)
    |                                   |
    |<------- 204 Load Tender -------->LOGISTICS
    |                          LOGISTICS|
    |                 990 LT Response ->|  (A=Accept / D=Decline)
    |                                   |
    |<------- 856 Advance Ship Notice --|
    |                                   |
    |<------- 810 Invoice --------------|
    |                                   |
    |-------- 861 Receiving Advice ---->|  (goods received)
```

---

*Generated from PhilHarvest backend EDI generators — version X12 005010*
