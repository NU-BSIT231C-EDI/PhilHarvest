<?php

namespace App\Http\Controllers\Api\Edi;

use App\Models\PurchaseOrder;

class OutboundController
{
    public function listOrders()
    {
        $orders = PurchaseOrder::with('items')->paginate(20);
        return response()->json($orders);
    }

    public function showOrder($id)
    {
        $order = PurchaseOrder::with('items')->find($id);
        return response()->json($order);
    }
}