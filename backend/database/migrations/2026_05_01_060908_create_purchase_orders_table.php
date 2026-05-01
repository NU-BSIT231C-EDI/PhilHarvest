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
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('edi_transaction_id')->constrained('edi_transactions');
            $table->string('po_number')->unique();
            $table->string('partner_id');
            $table->date('order_date');
            $table->date('delivery_date')->nullable();
            $table->decimal('total_amount', 12, 2);
            $table->enum('status', ['PENDING', 'CONFIRMED', 'PARTIAL', 'CANCELLED', 'SHIPPED', 'INVOICED'])->default('PENDING');
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
        Schema::dropIfExists('purchase_orders');
    }
};
