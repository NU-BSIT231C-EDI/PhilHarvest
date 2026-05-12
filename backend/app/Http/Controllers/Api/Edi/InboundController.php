<?php

namespace App\Http\Controllers\Api\Edi;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use App\Jobs\ProcessEdiInboundJob;
use App\Models\EdiTransaction;
use App\Services\Edi\CsvInboundService;

class InboundController
{
    private CsvInboundService $csvInboundService;

    public function __construct(CsvInboundService $csvInboundService)
    {
        $this->csvInboundService = $csvInboundService;
    }

    /**
     * Receive 850 (Purchase Order) - supports both X12 and CSV formats
     */
    public function receive850(Request $request)
    {
        try {
            // Get raw payload
            $rawPayload = $request->getContent();

            if (empty($rawPayload)) {
                return response()->json([
                    'error' => 'Empty payload'
                ], Response::HTTP_BAD_REQUEST);
            }

            // Detect format (X12 starts with ISA*, CSV starts with headers or data)
            $format = $this->detectFormat($rawPayload);
            $partnerId = $request->attributes->get('edi_partner_id', 'UNKNOWN');

            if ($format === 'CSV') {
                return $this->receiveCSV($rawPayload, '850', $partnerId, $request);
            } else {
                return $this->receiveX12($rawPayload, '850', $partnerId, $request);
            }

        } catch (\Exception $e) {
            \Log::error('EDI 850 Ingestion Error: ' . $e->getMessage());

            return response()->json([
                'error' => 'Failed to process EDI',
                'message' => $e->getMessage(),
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Dedicated CSV upload endpoint
     * POST /api/edi/csv/upload
     */
    public function uploadCSV(Request $request)
    {
        try {
            // Validate request
            $validated = $request->validate([
                'file' => 'required|file|mimes:csv,txt',
                'transaction_type' => 'required|in:850,855,856,810',
            ]);

            $partnerId = $request->attributes->get('edi_partner_id', 'UNKNOWN');
            $transactionType = $validated['transaction_type'];

            // Read CSV file
            $csvPayload = $request->file('file')->get();

            // Process CSV inbound
            $transaction = $this->csvInboundService->processIncomingCSV(
                $csvPayload,
                $transactionType,
                $partnerId,
                [
                    'sender_id' => $request->input('sender_id'),
                    'receiver_id' => $request->input('receiver_id'),
                ]
            );

            // Dispatch async job to process
            ProcessEdiInboundJob::dispatch($transaction->id, $transaction->generated_x12_payload);

            return response()->json([
                'message' => 'CSV file accepted',
                'transaction_id' => $transaction->id,
                'control_number' => $transaction->control_number,
                'format' => 'CSV',
                'status' => 'PENDING',
            ], Response::HTTP_ACCEPTED);

        } catch (\Exception $e) {
            \Log::error('CSV Upload Error: ' . $e->getMessage());

            return response()->json([
                'error' => 'Failed to process CSV file',
                'message' => $e->getMessage(),
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Process X12 format inbound
     */
    private function receiveX12(string $rawPayload, string $transactionType, string $partnerId, Request $request)
    {
        // Extract control number (ISA13) for idempotency
        $controlNumber = $this->extractControlNumber($rawPayload);

        if (!$controlNumber) {
            return response()->json([
                'error' => 'Invalid EDI format - missing ISA segment'
            ], Response::HTTP_BAD_REQUEST);
        }

        // Check for duplicate
        $existing = EdiTransaction::where('control_number', $controlNumber)->first();
        if ($existing) {
            return response()->json([
                'message' => 'Duplicate interchange - already processed',
                'transaction_id' => $existing->id
            ], Response::HTTP_ACCEPTED);
        }

        // Store raw transaction
        $transaction = EdiTransaction::create([
            'transaction_type' => $transactionType,
            'control_number' => $controlNumber,
            'partner_id' => $partnerId,
            'inbound_format' => 'X12',
            'outbound_format' => 'CSV', // Default to CSV for outbound
            'raw_payload' => $rawPayload,
            'status' => 'PENDING',
        ]);

        // Dispatch async job to process
        ProcessEdiInboundJob::dispatch($transaction->id, $rawPayload);

        return response()->json([
            'message' => 'Accepted',
            'transaction_id' => $transaction->id,
            'control_number' => $controlNumber,
            'format' => 'X12',
        ], Response::HTTP_ACCEPTED);
    }

    /**
     * Process CSV format inbound
     */
    private function receiveCSV(string $rawPayload, string $transactionType, string $partnerId, Request $request)
    {
        try {
            $transaction = $this->csvInboundService->processIncomingCSV(
                $rawPayload,
                $transactionType,
                $partnerId,
                [
                    'sender_id' => $request->input('sender_id'),
                    'receiver_id' => $request->input('receiver_id'),
                ]
            );

            // Dispatch async job to process (uses generated X12)
            ProcessEdiInboundJob::dispatch($transaction->id, $transaction->generated_x12_payload);

            return response()->json([
                'message' => 'CSV accepted',
                'transaction_id' => $transaction->id,
                'control_number' => $transaction->control_number,
                'format' => 'CSV',
                'status' => 'PENDING',
            ], Response::HTTP_ACCEPTED);

        } catch (\Exception $e) {
            \Log::error('CSV Inbound Processing Error: ' . $e->getMessage());

            return response()->json([
                'error' => 'Failed to process CSV',
                'message' => $e->getMessage(),
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Detect payload format (X12 or CSV)
     */
    private function detectFormat(string $payload): string
    {
        $trimmed = trim($payload);
        
        // X12 always starts with ISA segment
        if (strpos($trimmed, 'ISA*') === 0) {
            return 'X12';
        }

        // Check for CSV markers (comma-separated or newlines with structure)
        if (preg_match('/^[^*]+,[^*]+/', $trimmed)) {
            return 'CSV';
        }

        // Default to X12 for backward compatibility
        return 'X12';
    }

    /**
     * Extract ISA13 (Interchange Control Number) from X12 payload
     */
    private function extractControlNumber(string $payload): ?string
    {
        $segments = explode("\n", $payload);
        
        foreach ($segments as $segment) {
            $segment = trim($segment);
            if (strpos($segment, 'ISA*') === 0) {
                $parts = explode('*', $segment);
                // ISA13 is the Interchange Control Number at index 13
                return isset($parts[13]) ? trim($parts[13]) : null;
            }
        }

        return null;
    }
}