<?php

namespace App\Services\Edi\Contracts;

/**
 * Contract for EDI format converters
 */
interface EdiConverterContract
{
    /**
     * Convert from one format to another
     *
     * @param string $payload The payload to convert
     * @param array $options Optional conversion options
     * @return string The converted payload
     */
    public function convert(string $payload, array $options = []): string;

    /**
     * Validate the input payload
     *
     * @param string $payload The payload to validate
     * @return bool Whether the payload is valid
     */
    public function validate(string $payload): bool;

    /**
     * Get metadata about the converted payload
     *
     * @return array Metadata array
     */
    public function getMetadata(): array;
}
