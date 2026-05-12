<?php

namespace App\Services\Edi;

use App\Models\EdiTransaction;
use App\Services\Edi\Converters\CSVToX12Converter;
use Illuminate\Support\Facades\Log;

/**
 * Service for processing inbound CSV files
 * 
 * Workflow:
 * 1. Receive CSV file
 * 2. Store raw CSV in csv_payload
 * 3. Convert CSV to X12 format
 * 4. Store generated X12 in generated_x12_payload
 * 5. Parse X12 for database ingestion
 */
class CsvInboundService
{
    private CSVToX12Converter $converter;

    public function __construct()
    {
        $this->converter = new CSVToX12Converter();
    }

    /**
     * Process incoming CSV file
     *
     * @param string $csvPayload Raw CSV content
     * @param string $transactionType EDI transaction type (850, 855, 856, 810)
     * @param string $partnerId Partner identifier
     * @param array $options Additional options for conversion
     * @return EdiTransaction
     */
    public function processIncomingCSV(
        string $csvPayload,
        string $transactionType,
        string $partnerId,
        array $options = []
    ): EdiTransaction {
        try {
            // Validate CSV format
            if (!$this->validateCSV($csvPayload)) {
                throw new \Exception('Invalid CSV format: empty or malformed data');
            }

            // Generate control number based on first row if possible
            $controlNumber = $this->extractControlNumberFromCSV($csvPayload) ?? uniqid('csv_');

            // Check for duplicate
            $existing = EdiTransaction::where('control_number', $controlNumber)->first();
            if ($existing) {
                Log::info("Duplicate CSV file received", [
                    'control_number' => $controlNumber,
                    'partner_id' => $partnerId,
                ]);
                return $existing;
            }

            // Convert CSV to X12
            $conversionOptions = array_merge([
                'partner_id' => $partnerId,
                'sender_id' => $options['sender_id'] ?? config('edi.sender_id', 'SENDER001'),
                'receiver_id' => $options['receiver_id'] ?? config('edi.receiver_id', 'RECEIVER01'),
                'isa_control_number' => $options['isa_control_number'] ?? random_int(1, 999999999),
                'gs_control_number' => $options['gs_control_number'] ?? random_int(1, 99999),
                'st_control_number' => $options['st_control_number'] ?? random_int(1, 999999999),
            ], $options);

            $generatedX12 = $this->converter->convert($csvPayload, $conversionOptions);
            $conversionMetadata = $this->converter->getMetadata();

            // Create transaction record
            $transaction = EdiTransaction::create([
                'transaction_type' => $transactionType,
                'control_number' => $controlNumber,
                'partner_id' => $partnerId,
                'inbound_format' => 'CSV',
                'outbound_format' => 'CSV', // Default to CSV for outbound
                'raw_payload' => $csvPayload, // Raw CSV stored as raw_payload for audit trail
                'csv_payload' => $csvPayload,
                'generated_x12_payload' => $generatedX12,
                'status' => 'PENDING',
            ]);

            Log::info("CSV file processed and converted to X12", [
                'transaction_id' => $transaction->id,
                'control_number' => $controlNumber,
                'partner_id' => $partnerId,
                'transaction_type' => $transactionType,
                'metadata' => $conversionMetadata,
            ]);

            return $transaction;

        } catch (\Exception $e) {
            Log::error("CSV inbound processing failed", [
                'error' => $e->getMessage(),
                'partner_id' => $partnerId,
                'transaction_type' => $transactionType,
            ]);

            throw $e;
        }
    }

    /**
     * Validate CSV format and structure
     */
    public function validateCSV(string $csvPayload): bool
    {
        if (empty(trim($csvPayload))) {
            return false;
        }

        // Try to parse as CSV
        $lines = str_getcsv($csvPayload, "\n");
        // At least header + 1 data row required
        if (count($lines) < 2) {
            return false;
        }

        // Verify first line has content (headers)
        $firstLine = str_getcsv($lines[0]);
        if (empty($firstLine) || empty(array_filter($firstLine))) {
            return false;
        }

        return true;
    }

    /**
     * Extract control number from CSV headers
     * Looks for a column that could contain a transaction control number
     */
    private function extractControlNumberFromCSV(string $csvPayload): ?string
    {
        $lines = str_getcsv($csvPayload, "\n");
        if (empty($lines)) {
            return null;
        }

        $headers = str_getcsv($lines[0]);
        $headerMap = array_flip($headers);

        // Try to find control number in first data row
        if (isset($lines[1])) {
            $firstRow = str_getcsv($lines[1]);

            // Look for Control_Number column
            if (isset($headerMap['Control_Number'])) {
                $value = $firstRow[$headerMap['Control_Number']] ?? null;
                if ($value) return $value;
            }

            // Look for PO_Number column
            if (isset($headerMap['PO_Number'])) {
                $value = $firstRow[$headerMap['PO_Number']] ?? null;
                if ($value) return 'PO_' . $value;
            }

            // Look for Invoice_Number column
            if (isset($headerMap['Invoice_Number'])) {
                $value = $firstRow[$headerMap['Invoice_Number']] ?? null;
                if ($value) return 'INV_' . $value;
            }

            // Look for Shipment_Number column
            if (isset($headerMap['Shipment_Number'])) {
                $value = $firstRow[$headerMap['Shipment_Number']] ?? null;
                if ($value) return 'SHP_' . $value;
            }
        }

        return null;
    }

    /**
     * Get CSV file metadata
     */
    public function getCSVMetadata(string $csvPayload): array
    {
        $lines = str_getcsv($csvPayload, "\n");
        $rowCount = count($lines) - 1; // Exclude header

        return [
            'row_count' => max(0, $rowCount),
            'is_valid' => $this->validateCSV($csvPayload),
            'estimated_size' => strlen($csvPayload),
        ];
    }
}
