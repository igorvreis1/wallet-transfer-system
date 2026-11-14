<?php

namespace App\Exceptions;

class UserNotFoundException extends BusinessException
{
    public function __construct()
    {
        parent::__construct('Nenhum usuário encontrado com esse email ou nickname.');
    }

    public function status(): int
    {
        return 404;
    }
}
