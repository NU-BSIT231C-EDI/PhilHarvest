<?php

namespace App\Http\Controllers\Api\Edi;

use App\Models\PurchaseOrder;
use App\Models\EdiTransaction;
use App\Services\Edi\CsvOutboundService;
use App\Services\Edi\Converters\X12ToCSVConverter;
use Illuminate\Http\Response;

class OutboundController
{
    private CsvOutboundService $csvOutboundService;
    private X12ToCSVConverter $x12ToCsvConverter;

    public function __construct(CsvOutboundService $csvOutboundService)
    {
        $this->csvOutboundService = $csvOutboundService;
        $this->x12ToCsvConverter = new X12ToCSVConverter();
    }

    /**
     * List all orders (with pagination)
     */
    public function listOrders()
    {
        $orders = PurchaseOrder::with('items')->paginate(20);
        return response()->json($orders);
    }

    /**
     * Show specific order with line items
     */
    public function showOrder($id)
    {
        $order = PurchaseOrder::with('items')->find($id);
        return response()->json($order);
    }

    /**
     * List recent EDI transactions for dashboard monitoring
     */
    public function listTransactions()
    {
        $transactions = EdiTransaction::query()
            ->latest()
            ->limit(25)
            ->get([
                'id',
                'transaction_type',
                'control_number',
                'partner_id',
                'status',
                'raw_payload',
                'generated_x12_payload',
                'parsed_data',
                'created_at',
            ])
            ->map(function (EdiTransaction $transaction) {
                $payload = $transaction->raw_payload ?: $transaction->generated_x12_payload;
                $direction = in_array($transaction->transaction_type, ['850', '990'], true) ? 'inbound' : 'outbound';

                return [
                    'id' => $transaction->id,
                    'transaction_type' => $transaction->transaction_type,
                    'control_number' => $transaction->control_number,
                    'partner_id' => $transaction->partner_id,
                    'status' => $transaction->status,
                    'direction' => $direction,
                    'payload_preview' => $payload ? mb_substr($payload, 0, 500) : null,
                    'parsed_data' => $transaction->parsed_data,
                    'created_at' => optional($transaction->created_at)->toIso8601String(),
                ];
            });

        return response()->json($transactions);
    }

    /**
     * Download EDI transaction as CSV
     * GET /api/edi/transactions/{id}/csv
     * 
     * Returns the CSV representation of an EDI transaction
     * - If CSV exists, returns stored CSV
     * - If only X12 exists, converts X12 to CSV on-the-fly
     */
    public function downloadCSV($id)
    {
        try {
            $transaction = EdiTransaction::findOrFail($id);

            // Check if CSV already exists in database
            $csvPayload = $transaction->csv_payload;

            if (empty($csvPayload) && !empty($transaction->raw_payload)) {
                // Need to convert X12 to CSV
                try {
                    if ($this->x12ToCsvConverter->validate($transaction->raw_payload)) {
                        $csvPayload = $this->x12ToCsvConverter->convert($transaction->raw_payload);
                        
                        // Store CSV for future use
                        $transaction->update(['csv_payload' => $csvPayload]);
                    }
                } catch (\Exception $e) {
                    \Log::warning("Failed to convert X12 to CSV on-the-fly", [
                        'transaction_id' => $id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            if (empty($csvPayload)) {
                return response()->json([
                    'error' => 'No CSV data available for this transaction',
                    'message' => 'Transaction has no raw payload or failed conversion'
                ], Response::HTTP_NOT_FOUND);
            }

            // Generate proper filename
            $filename = $this->csvOutboundService->generateFilename($transaction);

            // Get CSV headers for response
            $headers = [
                'Content-Type' => 'text/csv; charset=utf-8',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0',
            ];

            // Add BOM for Excel compatibility
            $csvWithBom = "\xEF\xBB\xBF" . $csvPayload;

            \Log::info("CSV downloaded", [
                'transaction_id' => $id,
                'filename' => $filename,
                'transaction_type' => $transaction->transaction_type,
            ]);

            return response($csvWithBom, Response::HTTP_OK, $headers);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'error' => 'Transaction not found'
            ], Response::HTTP_NOT_FOUND);

        } catch (\Exception $e) {
            \Log::error("CSV download error", [
                'transaction_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Failed to generate CSV',
                'message' => $e->getMessage(),
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Export order as CSV
     * GET /api/edi/orders/{id}/export/csv
     * 
     * Exports a purchase order in CSV format for partner delivery
     */
    public function exportOrderAsCSV($id)
    {
        try {
            $order = PurchaseOrder::with(['items', 'transaction'])->findOrFail($id);
            
            // Get the associated EDI transaction
            $transaction = $order->transaction;
            if (!$transaction || empty($transaction->raw_payload)) {
                return response()->json([
                    'error' => 'No EDI data associated with this order'
                ], Response::HTTP_NOT_FOUND);
            }

            // Use the transaction CSV download
            return $this->downloadCSV($transaction->id);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'error' => 'Order not found'
            ], Response::HTTP_NOT_FOUND);

        } catch (\Exception $e) {
            \Log::error("Order CSV export error", [
                'order_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Failed to export order',
                'message' => $e->getMessage(),
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get transaction details including available formats
     * GET /api/edi/transactions/{id}
     */
    public function getTransactionDetails($id)
    {
        try {
            $transaction = EdiTransaction::with('purchaseOrder')->findOrFail($id);

            return response()->json([
                'id' => $transaction->id,
                'transaction_type' => $transaction->transaction_type,
                'control_number' => $transaction->control_number,
                'partner_id' => $transaction->partner_id,
                'status' => $transaction->status,
                'inbound_format' => $transaction->inbound_format,
                'outbound_format' => $transaction->outbound_format,
                'created_at' => $transaction->created_at,
                'has_raw_x12' => !empty($transaction->raw_payload),
                'has_csv' => !empty($transaction->csv_payload),
                'has_generated_x12' => !empty($transaction->generated_x12_payload),
                'purchase_order' => $transaction->purchaseOrder,
                'download_urls' => [
                    'csv' => route('edi.download-csv', ['id' => $transaction->id]),
                    // Could add other formats here
                ],
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'error' => 'Transaction not found'
            ], Response::HTTP_NOT_FOUND);
        }
    }
}
