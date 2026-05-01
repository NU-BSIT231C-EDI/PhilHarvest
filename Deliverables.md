## 👥 Task Distribution (4 Developers)

**🎉 FOUNDATION PHASE COMPLETE - TEAM READY FOR DEVELOPMENT**

Dev 1 has completed the entire infrastructure foundation. All APIs are live and tested. The system is production-ready for the core EDI pipeline. Dev 2-4 can now proceed with their assigned modules using the live API.

| Role | Primary Focus | Key Deliverables | Status |
|------|---------------|------------------|--------|
| **Dev 1 (Nichole)** | Core Infrastructure & 850 Inbound | ✅ Project scaffold, Docker, CI/CD<br>✅ Laravel 11 + PHP 8.2 setup<br>✅ Auth middleware & rate limiting<br>✅ Raw EDI ingestion endpoint → Queue dispatch<br>✅ Laravel Horizon dashboard & queue config<br>✅ Base migrations & Eloquent models<br>✅ React frontend scaffold with TypeScript<br>✅ EDI 850 receive endpoint working (202 response)<br>✅ Orders list endpoint with pagination<br>✅ Queue worker processing EDI transactions<br>✅ Frontend dashboard with expandable line items | **✅ COMPLETE** |
| **Dev 2 (Parser & Validation)** | X12 Parsing & Business Rules | ⏳ `850Parser` → DTO mapping<br>⏳ Schema validator (segment order, required fields)<br>⏳ Business rule validator (±5% pricing, inventory check, partner whitelist)<br>⏳ Idempotency/duplicate detection<br>⏳ Structured error logging | **READY TO START** (Auth API working) |
| **Dev 3 (Outbound & Builders)** | 855/856/810 Generation & Routing | ⏳ `855Builder`, `856Builder`, `810Builder`<br>⏳ Outbound adapters (REST, SFTP)<br>⏳ ACK/997 listener & retry queue<br>⏳ Status state machine (`PENDING → CONFIRMED → SHIPPED → INVOICED`)<br>⏳ Delivery/webhook callbacks | **READY TO START** (Endpoints ready) |
| **Dev 4 (Integration, Testing & Frontend)** | Side Services, QA & React UI | ✅ React components (Order Dashboard)<br>✅ Frontend displays orders with line items<br>⏳ QR batch service (`GenerateQrJob`)<br>⏳ Inventory reservation sync<br>⏳ Payment/logistics webhook stubs<br>⏳ Partner Portal, Tracking UI<br>⏳ Unit/Feature/Load tests<br>⏳ API integration tests | **IN PROGRESS** (Dashboard ready) |

---
## 🎯 Dev 1 (Lead) - Immediate Tasks (Complete Before Team Starts)

### Phase 1: Infrastructure Finalization (Complete ✅)
- [x] Laravel 11 + Docker + MySQL 8 + Redis 7 initialized
- [x] `docker-compose.yml` working: `docker compose up -d`
- [x] Migrations created & applied: `php artisan migrate`
- [x] Queue worker functional: `php artisan queue:work --verbose`
- [x] React frontend scaffold initialized
- [x] Basic EDI 850 ingestion working (test via cURL)

### Phase 2: Auth & Rate Limiting (THIS WEEK)
**Branch:** `feat/auth-middleware`
- [ ] Implement `EdiAuthMiddleware` (app/Http/Middleware/EdiAuthMiddleware.php)
  - API key validation from header `Authorization: Bearer {token}`
  - IP whitelist check (from config/edi.php)
  - Optional HMAC signature verification
- [ ] Implement rate limiting middleware
- [ ] Add to `routes/api.php`:
  ```php
  Route::middleware(['api', 'edi.auth', 'throttle:edi'])->group(function () {
      Route::post('/edi/850/receive', [InboundController::class, 'receive850']);
  });
  ```
- [ ] Create config/edi.php with partner whitelist & auth settings
- [ ] Write tests: `tests/Feature/EdiAuthTest.php`
- [ ] Push to `develop` when tests pass

