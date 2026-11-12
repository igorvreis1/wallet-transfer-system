<?php

namespace App\Services\Wallet;

use App\Enums\TransactionType;
use App\Exceptions\InsufficientBalanceException;
use App\Exceptions\RecipientNotFoundException;
use App\Exceptions\SelfTransferException;
use App\Models\Transaction;
use App\Models\User;
use App\Repositories\Contracts\TransactionRepositoryInterface;
use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Support\Facades\DB;

class TransferService
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly TransactionRepositoryInterface $transactions,
    ) {}

    /**
     * Encontra o destinatário pelo email ou nickname.
     * Também usado pela tela de confirmação ("Transferir para @fulano?").
     *
     * @throws RecipientNotFoundException
     * @throws SelfTransferException
     */
    public function resolveRecipient(User $sender, string $identifier): User
    {
        $recipient = $this->users->findByEmailOrNickname($identifier);

        if ($recipient === null) {
            throw new RecipientNotFoundException;
        }

        if ($recipient->id === $sender->id) {
            throw new SelfTransferException;
        }

        return $recipient;
    }

    /**
     * @param  int  $amount  Em centavos (> 0, garantido pela validação)
     *
     * @throws RecipientNotFoundException
     * @throws SelfTransferException
     * @throws InsufficientBalanceException
     */
    public function transfer(User $sender, string $recipientIdentifier, int $amount): Transaction
    {
        $recipient = $this->resolveRecipient($sender, $recipientIdentifier);

        return DB::transaction(function () use ($sender, $recipient, $amount) {
            // Trava os DOIS usuários. Outra operação com qualquer um deles espera esta terminar.
            $locked = $this->users->lockForUpdate([$sender->id, $recipient->id]);
            $from = $locked->get($sender->id);
            $to = $locked->get($recipient->id);

            // O saldo é conferido DEPOIS do lock: é o valor real, que ninguém mais pode alterar agora.
            if ($from->balance < $amount) {
                throw new InsufficientBalanceException($from->balance);
            }

            $from->balance -= $amount;
            $to->balance += $amount;
            $from->save();
            $to->save();

            return $this->transactions->create([
                'type' => TransactionType::Transfer,
                'sender_id' => $from->id,
                'receiver_id' => $to->id,
                'amount' => $amount,
            ]);
        }, attempts: 3); // em caso de deadlock, o Laravel tenta de novo até 3 vezes
    }
}
