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
use App\Services\Edi\Parsers\Edi850Parser;

class ProcessEdiInboundJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $transactionId,
        public string $x12Payload,
    ) {}

    public function handle(): void
    {
        $transaction = null;

        try {
            $transaction = EdiTransaction::find($this->transactionId);
            if (!$transaction) {
                throw new \Exception("Transaction not found: {$this->transactionId}");
            }

            $x12 = $transaction->getX12Payload() ?: $this->x12Payload;
            if ($x12 === null || $x12 === '') {
                throw new \Exception('Missing X12 payload on transaction and job');
            }

            match ($transaction->transaction_type) {
                '850' => $this->process850($transaction, $x12),
                '990' => $this->process990($transaction, $x12),
                default => $this->processUnknownType($transaction),
            };

            \Log::info('EDI Transaction processed successfully', [
                'transaction_id' => $transaction->id,
                'control_number' => $transaction->control_number,
                'format' => $transaction->inbound_format,
                'type' => $transaction->transaction_type,
            ]);
        } catch (\Exception $e) {
            if ($transaction instanceof EdiTransaction) {
                $transaction->update([
                    'status' => 'REJECTED',
                    'error_message' => $e->getMessage(),
                ]);
            }

            \Log::error('EDI Processing Error', [
                'transaction_id' => $this->transactionId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    private function process850(EdiTransaction $transaction, string $x12): void
    {
        if (PurchaseOrder::where('edi_transaction_id', $transaction->id)->exists()) {
            $transaction->update([
                'status' => 'VALIDATED',
                'error_message' => null,
                'outbound_format' => $transaction->inbound_format === 'CSV' ? $transaction->outbound_format : 'X12',
            ]);

            \Log::info('EDI 850 skipped — purchase order already exists (idempotent retry)', [
                'transaction_id' => $transaction->id,
            ]);

            return;
        }

        $parsed = $transaction->parsed_data;
        if (!$this->isCanonical850ParsedData($parsed)) {
            $parsed = (new Edi850Parser())->parse($x12)->toArray();
            $transaction->update(['parsed_data' => $parsed]);
        }

        $this->maybeAttachCsvAudit($transaction, $x12);

        $transaction->update([
            'status' => 'VALIDATED',
            'error_message' => null,
            'outbound_format' => $transaction->inbound_format === 'CSV' ? $transaction->outbound_format : 'X12',
        ]);

        $this->createPurchaseOrderFromCanonical850($transaction, $parsed);
    }

    private function process990(EdiTransaction $transaction, string $x12): void
    {
        $this->maybeAttachCsvAudit($transaction, $x12);

        $transaction->update([
            'status' => 'VALIDATED',
            'error_message' => null,
            'outbound_format' => $transaction->inbound_format === 'CSV' ? $transaction->outbound_format : 'X12',
        ]);
    }

    private function processUnknownType(EdiTransaction $transaction): void
    {
        \Log::warning('EDI job received unsupported transaction type', [
            'transaction_id' => $transaction->id,
            'transaction_type' => $transaction->transaction_type,
        ]);

        $transaction->update([
            'status' => 'VALIDATED',
            'error_message' => null,
        ]);
    }

    /**
     * Shape produced by Edi850PurchaseOrderDto::toArray() at ingest time.
     */
    private function isCanonical850ParsedData(mixed $parsed): bool
    {
        if (!is_array($parsed)) {
            return false;
        }

        return array_key_exists('po_number', $parsed)
            && array_key_exists('line_items', $parsed)
            && is_array($parsed['line_items']);
    }

    /**
     * Legacy CSV inbound: optional CSV audit file. Native X12 path skips this.
     */
    private function maybeAttachCsvAudit(EdiTransaction $transaction, string $x12): void
    {
        if ($transaction->inbound_format !== 'CSV') {
            return;
        }

        try {
            $csvConverter = new X12ToCSVConverter();
            if ($csvConverter->validate($x12)) {
                $transaction->update([
                    'csv_payload' => $csvConverter->convert($x12),
                ]);
            }
        } catch (\Throwable $e) {
            \Log::warning('CSV audit generation failed (legacy CSV inbound)', [
                'transaction_id' => $transaction->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Persist domain rows from canonical 850 JSON (DTO array), not from ad-hoc segment maps.
     */
    private function createPurchaseOrderFromCanonical850(EdiTransaction $transaction, array $parsed): void
    {
        $poNumber = ($parsed['po_number'] ?? 'UNKNOWN') . '-' . $transaction->control_number;
        $orderDate = $parsed['po_date'] ?? date('Y-m-d');
        $deliveryDate = $parsed['delivery_date'] ?? $parsed['shipping_date'] ?? $orderDate;

        $po = PurchaseOrder::create([
            'edi_transaction_id' => $transaction->id,
            'po_number' => $poNumber,
            'partner_id' => $transaction->partner_id,
            'order_date' => $orderDate,
            'delivery_date' => $deliveryDate,
            'total_amount' => 0,
            'status' => 'PENDING',
        ]);

        $totalAmount = 0.0;
        $lineItems = $parsed['line_items'] ?? [];

        foreach ($lineItems as $index => $line) {
            if (!is_array($line)) {
                continue;
            }

            $quantity = (float) ($line['quantity'] ?? 0);
            $unitPrice = (float) ($line['unit_price'] ?? 0);
            $lineTotal = isset($line['line_amount']) ? (float) $line['line_amount'] : $quantity * $unitPrice;
            $totalAmount += $lineTotal;

            PurchaseOrderItem::create([
                'purchase_order_id' => $po->id,
                'line_number' => (string) ($line['line_number'] ?? (string) ($index + 1)),
                'product_code' => (string) ($line['part_number'] ?? 'UNKNOWN'),
                'product_name' => (string) ($line['part_description'] ?? 'Product'),
                'quantity' => $quantity,
                'unit_of_measure' => (string) ($line['quantity_uom'] ?? 'EA'),
                'unit_price' => $unitPrice,
                'line_total' => $lineTotal,
            ]);
        }

        $po->update(['total_amount' => $totalAmount]);

        \Log::info('Purchase Order created from canonical 850 JSON', [
            'po_number' => $poNumber,
            'po_id' => $po->id,
            'total_amount' => $totalAmount,
            'inbound_format' => $transaction->inbound_format,
        ]);
    }
}
