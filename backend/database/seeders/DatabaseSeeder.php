<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\Wallet\DepositService;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Usuários de demonstração (senha: password1).
     */
    public function run(DepositService $deposits): void
    {
        $alice = User::factory()->create(['email' => 'alice@example.com', 'nickname' => 'alice']);
        User::factory()->create(['email' => 'bob@example.com', 'nickname' => 'bob']);

        // O saldo inicial entra por um depósito de verdade, para o extrato bater com o saldo.
        $deposits->deposit($alice, 100_00); // R$ 100,00
    }
}
