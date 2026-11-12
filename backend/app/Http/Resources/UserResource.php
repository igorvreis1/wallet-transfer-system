<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Formato público de um usuário na API (nunca expõe a senha).
 *
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'email' => $this->email,
            'nickname' => $this->nickname,
            'balance' => $this->balance, // em centavos: o frontend formata para "R$ 5,67"
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
