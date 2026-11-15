<?php

use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CardController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\WalletController;
use Illuminate\Support\Facades\Route;

/*
| Todas as rotas aqui recebem o prefixo /api (ex.: POST /api/auth/login).
*/

// Observabilidade: saúde da API e do banco (pública, sem dados sensíveis)
Route::get('health', HealthController::class);

// Públicas: apenas cadastro e login, com limite de tentativas contra força bruta.
Route::prefix('auth')->middleware('throttle:auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
});

// Protegidas: exigem o header "Authorization: Bearer <token>".
Route::middleware('auth:sanctum')->group(function () {
    // Autenticação
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('auth/me', [AuthController::class, 'me']);

    // Conta (privacidade: o email pode ser oculto, o nickname é sempre público)
    Route::patch('account/privacy', [AccountController::class, 'updatePrivacy']);

    // Cartões para depósito (só bandeira e 4 últimos dígitos: nunca o número completo)
    Route::get('cards', [CardController::class, 'index']);
    Route::post('cards', [CardController::class, 'store']);
    Route::patch('cards/{card}', [CardController::class, 'update'])->whereNumber('card');
    Route::delete('cards/{card}', [CardController::class, 'destroy'])->whereNumber('card');

    // Carteira
    Route::get('wallet', [WalletController::class, 'show']);
    Route::post('wallet/deposit', [WalletController::class, 'deposit']);
    Route::post('wallet/transfer', [WalletController::class, 'transfer']);

    // Busca de destinatário (limitada para dificultar varredura de usuários)
    Route::get('users/lookup', [WalletController::class, 'lookupRecipient'])->middleware('throttle:30,1');

    // Extrato e reversão
    Route::get('transactions', [TransactionController::class, 'index']);
    Route::get('transactions/counterparts', [TransactionController::class, 'counterparts']);
    Route::get('transactions/{transaction}', [TransactionController::class, 'show'])->whereNumber('transaction');
    Route::post('transactions/{transaction}/reverse', [TransactionController::class, 'reverse'])->whereNumber('transaction');
});
