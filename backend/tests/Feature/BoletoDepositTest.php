<?php

namespace Tests\Feature;

use App\Models\Card;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Depósito por boleto (simulado): o usuário gera o boleto, "paga" e confirma.
 */
class BoletoDepositTest extends TestCase
{
    use RefreshDatabase;

    public function test_deposito_por_boleto(): void
    {
        $alice = $this->alice(0);
        Sanctum::actingAs($alice);

        $this->postJson('/api/wallet/deposit', ['amount' => 150_00, 'method' => 'boleto'])
            ->assertCreated()
            ->assertJsonPath('transaction.payment_method', 'boleto')
            ->assertJsonPath('transaction.payment_detail', 'Boleto')
            ->assertJsonPath('balance_formatted', 'R$ 150,00');

        $this->assertSame(150_00, $alice->fresh()->balance);
    }

    public function test_boleto_nao_aceita_cartao(): void
    {
        $alice = $this->alice(0);
        $card = Card::factory()->for($alice)->create();
        Sanctum::actingAs($alice);

        $this->postJson('/api/wallet/deposit', ['amount' => 10_00, 'method' => 'boleto', 'card_id' => $card->id])
            ->assertUnprocessable()
            ->assertJsonPath('errors.card_id.0', 'Informe o cartão só quando o depósito for por cartão.');

        $this->assertSame(0, $alice->fresh()->balance);
    }

    public function test_extrato_mostra_que_foi_por_boleto(): void
    {
        Sanctum::actingAs($this->alice(0));

        $this->postJson('/api/wallet/deposit', ['amount' => 20_00, 'method' => 'boleto'])->assertCreated();

        $this->getJson('/api/transactions')
            ->assertJsonPath('data.0.payment_method', 'boleto')
            ->assertJsonPath('data.0.payment_detail', 'Boleto');
    }
}
