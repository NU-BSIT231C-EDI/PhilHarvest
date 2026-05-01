<?php

namespace App\DTOs\Edi;

class PurchaseOrderDto
{
    public function __construct(
        public string $poNumber,
        public string $partnerId,
        public string $orderDate,
        public string $deliveryDate,
        public decimal $totalAmount,
        public array $items = [],
    ) {}
}