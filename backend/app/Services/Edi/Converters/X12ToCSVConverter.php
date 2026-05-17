<?php

namespace App\Services\Edi\Converters;

use App\Services\Edi\Contracts\EdiConverterContract;

/**
 * Converts X12 EDI format to CSV format
 * 
 * X12 structure: ISA*00*...*GS*...*ST*...*segments...*SE*GE*IEA
 * CSV structure: Headers with field names, data rows with values
 */
class X12ToCSVConverter implements EdiConverterContract
{
    private array $metadata = [];

    /**
     * Convert X12 EDI payload to CSV format
     *
     * @param string $payload X12 EDI payload
     * @param array $options Conversion options
     * @return string CSV format payload
     */
    public function convert(string $payload, array $options = []): string
    {
        if (!$this->validate($payload)) {
            throw new \Exception('Invalid X12 payload format');
        }

        // Parse X12 segments
        $segments = $this->parseX12Segments($payload);
        $this->metadata['segment_count'] = count($segments);

        // Extract envelope information
        $isaSegment = $segments['ISA'][0] ?? null;
        $gsSegment = $segments['GS'][0] ?? null;
        $stSegment = $segments['ST'][0] ?? null;

        if (!$isaSegment || !$gsSegment || !$stSegment) {
            throw new \Exception('Missing required X12 envelope segments');
        }

        // Determine transaction type
        $transactionType = $stSegment[1] ?? 'UNKNOWN';
        $this->metadata['transaction_type'] = $transactionType;

        // Convert based on transaction type
        return match ($transactionType) {
            '850' => $this->convert850($segments),
            '855' => $this->convert855($segments),
            '856' => $this->convert856($segments),
            '810' => $this->convert810($segments),
            default => $this->convertGeneric($segments),
        };
    }

    /**
     * Validate X12 format
     */
    public function validate(string $payload): bool
    {
        return !empty($payload) && strpos($payload, 'ISA*') === 0;
    }

    /**
     * Get conversion metadata
     */
    public function getMetadata(): array
    {
        return $this->metadata;
    }

    /**
     * Convert 850 (Purchase Order) to CSV
     */
    private function convert850(array $segments): string
    {
        $rows = [];
        $headers = [
            'Transaction_Type',
            'Control_Number',
            'PO_Number',
            'Order_Date',
            'Delivery_Date',
            'Partner_Name',
            'Partner_Address',
            'Partner_City',
            'Partner_State',
            'Partner_Zip',
            'Line_Number',
            'Item_Number',
            'Quantity',
            'Unit_Of_Measure',
            'Unit_Price',
            'Description'
        ];

        $rows[] = $headers;

        // Extract envelope info
        $begSegment = $segments['BEG'][0] ?? [];
        $poNumber = $begSegment[3] ?? 'UNKNOWN';
        $orderDate = $begSegment[4] ?? '';

        $dtmSegment = $segments['DTM'][0] ?? [];
        $deliveryDate = $this->extractDateFromDTM($segments['DTM'] ?? []);

        // Extract partner info from N1 segment, or fallback to ISA/GS sender info
        $n1Segments = $segments['N1'] ?? [];
        $partnerName = $n1Segments[0][2] ?? $this->extractSenderFromISA($segments);
        $n3Segment = $segments['N3'][0] ?? [];
        $partnerAddress = $n3Segment[1] ?? '';
        $n4Segment = $segments['N4'][0] ?? [];
        $partnerCity = $n4Segment[1] ?? '';
        $partnerState = $n4Segment[2] ?? '';
        $partnerZip = $n4Segment[3] ?? '';

        // Extract line items
        $po1Segments = $segments['PO1'] ?? [];
        foreach ($po1Segments as $index => $po1) {
            $lineNumber = $po1[1] ?? ($index + 1);
            $itemNumber = $po1[7] ?? '';
            $quantity = $po1[2] ?? '';
            $uom = $po1[3] ?? '';
            $unitPrice = $po1[4] ?? '';

            // Find description from PID segment
            $pidSegment = $segments['PID'][$index] ?? [];
            $description = $pidSegment[5] ?? '';

            $rows[] = [
                '850', // Transaction Type
                $segments['ISA'][0][13] ?? '',  // Control Number
                $poNumber,
                $orderDate,
                $deliveryDate,
                $partnerName,
                $partnerAddress,
                $partnerCity,
                $partnerState,
                $partnerZip,
                $lineNumber,
                $itemNumber,
                $quantity,
                $uom,
                $unitPrice,
                $description
            ];
        }

        return $this->arrayToCSV($rows);
    }

