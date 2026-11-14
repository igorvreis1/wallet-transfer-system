<?php

namespace Tests\Feature;

use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Detalhes de uma operação: mensagem da transferência, prazo de reversão e
 * dados da reversão (quando e por quê), usados no pop-up de detalhes do frontend.
 */
class TransferDetailsTest extends TestCase
{
    use RefreshDatabase;

    public function test_transferencia_com_mensagem_aparece_para_quem_envia_e_quem_recebe(): void
    {
        $alice = $this->alice(100_00);
        $bob = $this->bob();
        Sanctum::actingAs($alice);

        $this->postJson('/api/wallet/transfer', ['recipient' => 'bob', 'amount' => 30_00, 'description' => 'Almoço de sexta'])
            ->assertCreated()
            ->assertJsonPath('transaction.description', 'Almoço de sexta');

        $this->actingAsUser($bob)->getJson('/api/transactions')
            ->assertJsonPath('data.0.description', 'Almoço de sexta')
            ->assertJsonPath('data.0.direction', 'in');
    }

    public function test_mensagem_e_opcional_e_vazia_vira_nula(): void
    {
        Sanctum::actingAs($this->alice(100_00));
        $this->bob();

        $this->postJson('/api/wallet/transfer', ['recipient' => 'bob', 'amount' => 1_00])
            ->assertCreated()->assertJsonPath('transaction.description', null);
        $this->postJson('/api/wallet/transfer', ['recipient' => 'bob', 'amount' => 1_00, 'description' => '   '])
            ->assertCreated()->assertJsonPath('transaction.description', null);
    }

    public function test_mensagem_tem_no_maximo_140_caracteres(): void
    {
        Sanctum::actingAs($this->alice(100_00));
        $this->bob();

        $this->postJson('/api/wallet/transfer', ['recipient' => 'bob', 'amount' => 1_00, 'description' => str_repeat('a', 141)])
            ->assertUnprocessable()
            ->assertJsonPath('errors.description.0', 'A mensagem pode ter no máximo 140 caracteres.');

        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_extrato_informa_ate_quando_pode_reverter(): void
    {
        $this->freezeSecond();
        Sanctum::actingAs($this->alice(100_00));
        $this->bob();

        $this->postJson('/api/wallet/transfer', ['recipient' => 'bob', 'amount' => 10_00])->assertCreated();

        $this->getJson('/api/transactions')
            ->assertJsonPath('data.0.reversible_until', now()->addDays(90)->toIso8601String());
    }

    public function test_reversao_nao_tem_prazo_de_reversao(): void
    {
        $alice = $this->alice(100_00);
        $this->bob();
        Sanctum::actingAs($alice);

        $id = $this->postJson('/api/wallet/transfer', ['recipient' => 'bob', 'amount' => 10_00])->json('transaction.id');
        $this->postJson("/api/transactions/{$id}/reverse")->assertCreated()
            ->assertJsonPath('transaction.reversible_until', null);
    }

    public function test_operacao_revertida_mostra_quando_e_o_motivo(): void
    {
        $alice = $this->alice(100_00);
        $this->bob();
        Sanctum::actingAs($alice);

        $id = $this->postJson('/api/wallet/transfer', ['recipient' => 'bob', 'amount' => 10_00])->json('transaction.id');
        $reversalId = $this->postJson("/api/transactions/{$id}/reverse", ['reason' => 'Enviei para a pessoa errada'])
            ->json('transaction.id');

        $this->getJson("/api/transactions/{$id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'reversed')
            ->assertJsonPath('data.reversed.id', $reversalId)
            ->assertJsonPath('data.reversed.reason', 'Enviei para a pessoa errada');

        $this->assertSame('Enviei para a pessoa errada', Transaction::find($reversalId)->reason);
    }

    public function test_operacao_nao_revertida_tem_reversed_nulo(): void
    {
        $alice = $this->alice(100_00);
        $this->bob();
        Sanctum::actingAs($alice);

        $id = $this->postJson('/api/wallet/transfer', ['recipient' => 'bob', 'amount' => 10_00])->json('transaction.id');

        $this->getJson("/api/transactions/{$id}")->assertJsonPath('data.reversed', null);
    }

    private function actingAsUser(User $user): static
    {
        Sanctum::actingAs($user);

        return $this;
    }
}
