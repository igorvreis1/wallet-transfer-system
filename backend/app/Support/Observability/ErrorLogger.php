<?php

namespace App\Support\Observability;

use App\Models\ErrorLog;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Grava todo erro da API na tabela error_logs, com o que for preciso para investigar
 * e NADA de dado sensível (senha, token, número de cartão, CVV).
 */
class ErrorLogger
{
    /** Campos da requisição que nunca são gravados */
    private const SENSITIVE = ['password', 'password_confirmation', 'current_password', 'token', 'number', 'cvv', 'card_number'];

    public function record(Request $request, Response $response, string $requestId, ?float $startedAt = null): void
    {
        $status = $response->getStatusCode();
        /** @var Throwable|null $exception */
        $exception = property_exists($response, 'exception') ? $response->exception : null;
        $level = $status >= 500 ? 'error' : 'warning';

        $context = array_filter([
            'input' => $this->safeInput($request),
            'query' => $request->query() ?: null,
            'invalid_fields' => $exception instanceof ValidationException ? array_keys($exception->errors()) : null,
            'user_agent' => $request->userAgent(),
            // Stack trace só nos erros inesperados (5xx), e só as primeiras linhas
            'trace' => $level === 'error' && $exception ? $this->shortTrace($exception) : null,
        ]);

        $entry = [
            'request_id' => $requestId,
            'level' => $level,
            'status' => $status,
            'exception' => $exception ? class_basename($exception) : null,
            'message' => mb_substr($this->message($response, $exception, $level), 0, 2000),
            'method' => $request->method(),
            'path' => mb_substr('/'.ltrim($request->path(), '/'), 0, 255),
            'user_id' => $request->user()?->getAuthIdentifier(),
            'ip' => $request->ip(),
            'context' => $context ?: null,
            'duration_ms' => $startedAt ? (int) round((microtime(true) - $startedAt) * 1000) : null,
        ];

        try {
            ErrorLog::query()->create($entry);
        } catch (Throwable $failure) {
            // Se nem o banco aceitar (ex.: banco fora do ar), o erro não se perde: vai para o arquivo de log.
            Log::error('Falha ao gravar em error_logs: '.$failure->getMessage(), $entry);
        }

        if ($level === 'error') {
            Log::error($entry['message'], Arr::except($entry, ['message'])); // cópia no arquivo storage/logs
        }
    }

    /**
     * 5xx: a mensagem REAL da exceção (fica só aqui; o usuário recebe uma mensagem genérica).
     * 4xx: a mensagem que o usuário recebeu.
     */
    private function message(Response $response, ?Throwable $exception, string $level): string
    {
        if ($level === 'error' && $exception) {
            return $exception->getMessage() ?: class_basename($exception);
        }

        $body = json_decode((string) $response->getContent(), true);

        return is_array($body) && isset($body['message']) ? (string) $body['message'] : 'HTTP '.$response->getStatusCode();
    }

    /** @return array<string, mixed>|null */
    private function safeInput(Request $request): ?array
    {
        $input = Arr::except($request->except(self::SENSITIVE), ['_token']);

        return $input === [] ? null : $input;
    }

    /** @return array<int, string> */
    private function shortTrace(Throwable $exception): array
    {
        $lines = [$exception->getFile().':'.$exception->getLine()];
        foreach (array_slice($exception->getTrace(), 0, 8) as $frame) {
            if (isset($frame['file'])) {
                $lines[] = str_replace(base_path().'/', '', $frame['file']).':'.($frame['line'] ?? '?');
            }
        }

        return $lines;
    }
}
