<?php

namespace App\Exceptions;

class CardExpiredException extends BusinessException
{
    public function __construct()
    {
        parent::__construct('Este cartão está vencido. Atualize a validade ou use outro cartão.');
    }

    public function status(): int
    {
        return 422;
    }
}
