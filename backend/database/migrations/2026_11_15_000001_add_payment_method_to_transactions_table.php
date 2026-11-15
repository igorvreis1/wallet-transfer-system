<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Como o depósito foi pago: Pix ou cartão.
 * "payment_detail" guarda uma FOTO do cartão no momento (ex.: "Visa •••• 4242"),
 * para o extrato continuar correto mesmo se o cartão for editado ou excluído depois.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->string('payment_method', 10)->nullable()->after('description'); // pix | card (só depósitos)
            $table->string('payment_detail', 60)->nullable()->after('payment_method');
            $table->foreignId('card_id')->nullable()->after('payment_detail')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('card_id');
            $table->dropColumn(['payment_method', 'payment_detail']);
        });
    }
};
