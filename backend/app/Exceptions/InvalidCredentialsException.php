<?php

namespace App\Exceptions;

class InvalidCredentialsException extends BusinessException
{
    public function __construct()
    {
        // Mensagem genérica de propósito: não revela se o usuário existe ou se só a senha está errada.
        parent::__construct('Email/nickname ou senha inválidos.');
    }

    public function status(): int
    {
        return 401;
    }
}
