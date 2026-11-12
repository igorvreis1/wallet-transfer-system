<?php

namespace App\Repositories\Contracts;

use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Acesso a dados de usuários.
 *
 * Os services dependem desta interface, não do Eloquent diretamente
 * (Inversão de Dependência, o "D" do SOLID). Isso facilita trocar a
 * implementação e simular o banco em testes unitários.
 */
interface UserRepositoryInterface
{
    /**
     * Busca pelo email ou pelo nickname (o que o usuário digitou).
     */
    public function findByEmailOrNickname(string $identifier): ?User;

    /**
     * @param  array{email: string, nickname: string, password: string}  $data
     */
    public function create(array $data): User;

    /**
     * Bloqueia as linhas dos usuários (SELECT ... FOR UPDATE) até o fim da transação do banco.
     * Bloqueia sempre em ordem crescente de id para evitar deadlock.
     * Deve ser chamado dentro de DB::transaction().
     *
     * @param  array<int>  $ids
     * @return Collection<int, User> indexada pelo id
     */
    public function lockForUpdate(array $ids): Collection;
}
