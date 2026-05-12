<?php

namespace App\Services\Edi\Converters;

use App\Services\Edi\Contracts\EdiConverterContract;

/**
 * Converts CSV format back to X12 EDI format
 * 
 * This converter takes CSV input and reconstructs the X12 EDI format
 * with proper envelope (ISA/GS/ST) and segment structure
 */
class CSVToX12Converter implements EdiConverterContract
{
    private array $metadata = [];
    private int $isaControlNumber = 0;
    private int $gsControlNumber = 0;
    private int $stControlNumber = 0;
    private string $partnerId = '';

    /**
     * Convert CSV payload to X12 EDI format
     *
     * @param string $payload CSV payload
     * @param array $options Conversion options (partnerId, senderId, receiverId, etc.)
     * @return string X12 EDI payload
     */
    public function convert(string $payload, array $options = []): string
    {
        if (!$this->validate($payload)) {
            throw new \Exception('Invalid CSV payload format');
        }

        $this->partnerId = $options['partner_id'] ?? 'UNKNOWN';
        $this->isaControlNumber = (int)($options['isa_control_number'] ?? 1);
        $this->gsControlNumber = (int)($options['gs_control_number'] ?? 1);
        $this->stControlNumber = (int)($options['st_control_number'] ?? 1);

        // Parse CSV
        $rows = $this->parseCSV($payload);
        if (empty($rows)) {
            throw new \Exception('Empty CSV data');
        }

        $headers = array_shift($rows);
        $transactionType = $this->detectTransactionType($headers);
        $this->metadata['transaction_type'] = $transactionType;
        $this->metadata['row_count'] = count($rows);

        // Convert based on transaction type
        $x12Segments = match ($transactionType) {
            '850' => $this->convert850($headers, $rows),
            '855' => $this->convert855($headers, $rows),
            '856' => $this->convert856($headers, $rows),
            '810' => $this->convert810($headers, $rows),
            default => $this->convertGeneric($headers, $rows),
        };

        // Build complete X12 with envelope
        return $this->buildX12Envelope($transactionType, $x12Segments, $options);
    }

    /**
     * Validate CSV format (basic check)
     */
    public function validate(string $payload): bool
    {
        if (empty(trim($payload))) {
            return false;
        }

        // Parse CSV lines
        $lines = str_getcsv($payload, "\n");
        
        // Must have header + at least 1 data row
        if (count($lines) < 2) {
            return false;
        }

        // Verify first line (headers) has content
        $firstLine = str_getcsv($lines[0]);
        return !empty($firstLine) && !empty(array_filter($firstLine));
    }

    /**
     * Get conversion metadata
     */
    public function getMetadata(): array
    {
        return $this->metadata;
    }

    /**
     * Convert 850 CSV to X12
     */
    private function convert850(array $headers, array $rows): array
    {
        $segments = [];
        $headerMap = array_flip($headers);

        // Use first data row for PO header info
        if (empty($rows)) {
            throw new \Exception('No data rows in CSV');
        }

        $firstRow = $rows[0];
        $poNumber = $firstRow[$headerMap['PO_Number'] ?? -1] ?? '';
        $orderDate = $firstRow[$headerMap['Order_Date'] ?? -1] ?? date('Ymd');
        $deliveryDate = $firstRow[$headerMap['Delivery_Date'] ?? -1] ?? '';
        $partnerName = $firstRow[$headerMap['Partner_Name'] ?? -1] ?? '';
        $partnerAddress = $firstRow[$headerMap['Partner_Address'] ?? -1] ?? '';
        $partnerCity = $firstRow[$headerMap['Partner_City'] ?? -1] ?? '';
        $partnerState = $firstRow[$headerMap['Partner_State'] ?? -1] ?? '';
        $partnerZip = $firstRow[$headerMap['Partner_Zip'] ?? -1] ?? '';

        // BEG segment (Beginning of Purchase Order)
        // BEG*transaction_set_purpose_code*purchase_order_type_code*po_number*po_date
        $segments[] = "BEG*00*SA*{$poNumber}*{$orderDate}";

        // N1 segments (Name and Address)
        $segments[] = "N1*BY*{$partnerName}";
        if ($partnerAddress) {
            $segments[] = "N3*{$partnerAddress}";
        }
        if ($partnerCity || $partnerState) {
            $segments[] = "N4*{$partnerCity}*{$partnerState}*{$partnerZip}";
        }

        // DTM segments (Date/Time)
        $segments[] = "DTM*002*{$deliveryDate}"; // Requested delivery date

        // Line items
        $lineCount = 0;
        $itemCount = 0;
        foreach ($rows as $row) {
            $lineNumber = $row[$headerMap['Line_Number'] ?? -1] ?? ++$lineCount;
            $itemNumber = $row[$headerMap['Item_Number'] ?? -1] ?? '';
            $quantity = $row[$headerMap['Quantity'] ?? -1] ?? '';
            $uom = $row[$headerMap['Unit_Of_Measure'] ?? -1] ?? 'EA';
            $unitPrice = $row[$headerMap['Unit_Price'] ?? -1] ?? '0';
            $description = $row[$headerMap['Description'] ?? -1] ?? '';

            // PO1 segment (Baseline Item Data)
            $segments[] = "PO1*{$lineNumber}*{$quantity}*{$uom}*{$unitPrice}*{$itemNumber}";

            // PID segment (Product/Item Description)
            if ($description) {
                $segments[] = "PID*F****{$description}";
            }

            $itemCount++;
        }

        // CTT segment (Transaction Totals) - line count
        $segments[] = "CTT*{$itemCount}";

        return $segments;
    }

