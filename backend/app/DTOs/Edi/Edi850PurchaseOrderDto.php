<?php

namespace App\DTOs\Edi;

/**
 * EDI 850 Purchase Order DTO
 *
 * Inbound from Manufacturer via X12 850.
 *
 * Nullable fields are genuinely optional in the EDI spec and will be null
 * when the corresponding segment is absent — they are never fabricated.
 */
class Edi850PurchaseOrderDto
{
    public function __construct(
        public string  $controlNumber,
        public string  $poNumber,
        public ?string $poDate = null,          // null when neither BEG nor DTM*004 supplies a date
        public ?string $manufacturerId = null,  // null when no N1*MF segment present
        public ?string $manufacturerName = null,
        public ?string $shippingDate = null,    // DTM*011
        public ?string $deliveryDate = null,    // DTM*002
        public ?string $currency = null,        // CUR segment; null when absent (not assumed USD)
        public array   $lineItems = [],
        public array   $shipToAddress = [],
        public array   $billToAddress = [],
        public ?string $buyerCompanyName = null,
        public ?string $buyerContactEmail = null,
        public ?string $buyerContactPhone = null,
        public ?float  $totalAmount = null,
    ) {}

    public function addLineItem(Edi850LineItemDto $lineItem): void
    {
        $this->lineItems[] = $lineItem;
    }

    public function toArray(): array
    {
        return [
            'control_number'      => $this->controlNumber,
            'po_number'           => $this->poNumber,
            'po_date'             => $this->poDate,
            'manufacturer_id'     => $this->manufacturerId,
            'manufacturer_name'   => $this->manufacturerName,
            'shipping_date'       => $this->shippingDate,
            'delivery_date'       => $this->deliveryDate,
            'currency'            => $this->currency,
            'line_items'          => array_map(
                static fn($li) => method_exists($li, 'toArray') ? $li->toArray() : $li,
                $this->lineItems
            ),
            'ship_to_address'     => $this->shipToAddress,
            'bill_to_address'     => $this->billToAddress,
            'buyer_company_name'  => $this->buyerCompanyName,
            'buyer_contact_email' => $this->buyerContactEmail,
            'buyer_contact_phone' => $this->buyerContactPhone,
            'total_amount'        => $this->totalAmount,
        ];
    }
}
