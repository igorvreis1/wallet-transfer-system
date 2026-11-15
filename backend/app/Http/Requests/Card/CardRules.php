<?php

namespace App\Http\Requests\Card;

/**
 * Regras e mensagens compartilhadas entre cadastrar e editar cartão.
 */
trait CardRules
{
    /**
     * @return array<string, mixed>
     */
    protected function commonRules(bool $creating): array
    {
        $required = $creating ? 'required' : 'sometimes';
        $year = (int) now()->format('Y');

        return [
            'holder_name' => [$required, 'string', 'min:3', 'max:60'],
            'exp_month' => [$required, 'integer', 'between:1,12'],
            'exp_year' => [$required, 'integer', 'between:'.$year.','.($year + 20)],
            'nickname' => ['nullable', 'string', 'max:30'],
            // Segurança: o número completo e o CVV nunca devem chegar ao servidor.
            'number' => ['prohibited'],
            'cvv' => ['prohibited'],
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function commonMessages(): array
    {
        return [
            'holder_name.required' => 'Informe o nome impresso no cartão.',
            'holder_name.min' => 'O nome impresso deve ter pelo menos 3 letras.',
            'exp_month.required' => 'Informe o mês de validade.',
            'exp_month.between' => 'O mês de validade deve ser de 1 a 12.',
            'exp_year.required' => 'Informe o ano de validade.',
            'exp_year.between' => 'Ano de validade inválido.',
            'nickname.max' => 'O apelido pode ter no máximo 30 caracteres.',
            'number.prohibited' => 'Por segurança, o número completo do cartão não é enviado nem armazenado.',
            'cvv.prohibited' => 'Por segurança, o CVV não é enviado nem armazenado.',
        ];
    }

    /** Validade no passado (mês/ano já terminou) */
    protected function isExpired(int $month, int $year): bool
    {
        return now()->greaterThan(now()->setDate($year, $month, 1)->endOfMonth());
    }
}
