<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property int $id
 * @property string $email
 * @property string $nickname
 * @property int $balance Saldo em centavos
 * @property bool $email_visible Se outras pessoas podem ver e usar o email (o nickname é sempre público)
 */
#[Fillable(['email', 'nickname', 'password', 'email_visible'])] // balance fica de fora: só os services de carteira alteram o saldo
#[Hidden(['password'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory;

    /**
     * Valores padrão de um usuário recém-criado (espelham o default da migration).
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'balance' => 0,
        'email_visible' => true,
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'balance' => 'integer',
            'email_visible' => 'boolean',
        ];
    }
}
