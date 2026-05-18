# AWS IAM Access Key Setup Quick Reference

## Which IAM Use Case to Select?

When creating an IAM access key, AWS asks "What will you use this access key for?"

### For PhilHarvest → AWS SQS Integration

**✅ SELECT:** "Application running outside AWS"

**Why?**
- Your Laravel app runs on **Render** (external platform, not AWS)
- It needs to access AWS SQS queue
- This is the correct classification for external applications

### Other Options (Not Applicable)

| Option | Use Case | For PhilHarvest? |
|--------|----------|------------------|
| **CLI** | AWS CLI on your local machine | ❌ No (we're not using CLI) |
| **Local code** | Local dev environment | ❌ No (we're on production) |
| **AWS compute service** | EC2, ECS, Lambda | ❌ No (Render is external) |
| **Third-party service** | External monitoring tools | ❌ No |
| **Other** | Custom use case | ❌ No |

---

## IAM User Setup Steps

### Step 1: Create User
1. AWS Console → **IAM → Users → Create User**
2. Name: `philharvest-lambda-user`
3. Select **"Programmatic access"**

### Step 2: Select Use Case
1. In the "Select AWS credential type" page:
   - ✅ Select: **"Application running outside AWS"**
2. Click **"Next: Add permissions"**

### Step 3: Attach Policies
Select these managed policies:
- ✅ `AmazonSQSFullAccess` — allows full SQS access
- ✅ `AWSLambdaFullAccess` — allows Lambda access (optional but useful)

### Step 4: Review & Create
1. Skip tags (optional)
2. Review the settings
3. Click **"Create user"**

### Step 5: Save Credentials
AWS will display:
- **Access Key ID** (starts with `AKIA...`)
- **Secret Access Key** (save in secure location)

⚠️ **Important:** You can only see the secret key once! Download the CSV file or copy both immediately.

---

## Where to Use These Credentials

### In Laravel App (Render)
Add to `.env` or Render dashboard:
```env
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

### In Lambda (AWS Console)
These credentials are **NOT** used in Lambda itself.
- Lambda uses its own **execution role** (IAM role attached to the function)
- Render app uses the access key to authenticate with SQS

---

## Access Key vs. Execution Role

| | Access Key | Execution Role |
|---|---|---|
| **For** | Render app calling AWS | Lambda function permissions |
| **Created in** | IAM → Users | Lambda → Configuration |
| **Type** | IAM User credentials | IAM Role with policies |
| **Used by** | External app (your Laravel) | AWS service (Lambda) |
| **Visible to** | Only when created | Part of Lambda config |

---

## Verification Checklist

- [ ] IAM user created: `philharvest-lambda-user`
- [ ] Use case selected: "Application running outside AWS"
- [ ] Policies attached: `AmazonSQSFullAccess`
- [ ] Access Key ID saved (starts with `AKIA`)
- [ ] Secret Access Key saved securely
- [ ] Added to `.env` or Render dashboard
- [ ] Can see SQS queue in AWS Console with these creds

---

## Troubleshooting

### Error: "User: arn:aws:iam::... is not authorized to perform: sqs:SendMessage"
**Cause:** Policy not attached to IAM user
**Fix:** Go to IAM → Users → `philharvest-lambda-user` → Attach `AmazonSQSFullAccess`

### Error: "The Access Key does not exist"
**Cause:** Typo in Access Key ID or Secret
**Fix:** Copy directly from AWS CSV download, don't type manually

### Error: "UnrecognizedClientException" on local test
**Cause:** Wrong AWS region in `.env`
**Fix:** Set `AWS_REGION=ap-southeast-1` (Singapore, same as SQS queue)

---

## Next Steps

1. ✅ Create IAM user with "Application running outside AWS" use case
2. ✅ Attach `AmazonSQSFullAccess` policy
3. ✅ Save Access Key ID + Secret
4. → Add to `.env` or Render dashboard
5. → Continue with SQS queue setup (Step 2 in main guide)
