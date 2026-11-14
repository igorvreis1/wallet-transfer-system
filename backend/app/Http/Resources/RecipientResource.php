<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Dados mínimos do destinatário para a tela de confirmação.
 * Não expõe saldo nem o email completo de terceiros. Se o email estiver oculto, nem o mascarado aparece.
 *
 * @mixin User
 */
class RecipientResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'nickname' => $this->nickname,
            'email_masked' => $this->email_visible ? self::maskEmail($this->email) : null,
        ];
    }

    /**
     * "bob.silva@example.com" vira "bo*******@example.com".
     */
    private static function maskEmail(string $email): string
    {
        [$local, $domain] = explode('@', $email, 2);
        $visible = mb_substr($local, 0, 2);

        return $visible.str_repeat('*', max(mb_strlen($local) - 2, 3)).'@'.$domain;
    }
}
