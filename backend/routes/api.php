<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;

/*
| Todas as rotas aqui recebem o prefixo /api (ex.: POST /api/auth/login).
*/

// Públicas: apenas cadastro e login, com limite de tentativas contra força bruta.
Route::prefix('auth')->middleware('throttle:auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
});

// Protegidas: exigem o header "Authorization: Bearer <token>".
Route::middleware('auth:sanctum')->group(function () {
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('auth/me', [AuthController::class, 'me']);
});
