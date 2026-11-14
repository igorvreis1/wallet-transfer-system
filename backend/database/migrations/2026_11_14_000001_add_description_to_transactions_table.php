<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mensagem opcional na transferência (como a mensagem do Pix), visível para quem envia e quem recebe.
 * Diferente de "reason", que é o motivo de uma reversão.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->string('description', 140)->nullable()->after('reason');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn('description');
        });
    }
};
