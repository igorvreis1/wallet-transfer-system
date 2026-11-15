<?php

/*
| Regras de negócio da carteira, ajustáveis por variável de ambiente.
*/

return [

    /*
    | Prazo (em dias) para o USUÁRIO pedir a reversão de uma operação, inspirado
    | na devolução do Pix. O comando administrativo "wallet:reverse" (correção de
    | inconsistência) não tem prazo.
    */
    'reversal_window_days' => (int) env('REVERSAL_WINDOW_DAYS', 90),

    /*
    | Fuso horário do usuário. O banco grava em UTC; os filtros de data do extrato
    | ("from" e "to") são interpretados como dias do calendário neste fuso.
    */
    'timezone' => env('WALLET_TIMEZONE', 'America/Sao_Paulo'),

    /*
    | Observabilidade: por quantos dias os registros de error_logs são mantidos.
    | Depois disso, o agendador apaga (php artisan model:prune, todo dia).
    */
    'error_log' => [
        'warning_days' => (int) env('ERROR_LOG_WARNING_DAYS', 30), // erros esperados (4xx)
        'error_days' => (int) env('ERROR_LOG_ERROR_DAYS', 90),     // erros inesperados (5xx)
    ],

];
