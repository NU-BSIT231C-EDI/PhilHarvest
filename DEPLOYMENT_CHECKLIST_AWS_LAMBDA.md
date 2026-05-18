# AWS Lambda + SQS Deployment Checklist for PhilHarvest

Complete these steps in order to migrate from Render worker to AWS Lambda + SQS.

---

## Phase 1: AWS Setup (30 min)

### [ ] 1.1 Create IAM User
- [ ] AWS Console → IAM → Users → Create User
  - Name: `philharvest-lambda-user`
  - Access type: Programmatic access
- [ ] Attach policies:
  - [ ] `AmazonSQSFullAccess`
  - [ ] `AWSLambdaFullAccess`
- [ ] Save **Access Key ID** and **Secret Access Key**
  - Paste them here (temporarily):
    ```
    Access Key: _______________________
    Secret Key: _______________________
    ```

### [ ] 1.2 Create SQS Queue
- [ ] AWS Console → SQS → Create Queue
  - Name: `philharvest-queue`
  - Type: Standard
  - Region: **ap-southeast-1** (Singapore)
- [ ] Set queue settings:
  - Visibility timeout: `300` seconds
  - Message retention: `1209600` seconds
  - Receive message wait time: `20` seconds
- [ ] Copy **Queue URL**:
  ```
  Queue URL: _______________________
  Account ID: _______________________
  ```
- [ ] Attach policy (replace YOUR_ACCOUNT_ID):
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:user/philharvest-lambda-user"
        },
        "Action": "sqs:*",
        "Resource": "arn:aws:sqs:ap-southeast-1:YOUR_ACCOUNT_ID:philharvest-queue"
      }
    ]
  }
  ```

### [ ] 1.3 Create Lambda Function
- [ ] AWS Console → Lambda → Create Function
  - Name: `philharvest-queue-worker`
  - Runtime: **Node.js 18.x**
  - Architecture: **arm64**
  - Execution role: Create new with basic permissions
- [ ] Set environment variables:
  ```
  DB_HOST=philharvest-mysql
  DB_PORT=3306
  DB_DATABASE=philharvest
  DB_USERNAME=root
  DB_PASSWORD=<your_db_password>
  APP_KEY=<your_laravel_app_key>
  LARAVEL_APP_URL=https://your-render-app.onrender.com
  LAMBDA_SECRET=<generate_random_secret>
  ```
  Generate random secret:
  ```bash
  openssl rand -base64 32
  ```
  Secret: `_______________________`

---

## Phase 2: Backend Code Changes (15 min)

### [ ] 2.1 Install AWS SDK
```bash
cd backend
composer require aws/aws-sdk-php
```
- [ ] Verify: `composer.lock` updated with `aws/aws-sdk-php`

### [ ] 2.2 Update Configuration
- [ ] ✅ DONE: `config/queue.php` updated with SQS driver
- [ ] ✅ DONE: `routes/api.php` added `/api/webhook/process-queue-job`
- [ ] ✅ DONE: `app/Http/Controllers/Webhook/QueueWebhookController.php` created

### [ ] 2.3 Update Environment Variables
In your `.env` (or Render dashboard):
```env
QUEUE_CONNECTION=sqs
AWS_ACCESS_KEY_ID=<your_access_key>
AWS_SECRET_ACCESS_KEY=<your_secret_key>
AWS_REGION=ap-southeast-1
SQS_PREFIX=https://sqs.ap-southeast-1.amazonaws.com/YOUR_ACCOUNT_ID
SQS_QUEUE=philharvest-queue
LAMBDA_SECRET=<same_secret_as_lambda>
LARAVEL_APP_URL=https://your-render-app.onrender.com
```

---

## Phase 3: Lambda Deployment (20 min)

### [ ] 3.1 Prepare Lambda Handler
```bash
cd backend

# Create Node dependencies
npm init -y
npm install axios

# Package Lambda function
zip -r lambda.zip lambda.js node_modules

