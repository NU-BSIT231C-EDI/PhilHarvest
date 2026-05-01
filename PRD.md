# 📘 PhilHarvest EDI Integration: Product Design Requirements Document (PDRD)

## 1. Executive Summary
This document outlines the design, architecture, phased roadmap, and implementation checklist for PhilHarvest’s EDI automation pipeline. The system standardizes B2B/B2C supply chain transactions using **ANSI X12 005010** and focuses on the core transaction set: **850 (Purchase Order) → 855 (Order Confirmation) → 856 (Advance Ship Notice) → 810 (Invoice)**. The pipeline integrates with inventory reservation, QR traceability, logistics routing, and electronic payment processing to replace manual, error-prone agribusiness workflows.

---

## 2. System Architecture & Tech Stack
| Layer | Technology | Purpose |
|-------|------------|---------|
| **Backend Framework** | PHP 8.2+ / Laravel 11 | Routing, DI, Queue, ORM, Validation, API layer |
| **Database** | MySQL 8.0 (InnoDB) | ACID-compliant PO, inventory, audit, payment, partner data |
| **Async/Queue** | Redis + Laravel Horizon | Decoupled parsing, validation, outbound ACKs, retries |
| **EDI Parsing** | `stedi/x12-parser` / Custom X12 Engine | Envelope handling, segment splitting, mapping to DTOs |
| **Storage** | AWS S3 / MinIO | Raw `.edi` archives, QR assets, invoice PDFs, audit logs |
| **API/Integration** | REST, Webhooks, SFTP (v1), AS2 (v2) | Partner ingestion, outbound delivery, status callbacks |
| **Monitoring** | Sentry, Laravel Telescope, Prometheus/Grafana | Error tracking, pipeline metrics, SLA monitoring |
| **Security** | TLS 1.3, JWT/OAuth2, HMAC payload signing, RBAC | Partner auth, payload integrity, DPA/BIR compliance readiness |

**Architecture Flow:**
`Partner Ingest (REST/SFTP) → Raw Storage → Queue → X12 Parser → DTO → Business Validator → DB Commit → Async Jobs (QR/Inventory/ACK) → Outbound Router → Partner ACK/Status`

---

## 3. Phased Development Roadmap
| Phase | Timeline | Milestone | Deliverables |
|-------|----------|-----------|--------------|
| **Phase 1: Foundation & 850 Ingestion** | Wk 1–4 | Core EDI pipeline operational | Raw ingest endpoint, 850 parser, schema/business validator, DB schema, idempotency layer, raw payload storage |
| **Phase 2: 855 Order Confirmation** | Wk 5–7 | Automated PO acknowledgment | 855 builder, pricing/availability sync, ACK routing, status state machine, retry/failure handling |
| **Phase 3: 856 ASN & Logistics** | Wk 8–10 | Shipment & traceability live | 856 builder, pallet/QR mapping, carrier routing, delivery ETA sync, warehouse console hooks |
| **Phase 4: 810 Invoice & Payments** | Wk 11–13 | Billing & reconciliation | 810 builder, tax/total calc, payment gateway hooks, e-wallet/bank/COD routing, accounting sync |
| **Phase 5: Hardening & Production** | Wk 14–16 | Production-ready pipeline | Load testing, partner sandbox onboarding, monitoring dashboards, audit compliance, SLA enforcement (<2s validation) |

---

