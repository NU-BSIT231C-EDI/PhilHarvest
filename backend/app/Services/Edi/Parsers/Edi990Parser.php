<?php

namespace App\Services\Edi\Parsers;

use App\DTOs\Edi\Edi990ResponseDto;
use Illuminate\Support\Facades\Log;

/**
 * X12 990 (Response to Load Tender) Parser
 * 
 * Parses raw X12 EDI 990 strings from logistics partners
 */
class Edi990Parser
{
    private array $segments = [];

    /**
     * Parse raw X12 990 string
     */
    public function parse(string $rawEdi): Edi990ResponseDto
    {
        try {
            $this->segments = $this->tokenizeX12($rawEdi);

            // Extract key segments
            $bgn = $this->findSegment('BEG');  // Beginning
            $n1 = $this->findSegments('N1');   // Names (Carrier)
            $dtm = $this->findSegments('DTM'); // Dates

            // Parse response code
            $responseCode = $bgn[1] ?? 'UN';  // AA=Accept, RE=Reject, UN=Unknown

            $dto = new Edi990ResponseDto(
                controlNumber: $this->extractControlNumber(),
                responseCode: $responseCode,
                loadTenderId: $bgn[2] ?? 'UNKNOWN',
                carrierId: $this->getCarrierId($n1),
                carrierName: $this->getCarrierName($n1),
                responseDate: $this->parseDateFromDTM($dtm, '137'),
                estimatedPickupDate: $this->parseDateFromDTM($dtm, '063'),
                estimatedDeliveryDate: $this->parseDateFromDTM($dtm, '076'),
                rejectionReason: $responseCode === 'RE' ? $this->getRejectionReason() : null,
            );

            return $dto;

        } catch (\Exception $e) {
            Log::error('Error parsing 990: ' . $e->getMessage());
            throw new \InvalidArgumentException('Failed to parse X12 990: ' . $e->getMessage());
        }
    }

    /**
     * Tokenize X12 string into segments
     */
    private function tokenizeX12(string $rawEdi): array
    {
        $segments = explode('~', $rawEdi);
        $result = [];

        foreach ($segments as $segment) {
            $segment = trim($segment);
            if (empty($segment)) {
                continue;
            }
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
        return uniqid('EDI990_');
    }

    /**
     * Parse date from DTM segment with specific qualifier
     */
    private function parseDateFromDTM(array $dtmSegments, string $qualifier): ?string
    {
        foreach ($dtmSegments as $dtm) {
            if ($dtm[1] === $qualifier) {
                return $this->formatX12Date($dtm[2] ?? null);
            }
        }
        return null;
    }

    /**
     * Format X12 date (CCYYMMDD) to standard format
     */
    private function formatX12Date(?string $dateStr): ?string
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
     * Get carrier ID from N1 segments
     */
    private function getCarrierId(array $n1Segments): string
    {
        foreach ($n1Segments as $n1) {
            if ($n1[1] === 'CN') {  // CN = Carrier
                return $n1[3] ?? 'UNKNOWN';
            }
        }
        return 'UNKNOWN';
    }

    /**
     * Get carrier name from N1 segments
     */
    private function getCarrierName(array $n1Segments): string
    {
        foreach ($n1Segments as $n1) {
            if ($n1[1] === 'CN') {  // CN = Carrier
                return $n1[2] ?? 'Unknown Carrier';
            }
        }
        return 'Unknown Carrier';
    }

    /**
     * Get rejection reason from message segment
     */
    private function getRejectionReason(): ?string
    {
        // Look for NTE segment (Note/Special Instruction)
        $nte = $this->findSegment('NTE');
        if ($nte && isset($nte[3])) {
            return $nte[3];
        }
        return null;
    }
}
