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
use App\Services\Edi\Converters\X12ToCSVConverter;

class ProcessEdiInboundJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The X12 payload to process (could be original X12 or generated from CSV)
     */
    public function __construct(
        public int $transactionId,
        public string $x12Payload,
    ) {}

    public function handle()
    {
        try {
            $transaction = EdiTransaction::find($this->transactionId);
            if (!$transaction) {
                throw new \Exception("Transaction not found: {$this->transactionId}");
            }

            // Parse X12 EDI segments
            $parsedData = $this->parseEdi($this->x12Payload);

            // Generate CSV from X12 for storage/audit trail
            try {
                $csvConverter = new X12ToCSVConverter();
                if ($csvConverter->validate($this->x12Payload)) {
                    $csvPayload = $csvConverter->convert($this->x12Payload);
                    
                    // Update transaction with both formats for audit trail
                    $transaction->update([
                        'raw_payload' => $this->x12Payload,  // Store X12 as raw
                        'csv_payload' => $csvPayload,         // Store generated CSV
                        'parsed_data' => $parsedData,
                        'status' => 'VALIDATED',
                        'outbound_format' => 'CSV', // Default to CSV for outbound
                    ]);
                }
            } catch (\Exception $csvError) {
                // Log CSV generation error but continue processing
                \Log::warning("CSV generation failed during processing", [
                    'transaction_id' => $transaction->id,
                    'error' => $csvError->getMessage(),
                ]);

                $transaction->update([
                    'parsed_data' => $parsedData,
                    'status' => 'VALIDATED',
                ]);
            }

            // Process based on transaction type
            if ($parsedData['transaction_type'] === '850') {
                $this->processPurchaseOrder($transaction, $parsedData);
            }

            // If this came from CSV inbound, mark the conversion as complete
            if ($transaction->inbound_format === 'CSV') {
                \Log::info("CSV converted to X12 and processed", [
                    'transaction_id' => $transaction->id,
                    'control_number' => $transaction->control_number,
                    'csv_stored' => true,
                    'x12_stored' => true,
                ]);
            }

            \Log::info("EDI Transaction processed successfully", [
                'transaction_id' => $transaction->id,
                'control_number' => $transaction->control_number,
                'format' => $transaction->inbound_format,
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
     * Handles both native X12 and X12 generated from CSV
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

            if ($segmentType) {
                if (!isset($segments[$segmentType])) {
                    $segments[$segmentType] = [];
                }
                $segments[$segmentType][] = $parts;
            }
        }

        return [
            'transaction_type' => $segments['ST'][0][1] ?? 'UNKNOWN',
            'segments' => $segments,
            'segment_count' => count($segments),
        ];
    }

    /**
     * Process 850 Purchase Order
     * Extracts data from parsed X12 segments and creates database records
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

        // Extract delivery date from DTM segments
        $deliveryDate = $this->extractDateFromDTM($segments['DTM'] ?? []) ?? $orderDate;

        // Create purchase order
        $po = PurchaseOrder::create([
            'edi_transaction_id' => $transaction->id,
            'po_number' => $poNumber,
            'partner_id' => $transaction->partner_id,
            'order_date' => $orderDate,
            'delivery_date' => $deliveryDate,
            'total_amount' => 0,
            'status' => 'PENDING',
        ]);

        // Process line items from PO1 segments
        $totalAmount = 0;
        if (isset($segments['PO1'])) {
            foreach ($segments['PO1'] as $index => $po1Segment) {
                // PO1 format: PO1*LineNum*Qty*UnitCode*UnitPrice*BasisCode*IdQualifier*ProductId
                $quantity = floatval($po1Segment[2] ?? 0);
                $unitPrice = floatval($po1Segment[4] ?? 0);  // Index 4 is unit price
                $lineTotal = $quantity * $unitPrice;
                $totalAmount += $lineTotal;

                // Try to extract product name from PID segment
                $productName = 'Product';
                $pidSegment = $segments['PID'][$index] ?? null;
                if ($pidSegment) {
                    $productName = $pidSegment[5] ?? $productName;
                }

                PurchaseOrderItem::create([
                    'purchase_order_id' => $po->id,
                    'line_number' => intval($po1Segment[1] ?? ($index + 1)),
                    'product_code' => $po1Segment[7] ?? $po1Segment[6] ?? 'UNKNOWN',
                    'product_name' => $productName,
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
            'inbound_format' => $transaction->inbound_format,
        ]);
    }

    /**
     * Extract delivery date from DTM segments
     * DTM segment format: DTM*qualifier*date*time_code
     */
    private function extractDateFromDTM(array $dtmSegments): ?string
    {
        foreach ($dtmSegments as $dtm) {
            if (($dtm[1] ?? null) === '002') { // Delivery date qualifier
                $dateStr = $dtm[2] ?? null;
                if ($dateStr && strlen($dateStr) === 8) {
                    try {
                        return \DateTime::createFromFormat('Ymd', $dateStr)->format('Y-m-d');
                    } catch (\Exception $e) {
                        \Log::warning("Failed to parse DTM date", ['date_str' => $dateStr]);
                    }
                }
            }
        }
        return null;
    }
}