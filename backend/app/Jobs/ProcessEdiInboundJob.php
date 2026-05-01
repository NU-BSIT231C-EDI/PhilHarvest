<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Models\EdiTransaction;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;

class ProcessEdiInboundJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $transactionId,
        public string $rawPayload,
    ) {}

    public function handle()
    {
        try {
            $transaction = EdiTransaction::find($this->transactionId);
            if (!$transaction) {
                throw new \Exception("Transaction not found: {$this->transactionId}");
            }

            // Parse EDI segments
            $parsedData = $this->parseEdi($this->rawPayload);

            // Update transaction with parsed data
            $transaction->update([
                'parsed_data' => $parsedData,
                'status' => 'VALIDATED',
            ]);

            // Extract purchase order data
            if ($parsedData['transaction_type'] === '850') {
                $this->processPurchaseOrder($transaction, $parsedData);
            }

            \Log::info("EDI Transaction processed successfully", [
                'transaction_id' => $transaction->id,
                'control_number' => $transaction->control_number,
            ]);

        } catch (\Exception $e) {
            $transaction->update([
                'status' => 'REJECTED',
                'error_message' => $e->getMessage(),
            ]);

            \Log::error("EDI Processing Error", [
                'transaction_id' => $this->transactionId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Parse X12 EDI payload
     */
    private function parseEdi(string $payload): array
    {
        $segments = [];
        $lines = explode("\n", $payload);

        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line)) continue;

            $parts = explode('*', $line);
            $segmentType = $parts[0] ?? null;

            $segments[$segmentType][] = $parts;
        }

        return [
            'transaction_type' => $segments['ST'][0][1] ?? 'UNKNOWN',
            'segments' => $segments,
        ];
    }

    /**
     * Process 850 Purchase Order
     */
    private function processPurchaseOrder(EdiTransaction $transaction, array $parsedData): void
    {
        $segments = $parsedData['segments'];

        // Extract PO info from BEG segment
        $begSegment = $segments['BEG'][0] ?? null;
        if (!$begSegment) {
            throw new \Exception("Missing BEG segment in 850");
        }

        $poNumber = $begSegment[3] ?? 'UNKNOWN';
        // Make PO number unique by appending control number
        $poNumber = $poNumber . '-' . $transaction->control_number;
        
        // Parse date from YYYYMMDD format
        $rawDate = $begSegment[4] ?? date('Ymd');
        $orderDate = \DateTime::createFromFormat('Ymd', $rawDate)?->format('Y-m-d') ?? date('Y-m-d');

        // Create purchase order
        $po = PurchaseOrder::create([
            'edi_transaction_id' => $transaction->id,
            'po_number' => $poNumber,
            'partner_id' => $transaction->partner_id,
            'order_date' => $orderDate,
            'delivery_date' => $orderDate,
            'total_amount' => 0,
            'status' => 'PENDING',
        ]);

        // Process line items from PO1 segments
        $totalAmount = 0;
        if (isset($segments['PO1'])) {
            foreach ($segments['PO1'] as $index => $po1Segment) {
                // PO1 format: PO1*LineNum*Qty*UnitCode*UnitPrice*BasisCode*IdQualifier*ProductId
                $quantity = floatval($po1Segment[2] ?? 0);
                $unitPrice = floatval($po1Segment[4] ?? 0);  // Index 4, not 3!
                $lineTotal = $quantity * $unitPrice;
                $totalAmount += $lineTotal;

                PurchaseOrderItem::create([
                    'purchase_order_id' => $po->id,
                    'line_number' => intval($po1Segment[1] ?? ($index + 1)),
                    'product_code' => $po1Segment[7] ?? $po1Segment[6] ?? 'UNKNOWN',
                    'product_name' => $po1Segment[7] ?? $po1Segment[6] ?? 'Product',
                    'quantity' => $quantity,
                    'unit_of_measure' => $po1Segment[3] ?? 'EA',  // Index 3 is unit code
                    'unit_price' => $unitPrice,
                    'line_total' => $lineTotal,
                ]);
            }
        }

        // Update PO total
        $po->update(['total_amount' => $totalAmount]);

        // Log success
        \Log::info("Purchase Order created", [
            'po_number' => $poNumber,
            'po_id' => $po->id,
            'total_amount' => $totalAmount,
        ]);
    }
}