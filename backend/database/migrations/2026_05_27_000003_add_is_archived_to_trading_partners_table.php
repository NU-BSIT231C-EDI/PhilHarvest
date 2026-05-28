<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trading_partners', function (Blueprint $table) {
            $table->boolean('is_archived')->default(false)->after('excluded_skus');
        });
    }

    public function down(): void
    {
        Schema::table('trading_partners', function (Blueprint $table) {
            $table->dropColumn('is_archived');
        });
    }
};
