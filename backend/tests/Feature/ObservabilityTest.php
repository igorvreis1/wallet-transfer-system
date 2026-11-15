<?php

namespace Tests\Feature;

use App\Models\ErrorLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;
use RuntimeException;
use Tests\TestCase;

/**
 * Observabilidade: ID por requisição, registro de todo erro em error_logs
 * (sem dados sensíveis), retenção e a rota de saúde.
 */
class ObservabilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_toda_resposta_da_api_tem_request_id(): void
    {
        $this->getJson('/api/health')->assertOk()->assertHeader('X-Request-Id');
    }

    public function test_reaproveita_o_request_id_enviado_pelo_cliente(): void
    {
        $this->getJson('/api/health', ['X-Request-Id' => 'meu-id-de-teste-123'])
            ->assertHeader('X-Request-Id', 'meu-id-de-teste-123');
    }

    public function test_request_id_invalido_e_trocado_por_um_novo(): void
    {
        $id = $this->getJson('/api/health', ['X-Request-Id' => "<script>\n"])->headers->get('X-Request-Id');

        $this->assertMatchesRegularExpression('/^[0-9a-f-]{36}$/', $id); // um UUID novo
    }

    public function test_sucesso_nao_gera_registro(): void
    {
        Sanctum::actingAs($this->alice());

        $this->postJson('/api/wallet/deposit', ['amount' => 10_00])->assertCreated();

        $this->assertDatabaseCount('error_logs', 0);
    }

    public function test_erro_de_regra_de_negocio_e_registrado_como_warning(): void
    {
        $alice = $this->alice(10_00);
        $this->bob();
        Sanctum::actingAs($alice);

        $response = $this->postJson('/api/wallet/transfer', ['recipient' => 'bob', 'amount' => 50_00])->assertUnprocessable();

        $log = ErrorLog::query()->sole();
        $this->assertSame('warning', $log->level);
        $this->assertSame(422, $log->status);
        $this->assertSame('InsufficientBalanceException', $log->exception);
        $this->assertSame('Saldo insuficiente. Seu saldo atual é R$ 10,00.', $log->message);
        $this->assertSame('POST', $log->method);
        $this->assertSame('/api/wallet/transfer', $log->path);
        $this->assertSame($alice->id, $log->user_id);
        $this->assertSame($response->headers->get('X-Request-Id'), $log->request_id); // liga a resposta ao registro
    }

    public function test_senha_nunca_e_gravada(): void
    {
        $this->alice();

        $this->postJson('/api/auth/login', ['login' => 'alice', 'password' => 'senha-errada-123'])->assertUnauthorized();

        $log = ErrorLog::query()->sole();
        $this->assertSame(['login' => 'alice'], $log->context['input']);
        $this->assertStringNotContainsString('senha-errada-123', json_encode($log->toArray()));
    }

    public function test_numero_de_cartao_e_cvv_nunca_sao_gravados(): void
    {
        Sanctum::actingAs($this->alice());

        $this->postJson('/api/cards', ['brand' => 'visa', 'last4' => '4242', 'number' => '4242424242424242', 'cvv' => '123'])
            ->assertUnprocessable();

        $log = ErrorLog::query()->sole();
        // Os VALORES nunca são gravados (o nome do campo pode aparecer em "invalid_fields", e tudo bem)
        $this->assertStringNotContainsString('4242424242424242', json_encode($log->toArray()));
        $this->assertSame(['brand' => 'visa', 'last4' => '4242'], $log->context['input']);
    }

    public function test_validacao_registra_quais_campos_falharam(): void
    {
        Sanctum::actingAs($this->alice());

        $this->postJson('/api/wallet/deposit', ['amount' => 0])->assertUnprocessable();

        $this->assertSame(['amount'], ErrorLog::query()->sole()->context['invalid_fields']);
    }

    public function test_rota_inexistente_tambem_e_registrada(): void
    {
        $this->getJson('/api/nao-existe')->assertNotFound();

        $this->assertDatabaseHas('error_logs', ['status' => 404, 'path' => '/api/nao-existe', 'level' => 'warning']);
    }

    public function test_erro_inesperado_e_registrado_como_error_com_a_causa_real_e_o_trace(): void
    {
        config(['app.debug' => false]);
        Route::middleware('api')->get('/api/teste-falha', fn () => throw new RuntimeException('Conexão com o serviço X caiu'));

        // O usuário recebe uma mensagem genérica (nada técnico vaza)...
        $this->getJson('/api/teste-falha')
            ->assertStatus(500)
            ->assertJsonPath('message', 'Ocorreu um erro interno. Tente novamente mais tarde.');

        // ...mas o registro guarda a causa real para quem for investigar
        $log = ErrorLog::query()->sole();
        $this->assertSame('error', $log->level);
        $this->assertSame('RuntimeException', $log->exception);
        $this->assertSame('Conexão com o serviço X caiu', $log->message);
        $this->assertNotEmpty($log->context['trace']);
    }

    public function test_retencao_apaga_so_os_registros_antigos(): void
    {
        $make = fn (string $level, int $daysAgo) => ErrorLog::query()->create([
            'request_id' => uniqid(), 'level' => $level, 'status' => $level === 'error' ? 500 : 422,
            'message' => 'teste', 'method' => 'GET', 'path' => '/api/x', 'created_at' => now()->subDays($daysAgo),
        ]);
        $make('warning', 31); // velho (> 30 dias): sai
        $make('warning', 5);  // novo: fica
        $make('error', 31);   // erro grave com 31 dias: fica (retenção de 90)
        $make('error', 91);   // erro grave com 91 dias: sai

        $this->artisan('model:prune', ['--model' => [ErrorLog::class]])->assertSuccessful();

        $this->assertSame(2, ErrorLog::query()->count());
        $this->assertDatabaseMissing('error_logs', ['level' => 'warning', 'created_at' => now()->subDays(31)]);
    }

    public function test_health_mostra_api_e_banco(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertJsonPath('status', 'ok')
            ->assertJsonPath('checks.database.status', 'ok');
    }
}
