<?php

use App\Models\ErrorLog;
use App\Services\Wallet\ReversalService;
use App\Support\Money;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Str;

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

/*
| Observabilidade: lista os últimos erros registrados em error_logs.
| Uso: docker compose exec app php artisan wallet:errors --level=error --limit=10
*/
Artisan::command('wallet:errors {--level= : error (inesperados) ou warning (esperados)} {--limit=20 : Quantos mostrar}', function () {
    $logs = ErrorLog::query()
        ->when($this->option('level'), fn ($q, $level) => $q->where('level', $level))
        ->latest('id')
        ->limit((int) $this->option('limit'))
        ->get();

    if ($logs->isEmpty()) {
        $this->info('Nenhum erro registrado.');

        return;
    }

    $this->table(
        ['Quando', 'Nível', 'HTTP', 'Rota', 'Usuário', 'Mensagem', 'Request ID'],
        $logs->map(fn (ErrorLog $log) => [
            $log->created_at?->timezone(config('wallet.timezone'))->format('d/m/Y H:i:s'),
            $log->level,
            $log->status,
            $log->method.' '.$log->path,
            $log->user_id ?? '-',
            Str::limit($log->message, 60),
            Str::limit($log->request_id, 13),
        ]),
    );
})->purpose('Lista os últimos erros da API (observabilidade)');

// Limpeza diária dos registros antigos de error_logs (retenção definida em config/wallet.php)
Schedule::command('model:prune', ['--model' => [ErrorLog::class]])->daily();
