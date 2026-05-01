<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EdiTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'transaction_type',
        'control_number',
        'partner_id',
        'raw_payload',
        'parsed_data',
        'status',
        'error_message',
    ];

    protected $casts = [
        'parsed_data' => 'json',
    ];

    public function purchaseOrder()
    {
        return $this->hasOne(PurchaseOrder::class);
    }
}