    /**
     * Convert 855 CSV to X12
     */
    private function convert855(array $headers, array $rows): array
    {
        $segments = [];
        $headerMap = array_flip($headers);

        if (empty($rows)) {
            throw new \Exception('No data rows in CSV');
        }

        $firstRow = $rows[0];
        $poNumber = $firstRow[$headerMap['PO_Number'] ?? -1] ?? '';
        $confirmationDate = $firstRow[$headerMap['Confirmation_Date'] ?? -1] ?? date('Ymd');
        $status = $firstRow[$headerMap['Confirmation_Status'] ?? -1] ?? '1'; // Accepted
        $partnerName = $firstRow[$headerMap['Partner_Name'] ?? -1] ?? '';

        // BEG segment
        $segments[] = "BEG*{$status}*SA*{$poNumber}*{$confirmationDate}";

        // N1 segment
        $segments[] = "N1*ST*{$partnerName}";

        // Line items
        $lineCount = 0;
        $itemCount = 0;
        foreach ($rows as $row) {
            $lineNumber = $row[$headerMap['Line_Number'] ?? -1] ?? ++$lineCount;
            $itemNumber = $row[$headerMap['Item_Number'] ?? -1] ?? '';
            $quantity = $row[$headerMap['Accepted_Quantity'] ?? -1] ?? '';
            $uom = $row[$headerMap['Unit_Of_Measure'] ?? -1] ?? 'EA';
            $unitPrice = $row[$headerMap['Unit_Price'] ?? -1] ?? '0';
            $statusCode = $row[$headerMap['Status_Code'] ?? -1] ?? 'A'; // Accepted
            $notes = $row[$headerMap['Notes'] ?? -1] ?? '';

            // PO1 segment
            $segments[] = "PO1*{$lineNumber}*{$quantity}*{$uom}*{$unitPrice}*{$itemNumber}";

            // AK5 segment (Line Item Detail) - acceptance status
            $segments[] = "AK5*{$statusCode}";

            if ($notes) {
                $segments[] = "AK3*3*{$notes}";
            }

            $itemCount++;
        }

        // CTT segment
        $segments[] = "CTT*{$itemCount}";

        return $segments;
    }

