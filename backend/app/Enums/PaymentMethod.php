<?php

namespace App\Enums;

/** Forma de pagamento de um depósito (simulada: não há cobrança real). */
enum PaymentMethod: string
{
    case Pix = 'pix';
    case Card = 'card';
    case Boleto = 'boleto';

    public function label(): string
    {
        return match ($this) {
            self::Pix => 'Pix',
            self::Card => 'Cartão',
            self::Boleto => 'Boleto',
        };
    }
}
