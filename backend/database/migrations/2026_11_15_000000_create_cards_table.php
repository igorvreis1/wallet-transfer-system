<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cartões do usuário para depósito.
 *
 * SEGURANÇA (PCI DSS): o número completo e o CVV NUNCA são guardados nem chegam à API.
 * Só ficam a bandeira e os 4 últimos dígitos, o suficiente para o usuário reconhecer o cartão.
 * Num banco real, o número iria para um gateway de pagamento, que devolveria um token.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('brand', 20);          // visa, mastercard, elo, amex, hipercard, other
            $table->char('last4', 4);
            $table->string('holder_name', 60);    // nome impresso no cartão
            $table->unsignedTinyInteger('exp_month');
            $table->unsignedSmallInteger('exp_year');
            $table->string('nickname', 30)->nullable(); // apelido opcional, ex.: "Cartão do trabalho"
            $table->timestamps();

            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cards');
    }
};