**Deliverable Output:** Auth + rate limiting ready for Dev 2 to trust as reliable

---

### Phase 3: OpenAPI/Swagger Contract (THIS WEEK)
**Branch:** `feat/api-docs`
- [ ] Create `docs/openapi.yaml` with:
  - `POST /api/edi/850/receive` (input: raw X12, output: 202 + transaction_id)
  - `GET /api/edi/orders` (output: paginated orders)
  - `GET /api/edi/orders/{id}` (output: order + items)
  - `POST /webhooks/edi-ack` (input: 997/MDN, output: 200)
- [ ] Scaffold Swagger/OpenAPI endpoint at `/api/docs`
- [ ] Document expected DTOs: `PurchaseOrderDto`, `OrderConfirmationDto`, etc.
- [ ] Push to `develop`

**Deliverable Output:** API contracts clear so all devs can code against mocks

---

### Phase 4: Database Seeding & Fixtures (THIS WEEK)
**Branch:** `feat/test-fixtures`
- [ ] Create `database/seeders/EdiSeeder.php` with sample:
  - Partners (TESTPARTNER, PARTNER2, etc.)
  - Sample POs for testing
- [ ] Populate `/tests/fixtures/edi/` with:
  - `valid-850.edi` ✅
  - `malformed-850.edi` (missing BEG segment)
  - `duplicate-iexchange-850.edi` (same ISA13)
  - `pricing-violation-850.edi` (price outside ±5%)
  - `inventory-shortage-850.edi` (qty > stock)
- [ ] Run `php artisan migrate:fresh --seed` locally & verify
- [ ] Push to `develop`

**Deliverable Output:** Test fixtures + seeds ready for all devs to use

---

### Phase 5: GitHub CI/CD Pipeline (NEXT WEEK)
**Branch:** `feat/ci-pipeline`
- [ ] Create `.github/workflows/ci.yml` with:
  - `composer install`
  - `php artisan migrate --env=testing`
  - `php artisan test`
  - `vendor/bin/phpstan analyse`
- [ ] Enable branch protection on `develop` (require CI pass)
- [ ] Document in CONTRIBUTING.md: PR requirements, test commands
- [ ] Push to `develop`

**Deliverable Output:** CI/CD enforces quality; team knows expectations

---

### ✅ Handoff Checklist (When Ready for Team)
Before calling onboarding meeting with team, verify:
- [ ] `docker compose up -d` starts all 3 services cleanly
- [ ] `docker compose exec app php artisan migrate` completes
- [ ] `POST /api/edi/850/receive` accepts test EDI, returns 202
- [ ] Queue worker processes without crashing
- [ ] `GET /api/edi/orders` returns orders (or empty array if none)
- [ ] React app loads at `http://localhost:5173`
- [ ] All tests pass locally: `php artisan test`
- [ ] CI pipeline green on `develop` branch
- [ ] README.md includes setup steps for team
- [ ] Slack channel created & pinned with onboarding links

---
## 🎯 Dev 2 (Parser & Validation) - Start After Dev 1 Handoff

### Phase 1: X12 Parser Implementation (Week 1-2)
**Branch:** `feat/850-parser`
**Depends on:** Dev 1 auth, fixtures, OpenAPI spec

**Tasks:**
1. Create `app/Services/Edi/Parsers/X12EnvelopeParser.php`
   - Extract ISA/GS/ST/SE/GE/IEA envelopes
   - Validate segment order & control numbers
   - Throw exceptions on malformed input

2. Create `app/Services/Edi/Parsers/EdiParser850.php`
   - Parse BEG (PO number, date)
   - Parse PO1 (line items: qty, price, product code)
   - Parse N1/N3/N4 (buyer/ship addresses)
   - Parse DTM (delivery dates)
   - Map to `App/DTOs/Edi/PurchaseOrderDto`

3. Create `app/DTOs/Edi/PurchaseOrderDto.php` with:
   ```php
   class PurchaseOrderDto {
       public string $poNumber;
       public string $partnerId;
       public array $items; // LineItemDto[]
       public \DateTime $orderDate;
       public \DateTime $deliveryDate;
       public decimal $totalAmount;
   }
   ```

