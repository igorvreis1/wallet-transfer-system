<?php

namespace App\Services\Wallet;

use App\Enums\PaymentMethod;
use App\Enums\TransactionType;
use App\Exceptions\CardExpiredException;
use App\Exceptions\CardNotFoundException;
use App\Models\Transaction;
use App\Models\User;
use App\Repositories\Contracts\TransactionRepositoryInterface;
use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Support\Facades\DB;

class DepositService
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly TransactionRepositoryInterface $transactions,
    ) {}

    /**
     * Soma o valor ao saldo. Se o saldo estiver negativo (ex.: após uma reversão),
     * o depósito quita a dívida primeiro: -R$ 30 + R$ 100 = R$ 70.
     *
     * Forma de pagamento SIMULADA: Pix ou um cartão salvo do próprio usuário (sem cobrança real).
     *
     * @param  int  $amount  Em centavos (> 0, garantido pela validação)
     *
     * @throws CardNotFoundException
     * @throws CardExpiredException
     */
    public function deposit(User $user, int $amount, PaymentMethod $method = PaymentMethod::Pix, ?int $cardId = null): Transaction
    {
        $card = null;
        if ($method === PaymentMethod::Card) {
            // Só os cartões DO PRÓPRIO usuário: o de outra pessoa "não existe" (404)
            $card = $user->cards()->find($cardId) ?? throw new CardNotFoundException;
            if ($card->isExpired()) {
                throw new CardExpiredException;
            }
        }

        // Tudo ou nada: se algo falhar no meio, o banco desfaz o saldo E o registro juntos.
        return DB::transaction(function () use ($user, $amount, $method, $card) {
            $locked = $this->users->lockForUpdate([$user->id])->get($user->id);

            $locked->balance += $amount;
            $locked->save();

            return $this->transactions->create([
                'type' => TransactionType::Deposit,
                'receiver_id' => $locked->id,
                'amount' => $amount,
                'payment_method' => $method,
                // Foto do meio de pagamento: o extrato continua certo mesmo se o cartão mudar depois
                'payment_detail' => $card?->label() ?? 'Pix',
                'card_id' => $card?->id,
            ]);
        }, attempts: 3);
    }
}