    /**
     * Convert 855 (Order Confirmation) to CSV
     */
    private function convert855(array $segments): string
    {
        $rows = [];
        $headers = [
            'Transaction_Type',
            'Control_Number',
            'PO_Number',
            'Confirmation_Date',
            'Confirmation_Status',
            'Partner_Name',
            'Line_Number',
            'Item_Number',
            'Accepted_Quantity',
            'Unit_Of_Measure',
            'Unit_Price',
            'Status_Code',
            'Notes'
        ];

        $rows[] = $headers;

        $begSegment = $segments['BEG'][0] ?? [];
        $poNumber = $begSegment[3] ?? '';
        $confirmationDate = $begSegment[4] ?? '';
        $confirmationStatus = $begSegment[1] ?? '';

        $n1Segment = $segments['N1'][0] ?? [];
        $partnerName = $n1Segment[2] ?? $this->extractSenderFromISA($segments);

        $po1Segments = $segments['PO1'] ?? [];
        foreach ($po1Segments as $index => $po1) {
            $rows[] = [
                '855',
                $segments['ISA'][0][13] ?? '',
                $poNumber,
                $confirmationDate,
                $confirmationStatus,
                $partnerName,
                $po1[1] ?? ($index + 1),
                $po1[2] ?? '',
                $po1[3] ?? '',
                $po1[4] ?? '',
                $po1[5] ?? '',
                $segments['AK5'][$index][1] ?? 'A', // Acceptance status
                $segments['AK3'][$index][4] ?? '' // Notes
            ];
        }

        return $this->arrayToCSV($rows);
    }

    /**
     * Convert 856 (Advance Ship Notice) to CSV
     */
    private function convert856(array $segments): string
    {
        $rows = [];
        $headers = [
            'Transaction_Type',
            'Control_Number',
            'Shipment_Number',
            'Ship_Date',
            'Delivery_Date',
            'Carrier_Code',
            'Carrier_Name',
            'Pro_Number',
            'Line_Number',
            'Item_Number',
            'Shipped_Quantity',
            'Unit_Of_Measure',
            'Lot_Number',
            'Serial_Number',
            'Container_Number'
        ];

        $rows[] = $headers;

        $begSegment = $segments['BEG'][0] ?? [];
        $shipmentNumber = $begSegment[2] ?? '';
        $shipDate = $begSegment[4] ?? '';

        $carrier = $this->extractCarrierInfo($segments);

        $hlSegments = $segments['HL'] ?? [];
        foreach ($hlSegments as $hlSegment) {
            // Skip hierarchy levels that aren't line items
            if (($hlSegment[3] ?? null) !== '0')
                continue;

            $po1Data = $this->findRelatedPO1($hlSegment[1] ?? '', $segments);
            if (!$po1Data)
                continue;

            $rows[] = [
                '856',
                $segments['ISA'][0][13] ?? '',
                $shipmentNumber,
                $shipDate,
                $this->extractDeliveryDate($segments),
                $carrier['code'] ?? '',
                $carrier['name'] ?? '',
                $this->extractProNumber($segments),
                $po1Data['line_number'] ?? '',
                $po1Data['item_number'] ?? '',
                $hlSegment[9] ?? '', // Quantity
                $hlSegment[10] ?? '', // UOM
                '', // Lot number
                '', // Serial number
                $hlSegment[1] ?? '' // Container number
            ];
        }

        return $this->arrayToCSV($rows);
    }

    /**
     * Convert 810 (Invoice) to CSV
     */
    private function convert810(array $segments): string
    {
        $rows = [];
        $headers = [
            'Transaction_Type',
            'Control_Number',
            'Invoice_Number',
            'Invoice_Date',
            'PO_Number',
            'Partner_Name',
            'Line_Number',
            'Item_Number',
            'Description',
            'Quantity',
            'Unit_Of_Measure',
            'Unit_Price',
            'Line_Amount',
            'Tax_Amount',
            'Invoice_Subtotal',
            'Invoice_Total',
            'Invoice_Status'
        ];

        $rows[] = $headers;

        $bigSegment = $segments['BIG'][0] ?? [];
        $invoiceNumber = $bigSegment[1] ?? '';
        $invoiceDate = $bigSegment[2] ?? '';
        $poNumber = $bigSegment[3] ?? '';

        $n1Segment = $segments['N1'][0] ?? [];
        $partnerName = $n1Segment[2] ?? $this->extractSenderFromISA($segments);

        $it1Segments = $segments['IT1'] ?? [];
        $subtotal = 0;
        foreach ($it1Segments as $index => $it1) {
            $quantity = (float) ($it1[2] ?? 0);
            $unitPrice = (float) ($it1[4] ?? 0);
            $lineAmount = $quantity * $unitPrice;
            $subtotal += $lineAmount;

            $rows[] = [
                '810',
                $segments['ISA'][0][13] ?? '',
                $invoiceNumber,
                $invoiceDate,
                $poNumber,
                $partnerName,
                $it1[1] ?? ($index + 1),
                $it1[3] ?? '',
                $segments['PID'][$index][5] ?? '',
                $quantity,
                $it1[5] ?? '',
                $unitPrice,
                $lineAmount,
                '', // Tax per line (usually in separate segments)
                $subtotal,
                '', // Invoice total (calculated later)
                'INVOICE'
            ];
        }

        // Add summary row with totals
        $totalAmount = $this->extractInvoiceTotal($segments, $subtotal);
        $rows[] = [
            '810',
            '',
            $invoiceNumber,
            $invoiceDate,
            $poNumber,
            $partnerName,
            'TOTAL',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            $subtotal,
            $totalAmount,
            'INVOICE'
        ];

        return $this->arrayToCSV($rows);
    }

