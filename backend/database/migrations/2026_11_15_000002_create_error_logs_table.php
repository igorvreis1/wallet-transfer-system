<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Observabilidade: TODO erro da API fica registrado aqui.
 *   level "error"   → inesperado (5xx): bug ou infraestrutura. É o que se investiga primeiro.
 *   level "warning" → esperado (4xx): regra de negócio, validação, login inválido...
 * O request_id liga o registro ao header X-Request-Id da resposta e às linhas do arquivo de log.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('error_logs', function (Blueprint $table) {
            $table->id();
            $table->string('request_id', 64)->index();
            $table->string('level', 10)->index();            // error | warning
            $table->unsignedSmallInteger('status');           // código HTTP devolvido
            $table->string('exception', 120)->nullable();     // classe da exceção (ex.: InsufficientBalanceException)
            $table->text('message');
            $table->string('method', 10);
            $table->string('path', 255);
            $table->unsignedBigInteger('user_id')->nullable()->index(); // sem FK: o log sobrevive à exclusão do usuário
            $table->string('ip', 45)->nullable();
            $table->json('context')->nullable();              // entrada (sem senhas/cartão), campos inválidos, trecho do stack trace
            $table->unsignedInteger('duration_ms')->nullable();
            $table->timestamp('created_at')->useCurrent()->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('error_logs');
    }
};