# Verify zip file
ls -lh lambda.zip
```

### [ ] 3.2 Deploy Lambda Handler
- [ ] AWS Console → Lambda → `philharvest-queue-worker`
- [ ] Code source → **Upload from .zip file**
- [ ] Select `lambda.zip`
- [ ] Set Handler: `lambda.handler`
- [ ] Increase timeout: Configuration → 30 seconds (default is 3 sec)
- [ ] Verify handler uploaded successfully

### [ ] 3.3 Add SQS Trigger
- [ ] Lambda → Add trigger
  - Select: **SQS**
  - Queue: `philharvest-queue`
  - Batch size: `1` (increase to 10 later for efficiency)
  - Batch window: `0`
- [ ] Enable trigger

---

## Phase 4: Local Testing (20 min)

### [ ] 4.1 Test Locally
```bash
cd backend

# Update .env with AWS credentials
# QUEUE_CONNECTION=sqs
# AWS_ACCESS_KEY_ID=xxx
# AWS_SECRET_ACCESS_KEY=xxx
# etc.

# Start app
docker compose up -d
docker compose exec app php artisan config:cache

# Send a test EDI message
curl -X POST http://localhost:8000/api/edi/inbound/x12 \
  -H "Content-Type: application/x12" \
  -H "Authorization: Bearer master_api_key_secret_123456" \
  --data @edi_850_test.txt
```

### [ ] 4.2 Verify SQS Received Message
- [ ] AWS Console → SQS → `philharvest-queue`
- [ ] Message should appear in queue within 5 seconds
- [ ] Wait 20 seconds for Lambda auto-trigger

### [ ] 4.3 Check Lambda Logs
```bash
# View Lambda logs
aws logs tail /aws/lambda/philharvest-queue-worker --follow --region ap-southeast-1
```

Expected output:
```
✓ Message xxx processed successfully
```

### [ ] 4.4 Verify Database
```bash
# Check transaction status changed to VALIDATED
docker compose exec mysql mysql -uroot -proot philharvest -e \
  "SELECT id, status, control_number FROM edi_transactions ORDER BY created_at DESC LIMIT 1;"
```

---

## Phase 5: Production Deployment (15 min)

### [ ] 5.1 Update Render Configuration
- [ ] Copy `render.yaml.sqs` → `render.yaml`
  ```bash
  cp backend/render.yaml.sqs backend/render.yaml
  ```
- [ ] Review `render.yaml` changes:
  - [ ] Worker section removed
  - [ ] `QUEUE_CONNECTION=sqs`
  - [ ] AWS env vars added with `sync: false` (secret)
  - [ ] Lambda secret added

### [ ] 5.2 Commit Changes
```bash
git add -A
git commit -m "feat: migrate from Render worker to AWS Lambda + SQS

- Removed Redis queue worker dependency
- Updated config/queue.php to support SQS
- Added Lambda webhook endpoint
- Created lambda.js handler
- Updated render.yaml to use SQS
- Reduced monthly cost: $7/mo → ~$1/mo"
```

### [ ] 5.3 Deploy to Render
- [ ] Render Dashboard → Push to trigger deploy
- [ ] Wait for deployment to complete
- [ ] Verify health check passes

### [ ] 5.4 Set Render Environment Variables
- [ ] Render Dashboard → Settings → Environment Variables
- [ ] Add/update:
  ```
  QUEUE_CONNECTION=sqs
  AWS_REGION=ap-southeast-1
  AWS_ACCESS_KEY_ID=<your_access_key>
  AWS_SECRET_ACCESS_KEY=<your_secret_key>
  SQS_PREFIX=https://sqs.ap-southeast-1.amazonaws.com/YOUR_ACCOUNT_ID
  SQS_QUEUE=philharvest-queue
  LAMBDA_SECRET=<your_lambda_secret>
  LARAVEL_APP_URL=https://philharvest-xxx.onrender.com
  ```

### [ ] 5.5 Remove Redis Service (Optional)
- [ ] If not using Redis for cache/sessions:
  - [ ] Edit `render.yaml` → remove redis service section
  - [ ] Commit & push
  - [ ] Render will destroy Redis service (saves $0)

---

## Phase 6: Production Verification (10 min)

### [ ] 6.1 Test Production
```bash
# Send test EDI message to production
curl -X POST https://your-render-app.onrender.com/api/edi/inbound/x12 \
  -H "Content-Type: application/x12" \
  -H "Authorization: Bearer master_api_key_secret_123456" \
  --data @edi_850_prod_test.txt
