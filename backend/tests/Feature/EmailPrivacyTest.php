<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Privacidade do email: o nickname é sempre público; o email pode ser oculto.
 * Email oculto = para OUTRAS pessoas, é como se ele não existisse (não aparece e não encontra).
 */
class EmailPrivacyTest extends TestCase
{
    use RefreshDatabase;

    public function test_email_e_visivel_por_padrao(): void
    {
        $this->postJson('/api/auth/register', [
            'email' => 'nova@teste.com',
            'nickname' => 'nova',
            'password' => 'senha123',
            'password_confirmation' => 'senha123',
        ])->assertCreated()->assertJsonPath('user.email_visible', true);
    }

    public function test_pode_se_cadastrar_com_email_oculto(): void
    {
        $this->postJson('/api/auth/register', [
            'email' => 'discreta@teste.com',
            'nickname' => 'discreta',
            'password' => 'senha123',
            'password_confirmation' => 'senha123',
            'email_visible' => false,
        ])->assertCreated()->assertJsonPath('user.email_visible', false);

        $this->assertDatabaseHas('users', ['nickname' => 'discreta', 'email_visible' => false]);
    }

    public function test_busca_pelo_nickname_nao_mostra_email_oculto(): void
    {
        Sanctum::actingAs($this->alice());
        $this->bobComEmailOculto();

        $this->getJson('/api/users/lookup?identifier=bob')
            ->assertOk()
            ->assertExactJson(['data' => ['nickname' => 'bob', 'email_masked' => null]]);
    }

    public function test_email_oculto_nao_encontra_ninguem_na_busca(): void
    {
        // Se a busca pelo email achasse o Bob, ela revelaria que esse email é dele.
        Sanctum::actingAs($this->alice());
        $this->bobComEmailOculto();

        $this->getJson('/api/users/lookup?identifier=bob@example.com')
            ->assertNotFound()
            ->assertJsonPath('message', 'Nenhum usuário encontrado com esse email ou nickname.');
    }

    public function test_nao_transfere_pelo_email_oculto_mas_transfere_pelo_nickname(): void
    {
        $alice = $this->alice(100_00);
        $bob = $this->bobComEmailOculto();
        Sanctum::actingAs($alice);

        $this->postJson('/api/wallet/transfer', ['recipient' => 'bob@example.com', 'amount' => 10_00])->assertNotFound();
        $this->postJson('/api/wallet/transfer', ['recipient' => 'bob', 'amount' => 10_00])->assertCreated();

        $this->assertSame(10_00, $bob->fresh()->balance);
    }

    public function test_filtro_do_extrato_pelo_email_oculto_nao_encontra(): void
    {
        Sanctum::actingAs($this->alice());
        $this->bobComEmailOculto();

        $this->getJson('/api/transactions?counterpart=bob@example.com')->assertNotFound();
        $this->getJson('/api/transactions?counterpart=bob')->assertOk();
    }

    public function test_o_dono_continua_entrando_com_o_email_oculto(): void
    {
        $this->bobComEmailOculto();

        $this->postJson('/api/auth/login', ['login' => 'bob@example.com', 'password' => 'password1'])
            ->assertOk()
            ->assertJsonPath('user.email', 'bob@example.com'); // o próprio dono sempre vê o email
    }

    public function test_usuario_oculta_e_volta_a_mostrar_o_email(): void
    {
        $bob = $this->bob();
        Sanctum::actingAs($bob);

        $this->patchJson('/api/account/privacy', ['email_visible' => false])
            ->assertOk()
            ->assertJsonPath('message', 'Seu email agora está oculto: as pessoas só te encontram pelo nickname.')
            ->assertJsonPath('user.email_visible', false);
        $this->assertFalse($bob->fresh()->email_visible);

        $this->patchJson('/api/account/privacy', ['email_visible' => true])
            ->assertOk()
            ->assertJsonPath('user.email_visible', true);
        $this->assertTrue($bob->fresh()->email_visible);
    }

    public function test_privacidade_exige_valor_valido_e_login(): void
    {
        $this->patchJson('/api/account/privacy', ['email_visible' => false])->assertUnauthorized();

        Sanctum::actingAs($this->bob());
        $this->patchJson('/api/account/privacy', ['email_visible' => 'talvez'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email_visible']);
    }

    private function bobComEmailOculto(): User
    {
        $bob = $this->bob();
        $bob->update(['email_visible' => false]);

        return $bob;
    }
}
