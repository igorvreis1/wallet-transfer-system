<?php

namespace App\Repositories\Contracts;

use App\Models\Transaction;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface TransactionRepositoryInterface
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Transaction;

    /**
     * Busca e bloqueia a transação (SELECT ... FOR UPDATE). Usar dentro de DB::transaction().
     */
    public function findForUpdate(int $id): ?Transaction;

    /**
     * Busca uma transação somente se o usuário participou dela.
     */
    public function findForUser(int $id, User $user): ?Transaction;

    /**
     * Extrato do usuário, mais recentes primeiro.
     *
     * @return LengthAwarePaginator<int, Transaction>
     */
    public function paginateForUser(User $user, int $perPage = 15): LengthAwarePaginator;
}
