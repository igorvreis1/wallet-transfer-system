<?php

namespace Tests;

use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Trava de segurança: se a configuração estiver errada, NUNCA roda no banco de desenvolvimento.
        $database = DB::connection()->getDatabaseName();
        if ($database !== 'wallet_testing') {
            throw new RuntimeException("Os testes só podem rodar no banco 'wallet_testing' (atual: '{$database}').");
        }
    }

    /**
     * Usuária padrão dos testes. Saldo em centavos (padrão R$ 100,00).
     */
    protected function alice(int $balance = 100_00): User
    {
        return User::factory()->withBalance($balance)->create([
            'email' => 'alice@example.com',
            'nickname' => 'alice',
        ]);
    }

    /**
     * Usuário padrão dos testes. Saldo em centavos (padrão R$ 0,00).
     */
    protected function bob(int $balance = 0): User
    {
        return User::factory()->withBalance($balance)->create([
            'email' => 'bob@example.com',
            'nickname' => 'bob',
        ]);
    }
}
