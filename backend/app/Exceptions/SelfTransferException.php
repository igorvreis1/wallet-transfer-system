<?php

namespace App\Exceptions;

class SelfTransferException extends BusinessException
{
    public function __construct()
    {
        parent::__construct('Você não pode transferir para si mesmo.');
    }

    public function status(): int
    {
        return 422;
    }
}
