"How are other groups going to receive our document?"

In production, trading partners don't "open" EDI documents like emails. They receive them through **automated, secure B2B transmission protocols** that their ERP, WMS, or order management systems can parse directly into their databases.

Here’s exactly how partners will receive your EDI documents, broken down by real-world methods, technical flow, and what you should implement for PhilHarvest.

---
### 📦 1. Common EDI Delivery Methods (How Partners Actually Receive Files)

| Method | How It Works | Best For | Pros | Cons |
|--------|--------------|----------|------|------|
| **HTTPS/REST API** | Your system `POST`s raw X12 or EDI-JSON to a partner endpoint. Partner returns `202 Accepted` + webhook callback. | Modern SaaS platforms, agile retailers, logistics apps | Real-time, easy to monitor, low latency | Requires partner to build/maintain an endpoint |
| **AS2 (Applicability Statement 2)** | HTTP/S-based protocol with digital certificates, encryption, and **MDN (Message Disposition Notification)** for legal receipt proof. | Large retailers, distributors, manufacturers (Walmart, Kroger, Sysco, etc.) | Industry standard, non-repudiation, automatic retries, highly secure | Requires cert management, stricter setup |
| **SFTP/FTPS Drop** | You push `.edi` files to a secure folder. Partner polls or receives a trigger to pick them up. | Legacy systems, mid-sized suppliers, 3PLs, freight brokers | Universally supported, simple, reliable | Polling delays, no built-in ACK, manual troubleshooting |
| **EDI VAN (Value Added Network)** | You send to a third-party network (e.g., SPS Commerce, TrueCommerce, Cleo). VAN routes, translates, and delivers to partner in their preferred format. | Scaling to 50+ diverse partners, small businesses with no EDI tech | Handles protocol translation, retries, compliance, partner onboarding | Monthly/per-transaction fees, vendor lock-in |
| **Web Portal / Email (Fallback)** | Partner logs into a dashboard to download/upload files, or receives encrypted email attachments. | Small farmers, local retailers, temporary onboarding | Zero tech barrier, fast onboarding | Not automated, breaks supply chain visibility, compliance risk |

---
### 🔄 2. The Actual Handshake Flow (How Delivery is Confirmed)

EDI isn't "fire and forget." Every transmission requires **two layers of acknowledgment**:

1. **Technical ACK** (Did the file arrive?)
   - AS2: `MDN` receipt
   - SFTP/REST: `200/202` HTTP status or SFTP success code
   - VAN: `TA1` (Technical Acknowledgment)

2. **Business ACK** (Did their system accept it?)
   - `997 Functional Acknowledgment` (standard for X12)
   - `855 Order Confirmation` (your system generates this)
   - VAN/Partner portal: status webhook or dashboard flag

**Your system must:**
- Store raw outbound payload + timestamp
- Log technical ACK status
- Wait for/poll business ACK (`997`/`855`)
- Retry on failure (exponential backoff)
- Alert ops if ACK isn't received within SLA (e.g., 15 mins)

---
### 🎯 3. Recommended Approach for PhilHarvest

Given your agribusiness context (mix of large retailers, 3PLs, small farmers, and government-linked buyers), use a **tiered routing strategy**:

| Partner Type | Recommended Delivery | Why |
|--------------|---------------------|-----|
| Large Retailers / Manufacturers | AS2 or VAN | They mandate AS2/EDI compliance; non-negotiable |
| Logistics / 3PLs / Freight Brokers | SFTP/FTPS or REST API | Legacy WMS/TMS systems; file-based routing |
| Small Farmers / Local Retailers | Web Portal + Auto-Conversion | Low tech barrier; you convert EDI ↔ Web UI behind the scenes |
| Government / Kadiwa-style Buyers | SFTP + Signed ZIP | Compliance, audit trails, offline fallback |

**Start with:** `REST API + SFTP` for flexibility, then add `AS2` or integrate a `VAN` once you hit 10+ external partners.

---
### ⚙️ 4. Technical Implementation Checklist (Outbound Routing)

| Step | Action | Tech/Tool |
|------|--------|-----------|
| 1 | Store partner routing config per ID | DB table: `partner_routing` (protocol, endpoint, credentials, retry_policy) |
| 2 | Build outbound dispatcher service | Laravel queue job: `SendEdiOutboundJob.php` |
| 3 | Implement protocol handlers | `AS2Client`, `SftpUploader`, `RestApiSender` (use `phpseclib`, `guzzle`, `php-as2`) |
| 4 | Add retry & idempotency logic | Redis-backed retry queue, `X-Idempotency-Key` header, exponential backoff |
| 5 | Implement ACK listener & parser | Webhook endpoint `/webhooks/edi-ack`, parse `997`/`MDN`, update `edi_status` |
| 6 | Add monitoring & alerting | Sentry + Prometheus, Slack/email alerts on failed ACKs, dashboard metrics |
| 7 | Log everything for audit | Store raw outbound + inbound ACK + metadata in immutable S3 bucket |

---
### 🔒 5. Security & Compliance Requirements
- **Encryption**: TLS 1.2+ for REST/AS2, SSH-2 for SFTP, PGP/SMIME for email fallback
- **Non-Repudiation**: AS2 MDNs or digitally signed `997` ACKs
- **Access Control**: IP whitelisting, API keys, OAuth2, mutual TLS (mTLS) for AS2
- **Data Retention**: Store raw EDI + ACKs for 7 years (tax/audit compliance)
- **DPA/GDPR**: Mask PII in logs, encrypt DB fields containing customer/farmer data

---
### 📌 Bottom Line
Partners receive your EDI documents through **agreed-upon automated protocols**, not manual downloads. You don't need to build every protocol from day one. Start with:
1. A **config-driven outbound router** (DB-driven protocol selection)
2. **SFTP + REST API** handlers (cover 80% of partners)
3. An **ACK listener + retry queue**
4. A **partner onboarding checklist** (endpoint, auth, test files, SLA)

When you scale, plug in a **VAN provider** or build an **AS2 module** for enterprise compliance.