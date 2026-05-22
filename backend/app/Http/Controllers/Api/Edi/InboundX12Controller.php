<?php

namespace App\Http\Controllers\Api\Edi;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Database\QueryException;
use App\Services\Edi\Parsers\Edi850Parser;
use App\Services\Edi\Parsers\Edi990Parser;
use App\Jobs\ProcessEdiInboundJob;
use App\Models\EdiTransaction;
use Illuminate\Support\Facades\Log;

/**
 * EDI Inbound Controller - Refactored for Native X12
 * 
 * Handles receiving and parsing raw X12 EDI strings
 * Supports:
 * - EDI 850: Purchase Order (from Manufacturer)
 * - EDI 990: Response to Load Tender (from Logistics Partner)
 */
class InboundX12Controller
{
    private Edi850Parser $edi850Parser;
    private Edi990Parser $edi990Parser;

    public function __construct(
        Edi850Parser $edi850Parser,
        Edi990Parser $edi990Parser
    ) {
        $this->edi850Parser = $edi850Parser;
        $this->edi990Parser = $edi990Parser;
    }

    /**
     * Generic inbound endpoint — detects transaction type from the ST segment
     * and dispatches to the appropriate handler.
     * POST /api/edi/inbound/x12
     */
    public function receiveInbound(Request $request)
    {
        $rawEdi = $request->getContent();

        if (empty($rawEdi)) {
            return response()->json([
                'error' => 'Empty payload',
                'message' => 'Request body must contain raw X12 EDI string',
            ], Response::HTTP_BAD_REQUEST);
        }

        $type = $this->detectTransactionType($rawEdi);

        return match ($type) {
            '990'   => $this->receive990($request),
            default => $this->receive850($request),
        };
    }

    /**
     * Extract the ST transaction set identifier code (e.g. '850', '990') from
     * the first ST segment, defaulting to '850' when absent.
     */
    private function detectTransactionType(string $rawEdi): string
    {
        foreach (explode('~', $rawEdi) as $segment) {
            $fields = explode('*', trim($segment));
            if (($fields[0] ?? '') === 'ST' && isset($fields[1])) {
                return trim($fields[1]);
            }
        }
        return '850';
    }

