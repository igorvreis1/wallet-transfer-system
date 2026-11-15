<?php

namespace App\Repositories\Contracts;

use App\Data\StatementFilters;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

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
     * Extrato do usuário, mais recentes primeiro, com filtros opcionais.
     * Os filtros só RESTRINGEM o resultado: nunca mostram transações de que o usuário não participou.
     *
     * @return LengthAwarePaginator<int, Transaction>
     */
    /**
     * Pessoas com quem o usuário já transacionou (enviou, recebeu ou estornou), em ordem alfabética.
     * Alimenta o filtro "Pessoa" do extrato sem permitir descobrir outros usuários.
     *
     * @return Collection<int, User>
     */
    public function counterpartsOf(User $user): Collection;

    public function paginateForUser(User $user, StatementFilters $filters = new StatementFilters, int $perPage = 15): LengthAwarePaginator;
}
