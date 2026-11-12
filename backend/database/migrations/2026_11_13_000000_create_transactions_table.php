<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Livro-razão (ledger) de todas as movimentações financeiras.
 *
 * Convenção de sentido do dinheiro:
 *   sender_id   = de quem o saldo SAI     (nulo num depósito)
 *   receiver_id = para quem o saldo ENTRA (nulo na reversão de um depósito)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['deposit', 'transfer', 'reversal']);
            $table->enum('status', ['completed', 'reversed'])->default('completed');
            $table->foreignId('sender_id')->nullable()->constrained('users');
            $table->foreignId('receiver_id')->nullable()->constrained('users');
            $table->unsignedBigInteger('amount'); // em centavos, sempre positivo

            // Numa reversão, aponta para a operação original.
            // UNIQUE: o próprio banco garante que uma operação só é revertida uma vez.
            $table->foreignId('reversal_of_id')->nullable()->unique()->constrained('transactions');
            $table->string('reason', 255)->nullable();
            $table->timestamps();

            $table->index(['sender_id', 'created_at']);
            $table->index(['receiver_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
