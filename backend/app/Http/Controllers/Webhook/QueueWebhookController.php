<?php

namespace App\Http\Controllers\Webhook;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use App\Http\Controllers\Controller;
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
        $messageId = $request->header('X-Lambda-Message-Id', 'unknown');
        $rawBody = $request->getContent();
        
        Log::info('=== Webhook Start ===', [
            'messageId' => $messageId,
            'headers' => $request->headers->all(),
            'contentType' => $request->header('Content-Type'),
            'bodyLength' => strlen($rawBody),
            'bodyPreview' => substr($rawBody, 0, 200),
        ]);

        try {
            // Authenticate Lambda requests
            if (!$this->authenticateLambda($request)) {
                Log::warning('Webhook auth failed', ['messageId' => $messageId]);
                return response()->json([
                    'error' => 'Unauthorized',
                    'message' => 'Invalid or missing Lambda authentication',
                ], 401);
            }

            Log::info('Webhook authenticated', ['messageId' => $messageId]);

            // Parse JSON body directly instead of using $request->input()
            $parsedBody = json_decode($rawBody, true);
            
            if (!$parsedBody) {
                Log::error('Failed to parse request body as JSON', [
                    'messageId' => $messageId,
                    'body' => $rawBody,
                    'jsonError' => json_last_error_msg(),
                ]);
                return response()->json([
                    'error' => 'Invalid JSON',
                    'message' => 'Request body is not valid JSON',
                ], 400);
            }

            Log::info('Parsed JSON body', [
                'messageId' => $messageId,
                'parsedBody' => $parsedBody,
            ]);

            // Extract job data - could be at root or nested under 'job' key
            $jobData = $parsedBody['job'] ?? $parsedBody;

            if (!$jobData || !is_array($jobData)) {
                Log::warning('Missing or invalid job data', [
                    'messageId' => $messageId,
                    'jobData' => $jobData,
                ]);
                return response()->json([
                    'error' => 'Invalid request',
                    'message' => 'Missing or invalid job data',
                ], 400);
            }

            // Determine job type and execute
            $result = $this->executeJob($jobData, $messageId);

            Log::info('Webhook success', [
                'messageId' => $messageId,
                'result' => $result,
            ]);

            return response()->json([
                'success' => true,
                'messageId' => $messageId,
                'result' => $result,
            ], 200);

        } catch (\Exception $e) {
            Log::error('=== Webhook Error ===', [
                'messageId' => $messageId,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => 'Job processing failed',
                'message' => $e->getMessage(),
                'debug' => app()->environment('local') ? $e->getTraceAsString() : null,
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

        // Laravel queues serialize the job with PHP serialize(), not JSON.
        // Example: O:29:"App\Jobs\ProcessEdiInboundJob":2:{s:13:"transactionId";i:45;...}
        $serializedCommand = $jobData['data']['command'] ?? null;
        if (!$serializedCommand || !is_string($serializedCommand)) {
            throw new \Exception('Missing serialized command in job data');
        }

        $command = @unserialize(
            $serializedCommand,
            ['allowed_classes' => [ProcessEdiInboundJob::class]]
        );

        if (!$command instanceof ProcessEdiInboundJob) {
            throw new \Exception('Failed to unserialize ProcessEdiInboundJob from queue payload');
        }

        $transactionId = $command->transactionId;
        $x12Payload = $command->x12Payload;

        if (!$transactionId || $x12Payload === null || $x12Payload === '') {
            throw new \Exception('Missing transactionId or x12Payload in job data');
        }

        // Execute the unserialized job
        try {
            $command->handle();

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
        $lambdaSecret = config('services.lambda.secret');
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