    /**
     * Convert 856 CSV to X12
     */
    private function convert856(array $headers, array $rows): array
    {
        $segments = [];
        $headerMap = array_flip($headers);

        if (empty($rows)) {
            throw new \Exception('No data rows in CSV');
        }

        $firstRow = $rows[0];
        $shipmentNumber = $firstRow[$headerMap['Shipment_Number'] ?? -1] ?? uniqid('SHP');
        $shipDate = $firstRow[$headerMap['Ship_Date'] ?? -1] ?? date('Ymd');
        $deliveryDate = $firstRow[$headerMap['Delivery_Date'] ?? -1] ?? '';
        $proNumber = $firstRow[$headerMap['Pro_Number'] ?? -1] ?? '';

        // BEG segment (Beginning of Purchase Order)
        $segments[] = "BEG*00*SA*{$shipmentNumber}*{$shipDate}";

        // DTM segments
        if ($deliveryDate) {
            $segments[] = "DTM*002*{$deliveryDate}";
        }

        // Carrier info (CA segment)
        $carrierCode = $firstRow[$headerMap['Carrier_Code'] ?? -1] ?? '';
        $carrierName = $firstRow[$headerMap['Carrier_Name'] ?? -1] ?? '';
        if ($carrierCode || $proNumber) {
            $segments[] = "CA*{$carrierCode}*{$carrierName}";
        }

        // REF segment for PRO number
        if ($proNumber) {
            $segments[] = "REF*CN*{$proNumber}";
        }

        // Shipment detail
        $hierLevel = 1;
        $lineCount = 0;
        foreach ($rows as $row) {
            $lineNumber = $row[$headerMap['Line_Number'] ?? -1] ?? ++$lineCount;
            $itemNumber = $row[$headerMap['Item_Number'] ?? -1] ?? '';
            $quantity = $row[$headerMap['Shipped_Quantity'] ?? -1] ?? '';
            $uom = $row[$headerMap['Unit_Of_Measure'] ?? -1] ?? 'EA';
            $lotNumber = $row[$headerMap['Lot_Number'] ?? -1] ?? '';
            $serialNumber = $row[$headerMap['Serial_Number'] ?? -1] ?? '';

            // HL segment (Hierarchical Level)
            $segments[] = "HL*{$hierLevel}***O*{$quantity}*{$uom}";

            // LIN segment (Item Information)
            $segments[] = "LIN*{$lineNumber}*IN*{$itemNumber}";

            // SN segment (Serial Number) if applicable
            if ($serialNumber) {
                $segments[] = "SN*{$serialNumber}";
            }

            $hierLevel++;
        }

        return $segments;
    }

    /**
     * Convert 810 CSV to X12
     */
    private function convert810(array $headers, array $rows): array
    {
        $segments = [];
        $headerMap = array_flip($headers);

        if (empty($rows)) {
            throw new \Exception('No data rows in CSV');
        }

        $firstRow = $rows[0];
        $invoiceNumber = $firstRow[$headerMap['Invoice_Number'] ?? -1] ?? '';
        $invoiceDate = $firstRow[$headerMap['Invoice_Date'] ?? -1] ?? date('Ymd');
        $poNumber = $firstRow[$headerMap['PO_Number'] ?? -1] ?? '';
        $partnerName = $firstRow[$headerMap['Partner_Name'] ?? -1] ?? '';

        // BIG segment (Beginning of Invoice)
        $segments[] = "BIG*{$invoiceNumber}*{$invoiceDate}*{$poNumber}";

        // N1 segment
        $segments[] = "N1*ST*{$partnerName}";

        // Line items
        $lineCount = 0;
        $subtotal = 0;
        $taxAmount = 0;

        foreach ($rows as $row) {
            $lineName = $row[$headerMap['Line_Number'] ?? -1] ?? '';
            
            // Skip total rows
            if (strtoupper($lineName) === 'TOTAL') {
                $subtotal = (float)($row[$headerMap['Invoice_Subtotal'] ?? -1] ?? 0);
                $totalAmount = (float)($row[$headerMap['Invoice_Total'] ?? -1] ?? $subtotal);
                continue;
            }

            $itemNumber = $row[$headerMap['Item_Number'] ?? -1] ?? '';
            $quantity = (float)($row[$headerMap['Quantity'] ?? -1] ?? 0);
            $unitPrice = (float)($row[$headerMap['Unit_Price'] ?? -1] ?? 0);
            $lineAmount = (float)($row[$headerMap['Line_Amount'] ?? -1] ?? 0);
            $description = $row[$headerMap['Description'] ?? -1] ?? '';

            $lineCount++;
            
            // IT1 segment (Baseline Item Data for Invoice)
            $segments[] = "IT1*{$lineCount}*{$quantity}*EA*{$unitPrice}*{$itemNumber}";

            // PID segment
            if ($description) {
                $segments[] = "PID*F****{$description}";
            }
        }

        // TXI segment (Tax Information) if applicable
        if ($taxAmount > 0) {
            $segments[] = "TXI*TX*{$taxAmount}";
        }

        // CTT segment
        $segments[] = "CTT*{$lineCount}";

        // AMT segments (Amounts)
        if ($subtotal > 0) {
            $segments[] = "AMT*1*{$subtotal}"; // Amount subject to discount
        }

        return $segments;
    }