## 4. Project Structure (Laravel-Focused)
```
app/
├── Http/
│   ├── Controllers/Api/Edi/
│   │   ├── InboundController.php          # Accepts 850/856 via REST/SFTP webhook
│   │   └── OutboundController.php         # Dispatches 855/810 to partners
│   └── Middleware/
│       ├── EdiAuthMiddleware.php          # Partner API key/IP/HMAC validation
│       └── EdiRateLimitMiddleware.php     # Throttling & partner quotas
├── Services/Edi/
│   ├── Parsers/
│   │   ├── X12EnvelopeParser.php          # ISA/GS/ST/GE/IEA envelope handling
│   │   ├── 850Parser.php                  # BEG/PO1/DTM/N1 → DTO
│   │   ├── 855Parser.php                  # AK5/AK9/REF → ACK DTO
│   │   ├── 856Parser.php                  # HL/PID/REF/FOB → ASN DTO
│   │   └── 810Parser.php                  # BIG/ITD/TXI/AMT → Invoice DTO
│   ├── Builders/
│   │   ├── 855Builder.php                 # Constructs ACK from PO validation
│   │   ├── 856Builder.php                 # Constructs ASN from fulfillment data
│   │   └── 810Builder.php                 # Constructs invoice from delivery + pricing
│   ├── Validators/
│   │   ├── X12SchemaValidator.php         # Segment order, required fields, UOM
│   │   └── BusinessRuleValidator.php      # Pricing markup, inventory, partner limits
│   └── Processors/
│       ├── PoProcessor.php                # Inventory lock, QR trigger, status init
│       ├── AckProcessor.php               # 855/997 routing & status sync
│       ├── AsnProcessor.php               # Carrier assignment, ETA calc, QR link
│       └── InvoiceProcessor.php           # Tax calc, payment routing, ledger sync
├── Jobs/
│   ├── ProcessEdiInboundJob.php           # Async parse → validate → DB
│   ├── GenerateQrBatchJob.php             # Async QR code creation & storage
│   ├── SendEdiOutboundJob.php             # Async 855/810 dispatch + retry
│   └── SyncInventoryJob.php               # Async stock deduction/reservation
├── Models/
│   ├── EdiTransaction.php                 # Raw payload, status, control numbers
│   ├── PurchaseOrder.php / Item.php       # 850 mapped records
│   ├── OrderConfirmation.php              # 855 mapped records
│   ├── ShipmentNotice.php / Item.php      # 856 mapped records
│   └── Invoice.php / Line.php             # 810 mapped records
├── DTOs/Edi/
│   ├── PurchaseOrderDto.php
│   ├── OrderConfirmationDto.php
│   ├── AdvanceShipNoticeDto.php
│   └── InvoiceDto.php
├── Events/ & Listeners/
│   ├── Events/PoValidated.php → Listeners/ReserveInventory.php
│   ├── Events/AckGenerated.php → Listeners/RouteAck.php
│   └── Events/AsnCreated.php → Listeners/UpdateLogisticsETA.php
└── config/edi.php                         # Versions, partner routing, retry policy
```

---

## 5. Feature Implementation Checklists

### ✅ EDI 850 (Purchase Order)
- [ ] Secure inbound endpoint (`POST /edi/850`) with HMAC/JWT auth
- [ ] Raw `.edi` storage to S3 with immutable audit trail
- [ ] Queue job for async parsing (`ProcessEdiInboundJob`)
- [ ] X12 envelope validation (`ISA`/`GS`/`ST` control numbers, version `005010`)
- [ ] Segment mapping: `BEG`, `PO1`, `PID`, `DTM`, `N1/N3/N4`, `SCH`, `CTT`
- [ ] Business validation: standardized markup ±5%, inventory check, partner whitelist
- [ ] Idempotency layer: reject duplicate `ISA13` / `ST02`
- [ ] DB insertion: `PurchaseOrder` + `PurchaseOrderItem` with `PENDING` status
- [ ] Trigger async: `GenerateQrBatchJob`, `SyncInventoryJob`, `PoValidated` event
- [ ] Error handling: malformed segment logging, 997 rejection generation, partner webhook

### ✅ EDI 855 (Order Confirmation)
- [ ] ACK generation logic: `855Builder` from validated PO DTO
- [ ] Status mapping: `Accepted`, `Accepted with Changes`, `Rejected`
- [ ] Pricing/availability override handling → `PO1` + `REF*VR`/`REF*PK`
- [ ] Envelope construction: `ST*855`, `AK5`, `AK9`, `CTT`, `SE`
- [ ] Outbound routing: partner-specific endpoint (REST/SFTP) with retry policy
- [ ] DB logging: `OrderConfirmation` linked to `PurchaseOrder`
- [ ] Status transition: `PENDING` → `CONFIRMED`/`PARTIAL`/`CANCELLED`
- [ ] Error handling: ACK delivery failure → exponential backoff, alerting

