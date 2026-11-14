<?php

namespace App\Repositories;

use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Support\Collection;

class EloquentUserRepository implements UserRepositoryInterface
{
    public function findByEmailOrNickname(string $identifier): ?User
    {
        [$column, $value] = $this->parse($identifier);

        return User::query()
            ->where($column, $value)
            // Email oculto: para os outros, é como se esse email não existisse.
            // Assim nem a busca revela de quem ele é.
            ->when($column === 'email', fn ($q) => $q->where('email_visible', true))
            ->first();
    }

    public function findForLogin(string $identifier): ?User
    {
        [$column, $value] = $this->parse($identifier);

        return User::query()->where($column, $value)->first();
    }

    /**
     * Nickname não aceita "@", então a presença dele já indica um email.
     *
     * @return array{0: 'email'|'nickname', 1: string}
     */
    private function parse(string $identifier): array
    {
        $value = mb_strtolower(trim($identifier));

        return [str_contains($value, '@') ? 'email' : 'nickname', $value];
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
