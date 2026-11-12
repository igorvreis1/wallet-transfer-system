<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Base para erros de regra de negócio (ex.: credenciais inválidas, saldo insuficiente).
 *
 * São erros ESPERADOS: viram uma resposta JSON clara para o usuário
 * e não são registrados no log de erros (o sistema está funcionando corretamente).
 */
abstract class BusinessException extends RuntimeException
{
    /** Código HTTP da resposta. */
    abstract public function status(): int;
}
