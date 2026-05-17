<?php

namespace App\DTOs\Edi;

/**
 * EDI 856 - Advance Ship Notice / ASN DTO
 * Outbound to Manufacturer
 * 
 * Notification of shipment details prior to receipt
 */
class Edi856AdvanceShipNoticeDto
{
    public function __construct(
        public string $controlNumber,
        public string $asnNumber,
        public string $poNumber,
        public string $poDate,
        public string $manufacturerId,
        public string $shipDate,
        public array $shipFromAddress,
        public array $shipToAddress,
        public array $boxes = [],
        public ?string $carrierCode = null,
        public ?string $trackingNumber = null,
        public ?string $estimatedDeliveryDate = null,
        public ?float $totalWeight = null,
        public ?float $totalQuantity = null,
    ) {}

    public function addBox(Edi856BoxDto $box): void
    {
        $this->boxes[] = $box;
    }

    public function toArray(): array
    {
        return [
            'control_number' => $this->controlNumber,
            'asn_number' => $this->asnNumber,
            'po_number' => $this->poNumber,
            'po_date' => $this->poDate,
            'manufacturer_id' => $this->manufacturerId,
            'ship_date' => $this->shipDate,
            'ship_from_address' => $this->shipFromAddress,
            'ship_to_address' => $this->shipToAddress,
            'boxes' => $this->boxes,
            'carrier_code' => $this->carrierCode,
            'tracking_number' => $this->trackingNumber,
            'estimated_delivery_date' => $this->estimatedDeliveryDate,
            'total_weight' => $this->totalWeight,
            'total_quantity' => $this->totalQuantity,
        ];
    }
}
