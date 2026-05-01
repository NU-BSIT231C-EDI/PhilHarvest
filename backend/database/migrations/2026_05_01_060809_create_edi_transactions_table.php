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
        Schema::create('edi_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('transaction_type'); // 850, 855, 856, 810
            $table->string('control_number')->unique(); // ISA13
            $table->string('partner_id');
            $table->longText('raw_payload');
            $table->json('parsed_data')->nullable();
            $table->enum('status', ['PENDING', 'VALIDATED', 'REJECTED', 'PROCESSED'])->default('PENDING');
            $table->text('error_message')->nullable();
            $table->timestamps();
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
        Schema::dropIfExists('edi_transactions');
    }
};