    /**
     * Generic conversion for unknown transaction types
     */
    private function convertGeneric(array $segments): string
    {
        $rows = [];

        foreach ($segments as $segmentType => $segmentData) {
            foreach ($segmentData as $index => $segment) {
                $row = [$segmentType];
                $row = array_merge($row, $segment);
                $rows[] = $row;
            }
        }

        return $this->arrayToCSV($rows);
    }

    /**
     * Parse X12 segments into structured array
     */
    private function parseX12Segments(string $payload): array
    {
        $segments = [];

        // Handle both single-line (~ delimited) and multi-line formats
        if (strpos($payload, "\n") === false) {
            // Single-line format: split by ~
            $lines = explode('~', $payload);
        } else {
            // Multi-line format: split by newline
            $lines = explode("\n", $payload);
        }

        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line))
                continue;

            // Remove segment terminator (~) if present
            $line = rtrim($line, '~');

            $parts = explode('*', $line);
            $segmentType = $parts[0] ?? null;

            if ($segmentType) {
                if (!isset($segments[$segmentType])) {
                    $segments[$segmentType] = [];
                }
                $segments[$segmentType][] = $parts;
            }
        }

        return $segments;
    }

    /**
     * Convert array to CSV string
     */
    private function arrayToCSV(array $rows): string
    {
        $csv = '';
        foreach ($rows as $row) {
            $csv .= $this->escapeCSVRow($row) . "\n";
        }
        return trim($csv);
    }

    /**
     * Escape and format a CSV row
     */
    private function escapeCSVRow(array $row): string
    {
        $escaped = [];
        foreach ($row as $field) {
            $field = (string) $field;
            // Quote fields containing comma, quote, or newline
            if (strpos($field, ',') !== false || strpos($field, '"') !== false || strpos($field, "\n") !== false) {
                $field = '"' . str_replace('"', '""', $field) . '"';
            }
            $escaped[] = $field;
        }
        return implode(',', $escaped);
    }

    /**
     * Helper: Extract delivery date from DTM segments
     */
    private function extractDateFromDTM(array $dtmSegments): string
    {
        foreach ($dtmSegments as $dtm) {
            if (($dtm[1] ?? null) === '002') { // Delivery date
                return $dtm[2] ?? '';
            }
        }
        return '';
    }

    /**
     * Helper: Extract carrier information
     */
    private function extractCarrierInfo(array $segments): array
    {
        $carrier = ['code' => '', 'name' => ''];
        $caSegments = $segments['CA'] ?? [];
        if (!empty($caSegments)) {
            $carrier['code'] = $caSegments[0][2] ?? '';
            $carrier['name'] = $caSegments[0][3] ?? '';
        }
        return $carrier;
    }

    /**
     * Helper: Extract PRO number from segments
     */
    private function extractProNumber(array $segments): string
    {
        $refSegments = $segments['REF'] ?? [];
        foreach ($refSegments as $ref) {
            if (($ref[1] ?? null) === 'CN') { // Pro/Bill number
                return $ref[2] ?? '';
            }
        }
        return '';
    }

    /**
     * Helper: Extract delivery date from 856
     */
    private function extractDeliveryDate(array $segments): string
    {
        return $this->extractDateFromDTM($segments['DTM'] ?? []);
    }

    /**
     * Helper: Find related PO1 segment
     */
    private function findRelatedPO1(string $hlNumber, array $segments): ?array
    {
        $po1Segments = $segments['PO1'] ?? [];
        if (!empty($po1Segments)) {
            $po1 = $po1Segments[0];
            return [
                'line_number' => $po1[1] ?? '',
                'item_number' => $po1[2] ?? '',
                'quantity' => $po1[3] ?? '',
                'uom' => $po1[4] ?? '',
                'price' => $po1[5] ?? '',
            ];
        }
        return null;
    }

    /**
     * Helper: Extract sender identity from ISA/GS segments when N1 is missing
     */
    private function extractSenderFromISA(array $segments): string
    {
        // Try GS segment first (sender code)
        $gsSegment = $segments['GS'][0] ?? null;
        if ($gsSegment && isset($gsSegment[2])) {
            $sender = trim($gsSegment[2]);
            if (!empty($sender)) {
                return $sender;
            }
        }

        // Fall back to ISA segment (sender ID)
        $isaSegment = $segments['ISA'][0] ?? null;
        if ($isaSegment && isset($isaSegment[6])) {
            $sender = trim($isaSegment[6]);
            if (!empty($sender)) {
                return $sender;
            }
        }

        return 'UNKNOWN';
    }

    /**
     * Helper: Extract total invoice amount
     */
    private function extractInvoiceTotal(array $segments, float $subtotal): float
    {
        $amtSegments = $segments['AMT'] ?? [];
        foreach ($amtSegments as $amt) {
            if (($amt[1] ?? null) === 'TT') { // Total amount due
                return (float) ($amt[2] ?? $subtotal);
            }
        }
        return $subtotal;
    }
}
