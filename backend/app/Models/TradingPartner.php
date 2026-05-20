<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TradingPartner extends Model
{
    protected $fillable = [
        'label',
        'isa_receiver_id',
        'company_name',
        'edi_role',
        'address_line_1',
        'address_line_2',
        'city',
        'state',
        'postal_code',
        'country',
        'po_number_format',
        'default_currency',
        'api_endpoint',
        'auth_token',
    ];

    protected $casts = [
        'auth_token' => 'encrypted',
    ];

    /** Auto-pad ISA receiver ID to exactly 15 chars (right-padded with spaces). */
    public function setIsaReceiverIdAttribute(string $value): void
    {
        $this->attributes['isa_receiver_id'] = str_pad(substr(trim($value), 0, 15), 15, ' ');
    }

    /**
     * Generate N1 / N3 / N4 segment strings for this partner.
     *
     * Returns an array of raw segment strings (without terminator).
     */
    public function toEdiN1Loop(string $fs = '*'): array
    {
        $segments = [];
        $segments[] = "N1{$fs}{$this->edi_role}{$fs}{$this->company_name}";

        $n3 = $this->address_line_1;
        if (!empty($this->address_line_2)) {
            $n3 .= "{$fs}{$this->address_line_2}";
        }
        $segments[] = "N3{$fs}{$n3}";
        $segments[] = "N4{$fs}{$this->city}{$fs}{$this->state}{$fs}{$this->postal_code}{$fs}{$this->country}";

        return $segments;
    }

    /** Return the padded receiver ID for use in ISA08 / GS03. */
    public function isaReceiverId(): string
    {
        return str_pad(substr(trim($this->isa_receiver_id), 0, 15), 15, ' ');
    }
}
