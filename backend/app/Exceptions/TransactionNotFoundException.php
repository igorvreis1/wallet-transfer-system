<?php

namespace App\Exceptions;

class TransactionNotFoundException extends BusinessException
{
    public function __construct()
    {
        // Também usada quando a transação existe mas é de outra pessoa: não revelamos que ela existe.
        parent::__construct('Transação não encontrada.');
    }

    public function status(): int
    {
        return 404;
    }
}
