<?php

namespace App\DTOs\Edi;

/**
 * EDI 850 Line Item DTO
 *
 * Represents a single PO1 line from an X12 850 Purchase Order.
 *
 * productIdQualifier / partNumber hold the primary product ID pair from PO1-6/7.
 * productIds holds ALL qualifier→value pairs found on the line (VP, IN, VN, UP, etc.)
 * so downstream code can look up any identifier without re-parsing.
 *
 * partDescription is NOT sourced from PO1 (PO1 carries no description field).
 * It should be populated from PID segments when those are parsed.
 */
class Edi850LineItemDto
{
    public function __construct(
        public string  $lineNumber,
        public ?string $productIdQualifier,   // e.g. VP, IN, VN, UP — the qualifier code
        public ?string $partNumber,            // the actual product identifier value
        public array   $productIds = [],       // all qualifier→value pairs: ['VP'=>'BEV-WATER-12PK','IN'=>'12345']
        public ?string $partDescription = null, // from PID segment, not PO1
        public float   $quantity = 0.0,
        public string  $quantityUom = 'EA',
        public float   $unitPrice = 0.0,
        public ?float  $lineAmount = null,
        public ?string $supplierPartNumber = null,
        public ?string $requestedDeliveryDate = null,
    ) {
        // Compute line amount only when not explicitly provided
        if ($this->lineAmount === null && $this->quantity > 0 && $this->unitPrice > 0) {
            $this->lineAmount = round($this->quantity * $this->unitPrice, 2);
        }
    }

    public function toArray(): array
    {
        return [
            'line_number'             => $this->lineNumber,
            'product_id_qualifier'    => $this->productIdQualifier,
            'part_number'             => $this->partNumber,
            'product_ids'             => $this->productIds,
            'part_description'        => $this->partDescription,
            'quantity'                => $this->quantity,
            'quantity_uom'            => $this->quantityUom,
            'unit_price'              => $this->unitPrice,
            'line_amount'             => $this->lineAmount,
            'supplier_part_number'    => $this->supplierPartNumber,
            'requested_delivery_date' => $this->requestedDeliveryDate,
        ];
    }
}
