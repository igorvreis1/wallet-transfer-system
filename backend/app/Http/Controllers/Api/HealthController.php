<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * GET /api/health: a API está de pé E consegue falar com o banco?
 * (O /up do Laravel só diz que o PHP respondeu.)
 * 200 = tudo ok; 503 = algum componente fora do ar. Útil para monitoramento e para o Docker.
 */
class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $started = microtime(true);
        try {
            DB::select('select 1');
            $database = ['status' => 'ok', 'latency_ms' => (int) round((microtime(true) - $started) * 1000)];
        } catch (Throwable) {
            $database = ['status' => 'down']; // não expõe detalhes técnicos numa rota pública
        }

        $healthy = $database['status'] === 'ok';

        return response()->json([
            'status' => $healthy ? 'ok' : 'degraded',
            'checks' => ['database' => $database],
            'time' => now()->toIso8601String(),
        ], $healthy ? 200 : 503);
    }
}
