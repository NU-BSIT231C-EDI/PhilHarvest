<?php

namespace App\DTOs\Edi;

/**
 * EDI 204 Shipment DTO
 * Details of a single shipment in a motor carrier load tender
 */
class Edi204ShipmentDto
{
    public function __construct(
        public string $shipmentNumber,
        public string $shipmentType,  // LTL, TL, etc.
        public array $lineItems = [],
        public ?float $weight = null,
        public ?string $weightUom = 'LB',
        public ?array $dimensions = [],  // length, width, height
        public ?string $packageType = null,  // SKD, PLT, CTN, etc.
    ) {}

    public function addLineItem(Edi204ShipmentLineItemDto $lineItem): void
    {
        $this->lineItems[] = $lineItem;
    }

    public function toArray(): array
    {
        return [
            'shipment_number' => $this->shipmentNumber,
            'shipment_type' => $this->shipmentType,
            'line_items' => $this->lineItems,
            'weight' => $this->weight,
            'weight_uom' => $this->weightUom,
            'dimensions' => $this->dimensions,
            'package_type' => $this->packageType,
        ];
    }
}
