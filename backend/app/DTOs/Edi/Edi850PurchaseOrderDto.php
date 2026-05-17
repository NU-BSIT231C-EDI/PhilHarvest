<?php

namespace App\DTOs\Edi;

/**
 * EDI 850 - Purchase Order DTO
 * Inbound from Manufacturer
 * 
 * Contains all parsed data from an X12 850 transaction
 */
class Edi850PurchaseOrderDto
{
    public function __construct(
        public string $controlNumber,
        public string $poNumber,
        public string $poDate,
        public string $manufacturerId,
        public string $manufacturerName,
        public ?string $shippingDate = null,
        public ?string $deliveryDate = null,
        public ?string $currency = 'USD',
        public array $lineItems = [],
        public array $shipToAddress = [],
        public array $billToAddress = [],
        public ?string $buyerCompanyName = null,
        public ?string $buyerContactEmail = null,
        public ?string $buyerContactPhone = null,
        public ?float $totalAmount = null,
    ) {}

    /**
     * Add a line item to the purchase order
     */
    public function addLineItem(Edi850LineItemDto $lineItem): void
    {
        $this->lineItems[] = $lineItem;
    }

    /**
     * Convert to array for database storage
     */
    public function toArray(): array
    {
        return [
            'control_number' => $this->controlNumber,
            'po_number' => $this->poNumber,
            'po_date' => $this->poDate,
            'manufacturer_id' => $this->manufacturerId,
            'manufacturer_name' => $this->manufacturerName,
            'shipping_date' => $this->shippingDate,
            'delivery_date' => $this->deliveryDate,
            'currency' => $this->currency,
            'line_items' => array_map(
                fn ($lineItem) => method_exists($lineItem, 'toArray') ? $lineItem->toArray() : $lineItem,
                $this->lineItems
            ),
            'ship_to_address' => $this->shipToAddress,
            'bill_to_address' => $this->billToAddress,
            'buyer_company_name' => $this->buyerCompanyName,
            'buyer_contact_email' => $this->buyerContactEmail,
            'buyer_contact_phone' => $this->buyerContactPhone,
            'total_amount' => $this->totalAmount,
        ];
    }
}
