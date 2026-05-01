<?php

namespace App\Http\Controllers\Api\Edi;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Services\Edi\EdiProcessorService;
use App\Models\EdiTransaction;

class WebhookController extends Controller
{
    protected EdiProcessorService $ediProcessor;

    public function __construct(EdiProcessorService $ediProcessor)
    {
        $this->ediProcessor = $ediProcessor;
    }

    /**
     * Handle incoming EDI transaction
     */
    public function handle(Request $request): JsonResponse
    {
        try {
            $payload = $request->all();
            
            // Process the EDI transaction
            $transaction = $this->ediProcessor->processIncoming($payload);

            return response()->json([
                'message' => 'EDI transaction received successfully',
                'transaction_id' => $transaction->id,
                'status' => $transaction->status
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error processing EDI transaction',
                'error' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Health check endpoint
     */
    public function health(): JsonResponse
    {
        return response()->json([
            'status' => 'healthy',
            'service' => 'EDI Webhook',
            'timestamp' => now()->toIso8601String()
        ]);
    }
}