<?php

namespace App\Repositories;

use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Support\Collection;

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

    public function lockForUpdate(array $ids): Collection
    {
        return User::query()
            ->whereIn('id', array_unique($ids))
            ->orderBy('id') // ordem fixa: duas operações nunca esperam uma pela outra em círculo
            ->lockForUpdate()
            ->get()
            ->keyBy('id');
    }
}
