<?php

namespace App\Services\Wallet;

use App\Enums\TransactionType;
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
     * @param  int  $amount  Em centavos (> 0, garantido pela validação)
     */
    public function deposit(User $user, int $amount): Transaction
    {
        // Tudo ou nada: se algo falhar no meio, o banco desfaz o saldo E o registro juntos.
        return DB::transaction(function () use ($user, $amount) {
            $locked = $this->users->lockForUpdate([$user->id])->get($user->id);

            $locked->balance += $amount;
            $locked->save();

            return $this->transactions->create([
                'type' => TransactionType::Deposit,
                'receiver_id' => $locked->id,
                'amount' => $amount,
            ]);
        }, attempts: 3);
    }
}
