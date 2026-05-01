<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up(): void
    {
        Schema::create('purchase_order_items', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('purchase_order_id')->constrained();
        $table->string('line_number');
        $table->string('product_code');
        $table->string('product_name');
        $table->decimal('quantity', 10, 2);
        $table->string('unit_of_measure');
        $table->decimal('unit_price', 10, 2);
        $table->decimal('line_total', 12, 2);
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
        Schema::dropIfExists('purchase_order_items');
    }
};