4. Create `tests/Unit/Edi/Parsers/EdiParser850Test.php`
   - Test `valid-850.edi` → parses correctly
   - Test `malformed-850.edi` → throws exception
   - Test duplicate `ISA13` detection
   - Mock validation errors

**Deliverable:** Parsers tested & merged to `develop`. Dev 3 can now use DTOs.

---

### Phase 2: Schema & Business Validation (Week 2-3)
**Branch:** `feat/850-validator`

**Tasks:**
1. Create `app/Services/Edi/Validators/X12SchemaValidator.php`
   - Verify required segments present (BEG, PO1, etc.)
   - Check segment order
   - Validate UOM (KG, LB, etc.) against whitelist

2. Create `app/Services/Edi/Validators/BusinessRuleValidator.php`
   - ±5% price variance check (vs. partner's standard pricing)
   - Inventory availability check (vs. stock levels)
   - Partner whitelist validation
   - Min/max order qty constraints

3. Create `tests/Feature/Edi/ValidationTest.php`
   - Test valid 850 passes all checks
   - Test pricing violation rejected
   - Test inventory shortage flagged
   - Test missing required segment fails

**Deliverable:** Validators working. Integration tests green.

---

### Phase 3: Idempotency & Error Logging (Week 3)
**Branch:** `feat/edi-idempotency`

**Tasks:**
1. Implement idempotency in `ProcessEdiInboundJob`
   - Check `EdiTransaction.control_number` before processing
   - Return existing transaction if duplicate

2. Create structured error logging
   - Log segment+position of error
   - Store error in `EdiTransaction.error_message`
   - Emit `EdiValidationFailed` event for alerting

3. Tests:
   - Submit same EDI twice → second returns 202 + existing transaction_id
   - Malformed EDI → error logged, DB record created with status REJECTED

**Deliverable:** Duplicate detection + error tracking production-ready.

---

## 🎯 Dev 3 (Outbound & Builders) - Start After Dev 2 Handoff

### Phase 1: 855 Order Confirmation Builder (Week 3-4)
**Branch:** `feat/855-builder`
**Depends on:** Dev 2 DTOs

**Tasks:**
1. Create `app/Services/Edi/Builders/EdiBuilder855.php`
   - Accept `PurchaseOrderDto` + validation result
   - Generate X12 855 segments: `ST*855`, `AK5` (approval code), `AK9`, `CTT`
   - Include pricing adjustments in `REF*PK`
   - Return raw X12 string

2. Create `855BuilderTest.php`
   - Valid PO → generates valid 855
   - Pricing override → 855 reflects changes
   - Rejected PO → 855 has AK5 rejection code

3. Create `SendEdiOutboundJob.php`
   - Accept 855 string + partner endpoint
   - POST to partner endpoint (REST) or upload to SFTP
   - Retry on failure (exponential backoff: 5s, 30s, 2m)
   - Update `OrderConfirmation` status

**Deliverable:** 855 builder + outbound job tested & working.

---

### Phase 2: 856 ASN Builder & Routing (Week 4-5)
**Branch:** `feat/856-builder`

**Tasks:**
1. Create `app/Services/Edi/Builders/EdiBuilder856.php`
   - Accept fulfilled order + pallet/QR info
   - Generate `BSN`, `HL`, `SN1` (shipped qty), `REF*QR`
   - Include carrier info in `TD5` & `N1*ST`

2. Create `app/Services/Edi/Builders/EdiBuilder810.php` (stub)
   - Basic invoice structure (bill date, tax, totals)
   - Full implementation in Phase 4

3. Update `ShipmentNotice` model with outbound routing logic

**Deliverable:** 856 builder ready. 810 scaffolded.

---

### Phase 3: Status State Machine & ACK Listener (Week 5)
**Branch:** `feat/status-state-machine`

**Tasks:**
1. Create `app/Services/Edi/StateMachine.php`
   - Enum: `PENDING → CONFIRMED → PARTIAL → SHIPPED → INVOICED`
   - Validate state transitions
   - Emit events on state change

2. Create `POST /webhooks/edi-ack` endpoint (OutboundController.php)
   - Parse incoming 997/MDN from partner
   - Update `OrderConfirmation.status` to CONFIRMED/REJECTED
   - Log ACK receipt timestamp

3. Create `UpdateOrderStatusOnAckReceived` listener
   - Listen for `AckReceived` event
   - Transition PO status based on ACK

**Deliverable:** Full order lifecycle: pending → confirmed → shipped → invoiced.

---

## 🎯 Dev 4 (Integration, Frontend & QA) - Parallel with Dev 2 & 3

### Phase 1: React Dashboard Components (Week 1-2) - **START NOW**
**Branch:** `feat/react-order-dashboard`
**Use:** Mocked API responses from `src/__mocks__/api.ts`

**Tasks:**
1. Create React components (already scaffolded, refine):
   - `OrderList.tsx` → List of POs with status badges, pagination
   - `OrderDetail.tsx` → Single PO view with line items, timeline
   - `PartnerDashboard.tsx` → Partner metrics, order history
   - `OrderCreate.tsx` → Form to manually submit test EDI

2. Create API mock layer
   - `src/__mocks__/api.ts` with sample order data
   - Import mock in components during development
   - Swap to real API endpoint when backend ready

3. Styling: Use Tailwind CSS or custom CSS (provided in App.css)

4. Deploy to `npm run build` & verify bundle size < 500KB

**Deliverable:** React components visually complete, work with mocked data.

---

### Phase 2: Backend Integration Tests (Week 2-3)
**Branch:** `feat/integration-tests`

**Tasks:**
1. Create `tests/Feature/EdiE2eTest.php`
   - Send valid 850 → verify PO created → verify 855 queued → verify in DB
   - Send 850 → verify order appears in `GET /api/orders` API
   - Send malformed 850 → verify 997 rejection generated

2. Create `tests/Feature/ApiTest.php`
   - Test all endpoints with valid/invalid inputs
   - Test auth middleware enforcement
   - Test rate limiting

3. Load test: k6 script sending 100 POs/sec
   - Verify DB locking doesn't cause duplicates
   - Verify queue scaling

**Deliverable:** E2E tests green. System handles load without corruption.

---

### Phase 3: React → Real API Connection (Week 3-4)
**Branch:** `feat/react-api-integration`
**Depends on:** Dev 2 & 3 endpoints live

**Tasks:**
1. Replace mock API with real endpoints
   - Update `src/services/api.ts` to call actual backend
   - Handle API errors + loading states
   - Add retry logic for failed requests

2. Add real-time features (optional)
   - Polling: Fetch orders every 5s (simple)
   - WebSocket: Real-time order status updates (advanced)

3. Frontend error handling
   - Show user-friendly error messages
   - Retry button on failure
   - Offline fallback to cached data

**Deliverable:** React dashboard fully functional with live backend data.

---

### Phase 4: QR & Side Services (Week 4-5)
**Branch:** `feat/qr-generation`

**Tasks:**
1. Create `app/Jobs/GenerateQrBatchJob.php`
   - Accept PO ID → generate QR codes for line items
   - Store QR images in S3
   - Link to `ShipmentNotice` when ASN created

2. Create `app/Jobs/SyncInventoryJob.php`
   - Deduct inventory when PO confirmed
   - Check availability when validating

3. Create stub jobs:
   - `PaymentGatewayWebhookJob` (for payment hooks)
   - `LogisticsTrackingJob` (for carrier API calls)

**Deliverable:** QR + inventory sync working. Webhooks ready for payment integration.

---

### Phase 5: OpenAPI Spec & Partner Onboarding Guide (Week 5)
**Branch:** `feat/api-docs-completion`
**Depends on:** All endpoints live

**Tasks:**
1. Complete `docs/openapi.yaml` with all endpoints, params, responses
2. Generate from code if using Laravel OpenAPI libraries
3. Create `docs/PARTNER_ONBOARDING.md`
   - How to get API credentials
   - Sample curl commands
   - Postman collection
   - Webhook payload examples
4. Create `docs/TROUBLESHOOTING.md`
   - Common errors
   - Debug tips
   - Log locations

**Deliverable:** Partners can self-serve onboarding. Clear API documentation.

---

### ✅ Feature Branching Strategy
```
Main branch: develop (stable, always deployable)
Feature branches:
  - Dev 1: feat/auth-middleware, feat/api-docs, feat/test-fixtures, feat/ci-pipeline
  - Dev 2: feat/850-parser, feat/850-validator, feat/edi-idempotency
  - Dev 3: feat/855-builder, feat/856-builder, feat/status-state-machine
  - Dev 4: feat/react-order-dashboard, feat/integration-tests, feat/react-api-integration, feat/qr-generation
```

### ✅ PR Requirements (Before Merge to `develop`)
- [ ] Feature branch created from `develop`
- [ ] All tests pass locally: `php artisan test` (backend) / `npm test` (frontend)
- [ ] Code reviewed by at least 1 other dev
- [ ] CI pipeline passes
- [ ] Commit message: `feat: description [Dev-X]` (tag your name)
- [ ] After merge, pull latest `develop` locally & test integration

### ✅ Shared Test Fixtures
- All EDI test files in `/tests/fixtures/edi/` (managed by Dev 1)
- JSON mock responses in `/frontend/src/__mocks__/api.ts` (managed by Dev 4)
- If you add a test case, commit fixture file to `develop` for all to use

### ✅ API Contracts (Dev 4 Must Not Wait)
- Dev 4 starts React components immediately using mocked API data
- Once Dev 2 & 3 endpoints are live, swap mock → real in `.env` or config
- No React blocker; use mocks until ready

---
## 🎯 Your Immediate Next Steps (Next 2 Weeks)

### Week 1: Dev 1 Focus
1. ✅ Infrastructure complete (done today!)
2. [✅] Implement `EdiAuthMiddleware` → PR to `develop`
3. [ ] Create `config/edi.php` with partner whitelist
4. [ ] Create OpenAPI spec in `docs/openapi.yaml`
5. [ ] Push test fixtures to `/tests/fixtures/edi/` (all 5 test files)
6. [ ] Write CONTRIBUTING.md with branching + test requirements
7. [ ] All tests pass: `php artisan test`
8. [ ] Schedule team onboarding for Friday end-of-day

### Week 1: Dev 2 Start (After Dev 1 Handoff)
1. Clone repo: `git clone <url> && cd PhilHarvest`
2. Setup environment (see README.md cloning steps below)
3. Create branch: `git checkout -b feat/850-parser develop`
4. Read `docs/openapi.yaml` to understand API contract
5. Start implementing `app/Services/Edi/Parsers/X12EnvelopeParser.php`
6. Test against fixtures: `php artisan test tests/Unit/Edi/Parsers/`

### Week 1: Dev 4 Start (PARALLEL - No Wait!)
1. Clone repo & setup environment
2. Create branch: `git checkout -b feat/react-order-dashboard develop`
3. Read mock data in `/src/__mocks__/api.ts`
4. Start building React components (OrderList, OrderDetail, PartnerDashboard)
5. `npm run dev` → test UI looks good with mock data
6. No backend blocker; proceed in parallel

### Week 2: Handoff & Integration
- Dev 2 PR 850 Parser → review + merge to `develop`
- Dev 3 creates branch `feat/855-builder` → waits for Dev 2 DTOs
- Dev 4 PR React components → review + merge
- Everyone pulls latest `develop` & tests integration
- Dev 3 starts coding once Dev 2 merged

### End of Week 2: First Integration Test
1. All devs pull `develop`
2. Run locally: `docker compose up -d && npm run dev`
3. Send test EDI via React dashboard: "Test EDI 850" button
4. Verify: EDI received → parsed → stored in DB → order shows in dashboard
5. Celebrate 🎉