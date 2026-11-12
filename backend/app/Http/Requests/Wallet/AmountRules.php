<?php

namespace App\Http\Requests\Wallet;

/**
 * Regras do campo "amount", compartilhadas por depósito e transferência.
 * O valor chega em CENTAVOS (inteiro): R$ 50,75 = 5075.
 */
trait AmountRules
{
    /** R$ 1.000.000,00 por operação. */
    private const MAX_AMOUNT = 100_000_000;

    /**
     * @return array<int, string>
     */
    protected function amountRules(): array
    {
        return ['required', 'integer', 'min:1', 'max:'.self::MAX_AMOUNT];
    }

    /**
     * @return array<string, string>
     */
    protected function amountMessages(): array
    {
        return [
            'amount.required' => 'Informe o valor.',
            'amount.integer' => 'O valor deve ser um número inteiro em centavos (ex.: 5075 para R$ 50,75).',
            'amount.min' => 'O valor deve ser maior que zero.',
            'amount.max' => 'O valor máximo por operação é R$ 1.000.000,00.',
        ];
    }
}
