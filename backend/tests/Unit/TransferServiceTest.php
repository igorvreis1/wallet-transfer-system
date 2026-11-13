<?php

namespace Tests\Unit;

use App\Exceptions\RecipientNotFoundException;
use App\Exceptions\SelfTransferException;
use App\Models\User;
use App\Repositories\Contracts\TransactionRepositoryInterface;
use App\Repositories\Contracts\UserRepositoryInterface;
use App\Services\Wallet\TransferService;
use Mockery;
use Mockery\MockInterface;
use Tests\TestCase;

/**
 * Teste UNITÁRIO do TransferService com repositórios FALSOS (mocks).
 *
 * Como o service depende de interfaces (o "D" do SOLID), dá para trocar o banco
 * por um objeto falso que responde o que o teste mandar. Nenhuma consulta ao MySQL acontece.
 */
class TransferServiceTest extends TestCase
{
    private MockInterface&UserRepositoryInterface $users;

    private MockInterface&TransactionRepositoryInterface $transactions;

    private TransferService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->users = Mockery::mock(UserRepositoryInterface::class);
        $this->transactions = Mockery::mock(TransactionRepositoryInterface::class);
        $this->service = new TransferService($this->users, $this->transactions);
    }

    public function test_encontra_o_destinatario_pelo_identificador(): void
    {
        $bob = $this->userWithId(2);
        $this->users->shouldReceive('findByEmailOrNickname')->with('bob')->once()->andReturn($bob);

        $this->assertSame($bob, $this->service->resolveRecipient($this->userWithId(1), 'bob'));
    }

    public function test_destinatario_inexistente_lanca_excecao(): void
    {
        $this->users->shouldReceive('findByEmailOrNickname')->andReturn(null);

        $this->expectException(RecipientNotFoundException::class);
        $this->expectExceptionMessage('Nenhum usuário encontrado com esse email ou nickname.');

        $this->service->resolveRecipient($this->userWithId(1), 'fantasma');
    }

    public function test_transferir_para_si_mesmo_lanca_excecao(): void
    {
        $alice = $this->userWithId(1);
        $this->users->shouldReceive('findByEmailOrNickname')->andReturn($alice);

        $this->expectException(SelfTransferException::class);

        $this->service->resolveRecipient($alice, 'alice');
    }

    public function test_destinatario_invalido_nao_chega_a_tocar_em_saldo_nem_registrar_transacao(): void
    {
        $this->users->shouldReceive('findByEmailOrNickname')->andReturn(null);
        $this->users->shouldNotReceive('lockForUpdate');      // nenhum saldo é travado
        $this->transactions->shouldNotReceive('create');      // nenhuma transação é registrada

        $this->expectException(RecipientNotFoundException::class);

        $this->service->transfer($this->userWithId(1), 'fantasma', 1000);
    }

    private function userWithId(int $id): User
    {
        $user = new User;
        $user->id = $id;

        return $user;
    }
}
