<?php

namespace App\Exceptions;

use App\Enums\TransactionType;

class ReversalNotAllowedException extends BusinessException
{
    public function __construct(TransactionType $type)
    {
        parent::__construct(match ($type) {
            TransactionType::Transfer => 'Apenas quem enviou a transferência pode revertê-la.',
            TransactionType::Deposit => 'Apenas o dono do depósito pode revertê-lo.',
            TransactionType::Reversal => 'Uma reversão não pode ser revertida.',
        });
    }

    public function status(): int
    {
        return 403;
    }
}
