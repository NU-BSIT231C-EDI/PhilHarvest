<?php

namespace App\Http\Controllers\Webhook;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use App\Jobs\ProcessEdiInboundJob;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class QueueWebhookController extends Controller
{
    /**
     * Process a queued job via Lambda webhook
     * 
     * Called by AWS Lambda when a message is received from SQS
     * Executes the queued job synchronously and returns result
     */
    public function processQueueJob(Request $request)
    {
        // Authenticate Lambda requests
        if (!$this->authenticateLambda($request)) {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'Invalid or missing Lambda authentication',
            ], 401);
        }

        try {
            $messageId = $request->header('X-Lambda-Message-Id', 'unknown');
            $jobData = $request->input('job');

            Log::info('Queue webhook received', [
                'messageId' => $messageId,
                'jobData' => $jobData,
            ]);

            if (!$jobData) {
                return response()->json([
                    'error' => 'Invalid request',
                    'message' => 'Missing job data',
                ], 400);
            }

            // Determine job type and execute
            $result = $this->executeJob($jobData, $messageId);

            return response()->json([
                'success' => true,
                'messageId' => $messageId,
                'result' => $result,
            ], 200);

        } catch (\Exception $e) {
            Log::error('Queue webhook error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => 'Job processing failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Execute the job based on its type
     */
    private function executeJob(array $jobData, string $messageId)
    {
        // The SQS message body contains the serialized Laravel job
        // Laravel automatically serializes jobs when they're queued
        
        // For ProcessEdiInboundJob, the structure is:
        // {
        //   "displayName": "App\\Jobs\\ProcessEdiInboundJob",
        //   "job": "Illuminate\\Queue\\CallQueuedHandler@call",
        //   "maxTries": null,
        //   "maxExceptions": null,
        //   "failOnTimeout": false,
        //   "backoff": null,
        //   "timeout": null,
        //   "retryUntil": null,
        //   "data": {
        //     "commandName": "App\\Jobs\\ProcessEdiInboundJob",
        //     "command": "... serialized job ..."
        //   }
        // }

        if (isset($jobData['displayName'])) {
            $jobClass = $jobData['displayName'];

            Log::info("Executing job: $jobClass", ['messageId' => $messageId]);

            // Unserialize and execute the job
            if ($jobClass === 'App\\Jobs\\ProcessEdiInboundJob') {
                return $this->executeProcessEdiInboundJob($jobData, $messageId);
            }

            throw new \Exception("Unsupported job class: $jobClass");
        }

        throw new \Exception("Invalid job data structure");
    }

    /**
     * Execute ProcessEdiInboundJob
     */
    private function executeProcessEdiInboundJob(array $jobData, string $messageId)
    {
        // Extract transaction ID and X12 payload from serialized data
        if (!isset($jobData['data']['commandName'])) {
            throw new \Exception("Invalid ProcessEdiInboundJob structure");
        }

        // Decode the serialized command
        $commandData = json_decode($jobData['data']['command'] ?? '{}', true);
        
        // The job properties are in the serialized command
        // For ProcessEdiInboundJob constructor args:
        // public function __construct(
        //     public int $transactionId,
        //     public string $x12Payload,
        // )

        // Extract from the command or from jobData properties
        $transactionId = $commandData['transactionId'] 
            ?? $jobData['data']['transactionId'] 
            ?? null;
        $x12Payload = $commandData['x12Payload'] 
            ?? $jobData['data']['x12Payload'] 
            ?? null;

        if (!$transactionId || !$x12Payload) {
            throw new \Exception("Missing transactionId or x12Payload in job data");
        }

        // Create and execute the job
        try {
            $job = new ProcessEdiInboundJob($transactionId, $x12Payload);
            $job->handle();

            Log::info('ProcessEdiInboundJob executed successfully', [
                'messageId' => $messageId,
                'transactionId' => $transactionId,
            ]);

            return [
                'job' => 'ProcessEdiInboundJob',
                'transactionId' => $transactionId,
                'status' => 'completed',
            ];

        } catch (\Exception $e) {
            Log::error('ProcessEdiInboundJob execution failed', [
                'messageId' => $messageId,
                'transactionId' => $transactionId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Authenticate Lambda requests
     * 
     * Simple token-based auth. For production, use AWS SigV4 verification.
     */
    private function authenticateLambda(Request $request): bool
    {
        $lambdaSecret = config('services.lambda.secret', env('LAMBDA_SECRET'));
        $providedSecret = $request->bearerToken();

        if (!$lambdaSecret || !$providedSecret) {
            Log::warning('Lambda auth failed: missing secret or token');
            return false;
        }

        if (!hash_equals($lambdaSecret, $providedSecret)) {
            Log::warning('Lambda auth failed: invalid token');
            return false;
        }

        return true;
    }
}
