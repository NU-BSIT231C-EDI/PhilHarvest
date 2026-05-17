<?php

namespace App\Services\Edi\Parsers;

use App\DTOs\Edi\Edi850PurchaseOrderDto;
use App\DTOs\Edi\Edi850LineItemDto;
use Illuminate\Support\Facades\Log;

/**
 * X12 850 (Purchase Order) Parser
 * 
 * Parses raw X12 EDI 850 strings into structured DTOs
 */
class Edi850Parser
{
    private array $segments = [];
    private int $currentIndex = 0;

    /**
     * Parse raw X12 850 string
     */
    public function parse(string $rawEdi): Edi850PurchaseOrderDto
    {
        try {
            $this->segments = $this->tokenizeX12($rawEdi);
            $this->currentIndex = 0;

            // Extract key segments
            $bgn = $this->findSegment('BEG');  // Beginning of Purchase Order
            $dtm = $this->findSegment('DTM');  // Dates
            $n1 = $this->findSegments('N1');   // Names

            // Parse BEG segment for PO info
            $poNumber = $bgn[3] ?? 'UNKNOWN';  // BEG position 3 is PO number (after type)
            // Try to get date from DTM first, fall back to BEG segment
            $poDate = $this->parseDateFromDTM($dtm, 'PO')
                ?? $this->formatX12Date($bgn[4] ?? null)
                ?? date('Y-m-d'); // Fallback to today's date

            // Find manufacturer info
            $manufacturerInfo = $this->parseManufacturerInfo($n1);

            // Create DTO
            $dto = new Edi850PurchaseOrderDto(
                controlNumber: $this->extractControlNumber(),
                poNumber: $poNumber,
                poDate: $poDate,
                manufacturerId: $manufacturerInfo['id'],
                manufacturerName: $manufacturerInfo['name'],
                shippingDate: $this->parseDateFromDTM($dtm, 'SHIP'),
                deliveryDate: $this->parseDateFromDTM($dtm, 'DELIV'),
                currency: $this->getCurrency(),
                shipToAddress: $this->parseAddressSegments($n1, 'ST'),
                billToAddress: $this->parseAddressSegments($n1, 'BT'),
            );

            // Parse line items
            $lineItems = $this->findSegments('PO1');
            foreach ($lineItems as $lineItem) {
                $dto->addLineItem($this->parseLineItem($lineItem));
            }

            return $dto;

        } catch (\Exception $e) {
            Log::error('Error parsing 850: ' . $e->getMessage());
            throw new \InvalidArgumentException('Failed to parse X12 850: ' . $e->getMessage());
        }
    }

    /**
     * Tokenize X12 string into segments
     */
    private function tokenizeX12(string $rawEdi): array
    {
        // X12 uses tilde (~) as segment terminator
        $segments = explode('~', $rawEdi);
        $result = [];

        foreach ($segments as $segment) {
            $segment = trim($segment);
            if (empty($segment)) {
                continue;
            }
            // Fields are separated by asterisk (*)
            $fields = explode('*', $segment);
            $result[] = $fields;
        }

        return $result;
    }

    /**
     * Find a single segment by type
     */
    private function findSegment(string $type): ?array
    {
        foreach ($this->segments as $segment) {
            if (!empty($segment[0]) && $segment[0] === $type) {
                return $segment;
            }
        }
        return null;
    }

    /**
     * Find all segments of a type
     */
    private function findSegments(string $type): array
    {
        $results = [];
        foreach ($this->segments as $segment) {
            if (!empty($segment[0]) && $segment[0] === $type) {
                $results[] = $segment;
            }
        }
        return $results;
    }

    /**
     * Extract control number from ISA segment
     */
    private function extractControlNumber(): string
    {
        $isa = $this->findSegment('ISA');
        if ($isa && isset($isa[13])) {
            return trim($isa[13]);
        }
        return uniqid('EDI850_');
    }

    /**
     * Parse date from DTM segment
     */
    private function parseDateFromDTM(?array $dtm = null, string $qualifier = ''): ?string
    {
        if (!$dtm) {
            return null;
        }

        // DTM format: DTM*qualifier*date*time
        if ($dtm[1] === $qualifier) {
            return $this->formatX12Date($dtm[2] ?? null);
        }

        return null;
    }

    /**
     * Format X12 date (CCYYMMDD) to standard format
     */
    protected function formatX12Date(?string $dateStr): ?string
    {
        if (!$dateStr || strlen($dateStr) < 8) {
            return null;
        }

        $year = substr($dateStr, 0, 4);
        $month = substr($dateStr, 4, 2);
        $day = substr($dateStr, 6, 2);

        return "$year-$month-$day";
    }

    /**
     * Parse manufacturer information from N1 segments
     */
    private function parseManufacturerInfo(array $n1Segments): array
    {
        foreach ($n1Segments as $n1) {
            if ($n1[1] === 'MF') {  // MF = Manufacturer
                return [
                    'id' => $n1[3] ?? 'UNKNOWN',
                    'name' => $n1[2] ?? 'Unknown Manufacturer',
                ];
            }
        }
        return ['id' => 'UNKNOWN', 'name' => 'Unknown Manufacturer'];
    }

    /**
     * Parse address from N1 segments
     */
    private function parseAddressSegments(array $n1Segments, string $code): array
    {
        foreach ($n1Segments as $n1) {
            if ($n1[1] === $code) {
                // Find corresponding N2, N3, N4 segments
                return [
                    'company_name' => $n1[2] ?? '',
                    'company_id' => $n1[3] ?? '',
                ];
            }
        }
        return [];
    }

    /**
     * Parse a PO1 line item segment
     */
    private function parseLineItem(array $po1): Edi850LineItemDto
    {
        return new Edi850LineItemDto(
            lineNumber: $po1[1] ?? '0',
            partNumber: $po1[6] ?? 'UNKNOWN',
            partDescription: $po1[7] ?? '',
            quantity: (float)($po1[2] ?? 0),
            quantityUom: $po1[3] ?? 'EA',
            unitPrice: (float)($po1[4] ?? 0),
            lineAmount: (float)($po1[5] ?? null),
        );
    }

    /**
     * Get currency code
     */
    private function getCurrency(): string
    {
        // Look for ITD segment with currency info
        $itd = $this->findSegment('ITD');
        if ($itd && isset($itd[8])) {
            return $itd[8];
        }
        return 'USD';
    }
}
