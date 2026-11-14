<?php

namespace Tests\Feature;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Filtros do extrato: período, direção, tipo e contraparte.
 * O irmão StatementTest cobre o extrato sem filtros e a consistência do ledger.
 */
class StatementFilterTest extends TestCase
{
    use RefreshDatabase;

    public function test_filtro_por_periodo_inclui_o_dia_inteiro_no_horario_de_brasilia(): void
    {
        $alice = $this->alice(0);

        // Horários no fuso do Brasil. O banco grava em UTC (3 horas a mais).
        $this->depositAt($alice, 1_00, '2026-10-31 23:59:59'); // véspera: FORA
        $this->depositAt($alice, 2_00, '2026-11-01 00:00:00'); // primeiro segundo do período: DENTRO
        $this->depositAt($alice, 3_00, '2026-11-30 23:59:59'); // último segundo (já é 1º/12 em UTC!): DENTRO
        $this->depositAt($alice, 4_00, '2026-12-01 00:00:00'); // dia seguinte: FORA

        $amounts = $this->statement($alice, '?from=2026-11-01&to=2026-11-30')
            ->assertOk()
            ->json('data.*.amount');

        $this->assertSame([3_00, 2_00], $amounts); // mais recente primeiro
    }

    public function test_periodo_de_um_dia_so(): void
    {
        $alice = $this->alice(0);
        $this->depositAt($alice, 1_00, '2026-11-10 12:00:00');
        $this->depositAt($alice, 2_00, '2026-11-11 12:00:00');

        $this->statement($alice, '?from=2026-11-10&to=2026-11-10')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.amount', 1_00);
    }

    public function test_so_a_data_inicial_ou_so_a_final(): void
    {
        $alice = $this->alice(0);
        $this->depositAt($alice, 1_00, '2026-11-01 12:00:00');
        $this->depositAt($alice, 2_00, '2026-11-20 12:00:00');

        $this->statement($alice, '?from=2026-11-10')->assertJsonCount(1, 'data')->assertJsonPath('data.0.amount', 2_00);
        $this->statement($alice, '?to=2026-11-10')->assertJsonCount(1, 'data')->assertJsonPath('data.0.amount', 1_00);
    }

    public function test_filtro_por_direcao_entradas_e_saidas(): void
    {
        [$alice, $bob] = [$this->alice(100_00), $this->bob(50_00)];

        $this->as($alice)->postJson('/api/wallet/transfer', ['recipient' => 'bob', 'amount' => 30_00]);   // sai da Alice
        $this->as($bob)->postJson('/api/wallet/transfer', ['recipient' => 'alice', 'amount' => 10_00]);   // entra na Alice
        $this->as($alice)->postJson('/api/wallet/deposit', ['amount' => 5_00]);                           // entra na Alice

        $this->statement($alice, '?direction=in')
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.direction', 'in')
            ->assertJsonPath('data.1.direction', 'in');

        $this->statement($alice, '?direction=OUT') // maiúsculas são aceitas
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.amount', 30_00);
    }

    public function test_filtro_por_tipo(): void
    {
        $alice = $this->alice(100_00);
        $this->bob();

        $this->as($alice)->postJson('/api/wallet/deposit', ['amount' => 5_00]);
        $this->as($alice)->postJson('/api/wallet/transfer', ['recipient' => 'bob', 'amount' => 30_00]);

        $this->statement($alice, '?type=deposit')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.type', 'deposit');
    }

    public function test_filtro_por_contraparte_traz_os_dois_sentidos(): void
    {
        [$alice, $bob] = [$this->alice(100_00), $this->bob(50_00)];
        $this->carol();

        $this->as($alice)->postJson('/api/wallet/transfer', ['recipient' => 'bob', 'amount' => 30_00]);   // Alice → Bob
        $this->as($bob)->postJson('/api/wallet/transfer', ['recipient' => 'alice', 'amount' => 10_00]);   // Bob → Alice
        $this->as($alice)->postJson('/api/wallet/transfer', ['recipient' => 'carol', 'amount' => 1_00]);  // Alice → Carol: FORA

        $this->statement($alice, '?counterpart=bob@example.com') // também aceita email
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.counterpart', 'bob')
            ->assertJsonPath('data.1.counterpart', 'bob');
    }

