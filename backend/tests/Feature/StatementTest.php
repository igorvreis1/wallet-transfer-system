<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Extrato e consistência do ledger.
 */
class StatementTest extends TestCase
{
    use RefreshDatabase;

    public function test_extrato_mostra_so_as_transacoes_do_usuario_do_ponto_de_vista_dele(): void
    {
        $alice = $this->alice(100_00);
        $bob = $this->bob(0);
        $carol = User::factory()->withBalance(50_00)->create(['nickname' => 'carol']);

        $this->actingAsUser($alice)->postJson('/api/wallet/transfer', ['recipient' => 'bob', 'amount' => 30_00]);
        $this->actingAsUser($carol)->postJson('/api/wallet/transfer', ['recipient' => 'alice', 'amount' => 5_00]);
        $this->actingAsUser($carol)->postJson('/api/wallet/deposit', ['amount' => 1_00]); // não envolve a Alice

        $this->actingAsUser($alice)->getJson('/api/transactions')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            // mais recente primeiro
            ->assertJsonPath('data.0.direction', 'in')
            ->assertJsonPath('data.0.counterpart', 'carol')
            ->assertJsonPath('data.0.amount_formatted', '+ R$ 5,00')
            ->assertJsonPath('data.0.can_reverse', false)  // quem recebeu não reverte
            ->assertJsonPath('data.1.direction', 'out')
            ->assertJsonPath('data.1.counterpart', 'bob')
            ->assertJsonPath('data.1.amount_formatted', '- R$ 30,00')
            ->assertJsonPath('data.1.can_reverse', true);  // quem enviou pode reverter
    }

    public function test_saldo_sempre_bate_com_a_soma_do_extrato(): void
    {
        // Todos começam do zero: o saldo só muda pelas operações abaixo, todas pela API.
        $alice = $this->alice(0);
        $bob = $this->bob(0);

        //                                                                                         Alice   Bob
        $this->actingAsUser($alice)->postJson('/api/wallet/deposit', ['amount' => 200_00]);        //  200     0
        $transferId = $this->actingAsUser($alice)->postJson('/api/wallet/transfer', ['recipient' => 'bob', 'amount' => 80_00])->json('transaction.id'); // 120 80
        $this->actingAsUser($bob)->postJson('/api/wallet/transfer', ['recipient' => 'alice', 'amount' => 80_00]); // 200 0
        $this->actingAsUser($alice)->postJson("/api/transactions/{$transferId}/reverse");          //  280   -80 (Bob negativo)
        $this->actingAsUser($bob)->postJson('/api/wallet/deposit', ['amount' => 100_00]);          //  280    20 (quita a dívida)

        foreach ([$alice, $bob] as $user) {
            $entrou = (int) DB::table('transactions')->where('receiver_id', $user->id)->sum('amount');
            $saiu = (int) DB::table('transactions')->where('sender_id', $user->id)->sum('amount');

            $this->assertSame($entrou - $saiu, $user->fresh()->balance, "Saldo de {$user->nickname} não bate com o extrato");
        }

        $this->assertSame(280_00, $alice->fresh()->balance);
        $this->assertSame(20_00, $bob->fresh()->balance);
    }

    private function actingAsUser(User $user): static
    {
        Sanctum::actingAs($user);

        return $this;
    }
}
