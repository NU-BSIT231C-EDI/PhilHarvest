<?php

namespace App\DTOs\Edi;

/**
 * EDI 990 - Response to Load Tender DTO
 * Inbound from Logistics Partner
 * 
 * Contains carrier's response to a load tender (204)
 */
class Edi990ResponseDto
{
    public function __construct(
        public string $controlNumber,
        public string $responseCode,  // AA (Accept), RE (Reject), etc.)
        public string $loadTenderId,
        public string $carrierId,
        public string $carrierName,
        public ?string $responseDate = null,
        public ?string $responseTime = null,
        public ?string $estimatedPickupDate = null,
        public ?string $estimatedDeliveryDate = null,
        public ?string $rejectionReason = null,
        public ?array $loadDetails = [],
    ) {}

    public function isAccepted(): bool
    {
        // Standard X12 990 uses 'A'; legacy non-standard tests used 'AA'
        return \in_array($this->responseCode, ['A', 'AA'], true);
    }

    public function isRejected(): bool
    {
        // Standard X12 990 uses 'D' (Decline); legacy used 'RE'
        return \in_array($this->responseCode, ['D', 'RE'], true);
    }

    public function toArray(): array
    {
        return [
            'control_number' => $this->controlNumber,
            'response_code' => $this->responseCode,
            'load_tender_id' => $this->loadTenderId,
            'carrier_id' => $this->carrierId,
            'carrier_name' => $this->carrierName,
            'response_date' => $this->responseDate,
            'response_time' => $this->responseTime,
            'estimated_pickup_date' => $this->estimatedPickupDate,
            'estimated_delivery_date' => $this->estimatedDeliveryDate,
            'rejection_reason' => $this->rejectionReason,
            'load_details' => $this->loadDetails,
        ];
    }
}
