<?php

namespace App\Services\Edi\Utilities;

/**
 * X12 EDI Format Utilities
 * 
 * Helper functions for X12 formatting, validation, and manipulation
 */
class X12Formatter
{
    private const SEGMENT_TERMINATOR = '~';
    private const FIELD_SEPARATOR = '*';
    private const COMPONENT_SEPARATOR = '^';
    private const REPETITION_SEPARATOR = '|';

    /**
     * Create a properly formatted address from array
     */
    public static function formatAddress(array $address): array
    {
        return [
            'street' => $address['street'] ?? $address['address_line_1'] ?? '',
            'city' => $address['city'] ?? '',
            'state' => $address['state'] ?? $address['province'] ?? '',
            'zip' => $address['zip'] ?? $address['postal_code'] ?? '',
            'country' => $address['country'] ?? 'US',
        ];
    }

    /**
     * Format date for X12 (CCYYMMDD format)
     */
    public static function formatDateForX12(\DateTime|string $date): string
    {
        if (is_string($date)) {
            $date = new \DateTime($date);
        }
        
        return $date->format('Ymd');
    }

    /**
     * Parse X12 date (CCYYMMDD) to DateTime
     */
    public static function parseX12Date(string $dateStr): ?\DateTime
    {
        if (strlen($dateStr) !== 8 || !is_numeric($dateStr)) {
            return null;
        }

        try {
            $year = substr($dateStr, 0, 4);
            $month = substr($dateStr, 4, 2);
            $day = substr($dateStr, 6, 2);
            
            return new \DateTime("$year-$month-$day");
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Format time for X12 (HHMM or HHMMSS format)
     */
    public static function formatTimeForX12(\DateTime|string|null $time, string $format = 'HHMM'): string
    {
        if ($time === null) {
            return date($format === 'HHMMSS' ? 'His' : 'Hi');
        }

        if (is_string($time)) {
            try {
                $time = new \DateTime($time);
            } catch (\Exception $e) {
                return date($format === 'HHMMSS' ? 'His' : 'Hi');
            }
        }

        return $format === 'HHMMSS' ? $time->format('His') : $time->format('Hi');
    }

    /**
     * Pad field value to exact length with spaces
     */
    public static function padField(string $value, int $length): string
    {
        return str_pad(substr($value, 0, $length), $length);
    }

    /**
     * Pad numeric value with leading zeros
     */
    public static function padNumeric($value, int $length): string
    {
        return str_pad((string)$value, $length, '0', STR_PAD_LEFT);
    }

    /**
     * Escape special characters in X12 field values
     */
    public static function escapeFieldValue(string $value): string
    {
        // X12 typically doesn't escape; it uses segment and field separators
        // This removes separator characters
        return str_replace([
            self::SEGMENT_TERMINATOR,
            self::FIELD_SEPARATOR,
            self::COMPONENT_SEPARATOR,
            self::REPETITION_SEPARATOR,
        ], '', $value);
    }

    /**
     * Validate X12 string structure
     */
    public static function isValidX12(string $payload): array
    {
        $errors = [];

        // Must start with ISA
        if (strpos(trim($payload), 'ISA*') !== 0) {
            $errors[] = 'Document must start with ISA segment';
        }

        // Must contain segment terminators
        if (strpos($payload, self::SEGMENT_TERMINATOR) === false) {
            $errors[] = 'Document must contain segment terminators (~)';
        }

        // Basic structure check
        $segments = explode(self::SEGMENT_TERMINATOR, trim($payload));
        if (count($segments) < 4) {
            $errors[] = 'Document must contain at least ISA, GS, ST, and SE segments';
        }

        // Validate ISA segment
        $isaSegment = explode(self::FIELD_SEPARATOR, trim($segments[0]));
        if ($isaSegment[0] !== 'ISA' || count($isaSegment) < 16) {
            $errors[] = 'Invalid ISA segment structure';
        }

        return $errors;
    }

    /**
     * Extract control number from X12 string
     */
    public static function extractControlNumber(string $payload): ?string
    {
        $segments = explode(self::SEGMENT_TERMINATOR, trim($payload));
        foreach ($segments as $segment) {
            $fields = explode(self::FIELD_SEPARATOR, trim($segment));
            if (($fields[0] ?? null) === 'ISA' && isset($fields[13])) {
                return trim($fields[13]);
            }
        }
        return null;
    }

    /**
     * Get all segments of a type
     */
    public static function getSegmentsByType(string $payload, string $type): array
    {
        $segments = explode(self::SEGMENT_TERMINATOR, trim($payload));
        $results = [];

        foreach ($segments as $segment) {
            if (empty(trim($segment))) {
                continue;
            }
            $fields = explode(self::FIELD_SEPARATOR, trim($segment));
            if ($fields[0] === $type) {
                $results[] = $fields;
            }
        }

        return $results;
    }

    /**
     * Format quantity with appropriate unit of measure
     */
    public static function formatQuantity(float $quantity, string $uom = 'EA'): array
    {
        return [
            'quantity' => number_format($quantity, 2),
            'uom' => $uom,
        ];
    }

    /**
     * Format monetary amount with currency
     */
    public static function formatMonetaryAmount(float $amount, string $currency = 'USD'): array
    {
        return [
            'amount' => number_format($amount, 2),
            'currency' => $currency,
        ];
    }

    /**
     * Convert X12 response code to human-readable description
     */
    public static function describeResponseCode(string $code): string
    {
        $codes = [
            'AA' => 'Accepted',
            'AB' => 'Accepted But With Errors',
            'AE' => 'Accepted Except',
            'AG' => 'Accepted With Partial Exchanges',
            'AK' => 'Acknowledged',
            'CA' => 'Conditionally Accepted',
            'DJ' => 'Deferred Judgment',
            'IA' => 'Accepted in Part',
            'IR' => 'In Review',
            'OE' => 'Order Error',
            'RE' => 'Rejected',
            'RJ' => 'Rejected',
            'SG' => 'Suspicious',
            'WK' => 'Withdrawn',
        ];

        return $codes[$code] ?? "Unknown ($code)";
    }

    /**
     * Generate standard X12 ISA envelope segment
     */
    public static function generateISA(
        string $senderId = 'PHILHARVEST',
        string $receiverId = 'PARTNER',
        string $senderQual = '01',
        string $receiverQual = '01',
        ?string $controlNumber = null
    ): string {
        $senderId = self::padField($senderId, 15);
        $receiverId = self::padField($receiverId, 15);
        $controlNumber = self::padNumeric($controlNumber ?? 1, 9);

        $isa = [
            'ISA',                    // 0: Segment ID
            '00',                     // 1: Authorization Info Qualifier
            '          ',             // 2: Authorization Information (10 spaces)
            '00',                     // 3: Security Info Qualifier
            '          ',             // 4: Security Information (10 spaces)
            $senderQual,              // 5: Interchange ID Qualifier
            $senderId,                // 6: Interchange Sender ID
            $receiverQual,            // 7: Interchange ID Qualifier
            $receiverId,              // 8: Interchange Receiver ID
            date('ymd'),              // 9: Interchange Date
            date('Hi'),               // 10: Interchange Time
            '^',                      // 11: Repetition Separator
            '00401',                  // 12: Interchange Control Version
            $controlNumber,           // 13: Interchange Control Number
            '0',                      // 14: Acknowledgment Requested
            'P',                      // 15: Usage Indicator (P=Production)
            ':',                      // 16: Component Element Separator
        ];

        return implode(self::FIELD_SEPARATOR, $isa);
    }

    /**
     * Generate standard X12 GS segment
     */
    public static function generateGS(
        string $functionalId,
        string $senderId = 'PHILHARVEST',
        string $receiverId = 'PARTNER'
    ): string {
        $gs = [
            'GS',                     // 0: Segment ID
            $functionalId,            // 1: Functional ID Code (PO, SH, IN, etc.)
            $senderId,                // 2: Application Sender Code
            $receiverId,              // 3: Application Receiver Code
            date('Ymd'),              // 4: Date
            date('Hi'),               // 5: Time
            self::padNumeric(1, 9),   // 6: Group Control Number
            'X',                      // 7: Responsible Agency Code
            '004010',                 // 8: Version / Release / Industry ID Code
        ];

        return implode(self::FIELD_SEPARATOR, $gs);
    }

    /**
     * Generate standard X12 ST segment
     */
    public static function generateST(
        string $transactionCode,
        string $controlNumber = '0001'
    ): string {
        $st = [
            'ST',                     // 0: Segment ID
            $transactionCode,         // 1: Transaction Set Identifier Code (850, 855, etc.)
            self::padNumeric($controlNumber, 4),  // 2: Transaction Set Control Number
        ];

        return implode(self::FIELD_SEPARATOR, $st);
    }

    /**
     * Generate standard X12 SE segment
     */
    public static function generateSE(
        int $segmentCount,
        string $controlNumber = '0001'
    ): string {
        $se = [
            'SE',                                  // 0: Segment ID
            self::padNumeric($segmentCount, 5),   // 1: Number of Included Segments
            self::padNumeric($controlNumber, 4),  // 2: Transaction Set Control Number
        ];

        return implode(self::FIELD_SEPARATOR, $se);
    }
}
