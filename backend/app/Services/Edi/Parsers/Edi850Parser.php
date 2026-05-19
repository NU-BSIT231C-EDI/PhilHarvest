<?php

namespace App\Services\Edi\Parsers;

use App\DTOs\Edi\Edi850PurchaseOrderDto;
use App\DTOs\Edi\Edi850LineItemDto;
use Illuminate\Support\Facades\Log;

/**
 * X12 850 (Purchase Order) Parser
 *
 * Parses raw X12 850 strings into structured DTOs.
 *
 * Design principles:
 *  - Extracted data: values read directly from EDI segments
 *  - Computed data:  values derived from extracted data (e.g. line_amount = qty × price)
 *  - No fabrication: absent optional segments produce null, never invented strings
 */
class Edi850Parser
{
    private array $segments = [];

    public function parse(string $rawEdi): Edi850PurchaseOrderDto
    {
        try {
            $this->segments = $this->tokenizeX12($rawEdi);

            $beg         = $this->findSegment('BEG');
            $dtmSegments = $this->findSegments('DTM');
            $n1Segments  = $this->findSegments('N1');
            $ctt         = $this->findSegment('CTT');

            // BEG[3] = Purchase Order Number
            // BEG[5] = Date (CCYYMMDD) when Release Number (BEG[4]) is present
            // BEG[4] = Date when Release Number is omitted (non-standard but common)
            $poNumber = isset($beg[3]) && $beg[3] !== '' ? $beg[3] : 'UNKNOWN';
            $poDate   = $this->parseDateFromDTMList($dtmSegments, '004')   // preferred: explicit DTM
                ?? $this->formatX12Date($beg[5] ?? null)                   // standard BEG position
                ?? $this->formatX12Date($beg[4] ?? null);                  // fallback: no release number

            $manufacturerInfo = $this->parseManufacturerInfo($n1Segments);

            $dto = new Edi850PurchaseOrderDto(
                controlNumber:   $this->extractControlNumber(),
                poNumber:        $poNumber,
                poDate:          $poDate,
                manufacturerId:  $manufacturerInfo['id'],
                manufacturerName: $manufacturerInfo['name'],
                shippingDate:    $this->parseDateFromDTMList($dtmSegments, '011'),
                deliveryDate:    $this->parseDateFromDTMList($dtmSegments, '002'),
                currency:        $this->getCurrency(),
                shipToAddress:   $this->parseAddressBlock('ST'),
                billToAddress:   $this->parseAddressBlock('BT'),
            );

            $po1Segments = $this->findSegments('PO1');
            foreach ($po1Segments as $po1) {
                $dto->addLineItem($this->parseLineItem($po1));
            }

            // CTT[1] = declared line item count, CTT[2] = hash total of quantities (not monetary)
            if ($ctt !== null) {
                $declaredCount  = (int)($ctt[1] ?? 0);
                $actualCount    = count($po1Segments);
                $hashTotal      = isset($ctt[2]) ? (float)$ctt[2] : null;
                $summedQuantity = array_sum(array_map(
                    static fn($li) => $li->quantity,
                    $dto->lineItems
                ));

                if ($declaredCount > 0 && $declaredCount !== $actualCount) {
                    Log::warning('EDI 850 CTT line count mismatch', [
                        'declared' => $declaredCount,
                        'actual'   => $actualCount,
                        'po_number' => $poNumber,
                    ]);
                }
                if ($hashTotal !== null && abs($hashTotal - $summedQuantity) > 0.001) {
                    Log::warning('EDI 850 CTT hash total mismatch', [
                        'ctt_hash_total'   => $hashTotal,
                        'summed_quantities' => $summedQuantity,
                        'po_number'         => $poNumber,
                    ]);
                }
            }

            return $dto;

        } catch (\Exception $e) {
            Log::error('Error parsing 850: ' . $e->getMessage());
            throw new \InvalidArgumentException('Failed to parse X12 850: ' . $e->getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Tokenisation
    // -------------------------------------------------------------------------

    private function tokenizeX12(string $rawEdi): array
    {
        $result = [];
        foreach (explode('~', $rawEdi) as $segment) {
            $segment = trim($segment);
            if ($segment !== '') {
                $result[] = explode('*', $segment);
            }
        }
        return $result;
    }

    // -------------------------------------------------------------------------
    // Segment lookup
    // -------------------------------------------------------------------------

    private function findSegment(string $type): ?array
    {
        foreach ($this->segments as $segment) {
            if (($segment[0] ?? '') === $type) {
                return $segment;
            }
        }
        return null;
    }

    private function findSegments(string $type): array
    {
        $results = [];
        foreach ($this->segments as $segment) {
            if (($segment[0] ?? '') === $type) {
                $results[] = $segment;
            }
        }
        return $results;
    }

    // -------------------------------------------------------------------------
    // Control number / sender ID
    // -------------------------------------------------------------------------

    private function extractControlNumber(): string
    {
        $isa = $this->findSegment('ISA');
        if ($isa && isset($isa[13])) {
            return trim($isa[13]);
        }
        return uniqid('EDI850_');
    }

    /**
     * ISA[6] = Interchange Sender ID (always present, 15-char padded).
     * Used as a fallback partner identifier when no N1*MF segment exists.
     */
    private function extractSenderId(): ?string
    {
        $isa = $this->findSegment('ISA');
        if ($isa && isset($isa[6])) {
            return trim($isa[6]) ?: null;
        }
        return null;
    }

    // -------------------------------------------------------------------------
    // Dates
    // -------------------------------------------------------------------------

    /**
     * Search a list of DTM segments for one with the given X12 qualifier code.
     *
     * Common 850 qualifiers:
     *   004 = Purchase Order date
     *   011 = Ship date
     *   002 = Delivery Requested date
     *   010 = Requested Ship date
     *   037 = Ship Not Before
     *   038 = Ship Not After
     */
    private function parseDateFromDTMList(array $dtmSegments, string $qualifier): ?string
    {
        foreach ($dtmSegments as $dtm) {
            if (($dtm[1] ?? '') === $qualifier) {
                return $this->formatX12Date($dtm[2] ?? null);
            }
        }
        return null;
    }

    protected function formatX12Date(?string $dateStr): ?string
    {
        if (!$dateStr || \strlen($dateStr) < 8) {
            return null;
        }
        return substr($dateStr, 0, 4) . '-' . substr($dateStr, 4, 2) . '-' . substr($dateStr, 6, 2);
    }

    // -------------------------------------------------------------------------
    // Manufacturer / party info
    // -------------------------------------------------------------------------

    /**
     * Look for an N1*MF segment.
     * When absent, fall back to the ISA sender ID as the partner identifier
     * so that partner_id is never null in the database.
     * Name is only populated from N1*MF — it is never fabricated.
     */
    private function parseManufacturerInfo(array $n1Segments): array
    {
        foreach ($n1Segments as $n1) {
            if (($n1[1] ?? '') === 'MF') {
                return [
                    'id'   => (isset($n1[3]) && $n1[3] !== '') ? $n1[3] : $this->extractSenderId(),
                    'name' => (isset($n1[2]) && $n1[2] !== '') ? $n1[2] : null,
                ];
            }
        }
        // No N1*MF: use ISA sender ID so partner_id is always populated
        return ['id' => $this->extractSenderId(), 'name' => null];
    }

    // -------------------------------------------------------------------------
    // Address block: N1 + optional N2 / N3 / N4
    // -------------------------------------------------------------------------

    /**
     * Find an N1 segment with the given entity code (e.g. 'ST', 'BT', 'MF')
     * and read the following N2/N3/N4 segments to build a complete address.
     */
    private function parseAddressBlock(string $code): array
    {
        // Find the position of this N1 in the full segment list
        $n1Position = null;
        foreach ($this->segments as $i => $seg) {
            if (($seg[0] ?? '') === 'N1' && ($seg[1] ?? '') === $code) {
                $n1Position = $i;
                break;
            }
        }

        if ($n1Position === null) {
            return [];
        }

        $n1 = $this->segments[$n1Position];
        $address = [
            'company_name' => (isset($n1[2]) && $n1[2] !== '') ? $n1[2] : null,
            'company_id'   => (isset($n1[3]) && $n1[3] !== '') ? $n1[3] : null,
            'id_qualifier' => (isset($n1[4]) && $n1[4] !== '') ? $n1[4] : null,
            'street'       => null,
            'city'         => null,
            'state'        => null,
            'postal_code'  => null,
            'country'      => null,
        ];

        // Walk forward to collect N2/N3/N4; stop at the next entity or transaction boundary
        static $boundarySegments = ['N1', 'PO1', 'CTT', 'SE', 'GE', 'IEA', 'BEG', 'ST'];

        for ($i = $n1Position + 1; $i < \count($this->segments); $i++) {
            $seg     = $this->segments[$i];
            $segType = $seg[0] ?? '';

            if ($segType === 'N2') {
                // N2 appends an additional name line
                $extra = trim($seg[1] ?? '');
                if ($extra !== '') {
                    $address['company_name'] = trim(($address['company_name'] ?? '') . ' ' . $extra);
                }
            } elseif ($segType === 'N3') {
                $address['street'] = (isset($seg[1]) && $seg[1] !== '') ? $seg[1] : null;
            } elseif ($segType === 'N4') {
                $address['city']        = (isset($seg[1]) && $seg[1] !== '') ? $seg[1] : null;
                $address['state']       = (isset($seg[2]) && $seg[2] !== '') ? $seg[2] : null;
                $address['postal_code'] = (isset($seg[3]) && $seg[3] !== '') ? $seg[3] : null;
                $address['country']     = (isset($seg[4]) && $seg[4] !== '') ? $seg[4] : null;
                break; // N4 ends the address block
            } elseif (\in_array($segType, $boundarySegments, true)) {
                break;
            }
        }

        return $address;
    }

    // -------------------------------------------------------------------------
    // Line items
    // -------------------------------------------------------------------------

    /**
     * Parse a PO1 segment into a line item DTO.
     *
     * PO1 element positions (0-indexed after segment ID):
     *   [1] Line number
     *   [2] Quantity ordered
     *   [3] Unit of measure
     *   [4] Unit price
     *   [5] Basis of unit price code  ← text qualifier, NOT a monetary amount — skip
     *   [6] Product ID qualifier 1    ← e.g. VP, IN, VN, UP
     *   [7] Product ID value 1        ← the actual identifier
     *   [8] Product ID qualifier 2    ← optional additional pair
     *   [9] Product ID value 2
     *   … repeating pairs …
     */
    private function parseLineItem(array $po1): Edi850LineItemDto
    {
        $primaryQualifier = isset($po1[6]) && $po1[6] !== '' ? $po1[6] : null;
        $primaryId        = isset($po1[7]) && $po1[7] !== '' ? $po1[7] : null;

        // Collect all qualifier/value pairs from index 6 onward
        $productIds = [];
        for ($i = 6; $i + 1 < \count($po1); $i += 2) {
            $qual = $po1[$i]     ?? '';
            $val  = $po1[$i + 1] ?? '';
            if ($qual !== '' && $val !== '') {
                $productIds[$qual] = $val;
            }
        }

        return new Edi850LineItemDto(
            lineNumber:         $po1[1] ?? '0',
            productIdQualifier: $primaryQualifier,
            partNumber:         $primaryId,
            productIds:         $productIds,
            partDescription:    null,           // sourced from PID segments, not PO1
            quantity:           (float)($po1[2] ?? 0),
            quantityUom:        (isset($po1[3]) && $po1[3] !== '') ? $po1[3] : 'EA',
            unitPrice:          (float)($po1[4] ?? 0),
            lineAmount:         null,           // DTO computes qty × price; PO1[5] is not an amount
        );
    }

    // -------------------------------------------------------------------------
    // Currency
    // -------------------------------------------------------------------------

    /**
     * Read currency from the CUR segment (CUR*qualifier*currency_code~).
     * Returns null when no CUR segment is present — does not assume USD.
     */
    private function getCurrency(): ?string
    {
        $cur = $this->findSegment('CUR');
        if ($cur && isset($cur[2]) && $cur[2] !== '') {
            return strtoupper($cur[2]);
        }
        return null;
    }
}
