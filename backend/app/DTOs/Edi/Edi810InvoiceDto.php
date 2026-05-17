<?php

namespace App\DTOs\Edi;

/**
 * EDI 810 - Invoice DTO
 * Outbound to Manufacturer
 * 
 * Billing information for goods/services delivered
 */
class Edi810InvoiceDto
{
    public function __construct(
        public string $controlNumber,
        public string $invoiceNumber,
        public string $invoiceDate,
        public string $poNumber,
        public string $poDate,
        public string $manufacturerId,
        public string $billToName,
        public array $billToAddress,
        public array $shipFromAddress,
        public array $lineItems = [],
        public ?string $shipDate = null,
        public ?float $subtotalAmount = null,
        public ?float $taxAmount = null,
        public ?float $shippingAmount = null,
        public ?float $totalAmount = null,
        public ?string $currency = 'USD',
        public ?string $paymentTerms = null,
        public ?string $dueDate = null,
    ) {}

    public function addLineItem(Edi810LineItemDto $lineItem): void
    {
        $this->lineItems[] = $lineItem;
    }

    public function calculateTotals(): void
    {
        $this->subtotalAmount = 0;
        foreach ($this->lineItems as $item) {
            $this->subtotalAmount += $item->toArray()['line_amount'] ?? 0;
        }
        $this->totalAmount = ($this->subtotalAmount ?? 0) + ($this->taxAmount ?? 0) + ($this->shippingAmount ?? 0);
    }

    public function toArray(): array
    {
        return [
            'control_number' => $this->controlNumber,
            'invoice_number' => $this->invoiceNumber,
            'invoice_date' => $this->invoiceDate,
            'po_number' => $this->poNumber,
            'po_date' => $this->poDate,
            'manufacturer_id' => $this->manufacturerId,
            'bill_to_name' => $this->billToName,
            'bill_to_address' => $this->billToAddress,
            'ship_from_address' => $this->shipFromAddress,
            'line_items' => $this->lineItems,
            'ship_date' => $this->shipDate,
            'subtotal_amount' => $this->subtotalAmount,
            'tax_amount' => $this->taxAmount,
            'shipping_amount' => $this->shippingAmount,
            'total_amount' => $this->totalAmount,
            'currency' => $this->currency,
            'payment_terms' => $this->paymentTerms,
            'due_date' => $this->dueDate,
        ];
    }
}
