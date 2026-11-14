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

];
