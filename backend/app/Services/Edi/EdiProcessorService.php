<?php

namespace App\Services\Edi;

use App\Models\EdiTransaction;
use Illuminate\Support\Facades\Log;

class EdiProcessorService
{
    /**
     * Process incoming EDI transaction
     */
    public function processIncoming(array $payload): EdiTransaction
    {
        // Extract key information from payload
        $transactionType = $payload['transaction_type'] ?? 'UNKNOWN';
        $controlNumber = $payload['control_number'] ?? uniqid('edi_');
        $partnerId = $payload['partner_id'] ?? 'unknown';

        // Create transaction record
        $transaction = EdiTransaction::create([
            'transaction_type' => $transactionType,
            'control_number' => $controlNumber,
            'partner_id' => $partnerId,
            'raw_payload' => json_encode($payload),
            'parsed_data' => $payload,
            'status' => 'PENDING'
        ]);

        Log::info("EDI transaction received", [
            'id' => $transaction->id,
            'type' => $transactionType,
            'control_number' => $controlNumber
        ]);

        // Optional: Dispatch job for async processing
        // \App\Jobs\ProcessEdiTransaction::dispatch($transaction);

        return $transaction;
    }
}