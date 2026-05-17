<?php

namespace App\DTOs\Edi;

/**
 * EDI 856 Box Line Item DTO
 * Individual item details within a box in an ASN
 */
class Edi856BoxLineItemDto
{
    public function __construct(
        public string $lineNumber,
        public string $poLineNumber,
        public string $partNumber,
        public string $partDescription,
        public float $shippedQuantity,
        public string $quantityUom,
        public ?string $serialNumber = null,
        public ?string $lotNumber = null,
    ) {}

    public function toArray(): array
    {
        return [
            'line_number' => $this->lineNumber,
            'po_line_number' => $this->poLineNumber,
            'part_number' => $this->partNumber,
            'part_description' => $this->partDescription,
            'shipped_quantity' => $this->shippedQuantity,
            'quantity_uom' => $this->quantityUom,
            'serial_number' => $this->serialNumber,
            'lot_number' => $this->lotNumber,
        ];
    }
}
