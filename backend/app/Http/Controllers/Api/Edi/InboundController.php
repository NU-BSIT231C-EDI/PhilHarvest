<?php

namespace App\Http\Controllers\Api\Edi;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use App\Jobs\ProcessEdiInboundJob;
use App\Models\EdiTransaction;

class InboundController
{
    public function receive850(Request $request)
    {
        try {
            // Get raw EDI payload
            $rawPayload = $request->getContent();

            if (empty($rawPayload)) {
                return response()->json([
                    'error' => 'Empty payload'
                ], Response::HTTP_BAD_REQUEST);
            }

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

            // Get authenticated partner ID from middleware
            $partnerId = $request->attributes->get('edi_partner_id', 'UNKNOWN');

            // Store raw transaction
            $transaction = EdiTransaction::create([
                'transaction_type' => '850',
                'control_number' => $controlNumber,
                'partner_id' => $partnerId,
                'raw_payload' => $rawPayload,
                'status' => 'PENDING',
            ]);

            // Dispatch async job to process
            ProcessEdiInboundJob::dispatch($transaction->id, $rawPayload);

            return response()->json([
                'message' => 'Accepted',
                'transaction_id' => $transaction->id,
                'control_number' => $controlNumber,
            ], Response::HTTP_ACCEPTED);

        } catch (\Exception $e) {
            \Log::error('EDI 850 Ingestion Error: ' . $e->getMessage());

            return response()->json([
                'error' => 'Failed to process EDI',
                'message' => $e->getMessage(),
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Extract ISA13 (Interchange Control Number) from EDI payload
     */
    private function extractControlNumber(string $payload): ?string
    {
        // ISA segment format: ISA*00*...*control_number at position 13
        $segments = explode("\n", $payload);
        
        foreach ($segments as $segment) {
            $segment = trim($segment);
            if (strpos($segment, 'ISA*') === 0) {
                $parts = explode('*', $segment);
                // ISA13 is the Interchange Control Number at index 13
                // Format: ISA*00*          *00*          *ZZ*SENDER    *ZZ*RECEIVER   *YYMMDD*HHMM*U*005010*XXXXXXXXX*...
                return isset($parts[13]) ? trim($parts[13]) : null;
            }
        }

        return null;
    }
}