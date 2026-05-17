<?php

namespace App\DTOs\Edi;

/**
 * EDI 856 Box/Carton DTO
 * Individual box/carton details in an ASN
 */
class Edi856BoxDto
{
    public function __construct(
        public string $boxNumber,
        public array $lineItems = [],
        public ?float $weight = null,
        public ?string $weightUom = 'LB',
        public ?array $dimensions = [],  // length, width, height
        public ?string $packageType = null,  // SKD, PLT, CTN, etc.
    ) {}

    public function addLineItem(Edi856BoxLineItemDto $lineItem): void
    {
        $this->lineItems[] = $lineItem;
    }

    public function toArray(): array
    {
        return [
            'box_number' => $this->boxNumber,
            'line_items' => $this->lineItems,
            'weight' => $this->weight,
            'weight_uom' => $this->weightUom,
            'dimensions' => $this->dimensions,
            'package_type' => $this->packageType,
        ];
    }
}
