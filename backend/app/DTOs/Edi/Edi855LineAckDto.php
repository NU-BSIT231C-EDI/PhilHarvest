<?php

namespace App\DTOs\Edi;

/**
 * EDI 855 Line Acknowledgment DTO
 * Represents acknowledgment status of a single line item
 */
class Edi855LineAckDto
{
    public function __construct(
        public string $lineNumber,
        public string $acknowledgmentCode,  // AA (Accept), RE (Reject), IA (Accepted in Part)
        public float $acceptedQuantity,
        public string $quantityUom,
        public ?float $rejectedQuantity = null,
        public ?string $rejectionReason = null,
        public ?string $estimatedDeliveryDate = null,
    ) {}

    public function toArray(): array
    {
        return [
            'line_number' => $this->lineNumber,
            'acknowledgment_code' => $this->acknowledgmentCode,
            'accepted_quantity' => $this->acceptedQuantity,
            'quantity_uom' => $this->quantityUom,
            'rejected_quantity' => $this->rejectedQuantity,
            'rejection_reason' => $this->rejectionReason,
            'estimated_delivery_date' => $this->estimatedDeliveryDate,
        ];
    }
}
