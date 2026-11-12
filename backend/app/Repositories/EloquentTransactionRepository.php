<?php

namespace App\Repositories;

use App\Models\Transaction;
use App\Models\User;
use App\Repositories\Contracts\TransactionRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class EloquentTransactionRepository implements TransactionRepositoryInterface
{
    public function create(array $data): Transaction
    {
        return Transaction::query()->create($data);
    }

    public function findForUpdate(int $id): ?Transaction
    {
        return Transaction::query()->lockForUpdate()->find($id);
    }

    public function findForUser(int $id, User $user): ?Transaction
    {
        return $this->queryForUser($user)
            ->with(['sender', 'receiver'])
            ->find($id);
    }

    public function paginateForUser(User $user, int $perPage = 15): LengthAwarePaginator
    {
        return $this->queryForUser($user)
            ->with(['sender', 'receiver']) // evita o problema N+1 ao montar o extrato
            ->latest('id')
            ->paginate($perPage);
    }

    /**
     * @return Builder<Transaction>
     */
    private function queryForUser(User $user): Builder
    {
        return Transaction::query()->where(function (Builder $q) use ($user) {
            $q->where('sender_id', $user->id)->orWhere('receiver_id', $user->id);
        });
    }
}
