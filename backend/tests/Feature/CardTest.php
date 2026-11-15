<?php

namespace Tests\Feature;

use App\Models\Card;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Cartões para depósito: CRUD, dono, validade e a regra de segurança
 * de nunca guardar o número completo nem o CVV.
 */
class CardTest extends TestCase
{
    use RefreshDatabase;

    private function validCard(array $overrides = []): array
    {
        return [
            'brand' => 'visa',
            'last4' => '4242',
            'holder_name' => 'alice teste',
            'exp_month' => 12,
            'exp_year' => (int) now()->addYears(2)->format('Y'),
            'nickname' => 'Cartão do dia a dia',
            ...$overrides,
        ];
    }

    public function test_cadastra_cartao_so_com_bandeira_e_final(): void
    {
        Sanctum::actingAs($this->alice());

        $this->postJson('/api/cards', $this->validCard())
            ->assertCreated()
            ->assertJsonPath('card.label', 'Visa •••• 4242')
            ->assertJsonPath('card.holder_name', 'ALICE TESTE') // salvo em maiúsculas, como no cartão
            ->assertJsonPath('card.expired', false);
    }

    public function test_numero_completo_e_cvv_sao_recusados_e_nunca_salvos(): void
    {
        Sanctum::actingAs($this->alice());

        $this->postJson('/api/cards', $this->validCard(['number' => '4242424242424242', 'cvv' => '123']))
            ->assertUnprocessable()
            ->assertJsonPath('errors.number.0', 'Por segurança, o número completo do cartão não é enviado nem armazenado.')
            ->assertJsonPath('errors.cvv.0', 'Por segurança, o CVV não é enviado nem armazenado.');

        $this->assertDatabaseCount('cards', 0);
        // Nem existe coluna onde guardar
        $this->assertFalse(Schema::hasColumn('cards', 'number'));
        $this->assertFalse(Schema::hasColumn('cards', 'cvv'));
    }

