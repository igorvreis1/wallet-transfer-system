<?php

namespace App\Exceptions;

class TransactionAlreadyReversedException extends BusinessException
{
    public function __construct()
    {
        parent::__construct('Esta transação já foi revertida.');
    }

    public function status(): int
    {
        return 409;
    }
}
