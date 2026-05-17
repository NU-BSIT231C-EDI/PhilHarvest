<?php

namespace App\DTOs\Edi;

/**
 * EDI 850 Line Item DTO
 * Represents a single line in a purchase order
 */
class Edi850LineItemDto
{
    public function __construct(
        public string $lineNumber,
        public string $partNumber,
        public string $partDescription,
        public float $quantity,
        public string $quantityUom,  // Unit of Measure (EA, CS, etc.)
        public float $unitPrice,
        public ?float $lineAmount = null,
        public ?string $supplierPartNumber = null,
        public ?string $requestedDeliveryDate = null,
    ) {
        $this->lineAmount = $this->lineAmount ?? ($quantity * $unitPrice);
    }

    public function toArray(): array
    {
        return [
            'line_number' => $this->lineNumber,
            'part_number' => $this->partNumber,
            'part_description' => $this->partDescription,
            'quantity' => $this->quantity,
            'quantity_uom' => $this->quantityUom,
            'unit_price' => $this->unitPrice,
            'line_amount' => $this->lineAmount,
            'supplier_part_number' => $this->supplierPartNumber,
            'requested_delivery_date' => $this->requestedDeliveryDate,
        ];
    }
}
