<?php

namespace App\Enums;

/** Forma de pagamento de um depósito. */
enum PaymentMethod: string
{
    case Pix = 'pix';
    case Card = 'card';

    public function label(): string
    {
        return match ($this) {
            self::Pix => 'Pix',
            self::Card => 'Cartão',
        };
    }
}
