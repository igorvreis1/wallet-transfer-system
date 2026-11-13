<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class DepositTest extends TestCase
{
    use RefreshDatabase;

    public function test_deposito_soma_ao_saldo_e_registra_a_transacao(): void
    {
        $alice = $this->alice(100_00);
        Sanctum::actingAs($alice);

        $this->postJson('/api/wallet/deposit', ['amount' => 50_75])
            ->assertCreated()
            ->assertJsonPath('message', 'Depósito realizado com sucesso.')
            ->assertJsonPath('balance', 150_75)
            ->assertJsonPath('balance_formatted', 'R$ 150,75')
            ->assertJsonPath('transaction.type', 'deposit')
            ->assertJsonPath('transaction.amount_formatted', '+ R$ 50,75');

        $this->assertSame(150_75, $alice->fresh()->balance);
        $this->assertDatabaseHas('transactions', [
            'type' => 'deposit',
            'sender_id' => null,
            'receiver_id' => $alice->id,
            'amount' => 50_75,
        ]);
    }

    public function test_deposito_em_saldo_negativo_quita_a_divida_primeiro(): void
    {
        // Regra do desafio: "caso o saldo esteja negativo, no depósito deve acrescentar ao valor".
        $bob = $this->bob(-30_00);
        Sanctum::actingAs($bob);

        $this->postJson('/api/wallet/deposit', ['amount' => 50_00])
            ->assertCreated()
            ->assertJsonPath('balance_formatted', 'R$ 20,00');

        $this->assertSame(20_00, $bob->fresh()->balance);
    }

    /**
     * @return array<string, array{mixed, string}>
     */
    public static function valoresInvalidos(): array
    {
        return [
            'zero' => [0, 'O valor deve ser maior que zero.'],
            'negativo' => [-100, 'O valor deve ser maior que zero.'],
            'com casas decimais' => [50.75, 'O valor deve ser um número inteiro em centavos (ex.: 5075 para R$ 50,75).'],
            'texto' => ['abc', 'O valor deve ser um número inteiro em centavos (ex.: 5075 para R$ 50,75).'],
            'acima do limite' => [100_000_001, 'O valor máximo por operação é R$ 1.000.000,00.'],
            'ausente' => [null, 'Informe o valor.'],
        ];
    }

    #[DataProvider('valoresInvalidos')]
    public function test_deposito_com_valor_invalido_e_recusado(mixed $amount, string $mensagem): void
    {
        $alice = $this->alice(100_00);
        Sanctum::actingAs($alice);

        $this->postJson('/api/wallet/deposit', ['amount' => $amount])
            ->assertUnprocessable()
            ->assertJsonPath('errors.amount.0', $mensagem);

        $this->assertSame(100_00, $alice->fresh()->balance); // nada mudou
        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_deposito_exige_login(): void
    {
        $this->postJson('/api/wallet/deposit', ['amount' => 1000])->assertUnauthorized();
    }

    public function test_consulta_de_saldo(): void
    {
        Sanctum::actingAs($this->alice(12_34));

        $this->getJson('/api/wallet')
            ->assertOk()
            ->assertExactJson(['balance' => 12_34, 'balance_formatted' => 'R$ 12,34']);
    }
}
