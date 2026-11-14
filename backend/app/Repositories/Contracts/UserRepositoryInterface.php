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
     * Busca PÚBLICA, para encontrar OUTRA pessoa (transferência, confirmação, filtro do extrato).
     * O nickname sempre encontra; o email só encontra se o dono deixou o email visível.
     */
    public function findByEmailOrNickname(string $identifier): ?User;

    /**
     * Busca para o LOGIN: o próprio dono sempre pode entrar com o email, mesmo oculto.
     */
    public function findForLogin(string $identifier): ?User;

    /**
     * @param  array{email: string, nickname: string, password: string, email_visible?: bool}  $data
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
