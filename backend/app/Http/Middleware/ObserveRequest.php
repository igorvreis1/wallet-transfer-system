<?php

namespace App\Http\Middleware;

use App\Support\Observability\ErrorLogger;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Observabilidade de toda requisição da API:
 *  1. dá um ID único à requisição (ou reaproveita o X-Request-Id que veio do cliente);
 *  2. coloca esse ID em todas as linhas do arquivo de log e no header X-Request-Id da resposta;
 *  3. se a resposta for um erro (4xx/5xx), registra em error_logs.
 *
 * É um middleware GLOBAL (roda antes do roteamento), então pega até rota inexistente (404).
 */
class ObserveRequest
{
    public function __construct(private readonly ErrorLogger $errors) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->is('api/*')) {
            return $next($request);
        }

        $startedAt = microtime(true);
        $requestId = $this->requestId($request);
        $request->attributes->set('request_id', $requestId);
        Log::shareContext(['request_id' => $requestId]);

        $response = $next($request);
        $response->headers->set('X-Request-Id', $requestId);

        if ($response->getStatusCode() >= 400) {
            $this->errors->record($request, $response, $requestId, $startedAt);
        }

        return $response;
    }

    /** Aceita o ID do cliente só se for "limpo" (evita injetar lixo nos logs); senão gera um UUID. */
    private function requestId(Request $request): string
    {
        $incoming = (string) $request->header('X-Request-Id', '');

        return preg_match('/^[A-Za-z0-9._-]{8,64}$/', $incoming) ? $incoming : (string) Str::uuid();
    }
}
