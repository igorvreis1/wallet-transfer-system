<?php

namespace Tests\Unit;

use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Models\Transaction;
use App\Models\User;
use Tests\TestCase;

/**
 * Teste UNITÁRIO da regra "quem pode reverter" (Transaction::isReversibleBy).
 * Os objetos são montados em memória: nada é gravado no banco.
 */
class TransactionReversalRulesTest extends TestCase
{
    private User $alice;

    private User $bob;

    protected function setUp(): void
    {
        parent::setUp();

        $this->alice = $this->userWithId(1);
        $this->bob = $this->userWithId(2);
    }

    public function test_quem_enviou_a_transferencia_pode_reverter(): void
    {
        $transfer = $this->transaction(TransactionType::Transfer, sender: 1, receiver: 2);

        $this->assertTrue($transfer->isReversibleBy($this->alice));
    }

    public function test_quem_recebeu_a_transferencia_nao_pode_reverter(): void
    {
        $transfer = $this->transaction(TransactionType::Transfer, sender: 1, receiver: 2);

        $this->assertFalse($transfer->isReversibleBy($this->bob));
    }

    public function test_dono_pode_reverter_o_proprio_deposito(): void
    {
        $deposit = $this->transaction(TransactionType::Deposit, sender: null, receiver: 1);

        $this->assertTrue($deposit->isReversibleBy($this->alice));
        $this->assertFalse($deposit->isReversibleBy($this->bob));
    }

    public function test_uma_reversao_nunca_pode_ser_revertida(): void
    {
        $reversal = $this->transaction(TransactionType::Reversal, sender: 2, receiver: 1);

        $this->assertFalse($reversal->isReversibleBy($this->alice));
        $this->assertFalse($reversal->isReversibleBy($this->bob));
    }

    public function test_operacao_ja_revertida_nao_pode_ser_revertida_de_novo(): void
    {
        $transfer = $this->transaction(TransactionType::Transfer, sender: 1, receiver: 2, status: TransactionStatus::Reversed);

        $this->assertFalse($transfer->isReversibleBy($this->alice));
    }

    public function test_ainda_pode_reverter_no_ultimo_dia_do_prazo_de_90_dias(): void
    {
        $this->freezeSecond(); // congela o relógio para a conta de datas ser exata
        $transfer = $this->transaction(TransactionType::Transfer, sender: 1, receiver: 2);
        $transfer->created_at = now()->subDays(90); // exatamente no limite

        $this->assertTrue($transfer->isReversibleBy($this->alice));
    }

    public function test_nao_pode_reverter_depois_do_prazo_de_90_dias(): void
    {
        $this->freezeSecond();
        $transfer = $this->transaction(TransactionType::Transfer, sender: 1, receiver: 2);
        $transfer->created_at = now()->subDays(90)->subSecond(); // 1 segundo além do limite

        $this->assertFalse($transfer->isReversibleBy($this->alice));
    }

    private function userWithId(int $id): User
    {
        $user = new User;
        $user->id = $id;

        return $user;
    }

    private function transaction(
        TransactionType $type,
        ?int $sender,
        ?int $receiver,
        TransactionStatus $status = TransactionStatus::Completed,
    ): Transaction {
        return new Transaction([
            'type' => $type,
            'status' => $status,
            'sender_id' => $sender,
            'receiver_id' => $receiver,
            'amount' => 1000,
        ]);
    }
}
