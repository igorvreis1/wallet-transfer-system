<?php

namespace Tests\Feature;

use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReversalTest extends TestCase
{
    use RefreshDatabase;

    public function test_quem_enviou_reverte_e_os_saldos_voltam_ao_que_eram(): void
    {
        $alice = $this->alice(100_00);
        $bob = $this->bob(0);
        $transfer = $this->transfer($alice, 'bob', 30_00);

        Sanctum::actingAs($alice);
        $this->postJson("/api/transactions/{$transfer->id}/reverse", ['reason' => 'Enviei para a pessoa errada'])
            ->assertCreated()
            ->assertJsonPath('message', 'Transação revertida com sucesso.')
            ->assertJsonPath('transaction.type', 'reversal')
            ->assertJsonPath('balance_formatted', 'R$ 100,00');

        $this->assertSame(100_00, $alice->fresh()->balance);
        $this->assertSame(0, $bob->fresh()->balance);

        // Nada é apagado: a original fica "reversed" e surge uma linha "reversal" apontando para ela.
        $this->assertSame('reversed', $transfer->fresh()->status->value);
        $this->assertDatabaseHas('transactions', [
            'type' => 'reversal',
            'reversal_of_id' => $transfer->id,
            'sender_id' => $bob->id,
            'receiver_id' => $alice->id,
            'reason' => 'Enviei para a pessoa errada',
        ]);
    }

    public function test_reversao_pode_deixar_o_destinatario_negativo(): void
    {
        $alice = $this->alice(100_00);
        $bob = $this->bob(0);
        $transfer = $this->transfer($alice, 'bob', 30_00);
        $this->transfer($bob, 'alice', 30_00); // Bob gasta tudo o que recebeu

        Sanctum::actingAs($alice);
        $this->postJson("/api/transactions/{$transfer->id}/reverse")->assertCreated();

        // Estorno integral: Bob fica devendo R$ 30,00.
        $this->assertSame(-30_00, $bob->fresh()->balance);
    }

    public function test_quem_recebeu_nao_pode_reverter(): void
    {
        $alice = $this->alice(100_00);
        $bob = $this->bob(0);
        $transfer = $this->transfer($alice, 'bob', 30_00);

        Sanctum::actingAs($bob);
        $this->postJson("/api/transactions/{$transfer->id}/reverse")
            ->assertForbidden()
            ->assertJsonPath('message', 'Apenas quem enviou a transferência pode revertê-la.');

        $this->assertSame(30_00, $bob->fresh()->balance);
    }

    public function test_nao_e_possivel_reverter_duas_vezes(): void
    {
        $alice = $this->alice(100_00);
        $this->bob();
        $transfer = $this->transfer($alice, 'bob', 30_00);

        Sanctum::actingAs($alice);
        $this->postJson("/api/transactions/{$transfer->id}/reverse")->assertCreated();
        $this->postJson("/api/transactions/{$transfer->id}/reverse")
            ->assertConflict()
            ->assertJsonPath('message', 'Esta transação já foi revertida.');

        $this->assertSame(100_00, $alice->fresh()->balance); // não recebeu duas vezes
    }

    public function test_uma_reversao_nao_pode_ser_revertida(): void
    {
        $alice = $this->alice(100_00);
        $this->bob();
        $transfer = $this->transfer($alice, 'bob', 30_00);

        Sanctum::actingAs($alice);
        $reversalId = $this->postJson("/api/transactions/{$transfer->id}/reverse")->json('transaction.id');

        $this->postJson("/api/transactions/{$reversalId}/reverse")
            ->assertForbidden()
            ->assertJsonPath('message', 'Uma reversão não pode ser revertida.');
    }

    public function test_dono_reverte_o_proprio_deposito(): void
    {
        $alice = $this->alice(0);
        Sanctum::actingAs($alice);
        $depositId = $this->postJson('/api/wallet/deposit', ['amount' => 50_00])->json('transaction.id');

        $this->postJson("/api/transactions/{$depositId}/reverse")->assertCreated();

        $this->assertSame(0, $alice->fresh()->balance);
    }

    public function test_usuario_nao_ve_nem_reverte_transacao_de_outras_pessoas(): void
    {
        $alice = $this->alice(100_00);
        $this->bob();
        $transfer = $this->transfer($alice, 'bob', 30_00);
        $intrusa = User::factory()->create(['nickname' => 'carol']);

        Sanctum::actingAs($intrusa);
        $this->getJson("/api/transactions/{$transfer->id}")
            ->assertNotFound()
            ->assertJsonPath('message', 'Transação não encontrada.');
        $this->postJson("/api/transactions/{$transfer->id}/reverse")->assertNotFound();
    }

    public function test_comando_administrativo_reverte_por_inconsistencia_sem_ser_o_dono(): void
    {
        $alice = $this->alice(100_00);
        $bob = $this->bob();
        $transfer = $this->transfer($alice, 'bob', 30_00);

        $this->artisan('wallet:reverse', ['transaction' => $transfer->id, '--reason' => 'Transferência duplicada'])
            ->expectsOutputToContain('revertida')
            ->assertSuccessful();

        $this->assertSame(100_00, $alice->fresh()->balance);
        $this->assertSame(0, $bob->fresh()->balance);
    }

    public function test_reversao_e_permitida_ate_o_ultimo_segundo_do_prazo_de_90_dias(): void
    {
        $this->freezeSecond();
        $alice = $this->alice(100_00);
        $this->bob();
        $transfer = $this->transfer($alice, 'bob', 30_00);

        $this->travel(90)->days(); // "viaja no tempo": agora é exatamente 90 dias depois

        Sanctum::actingAs($alice);
        $this->postJson("/api/transactions/{$transfer->id}/reverse")->assertCreated();
    }

    public function test_reversao_depois_de_90_dias_e_recusada_com_mensagem_clara(): void
    {
        $this->freezeSecond();
        $alice = $this->alice(100_00);
        $bob = $this->bob();
        $transfer = $this->transfer($alice, 'bob', 30_00);

        $this->travelTo(now()->addDays(90)->addSecond()); // 1 segundo depois do prazo

        Sanctum::actingAs($alice);
        $this->postJson("/api/transactions/{$transfer->id}/reverse")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'O prazo para reverter esta transação expirou. Reversões podem ser solicitadas em até 90 dias.');

        // nada muda
        $this->assertSame(70_00, $alice->fresh()->balance);
        $this->assertSame(30_00, $bob->fresh()->balance);
        $this->assertSame('completed', $transfer->fresh()->status->value);
    }

    public function test_extrato_esconde_o_botao_de_reverter_depois_do_prazo(): void
    {
        $alice = $this->alice(100_00);
        $this->bob();
        $this->transfer($alice, 'bob', 30_00);

        Sanctum::actingAs($alice);
        $this->getJson('/api/transactions')->assertJsonPath('data.0.can_reverse', true);

        $this->travel(91)->days();
        $this->getJson('/api/transactions')->assertJsonPath('data.0.can_reverse', false);
    }

    public function test_comando_administrativo_reverte_mesmo_depois_do_prazo(): void
    {
        $alice = $this->alice(100_00);
        $this->bob();
        $transfer = $this->transfer($alice, 'bob', 30_00);

        $this->travel(365)->days(); // um ano depois: o usuário não pode mais, o suporte pode

        $this->artisan('wallet:reverse', ['transaction' => $transfer->id])->assertSuccessful();

        $this->assertSame(100_00, $alice->fresh()->balance);
    }

    public function test_o_prazo_pode_ser_alterado_por_configuracao(): void
    {
        config(['wallet.reversal_window_days' => 7]); // ex.: REVERSAL_WINDOW_DAYS=7 no .env
        $alice = $this->alice(100_00);
        $this->bob();
        $transfer = $this->transfer($alice, 'bob', 30_00);

        $this->travel(8)->days();

        Sanctum::actingAs($alice);
        $this->postJson("/api/transactions/{$transfer->id}/reverse")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'O prazo para reverter esta transação expirou. Reversões podem ser solicitadas em até 7 dias.');
    }

    /**
     * Faz uma transferência pela API e devolve a transação criada.
     */
    private function transfer(User $from, string $to, int $amount): Transaction
    {
        Sanctum::actingAs($from);
        $id = $this->postJson('/api/wallet/transfer', ['recipient' => $to, 'amount' => $amount])
            ->assertCreated()
            ->json('transaction.id');

        return Transaction::findOrFail($id);
    }
}
