# AWS Lambda + SQS Setup Guide for PhilHarvest EDI Queue

## Overview
Migrate from Redis queue worker to AWS SQS (Simple Queue Service) + Lambda for cost-free/cheap async job processing.

**Cost**: ~$0–$1/month with free tier (100k Lambda invocations, 1M SQS messages)

---

## Step 1: Create IAM User (AWS Console)

1. Go to **IAM → Users → Create User**
   - Name: `philharvest-lambda-user`
   - Access type: Programmatic access
   - **Use case:** "Application running outside AWS" (Render is external infrastructure)
   
2. Attach policies:
   - `AmazonSQSFullAccess` (for queue access)
   - `AWSLambdaFullAccess` (for Lambda invocation)
   
3. Save **Access Key ID** and **Secret Access Key** (you'll need these)

---

## Step 2: Create SQS Queue (AWS Console)

1. Go to **SQS → Create Queue**
   - Name: `philharvest-queue`
   - Type: Standard
   - Region: **ap-southeast-1** (Singapore) ← matches your Render region
   
2. Queue settings:
   - Visibility timeout: `300` seconds (5 min, gives Lambda time to process)
   - Message retention: `1209600` seconds (14 days)
   - Receive message wait time: `20` seconds (long polling for efficiency)
   
3. Copy the **Queue URL** (looks like `https://sqs.ap-southeast-1.amazonaws.com/123456789/philharvest-queue`)
   - Extract account ID from URL: `123456789`

4. Go to **Queue → Details → Access Policy → Edit**
   - Paste this policy (replace YOUR_ACCOUNT_ID):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "AWS": "arn:aws:iam::377114445186:user/philharvest-lambda-user"
         },
         "Action": "sqs:*",
         "Resource": "arn:aws:sqs:ap-southeast-1:377114445186:philharvest-queue"
       }
     ]
   }
   ```

---

## Step 3: Update Laravel Environment (`.env`)

Add/update these variables in `.env`:

```env
QUEUE_CONNECTION=sqs
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=ap-southeast-1
SQS_PREFIX=https://sqs.ap-southeast-1.amazonaws.com/YOUR_ACCOUNT_ID
SQS_QUEUE=philharvest-queue
```

Verify in `config/queue.php` — it now reads these values.

---

## Step 4: Install AWS Packages (Backend)

Run in `backend/` directory:

```bash
composer require aws/aws-sdk-php
```

This allows Laravel to authenticate with AWS and send messages to SQS.

---

## Step 5: Create Lambda Function (AWS Console)

### 5a. Create function
1. Go to **Lambda → Create Function**
   - Name: `philharvest-queue-worker`
   - Runtime: **Node.js 22.x** (latest supported, lightweight, fast)
   - Architecture: **arm64** (cheaper)
   - Execution role: Create new role with basic Lambda permissions

2. Open the Lambda execution role in **IAM → Roles** and attach SQS permissions.
    The trigger creation error means the role cannot call `ReceiveMessage` yet.
    Add this policy to the role if it is not already present:

    ```json
    {
       "Version": "2012-10-17",
       "Statement": [
          {
             "Effect": "Allow",
             "Action": [
                "sqs:ReceiveMessage",
                "sqs:DeleteMessage",
                "sqs:GetQueueAttributes",
                "sqs:GetQueueUrl",
                "sqs:ChangeMessageVisibility"
             ],
             "Resource": "arn:aws:sqs:ap-southeast-1:YOUR_ACCOUNT_ID:philharvest-queue"
          }
       ]
    }
    ```

    If you want to move quickly for testing, you can temporarily attach the AWS-managed
    `AmazonSQSFullAccess` policy, then replace it later with the least-privilege policy above.

### 5b. Set environment variables in Lambda
In the Lambda console, **Configuration → Environment variables**, add:

```
DB_HOST=philharvest-mysql (your Render MySQL service)
DB_PORT=3306
DB_DATABASE=philharvest
DB_USERNAME=root
DB_PASSWORD=your_db_password
APP_KEY=your_laravel_app_key
EDI_AUTH_TOKEN=your_edi_token
LARAVEL_APP_URL=https://your-render-app.onrender.com (your Render web URL)
```

### 5c. Add SQS trigger
1. **Add trigger** → SQS
   - Queue: `philharvest-queue`
   - Batch size: `1` (process one message at a time for clarity; increase later)
   - Batch window: `0`

2. If trigger creation still fails, verify these two things:
   - The Lambda execution role has the SQS permissions above.
   - The queue ARN in the policy matches your actual AWS account ID and queue name.

---

## Step 6: Create Lambda Handler (Node.js)

Create a Lambda function that:
1. Receives SQS message
2. Calls your Laravel app API to process the job
3. Marks message as processed or returns error

You'll deploy this in **Step 7**.

---

## Step 7: Deploy Lambda Function

1. Create a `.zip` file with the Lambda handler:
   ```bash
   cd backend
   npm init -y
   npm install axios
   # Create lambda.js (see code below)
   zip -r lambda.zip lambda.js node_modules
   ```

2. Upload to Lambda:
   - In Lambda console, **Code source** → Upload from `.zip` file
   - Handler: `lambda.handler`

3. Test trigger:
   - Go to **SQS → Send and receive messages**
   - Send a test message:
     ```json
     {
       "messageId": "test-123",
       "body": "{\"transactionId\": 1, \"x12Payload\": \"ISA...\"}"
     }
     ```
   - Trigger Lambda manually or wait 20 seconds for auto-pull
   - Check Lambda logs for success/errors

---

## Step 8: Update Render Configuration

Remove the worker service from `render.yaml`:

```yaml
# DELETE THIS ENTIRE SECTION:
  - type: worker
    name: philharvest-worker
    runtime: docker
    dockerfilePath: ./Dockerfile
    region: singapore
    plan: free
    envVars: ...
    startCommand: php artisan queue:work --sleep=3 --tries=3
