<?php

namespace App\Exceptions;

class CardLimitReachedException extends BusinessException
{
    public function __construct()
    {
        parent::__construct('Você pode salvar no máximo 5 cartões. Exclua um para adicionar outro.');
    }

    public function status(): int
    {
        return 422;
    }
}
