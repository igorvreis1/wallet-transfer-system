<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'email' => fake()->unique()->safeEmail(),
            'nickname' => fake()->unique()->regexify('[a-z]{5}_[0-9]{3}'),
            'password' => static::$password ??= Hash::make('password1'),
            'balance' => 0,
        ];
    }

    /**
     * Usuário com saldo inicial (em centavos).
     */
    public function withBalance(int $cents): static
    {
        return $this->state(fn () => ['balance' => $cents]);
    }
}
