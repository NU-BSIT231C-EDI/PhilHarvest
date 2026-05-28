<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'sku',
        'name',
        'description',
        'category',
        'unit_price',
        'unit_of_measure',
        'stock_quantity',
        'reorder_point',
        'seller_name',
        'weight_kg',
        'image_url',
        'is_active',
    ];

    protected $casts = [
        'unit_price'     => 'decimal:2',
        'weight_kg'      => 'decimal:3',
        'stock_quantity' => 'integer',
        'reorder_point'  => 'integer',
        'is_active'      => 'boolean',
    ];
}
