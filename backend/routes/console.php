<?php

use App\Services\Wallet\ReversalService;
use App\Support\Money;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
| Reversão pelo próprio sistema, para casos de inconsistência (ex.: suporte identificou
| uma transferência indevida). Não exige ser o dono da operação.
| Uso: docker compose exec app php artisan wallet:reverse 15 --reason="Transferência duplicada"
*/
Artisan::command('wallet:reverse {transaction : ID da transação} {--reason= : Motivo da reversão}', function (ReversalService $reversals) {
    $reversal = $reversals->reverse(
        (int) $this->argument('transaction'),
        requestedBy: null,
        reason: $this->option('reason') ?: 'Reversão pelo sistema (inconsistência).',
    );

    $this->info("Transação #{$reversal->reversal_of_id} revertida (reversão #{$reversal->id}, ".Money::format($reversal->amount).').');
})->purpose('Reverte uma transação por inconsistência (uso administrativo)');
