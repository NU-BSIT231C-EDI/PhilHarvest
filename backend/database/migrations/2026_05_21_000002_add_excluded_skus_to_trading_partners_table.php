<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trading_partners', function (Blueprint $table) {
            // SKUs the partner is NOT permitted to order from us.
            // Null / empty = no restrictions. Non-empty = only those SKUs are rejected on 855.
            $table->json('excluded_skus')->nullable()->after('auth_token');
        });
    }

    public function down(): void
    {
        Schema::table('trading_partners', function (Blueprint $table) {
            $table->dropColumn('excluded_skus');
        });
    }
};
