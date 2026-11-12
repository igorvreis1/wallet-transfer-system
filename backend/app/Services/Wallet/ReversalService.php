<?php

namespace App\Services\Wallet;

use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Exceptions\ReversalNotAllowedException;
use App\Exceptions\TransactionAlreadyReversedException;
use App\Exceptions\TransactionNotFoundException;
use App\Models\Transaction;
use App\Models\User;
use App\Repositories\Contracts\TransactionRepositoryInterface;
use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Support\Facades\DB;

/**
 * Desfaz um depósito ou uma transferência, criando uma operação inversa.
 *
 * Nada é apagado: a operação original fica marcada como "reversed" e uma nova
 * linha "reversal" registra o estorno. Assim o histórico é sempre auditável.
 *
 * A reversão é aplicada POR INTEIRO, mesmo que deixe o saldo de alguém negativo
 * (modelo de estorno/chargeback). O próximo depósito dessa pessoa quita a dívida.
 */
class ReversalService
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly TransactionRepositoryInterface $transactions,
    ) {}

    /**
     * @param  User|null  $requestedBy  Quem pediu. Nulo = o próprio sistema (ex.: correção de inconsistência
     *                                  via comando "wallet:reverse"), que não passa pela regra de dono.
     *
     * @throws TransactionNotFoundException
     * @throws TransactionAlreadyReversedException
     * @throws ReversalNotAllowedException
     */
    public function reverse(int $transactionId, ?User $requestedBy, ?string $reason = null): Transaction
    {
        return DB::transaction(function () use ($transactionId, $requestedBy, $reason) {
            // Trava a operação original: dois pedidos de reversão simultâneos não passam juntos.
            $original = $this->transactions->findForUpdate($transactionId);

            if ($original === null || ($requestedBy !== null && ! $original->involves($requestedBy))) {
                throw new TransactionNotFoundException;
            }

            $this->ensureCanBeReversed($original, $requestedBy);

            $locked = $this->users->lockForUpdate(array_filter([$original->sender_id, $original->receiver_id]));

            // Inverte o fluxo: quem recebeu devolve, quem enviou recebe de volta.
            if ($original->receiver_id !== null) {
                $receiver = $locked->get($original->receiver_id);
                $receiver->balance -= $original->amount; // pode ficar negativo (regra de estorno)
                $receiver->save();
            }

            if ($original->sender_id !== null) {
                $sender = $locked->get($original->sender_id);
                $sender->balance += $original->amount;
                $sender->save();
            }

            $original->status = TransactionStatus::Reversed;
            $original->save();

            return $this->transactions->create([
                'type' => TransactionType::Reversal,
                'sender_id' => $original->receiver_id,
                'receiver_id' => $original->sender_id,
                'amount' => $original->amount,
                'reversal_of_id' => $original->id,
                'reason' => $reason,
            ]);
        }, attempts: 3);
    }

    private function ensureCanBeReversed(Transaction $original, ?User $requestedBy): void
    {
        if ($original->type === TransactionType::Reversal) {
            throw new ReversalNotAllowedException(TransactionType::Reversal);
        }

        if ($original->status === TransactionStatus::Reversed) {
            throw new TransactionAlreadyReversedException;
        }

        if ($requestedBy !== null && ! $original->isReversibleBy($requestedBy)) {
            throw new ReversalNotAllowedException($original->type);
        }
    }
}
