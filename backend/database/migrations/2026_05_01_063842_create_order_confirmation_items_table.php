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
        Schema::create('order_confirmation_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('order_confirmation_id')->constrained()->onDelete('cascade');
            $table->string('line_number');
            $table->string('product_code');
            $table->string('product_name');
            $table->decimal('quantity_confirmed', 10, 2);
            $table->decimal('quantity_backordered', 10, 2)->nullable();
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
        Schema::dropIfExists('order_confirmation_items');
    }
};