    /**
     * Generic conversion for unknown types
     */
    private function convertGeneric(array $headers, array $rows): array
    {
        $segments = [];
        foreach ($rows as $row) {
            $segment = implode('*', $row);
            $segments[] = $segment;
        }
        return $segments;
    }

    /**
     * Build complete X12 envelope with ISA/GS/ST/SE/GE/IEA
     */
    private function buildX12Envelope(string $transactionType, array $segments, array $options): string
    {
        $senderId = $options['sender_id'] ?? 'SENDER001';
        $receiverId = $options['receiver_id'] ?? 'RECEIVER01';
        $senderId = str_pad($senderId, 15);
        $receiverId = str_pad($receiverId, 15);

        $timestamp = date('yyMMddHHmm');
        $isaControlNumber = str_pad((string)$this->isaControlNumber, 9, '0', STR_PAD_LEFT);
        $gsControlNumber = str_pad((string)$this->gsControlNumber, 5, '0', STR_PAD_LEFT);
        $stControlNumber = str_pad((string)$this->stControlNumber, 9, '0', STR_PAD_LEFT);

        $x12 = '';

        // ISA segment (Interchange Control Header)
        $x12 .= "ISA*00*          *00*          *ZZ*{$senderId}*ZZ*{$receiverId}*" . date('yyMMdd') . "*" . date('HHmm') . "*U*005010*{$isaControlNumber}*0*P*:~\n";

        // GS segment (Functional Group Header)
        $functionalCode = $this->getFunctionalCode($transactionType);
        $x12 .= "GS*{$functionalCode}*{$senderId}*{$receiverId}*{$timestamp}*{$gsControlNumber}*1*X*005010~\n";

        // ST segment (Transaction Set Header)
        $segmentCount = count($segments) + 2; // +2 for ST and SE
        $x12 .= "ST*{$transactionType}*{$stControlNumber}~\n";

        // Add data segments
        foreach ($segments as $segment) {
            $x12 .= $segment . "~\n";
        }

        // SE segment (Transaction Set Trailer)
        $x12 .= "SE*{$segmentCount}*{$stControlNumber}~\n";

        // GE segment (Functional Group Trailer)
        $x12 .= "GE*1*{$gsControlNumber}~\n";

        // IEA segment (Interchange Control Trailer)
        $x12 .= "IEA*1*{$isaControlNumber}~";

        return $x12;
    }

    /**
     * Parse CSV string to array
     */
    private function parseCSV(string $payload): array
    {
        $rows = [];
        $lines = str_getcsv($payload, "\n");

        foreach ($lines as $line) {
            if (empty(trim($line))) continue;
            
            // Parse CSV line with proper quote handling
            $row = str_getcsv($line);
            $rows[] = $row;
        }

        return $rows;
    }

    /**
     * Detect transaction type from CSV headers
     */
    private function detectTransactionType(array $headers): string
    {
        $headerLower = array_map('strtolower', $headers);
        
        if (in_array('po_number', $headerLower)) {
            return '850';
        } elseif (in_array('confirmation_status', $headerLower)) {
            return '855';
        } elseif (in_array('shipment_number', $headerLower)) {
            return '856';
        } elseif (in_array('invoice_number', $headerLower)) {
            return '810';
        }

        // Default to 850 (most common)
        return '850';
    }

    /**
     * Get X12 functional code for transaction type
     */
    private function getFunctionalCode(string $transactionType): string
    {
        return match ($transactionType) {
            '850' => 'PO',  // Purchase Order
            '855' => 'OK',  // Order Confirmation
            '856' => 'SH',  // Shipment Notice
            '810' => 'IN',  // Invoice
            default => 'XX',
        };
    }
}