```

Redeploy Render. Now jobs are processed by Lambda instead.

---

## Step 9: Test End-to-End

### Local test (before production):
1. Update `.env` with SQS credentials
2. Start the app locally:
   ```bash
   docker compose up -d
   docker compose exec app php artisan config:cache
   ```
3. Send an EDI 850:
   ```bash
   curl -X POST http://localhost:8000/api/edi/inbound/x12 \
     -H "Content-Type: application/x12" \
     -H "Authorization: Bearer master_api_key_secret_123456" \
     --data @edi_850.txt
   ```
4. Check SQS in AWS Console:
   - Message should appear in queue
   - Lambda should process it within 20 seconds
   - Check Lambda logs for success/error
   - Transaction status in DB should change to `VALIDATED`

### Production test:
1. Deploy updated Render config (worker removed)
2. Send EDI 850 to production API
3. Watch Lambda logs: `AWS Console → Lambda → philharvest-queue-worker → Logs`
4. Verify transaction status in Render MySQL

---

## Step 10: Monitor and Debug

### Check SQS queue:
```bash
# View messages in queue
aws sqs receive-message \
  --queue-url https://sqs.ap-southeast-1.amazonaws.com/123456/philharvest-queue \
  --region ap-southeast-1
```

### Check Lambda logs:
```bash
aws logs tail /aws/lambda/philharvest-queue-worker --follow --region ap-southeast-1
```

### Handle errors:
- **"Message Processing Failed"**: Check DB credentials in Lambda env vars
- **"Invalid signature"**: Verify `APP_KEY` matches production
- **"Redis connection refused"**: You don't need Redis anymore (removed from SQS setup)
- **"Lambda timeout"**: Increase timeout in Lambda config (default 3 sec → 30 sec)

---

## Cost Breakdown (with free tier)

| Service | Free Tier | Est. Monthly Cost |
|---------|-----------|-------------------|
| SQS | 1M messages/month | $0 |
| Lambda | 1M invocations/month | $0 |
| Lambda (if >1M) | $0.20 per 1M | ~$0.10–$0.50 |
| **Total** | | **~$0–$1/mo** |

Your $100 AWS credit covers **12+ months**.

---

## Rollback Plan

If Lambda fails, revert to Render worker:
1. Revert `.env` to `QUEUE_CONNECTION=redis`
2. Re-add worker section to `render.yaml`
3. Redeploy Render

---

## Next Steps

1. ✅ Update `config/queue.php` (DONE)
2. → Install AWS SDK (`composer require aws/aws-sdk-php`)
3. → Create Lambda function in AWS
4. → Deploy Lambda handler code (Node.js)
5. → Test locally with SQS
6. → Remove worker from `render.yaml`
7. → Deploy to production
8. → Monitor logs

---

## Questions?

- **SQS vs Redis**: SQS is managed/serverless; you pay for messages, not compute.
- **Why Lambda?**: Auto-scales, no worker needed, free/cheap with low volume.
- **Can I use Python for Lambda?** Yes, use `python3.11` runtime instead of Node.
