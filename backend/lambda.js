/**
 * AWS Lambda Handler for PhilHarvest EDI Queue Processing
 * 
 * This Lambda function:
 * 1. Receives messages from SQS
 * 2. Calls the Laravel app webhook to process jobs
 * 3. Returns success or error
 * 
 * Requirements:
 * - Node.js: 22.x (latest supported on Lambda)
 * 
 * Deployment:
 * - npm install axios
 * - zip -r lambda.zip lambda.js node_modules
 * - Upload to Lambda, set handler to "lambda.handler"
 * - Runtime: Node.js 22.x
 * - Timeout: 30 seconds
 */

const axios = require('axios');

// Configuration from environment
const LARAVEL_APP_URL = process.env.LARAVEL_APP_URL || 'https://your-app.onrender.com';
const LAMBDA_SECRET = process.env.LAMBDA_SECRET || 'your-secret-key'; // Use a secret to verify requests
const MAX_RETRIES = 3;
const TIMEOUT = 25000; // 25 seconds (Lambda default is 30s)

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
    console.log('Received SQS event:', JSON.stringify(event, null, 2));

    const results = {
        batchItemFailures: [],
        processed: 0,
        failed: 0,
    };

    // Process each SQS message
    for (const record of event.Records) {
        try {
            const messageId = record.messageId;
            const body = JSON.parse(record.body);

            console.log(`Processing message ${messageId}:`, JSON.stringify(body, null, 2));

            // Call Laravel webhook to process the job
            await processJobViaWebhook(body, messageId);

            results.processed++;
            console.log(`✓ Message ${messageId} processed successfully`);

        } catch (error) {
            results.failed++;
            results.batchItemFailures.push({
                itemId: record.messageId,
                error: error.message,
            });

            console.error(`✗ Message ${record.messageId} failed:`, error.message);
        }
    }

    console.log('Batch results:', results);
    return results;
};

/**
 * Call Laravel webhook to process the job
 */
async function processJobViaWebhook(jobData, messageId) {
    const url = `${LARAVEL_APP_URL}/api/webhook/process-queue-job`;

    const payload = {
        messageId,
        job: jobData.Body || jobData,
        timestamp: new Date().toISOString(),
    };

    console.log(`Calling webhook: POST ${url}`);

    let lastError;

    // Retry logic for transient failures
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await axios.post(url, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${LAMBDA_SECRET}`,
                    'X-Lambda-Message-Id': messageId,
                    'X-Lambda-Timestamp': new Date().toISOString(),
                },
                timeout: TIMEOUT,
            });

            console.log(`Webhook response (attempt ${attempt}):`, response.status, response.data);

            if (response.status >= 200 && response.status < 300) {
                return response.data; // Success
            }

            throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);

        } catch (error) {
            lastError = error;

            if (attempt < MAX_RETRIES) {
                const delay = 1000 * Math.pow(2, attempt - 1); // Exponential backoff
                console.warn(`Attempt ${attempt}/${MAX_RETRIES} failed. Retrying in ${delay}ms...`);
                console.warn(`Error: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // All retries exhausted
    throw new Error(`Failed after ${MAX_RETRIES} attempts: ${lastError.message}`);
}

/**
 * Test handler locally
 */
if (require.main === module) {
    // Local test
    const testEvent = {
        Records: [
            {
                messageId: 'test-123',
                body: JSON.stringify({
                    messageId: '1',
                    Body: JSON.stringify({
                        transactionId: 1,
                        x12Payload: 'ISA*00*          *00*          *ZZ*PHILHARVEST     *ZZ*TEST           *200101*0000*U*00501*000000001*0*P*:',
                    }),
                }),
            },
        ],
    };

    exports.handler(testEvent).then(result => {
        console.log('Test result:', JSON.stringify(result, null, 2));
    }).catch(err => {
        console.error('Test error:', err);
    });
}
