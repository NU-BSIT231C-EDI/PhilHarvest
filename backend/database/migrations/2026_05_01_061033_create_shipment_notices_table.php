<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up(): void
    {
        Schema::create('shipment_notices', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('edi_transaction_id')->constrained('edi_transactions');
            $table->string('po_number')->index();
            $table->string('partner_id');
            $table->string('asn_number')->unique(); // Advance Ship Notice number
            $table->date('shipment_date');
            $table->date('expected_delivery_date')->nullable();
            $table->string('tracking_number')->nullable();
            $table->string('carrier')->nullable();
            $table->enum('status', ['PENDING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'EXCEPTION'])->default('PENDING');
            $table->decimal('total_weight', 10, 2)->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['partner_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('shipment_notices');
    }
};
