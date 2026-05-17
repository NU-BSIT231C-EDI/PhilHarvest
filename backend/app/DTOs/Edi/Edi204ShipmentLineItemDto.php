<?php

namespace App\DTOs\Edi;

/**
 * EDI 204 Shipment Line Item DTO
 * Individual item details within a shipment
 */
class Edi204ShipmentLineItemDto
{
    public function __construct(
        public string $lineNumber,
        public string $poNumber,
        public string $poLineNumber,
        public string $partNumber,
        public string $partDescription,
        public float $quantity,
        public string $quantityUom,
        public ?float $weight = null,
        public ?string $weightUom = 'LB',
    ) {}

    public function toArray(): array
    {
        return [
            'line_number' => $this->lineNumber,
            'po_number' => $this->poNumber,
            'po_line_number' => $this->poLineNumber,
            'part_number' => $this->partNumber,
            'part_description' => $this->partDescription,
            'quantity' => $this->quantity,
            'quantity_uom' => $this->quantityUom,
            'weight' => $this->weight,
            'weight_uom' => $this->weightUom,
        ];
    }
}
