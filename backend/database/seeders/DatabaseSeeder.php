<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Usuários de demonstração (senha: password1). Saldo em centavos.
        User::factory()->withBalance(100_00)->create([
            'email' => 'alice@example.com',
            'nickname' => 'alice',
        ]);

        User::factory()->create([
            'email' => 'bob@example.com',
            'nickname' => 'bob',
        ]);
    }
}
