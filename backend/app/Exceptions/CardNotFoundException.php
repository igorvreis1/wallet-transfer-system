<?php

namespace App\Exceptions;

class CardNotFoundException extends BusinessException
{
    public function __construct()
    {
        parent::__construct('Cartão não encontrado.');
    }

    public function status(): int
    {
        return 404;
    }
}
