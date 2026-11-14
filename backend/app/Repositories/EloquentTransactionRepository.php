<?php

namespace App\Repositories;

use App\Data\StatementFilters;
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

    public function paginateForUser(User $user, StatementFilters $filters = new StatementFilters, int $perPage = 15): LengthAwarePaginator
    {
        // Base: só as transações do usuário (entre parênteses). Cada filtro abaixo
        // entra com AND, então só consegue RESTRINGIR, nunca ampliar o resultado.
        return $this->queryForUser($user)
            ->when($filters->from, fn (Builder $q, $from) => $q->where('created_at', '>=', $from))
            ->when($filters->toExclusive, fn (Builder $q, $to) => $q->where('created_at', '<', $to))
            ->when($filters->direction === 'in', fn (Builder $q) => $q->where('receiver_id', $user->id))
            ->when($filters->direction === 'out', fn (Builder $q) => $q->where('sender_id', $user->id))
            ->when($filters->type, fn (Builder $q, $type) => $q->where('type', $type))
            ->when($filters->counterpartId, fn (Builder $q, int $otherId) => $q->where(
                // "entre mim e o outro", nos dois sentidos
                fn (Builder $q) => $q
                    ->where(fn (Builder $q) => $q->where('sender_id', $user->id)->where('receiver_id', $otherId))
                    ->orWhere(fn (Builder $q) => $q->where('sender_id', $otherId)->where('receiver_id', $user->id)),
            ))
            ->with(['sender', 'receiver']) // evita o problema N+1 ao montar o extrato
            ->latest('id')
            ->paginate($perPage)
            ->withQueryString(); // os links de página mantêm os filtros (?page=2&direction=out)
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