```

### [ ] 6.2 Monitor Logs
- [ ] Lambda logs:
  ```bash
  aws logs tail /aws/lambda/philharvest-queue-worker --follow
  ```
- [ ] Render app logs:
  - [ ] Render Dashboard → Logs

### [ ] 6.3 Verify Transaction Status
- [ ] Query production DB (via Render terminal):
  ```bash
  # Connect to Render MySQL
  mysql -h philharvest-mysql -u root -p philharvest -e \
    "SELECT id, status, control_number FROM edi_transactions ORDER BY created_at DESC LIMIT 5;"
  ```

### [ ] 6.4 Run Full Test Scenario
- [ ] Send 850 (PO) from test account
  - [ ] Lambda processes
  - [ ] Transaction marked VALIDATED
  - [ ] CSV generated
- [ ] Send 855 (Acknowledgment)
  - [ ] Processed successfully
- [ ] Check Render worker is NOT running (cost saved ✓)

---

## Phase 7: Monitoring & Cleanup (5 min)

### [ ] 7.1 Set Up Alarms (Optional but Recommended)
```bash
# CloudWatch alarm for Lambda errors
aws cloudwatch put-metric-alarm \
  --alarm-name philharvest-lambda-errors \
  --alarm-description "Alert on Lambda errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --region ap-southeast-1
```

### [ ] 7.2 Verify Cost Savings
- [ ] Before:
  - Render worker: $7/mo
  - Redis: ~$0.50/mo
  - **Total: ~$7.50/mo**
- [ ] After:
  - Lambda: ~$0.20/mo (with free tier)
  - SQS: ~$0.50/mo (with free tier)
  - **Total: ~$0.70/mo**
  - **Savings: ~$6.80/mo (90% reduction)**

### [ ] 7.3 Cleanup (if all tests pass)
- [ ] Delete old `render.yaml.sqs` file (optional)
- [ ] Delete Lambda test events
- [ ] Remove temporary test credentials

---

## Rollback Plan (If Issues Arise)

If something breaks, revert to Render worker in 5 minutes:

```bash
# 1. Restore old render.yaml from git
git checkout HEAD~1 backend/render.yaml

# 2. Revert .env to use Redis
QUEUE_CONNECTION=redis
# Remove SQS vars

# 3. Commit & push
git add backend/render.yaml .env
git commit -m "revert: switch back to Render worker"
git push

# 4. Render auto-deploys with worker running again
```

---

## Troubleshooting

| Issue | Diagnosis | Fix |
|-------|-----------|-----|
| Lambda timeout | Check Lambda logs for "Task timed out" | Increase timeout: Lambda → Configuration → 30 sec |
| Message stuck in SQS | Check Lambda logs for errors | Verify DB credentials, app URL, LAMBDA_SECRET |
| "Redis connection refused" | Old code still using Redis | Clear `config:cache`, redeploy |
| 401 Unauthorized on webhook | Lambda secret mismatch | Verify `LAMBDA_SECRET` on Lambda env vars and Render |
| Transaction not created | Check app logs | Verify EDI message format, auth token |

---

## Summary

✅ **Completed:**
- config/queue.php updated
- Lambda webhook endpoint added
- Lambda handler created
- render.yaml updated (non-worker version)
- Documentation created

**Next steps:**
1. Create IAM user + SQS queue + Lambda on AWS
2. Deploy Lambda handler
3. Test locally with SQS
4. Deploy to Render
5. Verify in production
6. Monitor for 24 hours
7. Remove Redis service (optional)

**Estimated time: 2 hours total**
**Cost savings: ~$6.80/month**

---

Questions? Check:
- AWS_LAMBDA_SQS_SETUP.md (detailed setup)
- Lambda logs for errors
- Render logs for app errors
