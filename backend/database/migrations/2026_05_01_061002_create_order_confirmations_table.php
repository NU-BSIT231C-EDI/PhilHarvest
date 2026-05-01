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
        Schema::create('order_confirmations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('edi_transaction_id')->constrained('edi_transactions');
            $table->string('po_number')->index(); // References original PO
            $table->string('partner_id');
            $table->date('confirmation_date');
            $table->decimal('total_amount', 12, 2)->nullable();
            $table->enum('status', ['PENDING', 'CONFIRMED', 'BACKORDERED', 'REJECTED'])->default('PENDING');
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
        Schema::dropIfExists('order_confirmations');
    }
};
