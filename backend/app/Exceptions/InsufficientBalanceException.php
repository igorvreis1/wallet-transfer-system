<?php

namespace App\Exceptions;

use App\Support\Money;

class InsufficientBalanceException extends BusinessException
{
    public function __construct(int $balanceInCents)
    {
        parent::__construct('Saldo insuficiente. Seu saldo atual é '.Money::format($balanceInCents).'.');
    }

    public function status(): int
    {
        return 422;
    }
}
