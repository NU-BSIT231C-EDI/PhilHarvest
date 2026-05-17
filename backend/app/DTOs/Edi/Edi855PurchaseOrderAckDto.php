<?php

namespace App\DTOs\Edi;

/**
 * EDI 855 - Purchase Order Acknowledgment DTO
 * Outbound to Manufacturer
 * 
 * Acknowledges receipt and acceptance/rejection of a purchase order
 */
class Edi855PurchaseOrderAckDto
{
    public function __construct(
        public string $controlNumber,
        public string $poNumber,
        public string $poDate,
        public string $manufacturerId,
        public string $acknowledgmentCode,  // AA (Accept), RE (Reject), etc.)
        public string $acknowledgedDate,
        public array $lineAcknowledgments = [],
        public ?string $rejectionReason = null,
        public ?string $estimatedShipDate = null,
        public ?array $shipToAddress = [],
    ) {}

    /**
     * Add a line acknowledgment
     */
    public function addLineAck(Edi855LineAckDto $lineAck): void
    {
        $this->lineAcknowledgments[] = $lineAck;
    }

    public function toArray(): array
    {
        return [
            'control_number' => $this->controlNumber,
            'po_number' => $this->poNumber,
            'po_date' => $this->poDate,
            'manufacturer_id' => $this->manufacturerId,
            'acknowledgment_code' => $this->acknowledgmentCode,
            'acknowledged_date' => $this->acknowledgedDate,
            'line_acknowledgments' => $this->lineAcknowledgments,
            'rejection_reason' => $this->rejectionReason,
            'estimated_ship_date' => $this->estimatedShipDate,
            'ship_to_address' => $this->shipToAddress,
        ];
    }
}
