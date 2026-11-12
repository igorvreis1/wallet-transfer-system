<?php

namespace App\Repositories\Contracts;

use App\Models\User;

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
}
