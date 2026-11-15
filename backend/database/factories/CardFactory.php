<?php

namespace Database\Factories;

use App\Enums\CardBrand;
use App\Models\Card;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Card>
 */
class CardFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'brand' => CardBrand::Visa,
            'last4' => '4242',
            'holder_name' => 'ALICE TESTE',
            'exp_month' => 12,
            'exp_year' => (int) now()->addYears(3)->format('Y'),
            'nickname' => null,
        ];
    }

    public function expired(): static
    {
        return $this->state(fn () => ['exp_month' => 1, 'exp_year' => (int) now()->subYear()->format('Y')]);
    }
}