    public function test_filtro_por_contraparte_nunca_mostra_transacoes_de_outras_pessoas(): void
    {
        // Segurança: o filtro só RESTRINGE o extrato da Alice, nunca abre o dos outros.
        $alice = $this->alice(100_00);
        $bob = $this->bob(50_00);
        $carol = $this->carol(50_00);

        $this->as($carol)->postJson('/api/wallet/transfer', ['recipient' => 'bob', 'amount' => 20_00]); // Carol → Bob (Alice não participa)
        $this->as($carol)->postJson('/api/wallet/deposit', ['amount' => 7_00]);                          // depósito da Carol
        $this->as($alice)->postJson('/api/wallet/transfer', ['recipient' => 'carol', 'amount' => 1_00]); // Alice → Carol

        $this->statement($alice, '?counterpart=carol')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.amount', 1_00);

        $this->statement($alice, '?counterpart=carol&direction=in')->assertJsonCount(0, 'data');
    }

    public function test_filtros_combinados(): void
    {
        [$alice, $bob] = [$this->alice(100_00), $this->bob(50_00)];
        $this->carol();

        $this->transferAt($alice, 'bob', 10_00, '2026-11-05 10:00:00');   // ✅ saída, para o Bob, dentro do período
        $this->transferAt($alice, 'bob', 20_00, '2026-12-05 10:00:00');   // ❌ fora do período
        $this->transferAt($alice, 'carol', 30_00, '2026-11-06 10:00:00'); // ❌ outra contraparte
        $this->transferAt($bob, 'alice', 5_00, '2026-11-07 10:00:00');    // ❌ é entrada

        $this->statement($alice, '?from=2026-11-01&to=2026-11-30&direction=out&counterpart=bob')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.amount', 10_00);
    }

    public function test_contraparte_inexistente_devolve_404_com_mensagem_clara(): void
    {
        $this->statement($this->alice(), '?counterpart=fantasma')
            ->assertNotFound()
            ->assertJsonPath('message', 'Nenhum usuário encontrado com esse email ou nickname.');
    }

    public function test_paginacao_mantem_os_filtros_nos_links(): void
    {
        $alice = $this->alice(0);

        for ($i = 1; $i <= 16; $i++) { // 16 depósitos = 2 páginas de 15
            $this->as($alice)->postJson('/api/wallet/deposit', ['amount' => 1_00]);
        }

        $next = $this->statement($alice, '?type=deposit')
            ->assertJsonCount(15, 'data')
            ->json('links.next');

        $this->assertStringContainsString('type=deposit', $next);
        $this->assertStringContainsString('page=2', $next);
    }

    #[DataProvider('filtrosInvalidos')]
    public function test_filtros_invalidos_sao_recusados(string $query, string $campo, string $mensagem): void
    {
        $this->statement($this->alice(), $query)
            ->assertUnprocessable()
            ->assertJsonPath("errors.{$campo}.0", $mensagem);
    }

    /**
     * @return array<string, array{string, string, string}>
     */
    public static function filtrosInvalidos(): array
    {
        return [
            'data em formato brasileiro' => ['?from=01/11/2026', 'from', 'A data inicial deve estar no formato AAAA-MM-DD.'],
            'data que não existe' => ['?to=2026-02-30', 'to', 'A data final deve estar no formato AAAA-MM-DD.'],
            'final antes da inicial' => ['?from=2026-11-30&to=2026-11-01', 'to', 'A data final deve ser igual ou posterior à data inicial.'],
            'direção desconhecida' => ['?direction=xyz', 'direction', 'A direção deve ser "in" (entradas) ou "out" (saídas).'],
            'tipo desconhecido' => ['?type=pix', 'type', 'O tipo deve ser "deposit", "transfer" ou "reversal".'],
        ];
    }

    // ---------------------------------------------------------------- helpers

    private function carol(int $balance = 0): User
    {
        return User::factory()->withBalance($balance)->create(['email' => 'carol@example.com', 'nickname' => 'carol']);
    }

    private function as(User $user): static
    {
        Sanctum::actingAs($user);

        return $this;
    }

    private function statement(User $user, string $query = ''): \Illuminate\Testing\TestResponse
    {
        return $this->as($user)->getJson('/api/transactions'.$query);
    }

    /** Viaja até o horário (no fuso do Brasil) e deposita pela API. */
    private function depositAt(User $user, int $amount, string $brasilia): void
    {
        $this->travelTo(CarbonImmutable::parse($brasilia, 'America/Sao_Paulo'));
        $this->as($user)->postJson('/api/wallet/deposit', ['amount' => $amount])->assertCreated();
        $this->travelBack();
    }

    private function transferAt(User $from, string $to, int $amount, string $brasilia): void
    {
        $this->travelTo(CarbonImmutable::parse($brasilia, 'America/Sao_Paulo'));
        $this->as($from)->postJson('/api/wallet/transfer', ['recipient' => $to, 'amount' => $amount])->assertCreated();
        $this->travelBack();
    }
}
