<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TransferTest extends TestCase
{
    use RefreshDatabase;

    public function test_alice_transfere_30_reais_para_bob_pelo_nickname(): void
    {
        // 1. PREPARAR
        $alice = $this->alice(100_00);
        $bob = $this->bob(0);
        Sanctum::actingAs($alice);

        // 2. AGIR
        $response = $this->postJson('/api/wallet/transfer', ['recipient' => 'bob', 'amount' => 30_00]);

        // 3. CONFERIR
        $response->assertCreated()
            ->assertJsonPath('message', 'Transferência realizada com sucesso.')
            ->assertJsonPath('balance_formatted', 'R$ 70,00')
            ->assertJsonPath('transaction.direction', 'out')
            ->assertJsonPath('transaction.counterpart', 'bob');

        $this->assertSame(70_00, $alice->fresh()->balance);
        $this->assertSame(30_00, $bob->fresh()->balance);
        $this->assertDatabaseHas('transactions', [
            'type' => 'transfer',
            'sender_id' => $alice->id,
            'receiver_id' => $bob->id,
            'amount' => 30_00,
            'status' => 'completed',
        ]);
    }

    public function test_transferencia_pelo_email_do_destinatario(): void
    {
        $alice = $this->alice(100_00);
        $bob = $this->bob(0);
        Sanctum::actingAs($alice);

        $this->postJson('/api/wallet/transfer', ['recipient' => 'BOB@example.com', 'amount' => 10_00])
            ->assertCreated();

        $this->assertSame(10_00, $bob->fresh()->balance);
    }

    public function test_pode_transferir_o_saldo_exato_e_ficar_zerado(): void
    {
        $alice = $this->alice(100_00);
        $this->bob();
        Sanctum::actingAs($alice);

        $this->postJson('/api/wallet/transfer', ['recipient' => 'bob', 'amount' => 100_00])->assertCreated();

        $this->assertSame(0, $alice->fresh()->balance);
    }

    public function test_transferencia_sem_saldo_e_recusada_e_nada_muda(): void
    {
        $alice = $this->alice(100_00);
        $bob = $this->bob(0);
        Sanctum::actingAs($alice);

        $this->postJson('/api/wallet/transfer', ['recipient' => 'bob', 'amount' => 100_01])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Saldo insuficiente. Seu saldo atual é R$ 100,00.');

        $this->assertSame(100_00, $alice->fresh()->balance);
        $this->assertSame(0, $bob->fresh()->balance);
        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_usuario_com_saldo_negativo_nao_consegue_transferir(): void
    {
        $bob = $this->bob(-10_00);
        $this->alice();
        Sanctum::actingAs($bob);

        $this->postJson('/api/wallet/transfer', ['recipient' => 'alice', 'amount' => 1])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Saldo insuficiente. Seu saldo atual é -R$ 10,00.');
    }

    public function test_nao_pode_transferir_para_si_mesmo(): void
    {
        Sanctum::actingAs($this->alice());

        $this->postJson('/api/wallet/transfer', ['recipient' => 'alice@example.com', 'amount' => 1000])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Você não pode transferir para si mesmo.');
    }

    public function test_destinatario_inexistente_devolve_404_com_mensagem_clara(): void
    {
        Sanctum::actingAs($this->alice());

        $this->postJson('/api/wallet/transfer', ['recipient' => 'fantasma', 'amount' => 1000])
            ->assertNotFound()
            ->assertJsonPath('message', 'Nenhum usuário encontrado com esse email ou nickname.');
    }

    public function test_campos_obrigatorios(): void
    {
        Sanctum::actingAs($this->alice());

        $this->postJson('/api/wallet/transfer', [])
            ->assertUnprocessable()
            ->assertJsonPath('errors.recipient.0', 'Informe o email ou nickname de quem vai receber.')
            ->assertJsonPath('errors.amount.0', 'Informe o valor.');
    }

    public function test_busca_do_destinatario_para_confirmacao_nao_expoe_dados_sensiveis(): void
    {
        Sanctum::actingAs($this->alice());
        $this->bob(500_00);

        $this->getJson('/api/users/lookup?identifier=BOB')
            ->assertOk()
            ->assertExactJson(['data' => [
                'nickname' => 'bob',
                'email_masked' => 'bo***@example.com', // sem email completo e sem saldo
            ]]);
    }

    public function test_busca_de_destinatario_inexistente(): void
    {
        Sanctum::actingAs($this->alice());

        $this->getJson('/api/users/lookup?identifier=ninguem')->assertNotFound();
    }
}
