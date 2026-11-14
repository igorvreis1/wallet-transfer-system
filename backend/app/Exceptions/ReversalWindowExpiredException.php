<?php

namespace App\Exceptions;

class ReversalWindowExpiredException extends BusinessException
{
    public function __construct(int $days)
    {
        parent::__construct("O prazo para reverter esta transação expirou. Reversões podem ser solicitadas em até {$days} dias.");
    }

    public function status(): int
    {
        return 422;
    }
}
