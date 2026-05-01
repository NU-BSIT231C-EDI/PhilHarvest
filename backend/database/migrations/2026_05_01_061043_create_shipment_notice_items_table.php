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
        Schema::create('shipment_notice_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('shipment_notice_id')->constrained()->onDelete('cascade');
            $table->string('line_number');
            $table->string('product_code');
            $table->string('product_name');
            $table->decimal('quantity_shipped', 10, 2);
            $table->string('unit_of_measure');
            $table->string('packaging_type')->nullable(); // e.g., carton, pallet, case
            $table->string('serial_lot_number')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('shipment_notice_items');
    }
};
