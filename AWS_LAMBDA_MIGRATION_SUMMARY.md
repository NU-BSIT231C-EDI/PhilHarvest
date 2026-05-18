# AWS Lambda + SQS Migration Summary

## What Was Done (Backend Code Changes)

### Files Created:
1. **`backend/lambda.js`** — Node.js handler for AWS Lambda
   - Receives SQS messages
   - Calls your Laravel webhook to process jobs
   - Includes retry logic and error handling

2. **`backend/app/Http/Controllers/Webhook/QueueWebhookController.php`** — Laravel webhook
   - Authenticates Lambda requests via `LAMBDA_SECRET`
   - Deserializes and executes queued jobs
   - Handles `ProcessEdiInboundJob` execution

3. **`backend/routes/api.php`** — Added webhook route
   - `POST /api/webhook/process-queue-job` — Lambda calls this

4. **`backend/render.yaml.sqs`** — Updated Render config without worker
   - Removed worker service (saves $7/mo)
   - Updated env vars for SQS
   - Optional Redis (can be removed too)

5. **`AWS_LAMBDA_SQS_SETUP.md`** — Detailed setup guide
   - AWS account setup (IAM, SQS, Lambda)
   - Environment variables
   - Testing procedures

6. **`DEPLOYMENT_CHECKLIST_AWS_LAMBDA.md`** — Step-by-step checklist
   - 7 phases with checkboxes
   - Estimated timings
   - Troubleshooting

### Files Updated:
1. **`backend/config/queue.php`** — Added SQS driver config
   ```php
   'sqs' => [
       'driver' => 'sqs',
       'key' => env('AWS_ACCESS_KEY_ID'),
       'secret' => env('AWS_SECRET_ACCESS_KEY'),
       'prefix' => env('SQS_PREFIX'),
       'queue' => env('SQS_QUEUE', 'philharvest-queue'),
       'region' => env('AWS_REGION', 'ap-southeast-1'),
   ]
   ```

2. **`backend/.env.example`** — Added AWS/SQS variables
   ```env
   QUEUE_CONNECTION=sqs
   AWS_REGION=ap-southeast-1
   SQS_PREFIX=https://sqs.ap-southeast-1.amazonaws.com/your-account-id
   SQS_QUEUE=philharvest-queue
   LAMBDA_SECRET=your-secret-key
   ```

---

## Architecture Overview

**Before (Current):**
```
Frontend → Render App → Redis Queue → Render Worker → DB
                        (cost: $7/mo + Redis)
```

**After (AWS Lambda + SQS):**
```
Frontend → Render App → SQS Queue → AWS Lambda → DB
                        (cost: ~$0.70/mo)
```

**Cost Savings:** ~$6.80/month (90% reduction)

---

## How It Works

1. **User sends EDI 850** → `POST /api/edi/inbound/x12`
2. **App dispatches job** → `ProcessEdiInboundJob::dispatch($txnId, $x12)`
3. **Job serialized & sent to SQS** (instead of Redis)
4. **Lambda auto-triggered** by SQS (within 20 seconds)
5. **Lambda calls webhook** → `POST /api/webhook/process-queue-job`
6. **Webhook deserializes & executes job** → Processes EDI, saves to DB
7. **Transaction marked VALIDATED** → CSV generated

---

## Environment Variables Needed

**For Laravel app (Render):**
```env
QUEUE_CONNECTION=sqs
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-southeast-1
SQS_PREFIX=https://sqs.ap-southeast-1.amazonaws.com/YOUR_ACCOUNT_ID
SQS_QUEUE=philharvest-queue
LAMBDA_SECRET=your-random-secret
LARAVEL_APP_URL=https://philharvest-xxx.onrender.com
```

**For Lambda (AWS Console):**
```env
DB_HOST=philharvest-mysql
DB_PORT=3306
DB_DATABASE=philharvest
DB_USERNAME=root
DB_PASSWORD=your_db_password
APP_KEY=your_laravel_app_key
LARAVEL_APP_URL=https://philharvest-xxx.onrender.com
LAMBDA_SECRET=your-random-secret
```

---

## Next Steps (You Need to Do These)

