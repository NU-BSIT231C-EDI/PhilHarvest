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
        Schema::table('edi_transactions', function (Blueprint $table) {
            // Store the CSV format of the EDI file (either received as CSV or generated from X12)
            $table->longText('csv_payload')->nullable()->after('raw_payload');
            
            // Track the original format of inbound files (X12 or CSV)
            $table->enum('inbound_format', ['X12', 'CSV'])->default('X12')->after('transaction_type');
            
            // Track the outbound format (X12, CSV, or both for audit)
            $table->enum('outbound_format', ['X12', 'CSV', 'BOTH'])->default('CSV')->after('inbound_format');
            
            // Generated X12 from received CSV (for received CSV files)
            $table->longText('generated_x12_payload')->nullable()->after('csv_payload');
            
            // Add index for format filtering
            $table->index(['inbound_format', 'outbound_format']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('edi_transactions', function (Blueprint $table) {
            $table->dropIndex(['inbound_format', 'outbound_format']);
            $table->dropColumn(['csv_payload', 'inbound_format', 'outbound_format', 'generated_x12_payload']);
        });
    }
};
