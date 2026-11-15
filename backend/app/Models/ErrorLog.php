<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;

/**
 * Registro de um erro da API (observabilidade). Só tem created_at: um log nunca é editado.
 *
 * Retenção: registros antigos são apagados todo dia pelo agendador (container "scheduler"):
 *   warning (erros esperados, 4xx) → depois de 30 dias
 *   error   (inesperados, 5xx)     → depois de 90 dias
 * Ajustável no .env: ERROR_LOG_WARNING_DAYS e ERROR_LOG_ERROR_DAYS.
 */
class ErrorLog extends Model
{
    use Prunable;

    public const UPDATED_AT = null;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'context' => 'array',
            'status' => 'integer',
            'duration_ms' => 'integer',
        ];
    }

    /** O que já pode ser apagado (usado pelo comando model:prune). */
    public function prunable(): Builder
    {
        return static::query()->where(function (Builder $q) {
            $q->where(fn (Builder $q) => $q
                ->where('level', 'warning')
                ->where('created_at', '<', now()->subDays((int) config('wallet.error_log.warning_days'))))
                ->orWhere(fn (Builder $q) => $q
                    ->where('level', 'error')
                    ->where('created_at', '<', now()->subDays((int) config('wallet.error_log.error_days'))));
        });
    }
}
