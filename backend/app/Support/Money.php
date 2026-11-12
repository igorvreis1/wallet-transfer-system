<?php

namespace App\Support;

/**
 * Formatação de valores monetários.
 * Internamente tudo é inteiro em centavos; só a exibição vira "R$ 1.234,56".
 */
final class Money
{
    public static function format(int $cents): string
    {
        $sign = $cents < 0 ? '-' : '';
        $abs = abs($cents);

        // Sem float nem na exibição: separa reais e centavos com aritmética inteira.
        $reais = number_format(intdiv($abs, 100), 0, ',', '.');
        $centavos = str_pad((string) ($abs % 100), 2, '0', STR_PAD_LEFT);

        return "{$sign}R$ {$reais},{$centavos}";
    }
}
