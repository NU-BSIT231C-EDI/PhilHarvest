# 🌾 PhilHarvest EDI Integration Platform

**A Laravel 11 + React EDI automation system for agribusiness supply chain transactions.**

Standardizes B2B/B2C transactions using ANSI X12 005010, automating Purchase Orders (850) → Order Confirmations (855) → Advance Ship Notices (856) → Invoices (810).

---

## 📋 Table of Contents

- [✅ What's Complete](#-whats-complete)
- [Prerequisites](#prerequisites)
- [Quick Start (Clone & Run)](#-quick-start-clone--run)
- [Step-by-Step Initialization](#step-by-step-initialization)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Key Commands](#key-commands)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Team Workflow](#team-workflow)

---

## ✅ What's Complete

| Component | Status | Details |
|-----------|--------|---------|
| **Infrastructure** | ✅ | Docker Compose (PHP 8.2, MySQL 8, Redis 7) |
| **Backend API** | ✅ | Laravel 11 with auth & rate limiting |
| **EDI 850 Inbound** | ✅ | `POST /api/edi/850/receive` → 202 Accepted |
| **Queue Processing** | ✅ | Redis queue with `php artisan queue:work` |
| **Orders API** | ✅ | `GET /api/edi/orders` & `GET /api/edi/orders/{id}` |
| **Authentication** | ✅ | Bearer token validation, partner ID extraction |
| **Rate Limiting** | ✅ | Per-partner throttling (100 req/min) |
| **React Frontend** | ✅ | TypeScript dashboard with order list & line items |
| **TypeScript Config** | ✅ | Fixed all compilation errors (JSX, vite-env) |
| **Database Models** | ✅ | PurchaseOrder, PurchaseOrderItem, EdiTransaction |

**Next Phase:** Dev 2-4 start on 855/856/810 builders, validation logic, and additional UI features.

See [EDI_API_INTEGRATION.md](EDI_API_INTEGRATION.md) for API integration details.


## ✅ Prerequisites

**You need to have installed:**
- ✅ Docker Desktop (or Docker + Docker Daemon)
- ✅ Git
- ✅ Code editor (VS Code recommended)
- ✅ Postman or cURL (for testing endpoints)

**You DO NOT need to install:**
- ❌ PHP (runs in Docker)
- ❌ MySQL (runs in Docker)
- ❌ Redis (runs in Docker)
- ❌ Node.js globally (npm runs in frontend folder)

---

## ⚡ Quick Start (Clone & Run)

**First time? Follow this 5-minute setup:**

### 1. Clone the Repository

```bash
git clone <repository-url> PhilHarvest
cd PhilHarvest
```

### 2. Start Backend (Docker)

```bash
cd backend

# Copy environment file
cp .env.example .env

# Start all services (PHP, MySQL, Redis)
docker compose up -d

# Wait ~15 seconds for services to start, then verify
docker compose ps

# You should see all 3 containers with status "Up"
```

### 3. Initialize Database

```bash
# Run migrations (create tables)
docker compose exec app php artisan migrate

# Seed test data (optional)
docker compose exec app php artisan db:seed --class=EdiSeeder
```

### 4. Start Queue Worker (REQUIRED - keep this terminal open)

```bash
# In a NEW terminal, start the async job worker
docker compose exec app php artisan queue:work --verbose

# Keep this running. You'll see jobs being processed here.
```

### 5. Start Frontend (React)

```bash
# In another NEW terminal
cd frontend

# Copy environment file
cp .env.example .env

# Install dependencies
npm install

# Start dev server
npm run dev
```

### 6. Access the Application

| Service | URL | Purpose |
|---------|-----|---------|
| **React Dashboard** | http://localhost:5173 | Order management UI |
| **Laravel API** | http://localhost:8000 | EDI endpoints |
| **Laravel Welcome** | http://localhost:8000 | Backend status |

**You're done! 🎉 The system is ready to use.**

---

## 🚀 Step-by-Step Initialization

### For Backend Developers (Dev 2 & Dev 3)

After cloning + quick start above, run these verification steps:

```bash
cd backend

# 1. Check all migrations ran
docker compose exec app php artisan migrate:status

# 2. Check database tables exist
docker compose exec mysql mysql -u root -proot philharvest -e "SHOW TABLES;"

# 3. Run tests to ensure everything works
docker compose exec app php artisan test

# 4. Check queue is connected
docker compose exec app php artisan queue:work --tries=1 &
# Wait 5 seconds, then press Ctrl+C

# 5. Verify you can fetch orders via API
curl http://localhost:8000/api/edi/orders \
  -H "Authorization: Bearer test_token_here"
```

**If all commands succeed, you're ready to start coding!** See [Deliverables.md](Deliverables.md) for your specific tasks.

### For Frontend Developers (Dev 4)

After cloning + quick start above:

```bash
cd frontend

# 1. Verify React app loads
# Open http://localhost:5173 in browser
# You should see the dashboard with a "Test EDI 850" button

# 2. Check mock API data loads
# Open browser console (F12)
# You should see NO errors about missing API

# 3. Test component renders
# Click "Test EDI 850" button
# Should show a form without errors

# 4. Run tests (if configured)
npm test
```

**If React app loads cleanly, you're ready!** Start building components. Use mocked API data until backend endpoints are live.

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend** | PHP 8.2, Laravel 11, Eloquent ORM | API routing, business logic, queue orchestration |
| **Frontend** | React 18+, TypeScript, Vite | Client-facing order dashboard, partner portal |
| **Database** | MySQL 8.0 (InnoDB) | ACID-compliant PO, inventory, audit, payment data |
| **Queue/Cache** | Redis 7, Laravel Horizon | Async job processing, distributed caching |
| **EDI Parsing** | Custom X12 parser | X12 segment validation & DTO mapping |
| **Storage** | Local disk / AWS S3 | Raw EDI archives, QR assets, audit logs |
| **Monitoring** | Laravel Telescope | Error tracking, pipeline metrics |
| **Security** | TLS 1.3, Bearer tokens, HMAC | Partner auth, payload integrity |

---

## 📁 Project Structure

```
PhilHarvest/
├── backend/                          # Laravel 11 API (PHP)
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/Edi/
│   │   │   │   ├── InboundController.php      # Receives EDI 850
│   │   │   │   ├── OutboundController.php     # Serves orders, ACKs
│   │   │   │   └── WebhookController.php      # Receives partner ACKs
│   │   │   └── Middleware/
│   │   │       ├── EdiAuthMiddleware.php      # Auth validation
│   │   │       └── EdiRateLimitMiddleware.php # Rate limiting
│   │   ├── Services/Edi/
│   │   │   ├── Parsers/                       # X12 parsing logic
│   │   │   ├── Builders/                      # 855/856/810 generation
│   │   │   ├── Validators/                    # Schema + business rules
│   │   │   └── Processors/                    # PO/ASN/Invoice processing
│   │   ├── Jobs/
│   │   │   ├── ProcessEdiInboundJob.php       # Async EDI processing
│   │   │   ├── GenerateQrBatchJob.php         # QR code generation
│   │   │   └── SendEdiOutboundJob.php         # Send 855/856/810
│   │   ├── Models/
│   │   │   ├── EdiTransaction.php
│   │   │   ├── PurchaseOrder.php
│   │   │   ├── OrderConfirmation.php
│   │   │   ├── ShipmentNotice.php
│   │   │   └── Invoice.php
│   │   ├── DTOs/Edi/                          # Data transfer objects
│   │   ├── Events/                            # Laravel events
│   │   └── Listeners/                         # Event listeners
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   ├── tests/
│   │   ├── fixtures/edi/                      # Test EDI files (.edi)
│   │   ├── Unit/
│   │   ├── Feature/
│   │   └── Integration/
│   ├── storage/app/edi/raw/                   # Raw EDI archive
│   ├── docker-compose.yml                     # Docker services
│   ├── Dockerfile                             # PHP container config
│   ├── .env.example                           # Environment template
│   └── composer.json
│
├── frontend/                         # React 18 Dashboard (TypeScript)
│   ├── src/
│   │   ├── components/
│   │   │   ├── OrderList.tsx                  # List of orders
│   │   │   ├── OrderDetail.tsx                # Single order view
│   │   │   └── PartnerDashboard.tsx           # Partner metrics
│   │   ├── services/
│   │   │   └── api.ts                         # API client + types
│   │   ├── __mocks__/
│   │   │   └── api.ts                         # Mock API for dev
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── vite.config.ts
│   ├── package.json
│   └── .env.example
│
├── docs/
│   ├── openapi.yaml                           # API specification
│   ├── CONTRIBUTING.md                        # Dev workflow rules
│   ├── PARTNER_ONBOARDING.md                  # Partner integration guide
│   └── TROUBLESHOOTING.md                     # Common issues
│
├── Deliverables.md                            # Task distribution per dev
├── HowToTest.md                               # Testing strategy
├── HowTheyReceiveFiles.md                     # EDI delivery methods
├── PRD.md                                     # Product requirements
└── README.md                                  # This file

### 4. Test EDI Ingestion

```bash
# In a new terminal, send a test 850 order
curl -X POST http://localhost:8000/api/edi/850 \
  -H "Content-Type: application/edi-x12" \
  -H "Authorization: Bearer test_token_here" \
  -d @../tests/fixtures/edi/valid-850.edi

# Expected response: HTTP 202 Accepted

# Watch queue worker logs to see parsing in action
# Check React dashboard to see order appear
```

---

## 🎯 Key Commands

### Backend (Laravel + Docker)

```bash
cd backend

# Docker Management
docker compose up -d              # Start all services
docker compose down               # Stop all services
docker compose down -v            # Stop + remove volumes (reset DB)
docker compose logs -f app        # View PHP container logs
docker compose ps                 # Check service status

# Database & Migrations
php artisan migrate              # Run pending migrations
php artisan migrate:status       # Check migration status
php artisan migrate:fresh --seed # Reset DB + run seeders
php artisan db:seed --class=EdiSeeder  # Run specific seeder

# Queue & Jobs
php artisan queue:work --verbose # Start queue worker (KEEP RUNNING!)
php artisan queue:failed         # View failed jobs
php artisan queue:retry <id>     # Retry a failed job
php artisan horizon              # Start Horizon dashboard

# Testing & Quality
php artisan test                 # Run all tests
php artisan test tests/Unit/     # Run unit tests only
vendor/bin/phpstan analyse       # Static code analysis

# Useful Utilities
php artisan tinker              # Interactive shell
php artisan route:list          # List all API routes
php artisan cache:clear        # Clear application cache
php artisan config:clear       # Clear config cache
php artisan storage:link       # Create storage symlink
```

### Frontend (React + Vite)

```bash
cd frontend

# Development
npm run dev              # Start Vite dev server
npm run build          # Build for production
npm run preview        # Preview production build locally

# Testing & Linting (if configured)
npm test              # Run tests
npm run lint          # Run ESLint

# Dependency Management
npm install           # Install dependencies
npm update            # Update all packages
npm cache clean --force  # Clear npm cache
```

### EDI Testing

```bash
cd backend

# Send test 850 via cURL
curl -X POST http://localhost:8000/api/edi/850/receive \
  -H "Content-Type: application/edi-x12" \
  -H "X-Partner-ID: TESTPARTNER" \
  -d @tests/fixtures/edi/valid-850.edi

# Expected response (HTTP 202):
# {"message":"Accepted","transaction_id":1,"control_number":"000000001"}

# Fetch orders from API
curl http://localhost:8000/api/edi/orders \
  -H "Authorization: Bearer test_token"

# Check Horizon dashboard (queue monitoring)
# Open http://localhost:8000/horizon in browser

# View logs
tail -f storage/logs/laravel.log
```

---

## 🧪 Testing

### Run All Tests

```bash
cd backend

# Run all tests (Unit + Feature + Integration)
php artisan test

# Run specific test suite
php artisan test tests/Unit/
php artisan test tests/Feature/Edi/

# Run with verbose output
php artisan test --verbose

# Run tests matching pattern
php artisan test --filter=ParserTest
```

### Test Coverage

```bash
# Generate coverage report
php artisan test --coverage

# Coverage for specific file
php artisan test --coverage --filter=EdiParser850Test
```

### Writing Tests (For All Developers)

Tests go in `backend/tests/` folder:
- `Unit/` → Tests for parsers, validators, DTOs (no DB)
- `Feature/` → Tests for controllers, jobs, models (with DB)
- `Integration/` → E2E tests across modules

**Every feature branch should include tests!** No PR without tests.

---

## 🐛 Troubleshooting

### Docker Issues

**Problem:** `docker compose up` fails
```bash
# Check logs
docker compose logs

# Restart from scratch
docker compose down -v
docker compose up -d
```

**Problem:** Port already in use (8000, 3306, 6379)
```bash
# Edit docker-compose.yml:
# - "8001:8000"  # Use 8001 instead
# - "3307:3306"  # Use 3307 instead
# - "6380:6379"  # Use 6380 instead
```

### Database Issues

**Problem:** Migrations fail
```bash
# Clear config cache
docker compose exec app php artisan config:clear

# Fresh migration
docker compose exec app php artisan migrate:fresh

# Check migrations table
docker compose exec mysql mysql -u root -proot philharvest \
  -e "SELECT * FROM migrations;"
```

### Queue Issues

**Problem:** Jobs not being processed
```bash
# Check queue worker is running (should say "Listening for jobs")
docker compose exec app php artisan queue:work --verbose

# Check if Redis is connected
docker compose exec redis redis-cli ping
# Should return "PONG"

# Check failed jobs
docker compose exec app php artisan queue:failed
```

### React Issues

**Problem:** CORS errors from frontend
```bash
# Add backend URL to frontend .env
VITE_API_URL=http://localhost:8000

# Verify backend CORS config (in config/cors.php)
# Should allow localhost:5173 in dev
```

**Problem:** `npm install` fails
```bash
rm -rf node_modules package-lock.json
npm install
```

### EDI Testing Issues

**Problem:** `curl` returns 401 Unauthorized
```bash
# Check auth token in header
curl -H "Authorization: Bearer test_token_here" ...

# Check .env has EDI_AUTH_TOKEN set
grep EDI_AUTH_TOKEN backend/.env
```

**Problem:** Test EDI doesn't parse
```bash
# Check test fixture format
cat backend/tests/fixtures/edi/valid-850.edi

# Check queue worker logs for parsing errors
docker compose logs app | grep "ProcessEdiInboundJob"

# Send with verbose logging
curl -v -X POST http://localhost:8000/api/edi/850/receive \
  -H "Content-Type: application/edi-x12" \
  -d @backend/tests/fixtures/edi/valid-850.edi
```

---

## 👥 Team Workflow

### For New Team Members (After Cloning)

1. **Clone repository**
   ```bash
   git clone <repo> && cd PhilHarvest
   ```

2. **Follow Quick Start above** (5 minutes)

3. **Verify everything works**
   ```bash
   # Backend
   docker compose ps              # All 3 containers "Up"?
   docker compose exec app php artisan migrate:status  # All migrated?
   
   # Frontend
   # Open http://localhost:5173 → see React app?
   ```

4. **Read your role's tasks**
   - See [Deliverables.md](Deliverables.md) for what YOU should build
   - Look at example code in existing files
   - Ask questions in #philharvest-dev Slack

5. **Create your feature branch**
   ```bash
   git checkout -b feat/<your-feature-name> develop
   ```

6. **Start coding!** Use the test fixtures and mocked APIs.

### Branching Strategy

```
Main branch: develop (always deployable)

Feature branches:
  feat/auth-middleware         (Dev 1)
  feat/850-parser              (Dev 2)
  feat/855-builder             (Dev 3)
  feat/react-order-dashboard   (Dev 4)
  
PR naming: "fix: description [Dev-X]"
```

### Pull Request Checklist

Before submitting PR to `develop`:
- [ ] Feature branch created from `develop`
- [ ] All tests pass: `php artisan test` or `npm test`
- [ ] No console errors
- [ ] Code follows existing style (check PSR-12 for Laravel, ESLint for React)
- [ ] Commit message is descriptive: `feat: add 850 parser [Dev-2]`
- [ ] PR includes a short description of what was added
- [ ] At least 1 other dev has reviewed code

---

## 📚 Additional Resources

- [Laravel 11 Docs](https://laravel.com/docs/11.x)
- [React 18 Docs](https://react.dev)
- [X12 EDI Basics](https://www.edibasics.com/)
- [ANSI X12 Standard Segments](https://www.edifact.org/standards/x12/)

---

## 📞 Support

- **Questions?** Ask in #philharvest-dev Slack
- **Bug report?** Create an issue on GitHub
- **Emergency?** @dev-lead in Slack

---

## 📄 License

Internal project. All rights reserved.
- [ ] All dependencies are in package.json (not just node_modules)
- [ ] .env file has correct API base URL (e.g., `VITE_API_URL=http://localhost:8000`)

### API Endpoints
- [ ] `GET /` returns Laravel welcome page or custom landing
- [ ] `POST /api/edi/850` accepts test EDI payload, returns `202 Accepted`
- [ ] `GET /api/orders` returns paginated purchase orders (mock or real data)
- [ ] `GET /api/orders/:id` returns single order details
- [ ] All endpoints require valid auth token (bearer JWT or API key)
- [ ] CORS headers allow React frontend to communicate with backend

### EDI Testing
- [ ] Test fixtures exist in `backend/tests/fixtures/edi/`:
  - `valid-850.edi` (standard purchase order)
  - `malformed-850.edi` (missing required segment)
  - `duplicate-850.edi` (duplicate ISA13)
  - `pricing-violation-850.edi` (price outside ±5%)
- [ ] All test fixtures parse without fatal errors (logged validation failures are OK)
- [ ] Queue worker processes test 850 correctly: DB record created, 855 generated

### Testing & Quality
- [ ] `php artisan test` runs all tests and passes
- [ ] `npm test` (if configured) runs React tests and passes
- [ ] No phpstan/larastan errors: `vendor/bin/phpstan analyse`
- [ ] No eslint errors in React: `npm run lint` (if configured)

### Documentation
- [ ] `README.md` includes:
  - Quick start (docker compose up)
  - Local setup steps
  - Key commands
  - Architecture diagram or flowchart
- [ ] `.env.example` documents all required variables
- [ ] `CONTRIBUTING.md` exists with branching strategy, PR process, commit conventions
- [ ] API docs available (Swagger/OpenAPI at `/api/docs` or `openapi.yaml`)
- [ ] Each service has inline code comments for complex logic

### Git & CI/CD
- [ ] .gitignore is set up (exclude node_modules, `vendor/`, .env, Docker volumes)
- [ ] `.github/workflows/` (or GitLab CI) has:
  - Composer install & `phpstan` check
  - `php artisan test` execution
  - (Optional) npm install & React lint/test
- [ ] Initial commit pushed to `develop` branch
- [ ] GitHub branch protection requires passing CI before merge

### Secrets & Configuration
- [ ] No hardcoded API keys, passwords, or credentials in code
- [ ] All secrets stored in .env (git-ignored)
- [ ] `.env.example` shows placeholders (no real values)
- [ ] Dev .env has dummy/test credentials (e.g., `REDIS_PASSWORD=testing`)

### Team Readiness
- [ ] All 4 developers can clone, run `docker compose up`, and see the system working within 30 minutes
- [ ] Each developer assigned to a sprint task (Deliverables.md role)
- [ ] Shared Slack/Discord channel for questions
- [ ] 1-hour onboarding session scheduled with architecture walkthrough

---

## 🏗 Architecture Overview

```
┌─────────────────┐
│  Trading      │
│  Partner      │
│  (Retailer)   │
└────────┬────────┘
         │ POST /api/edi/850 (X12 format)
         ▼
┌─────────────────────────────────────────────┐
│     LARAVEL BACKEND (php artisan serve)     │
├─────────────────────────────────────────────┤
│ ┌──────────────────────────────────────┐   │
│ │ InboundController                    │   │
│ │ • Parse request headers              │   │
│ │ • Validate auth token & IP whitelist │   │
│ └──────────────────────────┬───────────┘   │
│                            │                │
│                 Store raw EDI payload       │
│                 (S3/MinIO/local disk)       │
│                            │                │
│ ┌──────────────────────────▼───────────┐   │
│ │ ProcessEdiInboundJob (Queue)         │   │
│ │ • X12EnvelopeParser (ISA/GS/ST)      │   │
│ │ • 850Parser (BEG/PO1/DTM/N1)         │   │
│ │ • BusinessRuleValidator              │   │
│ └──────────────────────────┬───────────┘   │
│                            │                │
│                 DB: PurchaseOrder created   │
│                 Status: PENDING             │
│                            │                │
│ ┌──────────────────────────▼───────────┐   │
│ │ Event: PoValidated (triggered)       │   │
│ │ Listeners:                           │   │
│ │ • GenerateQrJob                      │   │
│ │ • SyncInventoryJob                   │   │
│ │ • RouteAckJob (send 855)             │   │
│ └──────────────────────────┬───────────┘   │
│                            │                │
│                     855Builder               │
│                     Status: CONFIRMED       │
│                            │                │
│                    SendEdiOutboundJob       │
│              (Route to partner endpoint)    │
└────────────────────┬───────────────────────┘
                     │ POST partner endpoint
                     ▼
┌─────────────────┐
│  Trading       │
│  Partner Sys   │
│  (Receives ACK)│
└─────────────────┘

PARALLEL: React Frontend polls /api/orders endpoint
┌─────────────────┐
│  React         │
│  Dashboard     │
│  (localhost:   │
│   5173)        │
└────────┬────────┘
         │ GET /api/orders (every 5s)
         │ GET /api/orders/:id
         ▼
    Backend API
    ├─ Order List
    ├─ Order Status
    ├─ Partner Details
    └─ Timeline/History
```

---

## 🎯 Key Commands

### Backend (Laravel)

```bash
cd backend

# Docker
docker compose up -d              # Start all services
docker compose down               # Stop all services
docker compose logs -f app        # View PHP logs

# Laravel
php artisan migrate              # Run database migrations
php artisan migrate:fresh --seed # Reset DB + seed
php artisan tinker              # Interactive shell
php artisan queue:work          # Start queue worker
php artisan queue:failed        # View failed jobs
php artisan horizon             # Start Horizon dashboard

# Testing
php artisan test                # Run all tests
php artisan test tests/Unit/   # Run specific test suite
vendor/bin/phpstan analyse      # Static analysis

# Cleanup
php artisan cache:clear        # Clear application cache
php artisan config:clear       # Clear config cache
php artisan storage:link       # Create storage symlink
```

### Frontend (React)

```bash
cd frontend

# Development
npm run dev              # Start Vite dev server
npm run build          # Build for production
npm run preview        # Preview production build locally

# Testing & Linting
npm test              # Run tests (if configured)
npm run lint          # Run ESLint

# Cleanup
npm cache clean --force
rm -rf node_modules && npm install  # Reinstall dependencies
```

### EDI Testing

```bash
# Send test 850
curl -X POST http://localhost:8000/api/edi/850 \
  -H "Content-Type: application/edi-x12" \
  -H "Authorization: Bearer test_token" \
  -d @tests/fixtures/edi/valid-850.edi

# Fetch orders from API
curl http://localhost:8000/api/orders \
  -H "Authorization: Bearer test_token"

# Check queue status
curl http://localhost:8000/horizon

# View raw EDI payload
cat storage/app/edi/raw/<date>/<file>.edi
```

---

## 🔧 CI/CD Setup

### GitHub Actions (Recommended)

Create `.github/workflows/ci.yml`:

```yaml
name: CI Pipeline

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_DATABASE: philharvest_test
          MYSQL_ROOT_PASSWORD: root
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
      
      redis:
        image: redis:7
        options: >-
          --health-cmd="redis-cli ping"
          --health-interval=10s

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
      
      - name: Install Composer dependencies
        run: composer install
      
      - name: Generate app key
        run: php artisan key:generate
      
      - name: Run migrations
        run: php artisan migrate
      
      - name: Run tests
        run: php artisan test
      
      - name: Run PHPStan
        run: vendor/bin/phpstan analyse
```

---

## 👥 Team Onboarding

### Day 1: Initial Setup & Walkthrough

1. **Everyone clones repo:**
   ```bash
   git clone <repo-url> && cd PhilHarvest
   ```

2. **Everyone starts Docker:**
   ```bash
   cd backend && docker compose up -d
   cd ../frontend && npm install && npm run dev
   ```

3. **Lead (you) walks through:**
   - Architecture diagram & EDI pipeline
   - Folder structure & service responsibilities
   - How to run tests & send test 850 payloads
   - Shared Slack channel for questions

### Day 2–3: Role Assignment & Task Kickoff

- **Dev 1 (You):** Finalize infrastructure, begin `EdiAuthMiddleware`
- **Dev 2:** Start `X12EnvelopeParser` + `850Parser` (mocked DTOs)
- **Dev 3:** Stub `855Builder` + outbound adapters (expects Dev 2 DTOs)
- **Dev 4:** Build React dashboard components + start backend integration tests

### Ongoing: Daily Sync

- **15-min standup:** "What's blocking? Any API changes? Do interfaces match expectations?"
- **Code reviews:** Every PR reviewed before merge to `develop`
- **Shared test fixtures:** All developers add/validate `.edi` files in `/tests/fixtures/edi/`

---

## 🐛 Troubleshooting

### Docker Issues

**Problem:** `docker compose up` fails to start
```bash
# Check logs
docker compose logs

# Restart from scratch
docker compose down -v
docker compose up -d

# Check specific service
docker compose exec app php artisan migrate
```

**Problem:** Port conflicts (8000, 3306, 6379 already in use)
```bash
# In docker-compose.yml, change ports:
# - "8001:8000"  # Use 8001 instead of 8000
# - "3307:3306"  # Use 3307 instead of 3306
# - "6380:6379"  # Use 6380 instead of 6379
```

### Laravel Issues

**Problem:** `php artisan migrate` fails
```bash
# Check .env is set correctly
# Clear cache
php artisan config:clear cache:clear

# Try fresh migration
php artisan migrate:fresh
```

**Problem:** Queue worker not processing jobs
```bash
# Check Redis is running
docker compose ps redis

# Check failed jobs
php artisan queue:failed

# Retry failed job
php artisan queue:retry <id>
```

### React Issues

**Problem:** CORS errors when calling backend
```
# In frontend .env, add backend URL
VITE_API_URL=http://localhost:8000

# In backend, configure CORS in config/cors.php
```

**Problem:** `npm start` hangs or won't start
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### EDI Testing

**Problem:** `POST /api/edi/850` returns 401 Unauthorized
```bash
# Check auth token is passed correctly
# Check EdiAuthMiddleware is not blocking requests
# View logs: docker compose logs app
```

**Problem:** Test 850 parses but DB record not created
```bash
# Check queue worker is running in separate terminal
php artisan queue:work --verbose

# Check for exceptions in logs
tail -f storage/logs/laravel.log
```


---

## 📄 License

Internal project. All rights reserved.
```

---

## 📝 Create These Additional Files

### `.env.example` (Backend)

```bash
APP_NAME=PhilHarvest
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=philharvest
DB_USERNAME=root
DB_PASSWORD=root

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=null

QUEUE_CONNECTION=redis
SESSION_DRIVER=redis

MAIL_DRIVER=smtp
MAIL_HOST=smtp.mailtrap.io

S3_DRIVER=local
STORAGE_PATH=storage/app/edi/raw

EDI_AUTH_TOKEN=test_token_here
EDI_PARTNER_WHITELIST=TESTPARTNER,PARTNER2

LOG_CHANNEL=stack
LOG_LEVEL=debug
```

### `.env.example` (Frontend)

```bash
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=PhilHarvest
```