### Phase 1: AWS Setup (30 minutes)
1. Create IAM user with SQS + Lambda permissions
2. Create SQS queue (`philharvest-queue`)
3. Create Lambda function (`philharvest-queue-worker`)
4. Configure Lambda environment variables

### Phase 2: Deploy Lambda Handler (20 minutes)
1. Install Node.js dependencies: `npm install axios`
2. Package Lambda: `zip -r lambda.zip lambda.js node_modules`
3. Upload zip to Lambda console
4. **Set runtime to Node.js 22.x** (latest supported)
5. Add SQS trigger to Lambda
6. Increase Lambda timeout to 30 seconds

### Phase 3: Test Locally (20 minutes)
1. Update `.env` with AWS credentials
2. Send test EDI 850 to local app
3. Verify message appears in SQS queue
4. Check Lambda logs for successful processing
5. Verify transaction status in DB

### Phase 4: Deploy to Production (15 minutes)
1. Replace `render.yaml` with `render.yaml.sqs`
2. Add AWS env vars to Render dashboard
3. Commit & push to trigger deploy
4. Wait for Render to redeploy (no worker needed)

### Phase 5: Verify Production (10 minutes)
1. Send test EDI to production
2. Monitor Lambda logs
3. Verify transaction processed
4. Test another EDI type (855, 856, etc.)

**Total time: ~1.5 hours**

---

## Testing Commands

### Local test:
```bash
# Send test EDI
curl -X POST http://localhost:8000/api/edi/inbound/x12 \
  -H "Content-Type: application/x12" \
  -H "Authorization: Bearer master_api_key_secret_123456" \
  --data @edi_850_test.txt

# Check Lambda logs
aws logs tail /aws/lambda/philharvest-queue-worker --follow

# Query DB
mysql -h localhost -u root -proot philharvest -e \
  "SELECT id, status, control_number FROM edi_transactions ORDER BY created_at DESC LIMIT 5;"
```

---

## Key Decisions Made

| Decision | Why |
|----------|-----|
| AWS SQS (not Redis) | Managed service, no worker needed, cheaper |
| Node.js Lambda (not PHP) | Faster cold starts, cheaper memory, easier to maintain |
| HTTP webhook (not direct DB) | Reuses existing Laravel code, easier to debug |
| Retry logic | Handles transient failures (network, DB locks) |
| Bearer token auth | Simple, works with existing middleware patterns |

---

## Files Ready for Review

- ✅ `backend/lambda.js` — Lambda handler
- ✅ `backend/app/Http/Controllers/Webhook/QueueWebhookController.php` — Webhook controller
- ✅ `backend/config/queue.php` — SQS driver config
- ✅ `backend/routes/api.php` — Webhook route
- ✅ `backend/render.yaml.sqs` — Updated Render config (worker removed)
- ✅ `AWS_LAMBDA_SQS_SETUP.md` — Detailed setup guide
- ✅ `DEPLOYMENT_CHECKLIST_AWS_LAMBDA.md` — Step-by-step checklist

---

## Questions?

1. **"What if Lambda fails?"** → Messages stay in SQS queue, auto-retry
2. **"What if webhook is down?"** → Lambda retries up to 3x, then message goes to DLQ
3. **"How do I scale this?"** → Just increase batch size in Lambda trigger (1 → 10)
4. **"What about the $100 AWS credit?"** → Lasts 12+ months at current volume

---

## Cost Comparison

| | Render | AWS Lambda |
|---|--------|-----------|
| Worker | $7/mo | $0 (free tier) |
| Redis | $0.50/mo | $0 (not needed) |
| SQS | — | $0.50/mo (free tier) |
| Lambda | — | $0.20/mo (free tier) |
| **Total** | **$7.50/mo** | **$0.70/mo** |
| **Savings** | — | **90% cheaper** |

---

## Deployment Timeline

- **AWS setup:** 30 min
- **Code review:** 10 min
- **Local testing:** 20 min
- **Production deploy:** 15 min
- **Verification:** 10 min
- **Total:** ~1.5 hours

**Go live:** Same day if you do it all in sequence.

---

**Ready to proceed? Start with AWS_LAMBDA_SQS_SETUP.md and DEPLOYMENT_CHECKLIST_AWS_LAMBDA.md**
