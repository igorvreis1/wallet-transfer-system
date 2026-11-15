<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Lista do filtro "Pessoa" do extrato: só quem já transacionou com você.
 */
class CounterpartsTest extends TestCase
{
    use RefreshDatabase;

    public function test_lista_quem_ja_transacionou_comigo_em_ordem_alfabetica_sem_repetir(): void
    {
        $alice = $this->alice(100_00);
        $bob = $this->bob(50_00);
        $carol = User::factory()->create(['nickname' => 'carol']);
        User::factory()->create(['nickname' => 'dani']); // nunca transacionou com a Alice

        Sanctum::actingAs($alice);
        $this->postJson('/api/wallet/transfer', ['recipient' => 'carol', 'amount' => 1_00]);
        $this->postJson('/api/wallet/transfer', ['recipient' => 'bob', 'amount' => 1_00]);
        $this->postJson('/api/wallet/transfer', ['recipient' => 'bob', 'amount' => 1_00]); // repetido
        $this->postJson('/api/wallet/deposit', ['amount' => 5_00]);                         // sem contraparte

        Sanctum::actingAs($bob);
        $this->postJson('/api/wallet/transfer', ['recipient' => 'alice', 'amount' => 1_00]); // recebido também conta

        Sanctum::actingAs($alice);
        $this->getJson('/api/transactions/counterparts')
            ->assertOk()
            ->assertExactJson(['data' => [['nickname' => 'bob'], ['nickname' => 'carol']]]);
    }

    public function test_nao_mostra_transacoes_entre_outras_pessoas(): void
    {
        $alice = $this->alice();
        $bob = $this->bob(50_00);
        User::factory()->create(['nickname' => 'carol']);

        Sanctum::actingAs($bob);
        $this->postJson('/api/wallet/transfer', ['recipient' => 'carol', 'amount' => 1_00]); // Bob → Carol

        Sanctum::actingAs($alice);
        $this->getJson('/api/transactions/counterparts')->assertExactJson(['data' => []]);
    }

    public function test_exige_login(): void
    {
        $this->getJson('/api/transactions/counterparts')->assertUnauthorized();
    }
}
