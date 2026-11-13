<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Teste de INTEGRAÇÃO: chama a API de verdade (rota → validação → controller → service → banco).
 * RefreshDatabase: cada teste roda dentro de uma transação do banco "wallet_testing" e é desfeito no final.
 */
class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_cadastro_valido_cria_usuario_com_saldo_zero_e_devolve_token(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'email' => 'igor@teste.com',
            'nickname' => 'igor_reis',
            'password' => 'senha123',
            'password_confirmation' => 'senha123',
        ]);

        $response->assertCreated()
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonPath('user.nickname', 'igor_reis')
            ->assertJsonPath('user.balance', 0)
            ->assertJsonMissingPath('user.password'); // a senha nunca sai na resposta

        $this->assertNotEmpty($response->json('token'));
        $this->assertDatabaseHas('users', ['email' => 'igor@teste.com', 'balance' => 0]);
    }

    public function test_cadastro_salva_email_e_nickname_em_minusculas(): void
    {
        $this->postJson('/api/auth/register', [
            'email' => '  Igor@Teste.COM ',
            'nickname' => 'Igor_Reis',
            'password' => 'senha123',
            'password_confirmation' => 'senha123',
        ])->assertCreated();

        $this->assertDatabaseHas('users', ['email' => 'igor@teste.com', 'nickname' => 'igor_reis']);
    }

    public function test_cadastro_invalido_devolve_mensagem_de_cada_campo_em_portugues(): void
    {
        $this->postJson('/api/auth/register', [
            'email' => 'nao-e-email',
            'nickname' => 'igor reis',
            'password' => 'abc',
            'password_confirmation' => 'xyz',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Verifique os dados informados.')
            ->assertJsonPath('errors.email.0', 'Informe um email válido.')
            ->assertJsonPath('errors.nickname.0', 'O nickname pode conter apenas letras, números e _ (underline).')
            ->assertJsonValidationErrors(['password']);

        $this->assertDatabaseCount('users', 0);
    }

    public function test_cadastro_recusa_email_e_nickname_ja_usados(): void
    {
        $this->alice();

        $this->postJson('/api/auth/register', [
            'email' => 'ALICE@example.com',
            'nickname' => 'Alice',
            'password' => 'senha123',
            'password_confirmation' => 'senha123',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.email.0', 'Este email já está em uso.')
            ->assertJsonPath('errors.nickname.0', 'Este nickname já está em uso.');
    }

    public function test_login_pelo_nickname(): void
    {
        $this->alice();

        $this->postJson('/api/auth/login', ['login' => 'ALICE', 'password' => 'password1'])
            ->assertOk()
            ->assertJsonPath('user.nickname', 'alice');
    }

    public function test_login_pelo_email(): void
    {
        $this->bob();

        $this->postJson('/api/auth/login', ['login' => 'bob@example.com', 'password' => 'password1'])
            ->assertOk()
            ->assertJsonPath('user.nickname', 'bob');
    }

    public function test_login_com_senha_errada_ou_usuario_inexistente_tem_a_mesma_mensagem(): void
    {
        $this->alice();
        $mensagem = 'Email/nickname ou senha inválidos.';

        $this->postJson('/api/auth/login', ['login' => 'alice', 'password' => 'errada123'])
            ->assertUnauthorized()->assertJsonPath('message', $mensagem);

        // Mesma resposta: um atacante não descobre quais usuários existem.
        $this->postJson('/api/auth/login', ['login' => 'ninguem', 'password' => 'errada123'])
            ->assertUnauthorized()->assertJsonPath('message', $mensagem);
    }

    public function test_login_bloqueia_apos_5_tentativas_por_minuto(): void
    {
        $this->alice();

        for ($i = 1; $i <= 5; $i++) {
            $this->postJson('/api/auth/login', ['login' => 'alice', 'password' => 'errada123'])->assertUnauthorized();
        }

        $this->postJson('/api/auth/login', ['login' => 'alice', 'password' => 'password1'])
            ->assertTooManyRequests();
    }

    public function test_rota_protegida_sem_token_devolve_401(): void
    {
        $this->getJson('/api/auth/me')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Sessão inválida ou expirada. Faça login novamente.');
    }

    public function test_perfil_com_token_valido(): void
    {
        $this->alice();
        $token = $this->postJson('/api/auth/login', ['login' => 'alice', 'password' => 'password1'])->json('token');

        $this->withToken($token)->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.nickname', 'alice')
            ->assertJsonPath('data.balance_formatted', 'R$ 100,00');
    }

    public function test_logout_invalida_o_token(): void
    {
        $this->alice();
        $token = $this->postJson('/api/auth/login', ['login' => 'alice', 'password' => 'password1'])->json('token');

        $this->withToken($token)->postJson('/api/auth/logout')->assertOk();

        $this->app['auth']->forgetGuards(); // simula uma nova requisição, sem o usuário "lembrado" em memória
        $this->withToken($token)->getJson('/api/auth/me')->assertUnauthorized();
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_usuario_nao_consegue_definir_o_proprio_saldo_no_cadastro(): void
    {
        $this->postJson('/api/auth/register', [
            'email' => 'esperto@teste.com',
            'nickname' => 'esperto',
            'password' => 'senha123',
            'password_confirmation' => 'senha123',
            'balance' => 999_999_99, // tentativa de "mass assignment"
        ])->assertCreated()->assertJsonPath('user.balance', 0);

        $this->assertSame(0, User::where('nickname', 'esperto')->value('balance'));
    }
}
