<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Privacidade do email. O nickname é sempre público (é a "chave" da carteira);
 * o email é público por padrão, mas o usuário pode ocultá-lo.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('email_visible')->default(true)->after('nickname');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('email_visible');
        });
    }
};
