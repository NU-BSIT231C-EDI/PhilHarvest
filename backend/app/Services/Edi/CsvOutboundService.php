<?php

namespace App\Services\Edi;

use App\Models\EdiTransaction;
use App\Services\Edi\Converters\X12ToCSVConverter;
use Illuminate\Support\Facades\Log;

/**
 * Service for handling CSV outbound delivery
 * 
 * Workflow:
 * 1. Generate X12 document (via builder)
 * 2. Convert X12 to CSV format
 * 3. Prepare CSV for API delivery to partner
 * 4. Store both formats for audit trail
 */
class CsvOutboundService
{
    private X12ToCSVConverter $converter;

    public function __construct()
    {
        $this->converter = new X12ToCSVConverter();
    }

    /**
     * Convert X12 payload to CSV for outbound transmission
     *
     * @param string $x12Payload X12 EDI payload
     * @param string $transactionType Transaction type (850, 855, 856, 810)
     * @param string $controlNumber Control number for tracking
     * @param string $partnerId Partner identifier
     * @return array Array with csv_payload and metadata
     */
    public function convertToCSV(
        string $x12Payload,
        string $transactionType,
        string $controlNumber,
        string $partnerId
    ): array {
        try {
            // Validate X12 format
            if (!$this->converter->validate($x12Payload)) {
                throw new \Exception('Invalid X12 format for conversion');
            }

            // Convert to CSV
            $csvPayload = $this->converter->convert($x12Payload, [
                'transaction_type' => $transactionType,
                'control_number' => $controlNumber,
            ]);

            $metadata = $this->converter->getMetadata();
            $metadata['csv_size'] = strlen($csvPayload);
            $metadata['line_count'] = count(explode("\n", $csvPayload));

            Log::info("X12 converted to CSV for outbound", [
                'transaction_type' => $transactionType,
                'control_number' => $controlNumber,
                'partner_id' => $partnerId,
                'metadata' => $metadata,
            ]);

            return [
                'csv_payload' => $csvPayload,
                'metadata' => $metadata,
            ];

        } catch (\Exception $e) {
            Log::error("CSV outbound conversion failed", [
                'error' => $e->getMessage(),
                'transaction_type' => $transactionType,
                'control_number' => $controlNumber,
                'partner_id' => $partnerId,
            ]);

            throw $e;
        }
    }

    /**
     * Prepare outbound CSV for delivery
     * Creates properly formatted CSV with headers and validation
     *
     * @param EdiTransaction $transaction The EDI transaction
     * @param string $x12Payload The X12 payload to convert
     * @return array Array with csv_data and headers
     */
    public function prepareOutboundCSV(EdiTransaction $transaction, string $x12Payload): array
    {
        $conversionResult = $this->convertToCSV(
            $x12Payload,
            $transaction->transaction_type,
            $transaction->control_number,
            $transaction->partner_id
        );

        // Update transaction with CSV payload
        $transaction->update([
            'csv_payload' => $conversionResult['csv_payload'],
            'outbound_format' => 'CSV',
        ]);

        return [
            'csv_data' => $conversionResult['csv_payload'],
            'headers' => $this->getCSVHeaders($transaction->transaction_type),
            'filename' => $this->generateFilename($transaction),
            'metadata' => $conversionResult['metadata'],
        ];
    }

    /**
     * Generate proper CSV filename for partner delivery
     */
    public function generateFilename(EdiTransaction $transaction): string
    {
        $date = now()->format('YmdHis');
        $type = $transaction->transaction_type;
        $controlNumber = $transaction->control_number;

        return "{$type}_{$controlNumber}_{$date}.csv";
    }

    /**
     * Get HTTP headers for CSV delivery
     */
    public function getCSVHeaders(string $transactionType): array
    {
        $filename = match ($transactionType) {
            '850' => 'purchase-order.csv',
            '855' => 'order-confirmation.csv',
            '856' => 'advance-ship-notice.csv',
            '810' => 'invoice.csv',
            default => 'edi-transaction.csv',
        };

        return [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ];
    }

    /**
     * Store both X12 and CSV for audit trail
     */
    public function storeForAudit(
        EdiTransaction $transaction,
        string $x12Payload,
        string $csvPayload
    ): void {
        try {
            $transaction->update([
                'raw_payload' => $x12Payload,
                'csv_payload' => $csvPayload,
                'outbound_format' => 'BOTH', // Store both for audit
            ]);

            Log::info("X12 and CSV stored for audit", [
                'transaction_id' => $transaction->id,
                'control_number' => $transaction->control_number,
            ]);

        } catch (\Exception $e) {
            Log::error("Failed to store audit copies", [
                'transaction_id' => $transaction->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Validate CSV is ready for delivery
     */
    public function validateCSVForDelivery(string $csvPayload): bool
    {
        if (empty(trim($csvPayload))) {
            return false;
        }

        // Verify CSV has proper structure
        $lines = str_getcsv($csvPayload, "\n");
        
        // Must have header + at least 1 data row
        return count($lines) >= 2;
    }

    /**
     * Get CSV column mapping for a transaction type
     */
    private function getCSVColumnMapping(string $transactionType): array
    {
        return match ($transactionType) {
            '850' => [
                'Transaction_Type', 'Control_Number', 'PO_Number', 'Order_Date',
                'Delivery_Date', 'Partner_Name', 'Partner_Address', 'Partner_City',
                'Partner_State', 'Partner_Zip', 'Line_Number', 'Item_Number',
                'Quantity', 'Unit_Of_Measure', 'Unit_Price', 'Description'
            ],
            '855' => [
                'Transaction_Type', 'Control_Number', 'PO_Number', 'Confirmation_Date',
                'Confirmation_Status', 'Partner_Name', 'Line_Number', 'Item_Number',
                'Accepted_Quantity', 'Unit_Of_Measure', 'Unit_Price', 'Status_Code', 'Notes'
            ],
            '856' => [
                'Transaction_Type', 'Control_Number', 'Shipment_Number', 'Ship_Date',
                'Delivery_Date', 'Carrier_Code', 'Carrier_Name', 'Pro_Number',
                'Line_Number', 'Item_Number', 'Shipped_Quantity', 'Unit_Of_Measure',
                'Lot_Number', 'Serial_Number', 'Container_Number'
            ],
            '810' => [
                'Transaction_Type', 'Control_Number', 'Invoice_Number', 'Invoice_Date',
                'PO_Number', 'Partner_Name', 'Line_Number', 'Item_Number',
                'Description', 'Quantity', 'Unit_Of_Measure', 'Unit_Price',
                'Line_Amount', 'Tax_Amount', 'Invoice_Subtotal', 'Invoice_Total',
                'Invoice_Status'
            ],
            default => [],
        };
    }
}