### ✅ EDI 856 (Advance Ship Notice)
- [ ] Trigger: fired upon warehouse fulfillment/pack scan
- [ ] Builder: `856Builder` maps `BSN`, `HL`, `PRF`, `TD1/TD5`, `REF*BM/QR`, `FOB`
- [ ] QR/Pallet linkage: `REF*QR` ties to batch QR codes, scan-ready payload
- [ ] Carrier & routing: `N1*ST`, `N3/N4`, `TD5` carrier SCAC, ETA calc
- [ ] Line-level mapping: `LIN`, `SN1` (qty shipped), `PID`, `MAN` (package IDs)
- [ ] Outbound dispatch: `SendEdiOutboundJob` → partner/logistics system
- [ ] DB logging: `ShipmentNotice` + tracking status `DISPATCHED`/`IN_TRANSIT`
- [ ] Error handling: partial ship tolerance, carrier API fallback, ETA recalc

### ✅ EDI 810 (Invoice)
- [ ] Trigger: delivery confirmation + ASN reconciliation
- [ ] Builder: `810Builder` maps `BIG`, `REF*PK`, `ITD`, `TAX/TXI`, `AMT`, `IT1`
- [ ] Financial calc: subtotal, platform markup, tax, delivery fee, discounts
- [ ] Payment routing: e-wallet, bank transfer, COD status mapping
- [ ] Outbound dispatch: accounting system sync + partner invoice delivery
- [ ] DB logging: `Invoice` + `InvoiceLine`, ledger entry for loan scoring
- [ ] Error handling: mismatched delivery qty, payment gateway failure, BIR e-invoice future hook
- [ ] Reconciliation: 810 ↔ 856 ↔ 850 3-way match validation

---

## 6. Dependencies & Constraints
| Category | Details |
|----------|---------|
| **Partner Onboarding** | Requires sandbox credentials, sample `.edi` files, endpoint testing window |
| **Regulatory** | Philippine DPA compliance for PII, BIR e-invoicing alignment (Phase 2+), PCI-DSS for payment hooks |
| **Infrastructure** | Redis/MySQL sizing for concurrent EDI bursts, S3 lifecycle policies for raw `.edi` retention |
| **Third-Party APIs** | Payment gateways (GCash/Maya/BDO), SMS/Email alerts, logistics tracking (Lalamove/Grab) |
| **Team Capacity** | Backend (2), DevOps (1), QA (1), Product/Compliance (1). Scope locked to 850→810 core flow |
| **Technical Constraints** | Strict X12 005010 compliance; no custom segment extensions in Phase 1; async-only parsing; <2s validation SLA |

---

## 7. Success Metrics & KPIs
| Metric | Target |
|--------|--------|
| **Processing SLA** | <2s validation, <5s full PO→855 pipeline |
| **Error Rate** | <0.1% malformed/rejected transactions |
| **ACK Compliance** | 100% 855/997 delivery within 15 mins |
| **Inventory Accuracy** | ≥99.5% real-time stock deduction sync |
| **QR Traceability** | 100% batch QR linked to PO/ASN within 30s |
| **System Uptime** | 99.9% monthly availability |
| **Partner Onboarding** | ≤3 days end-to-end sandbox → production |

---

## 📎 Next Steps for Engineering
1. Initialize Laravel project + Docker compose (PHP, MySQL, Redis, Horizon)
2. Implement `EDI InboundController` + `X12EnvelopeParser` + raw S3 storage
3. Build `850Parser` + `BusinessRuleValidator` + idempotency middleware
4. Configure Horizon queues + `ProcessEdiInboundJob` + DB migrations
5. Draft OpenAPI spec for `/edi/850/receive` & partner webhook contracts
6. Begin sandbox integration with 1–2 pilot farmers/retailers

This PDRD serves as the technical and product blueprint. Upon approval, engineering will proceed with **Phase 1 sprint planning** and **EDI sandbox onboarding**.