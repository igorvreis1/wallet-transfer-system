<?php

namespace App\Repositories;

use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;

class EloquentUserRepository implements UserRepositoryInterface
{
    public function findByEmailOrNickname(string $identifier): ?User
    {
        $identifier = mb_strtolower(trim($identifier));

        // Nickname não aceita "@", então a presença dele já indica um email.
        $column = str_contains($identifier, '@') ? 'email' : 'nickname';

        return User::query()->where($column, $identifier)->first();
    }

    public function create(array $data): User
    {
        return User::query()->create($data);
    }
}
