<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trading_partners', function (Blueprint $table) {
            $table->id();
            $table->string('label');
            $table->string('isa_receiver_id', 15)->comment('ISA08 / GS03 — always 15 chars, right-padded with spaces');
            $table->string('company_name', 35)->comment('N102');
            $table->enum('edi_role', ['BY', 'SE', 'SF', 'ST'])->comment('N101 qualifier');
            $table->string('address_line_1', 55)->comment('N301');
            $table->string('address_line_2', 55)->nullable()->comment('N302');
            $table->string('city', 30)->comment('N401');
            $table->string('state', 3)->nullable()->comment('N402');
            $table->string('postal_code', 15)->comment('N403');
            $table->string('country', 2)->comment('N404, ISO 3166-1 alpha-2');
            $table->string('po_number_format')->comment('BEG03 prefix/pattern');
            $table->string('default_currency', 3)->comment('CUR03, ISO 4217');
            $table->string('api_endpoint')->comment('HTTPS outbound transmission target');
            $table->text('auth_token')->comment('Encrypted at rest; Bearer or API-Key token');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trading_partners');
    }
};
