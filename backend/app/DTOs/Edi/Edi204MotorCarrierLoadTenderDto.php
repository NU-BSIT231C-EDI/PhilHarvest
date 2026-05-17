<?php

namespace App\DTOs\Edi;

/**
 * EDI 204 - Motor Carrier Load Tender DTO
 * Outbound to Logistics Partner
 * 
 * Tender of a shipment for carrier pickup and delivery
 */
class Edi204MotorCarrierLoadTenderDto
{
    public function __construct(
        public string $controlNumber,
        public string $loadTenderId,
        public string $shipperCompanyName,
        public array $shipperAddress,
        public string $carrierCode,
        public array $shipToAddress,
        public array $shipments = [],
        public ?string $pickupDate = null,
        public ?string $pickupTime = null,
        public ?string $deliveryDate = null,
        public ?string $deliveryTime = null,
        public ?string $shipmentWeight = null,  // Total weight in lbs
        public ?string $shipmentClass = null,   // NMFC class
        public ?array $hazmatInfo = null,
        public ?string $specialInstructions = null,
    ) {}

    public function addShipment(Edi204ShipmentDto $shipment): void
    {
        $this->shipments[] = $shipment;
    }

    public function toArray(): array
    {
        return [
            'control_number' => $this->controlNumber,
            'load_tender_id' => $this->loadTenderId,
            'shipper_company_name' => $this->shipperCompanyName,
            'shipper_address' => $this->shipperAddress,
            'carrier_code' => $this->carrierCode,
            'ship_to_address' => $this->shipToAddress,
            'shipments' => $this->shipments,
            'pickup_date' => $this->pickupDate,
            'pickup_time' => $this->pickupTime,
            'delivery_date' => $this->deliveryDate,
            'delivery_time' => $this->deliveryTime,
            'shipment_weight' => $this->shipmentWeight,
            'shipment_class' => $this->shipmentClass,
            'hazmat_info' => $this->hazmatInfo,
            'special_instructions' => $this->specialInstructions,
        ];
    }
}
