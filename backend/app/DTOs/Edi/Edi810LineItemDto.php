<?php

namespace App\DTOs\Edi;

/**
 * EDI 810 Invoice Line Item DTO
 * Individual item on an invoice
 */
class Edi810LineItemDto
{
    public function __construct(
        public string $lineNumber,
        public string $poLineNumber,
        public string $partNumber,
        public string $partDescription,
        public float $invoicedQuantity,
        public string $quantityUom,
        public float $unitPrice,
        public ?float $lineAmount = null,
        public ?float $taxAmount = null,
        public ?string $shipDate = null,
    ) {
        $this->lineAmount = $this->lineAmount ?? ($invoicedQuantity * $unitPrice);
    }

    public function toArray(): array
    {
        return [
            'line_number' => $this->lineNumber,
            'po_line_number' => $this->poLineNumber,
            'part_number' => $this->partNumber,
            'part_description' => $this->partDescription,
            'invoiced_quantity' => $this->invoicedQuantity,
            'quantity_uom' => $this->quantityUom,
            'unit_price' => $this->unitPrice,
            'line_amount' => $this->lineAmount,
            'tax_amount' => $this->taxAmount,
            'ship_date' => $this->shipDate,
        ];
    }
}
