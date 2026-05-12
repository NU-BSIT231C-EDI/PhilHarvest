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
        'inbound_format',
        'outbound_format',
        'raw_payload',
        'csv_payload',
        'generated_x12_payload',
        'parsed_data',
        'status',
        'error_message',
    ];

    protected $casts = [
        'parsed_data' => 'json',
    ];

    /**
     * Get the purchase order created from this transaction
     */
    public function purchaseOrder()
    {
        return $this->hasOne(PurchaseOrder::class, 'edi_transaction_id');
    }

    /**
     * Scope: Filter by transaction type
     */
    public function scopeByType($query, $type)
    {
        return $query->where('transaction_type', $type);
    }

    /**
     * Scope: Filter by status
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope: Filter by inbound format
     */
    public function scopeInboundFormat($query, $format)
    {
        return $query->where('inbound_format', $format);
    }

    /**
     * Check if transaction has CSV payload
     */
    public function hasCSV(): bool
    {
        return !empty($this->csv_payload);
    }

    /**
     * Check if transaction has X12 payload
     */
    public function hasX12(): bool
    {
        return !empty($this->raw_payload) || !empty($this->generated_x12_payload);
    }

    /**
     * Get the X12 payload (generated or raw)
     */
    public function getX12Payload(): ?string
    {
        return $this->raw_payload ?? $this->generated_x12_payload;
    }
}