    public function test_nao_aceita_cartao_vencido(): void
    {
        Sanctum::actingAs($this->alice());
        $lastYear = (int) now()->subYear()->format('Y');

        $this->postJson('/api/cards', $this->validCard(['exp_year' => $lastYear]))->assertUnprocessable();

        $lastMonth = now()->subMonthNoOverflow();
        $this->postJson('/api/cards', $this->validCard(['exp_month' => (int) $lastMonth->format('n'), 'exp_year' => (int) $lastMonth->format('Y')]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['exp_month']);
    }

    public function test_cartao_que_vence_este_mes_ainda_vale(): void
    {
        Sanctum::actingAs($this->alice());

        $this->postJson('/api/cards', $this->validCard(['exp_month' => (int) now()->format('n'), 'exp_year' => (int) now()->format('Y')]))
            ->assertCreated();
    }

    public function test_lista_so_os_proprios_cartoes(): void
    {
        $alice = $this->alice();
        Card::factory()->for($alice)->create(['last4' => '1111']);
        Card::factory()->for($this->bob())->create(['last4' => '2222']);
        Sanctum::actingAs($alice);

        $this->getJson('/api/cards')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.last4', '1111');
    }

    public function test_edita_apelido_e_validade_mas_nao_o_final(): void
    {
        $alice = $this->alice();
        $card = Card::factory()->for($alice)->create();
        Sanctum::actingAs($alice);
        $nextYear = (int) now()->addYear()->format('Y');

        $this->patchJson("/api/cards/{$card->id}", ['nickname' => 'Nubank', 'exp_month' => 6, 'exp_year' => $nextYear])
            ->assertOk()
            ->assertJsonPath('card.nickname', 'Nubank')
            ->assertJsonPath('card.expires', sprintf('06/%02d', $nextYear % 100));

        $this->patchJson("/api/cards/{$card->id}", ['last4' => '9999'])->assertUnprocessable();
        $this->assertSame('4242', $card->fresh()->last4);
    }

    public function test_nao_mexe_no_cartao_de_outra_pessoa(): void
    {
        $bobCard = Card::factory()->for($this->bob())->create();
        Sanctum::actingAs($this->alice());

        $this->patchJson("/api/cards/{$bobCard->id}", ['nickname' => 'meu agora'])
            ->assertNotFound()
            ->assertJsonPath('message', 'Cartão não encontrado.');
        $this->deleteJson("/api/cards/{$bobCard->id}")->assertNotFound();

        $this->assertNull($bobCard->fresh()->nickname);
    }

    public function test_exclui_cartao_e_o_extrato_continua_mostrando_qual_foi(): void
    {
        $alice = $this->alice(0);
        $card = Card::factory()->for($alice)->create();
        Sanctum::actingAs($alice);

        $this->postJson('/api/wallet/deposit', ['amount' => 50_00, 'method' => 'card', 'card_id' => $card->id])->assertCreated();
        $this->deleteJson("/api/cards/{$card->id}")->assertOk()->assertJsonPath('message', 'Cartão excluído.');

        $this->assertDatabaseCount('cards', 0);
        $this->getJson('/api/transactions')->assertJsonPath('data.0.payment_detail', 'Visa •••• 4242');
    }

    public function test_limite_de_5_cartoes(): void
    {
        $alice = $this->alice();
        Card::factory()->count(Card::MAX_PER_USER)->for($alice)->create();
        Sanctum::actingAs($alice);

        $this->postJson('/api/cards', $this->validCard())
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Você pode salvar no máximo 5 cartões. Exclua um para adicionar outro.');
    }

    public function test_cartoes_exigem_login(): void
    {
        $this->getJson('/api/cards')->assertUnauthorized();
    }

    // ---------------------------------------------------------------- depósito

    public function test_deposito_sem_metodo_e_pix(): void
    {
        Sanctum::actingAs($this->alice(0));

        $this->postJson('/api/wallet/deposit', ['amount' => 10_00])
            ->assertCreated()
            ->assertJsonPath('transaction.payment_method', 'pix')
            ->assertJsonPath('transaction.payment_detail', 'Pix');
    }

    public function test_deposito_com_cartao_proprio(): void
    {
        $alice = $this->alice(0);
        $card = Card::factory()->for($alice)->create();
        Sanctum::actingAs($alice);

        $this->postJson('/api/wallet/deposit', ['amount' => 25_00, 'method' => 'card', 'card_id' => $card->id])
            ->assertCreated()
            ->assertJsonPath('transaction.payment_method', 'card')
            ->assertJsonPath('transaction.payment_detail', 'Visa •••• 4242');

        $this->assertSame(25_00, $alice->fresh()->balance);
    }

    public function test_deposito_com_cartao_de_outra_pessoa_e_recusado(): void
    {
        $alice = $this->alice(0);
        $bobCard = Card::factory()->for($this->bob())->create();
        Sanctum::actingAs($alice);

        $this->postJson('/api/wallet/deposit', ['amount' => 10_00, 'method' => 'card', 'card_id' => $bobCard->id])
            ->assertNotFound();

        $this->assertSame(0, $alice->fresh()->balance);
    }

    public function test_deposito_com_cartao_vencido_e_recusado(): void
    {
        $alice = $this->alice(0);
        $card = Card::factory()->for($alice)->expired()->create();
        Sanctum::actingAs($alice);

        $this->postJson('/api/wallet/deposit', ['amount' => 10_00, 'method' => 'card', 'card_id' => $card->id])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Este cartão está vencido. Atualize a validade ou use outro cartão.');

        $this->assertSame(0, $alice->fresh()->balance);
        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_deposito_por_cartao_exige_o_cartao(): void
    {
        Sanctum::actingAs($this->alice());

        $this->postJson('/api/wallet/deposit', ['amount' => 10_00, 'method' => 'card'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.card_id.0', 'Escolha o cartão para o depósito.');

        $this->postJson('/api/wallet/deposit', ['amount' => 10_00, 'method' => 'cheque'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['method']);
    }

    public function test_usuario_excluido_leva_os_cartoes_junto(): void
    {
        $bob = $this->bob();
        Card::factory()->for($bob)->create();

        $bob->delete();

        $this->assertDatabaseCount('cards', 0);
        $this->assertNull(User::find($bob->id));
    }
}