    /**
     * Receive EDI 850 (Purchase Order)
     * POST /api/edi/850/receive
     * 
     * Expects raw X12 EDI string in request body
     */
    public function receive850(Request $request)
    {
        try {
            $rawEdi = $request->getContent();

            if (empty($rawEdi)) {
                return response()->json([
                    'error' => 'Empty payload',
                    'message' => 'Request body must contain raw X12 EDI string',
                ], Response::HTTP_BAD_REQUEST);
            }

            // Validate X12 format
            if (!$this->isValidX12($rawEdi)) {
                return response()->json([
                    'error' => 'Invalid X12 format',
                    'message' => 'Payload does not appear to be valid X12 EDI',
                ], Response::HTTP_BAD_REQUEST);
            }

            // Parse the X12 string
            $dto = $this->edi850Parser->parse($rawEdi);

            $controlNumber = trim($dto->controlNumber);

            // If ISA13 was already processed, return a dedicated handled response
            $existing = EdiTransaction::where('control_number', $controlNumber)->first();
            if ($existing) {
                Log::info('Duplicate EDI 850 control number received', [
                    'control_number' => $controlNumber,
                    'transaction_id' => $existing->id,
                ]);

                return $this->alreadyHandledResponse($existing->id, $existing->control_number, $dto->poNumber);
            }

            // Create transaction record
            try {
                $transaction = EdiTransaction::create([
                    'transaction_type' => '850',
                    'control_number' => $controlNumber,
                    'partner_id' => $dto->manufacturerId,
                    'raw_payload' => $rawEdi,
                    'parsed_data' => $dto->toArray(),
                    'status' => 'PENDING',
                ]);
            } catch (QueryException $e) {
                if ($this->isAlreadyHandledException($e)) {
                    $existing = EdiTransaction::where('control_number', $controlNumber)->first();

                    Log::info('EDI 850 create hit duplicate control number', [
                        'control_number' => $controlNumber,
                        'transaction_id' => $existing?->id,
                    ]);

                    return $this->alreadyHandledResponse(
                        $existing?->id,
                        $controlNumber,
                        $dto->poNumber,
                    );
                }

                throw $e;
            }

            // Always run synchronously — Render web services have no queue worker,
            // so async dispatch would leave every transaction in PENDING forever.
            ProcessEdiInboundJob::dispatchSync($transaction->id, $rawEdi);

            Log::info('EDI 850 received and queued for processing', [
                'transaction_id' => $transaction->id,
                'control_number' => $dto->controlNumber,
                'po_number' => $dto->poNumber,
                'manufacturer_id' => $dto->manufacturerId,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'EDI 850 received and queued for processing',
                'transaction_id' => $transaction->id,
                'control_number' => $transaction->control_number,
                'po_number' => $dto->poNumber,
            ], Response::HTTP_ACCEPTED);

        } catch (\InvalidArgumentException $e) {
            Log::error('Validation error parsing EDI 850', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Parsing error',
                'message' => $e->getMessage(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);

        } catch (\Exception $e) {
            Log::error('Unexpected error processing EDI 850', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => 'Internal server error',
                'message' => 'An unexpected error occurred processing the EDI document',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Return a consistent response when the request has already been handled.
     */
    private function alreadyHandledResponse(?int $transactionId, string $controlNumber, ?string $poNumber = null)
    {
        return response()->json([
            'error' => 'Already handled',
            'handled' => true,
            'already_processed' => true,
            'message' => 'This EDI interchange has already been handled',
            'transaction_id' => $transactionId,
            'control_number' => $controlNumber,
            'po_number' => $poNumber,
        ], Response::HTTP_CONFLICT);
    }

    /**
     * Detect whether a database exception is a duplicate-control-number case.
     */
    private function isAlreadyHandledException(QueryException $e): bool
    {
        $message = $e->getMessage();

        return str_contains($message, 'Duplicate entry')
            && str_contains($message, 'edi_transactions')
            && str_contains($message, 'control_number');
    }

    /**
     * Receive EDI 990 (Response to Load Tender)
     * POST /api/edi/990/receive
     * 
     * Expects raw X12 EDI string in request body
     */
    public function receive990(Request $request)
    {
        try {
            $rawEdi = $request->getContent();

            if (empty($rawEdi)) {
                return response()->json([
                    'error' => 'Empty payload',
                    'message' => 'Request body must contain raw X12 EDI string',
                ], Response::HTTP_BAD_REQUEST);
            }

            // Validate X12 format
            if (!$this->isValidX12($rawEdi)) {
                return response()->json([
                    'error' => 'Invalid X12 format',
                    'message' => 'Payload does not appear to be valid X12 EDI',
                ], Response::HTTP_BAD_REQUEST);
            }

            // Parse the X12 string
            $dto = $this->edi990Parser->parse($rawEdi);

            $controlNumber = trim($dto->controlNumber);

            // Return a consistent response if already processed
            $existing = EdiTransaction::where('control_number', $controlNumber)->first();
            if ($existing) {
                Log::info('Duplicate EDI 990 control number received', [
                    'control_number' => $controlNumber,
                    'transaction_id' => $existing->id,
                ]);
                return response()->json([
                    'error'            => 'Already handled',
                    'handled'          => true,
                    'already_processed' => true,
                    'message'          => 'This EDI interchange has already been handled',
                    'transaction_id'   => $existing->id,
                    'control_number'   => $existing->control_number,
                ], Response::HTTP_CONFLICT);
            }

            // Create transaction record
            try {
                $transaction = EdiTransaction::create([
                    'transaction_type' => '990',
                    'control_number'   => $controlNumber,
                    'partner_id'       => $dto->carrierId,
                    'raw_payload'      => $rawEdi,
                    'parsed_data'      => $dto->toArray(),
                    'status'           => 'PENDING',
                ]);
            } catch (QueryException $e) {
                if ($this->isAlreadyHandledException($e)) {
                    $existing = EdiTransaction::where('control_number', $controlNumber)->first();
                    return response()->json([
                        'error'            => 'Already handled',
                        'handled'          => true,
                        'already_processed' => true,
                        'message'          => 'This EDI interchange has already been handled',
                        'transaction_id'   => $existing?->id,
                        'control_number'   => $controlNumber,
                    ], Response::HTTP_CONFLICT);
                }
                throw $e;
            }

            ProcessEdiInboundJob::dispatchSync($transaction->id, $rawEdi);

            Log::info('EDI 990 received and queued for processing', [
                'transaction_id' => $transaction->id,
                'control_number' => $controlNumber,
                'load_tender_id' => $dto->loadTenderId,
                'carrier_id'     => $dto->carrierId,
                'response_code'  => $dto->responseCode,
            ]);

            return response()->json([
                'success'        => true,
                'message'        => 'EDI 990 received and queued for processing',
                'transaction_id' => $transaction->id,
                'control_number' => $transaction->control_number,
                'response_code'  => $dto->responseCode,
                'is_accepted'    => $dto->isAccepted(),
            ], Response::HTTP_ACCEPTED);

        } catch (\InvalidArgumentException $e) {
            Log::error('Validation error parsing EDI 990', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Parsing error',
                'message' => $e->getMessage(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);

        } catch (\Exception $e) {
            Log::error('Unexpected error processing EDI 990', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => 'Internal server error',
                'message' => 'An unexpected error occurred processing the EDI document',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Validate X12 format
     * 
     * X12 documents should start with ISA segment and end with tilde
     */
    private function isValidX12(string $payload): bool
    {
        $trimmed = trim($payload);
        
        // Check for ISA segment (Interchange Control Header)
        if (strpos($trimmed, 'ISA*') !== 0) {
            return false;
        }

        // Check for segment terminator
        if (strpos($trimmed, '~') === false) {
            return false;
        }

        return true;
    }

    /**
     * Get transaction status
     * GET /api/edi/transactions/{id}
     */
    public function getTransactionStatus(string $id)
    {
        try {
            $transaction = EdiTransaction::findOrFail($id);

            return response()->json([
                'transaction_id' => $transaction->id,
                'transaction_type' => $transaction->transaction_type,
                'control_number' => $transaction->control_number,
                'partner_id' => $transaction->partner_id,
                'status' => $transaction->status,
                'created_at' => $transaction->created_at,
                'updated_at' => $transaction->updated_at,
                'error_message' => $transaction->error_message,
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'error' => 'Not found',
                'message' => 'Transaction not found',
            ], Response::HTTP_NOT_FOUND);
        }
    }
}
