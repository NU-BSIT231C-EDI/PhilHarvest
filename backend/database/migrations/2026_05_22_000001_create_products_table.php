<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('sku')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('category')->nullable();
            $table->decimal('unit_price', 10, 2);
            $table->string('unit_of_measure', 10)->default('EA'); // EA, CS, LB, KG, etc.
            $table->integer('stock_quantity')->default(0);
            $table->integer('reorder_point')->default(0);
            $table->string('seller_name')->nullable();
            $table->decimal('weight_kg', 8, 3)->nullable(); // for 856 ASN shipping calcs
            $table->string('image_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
