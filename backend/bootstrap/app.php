<?php

use App\Exceptions\BusinessException;
use App\Http\Middleware\ObserveRequest;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Observabilidade: ID por requisição (X-Request-Id) + registro de todo erro da API em error_logs
        $middleware->prepend(ObserveRequest::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $isApi = fn (Request $request) => $request->is('api/*') || $request->expectsJson();

        $exceptions->shouldRenderJsonWhen($isApi);

        // Erros de regra de negócio são esperados: não poluem o ARQUIVO de log.
        // (Eles continuam registrados na tabela error_logs como "warning", pelo middleware ObserveRequest.)
        $exceptions->dontReport(BusinessException::class);

        /*
        | Todas as respostas de erro da API seguem o formato { "message": "..." }.
        | Erros de validação também trazem "errors" com a mensagem de cada campo.
        */
        $exceptions->render(function (BusinessException $e, Request $request) use ($isApi) {
            if ($isApi($request)) {
                return response()->json(['message' => $e->getMessage()], $e->status());
            }
        });

        $exceptions->render(function (ValidationException $e, Request $request) use ($isApi) {
            if ($isApi($request)) {
                return response()->json([
                    'message' => 'Verifique os dados informados.',
                    'errors' => $e->errors(),
                ], 422);
            }
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) use ($isApi) {
            if ($isApi($request)) {
                return response()->json(['message' => 'Sessão inválida ou expirada. Faça login novamente.'], 401);
            }
        });

        $exceptions->render(function (ThrottleRequestsException $e, Request $request) use ($isApi) {
            if ($isApi($request)) {
                $seconds = $e->getHeaders()['Retry-After'] ?? 60;

                return response()->json(
                    ['message' => "Muitas tentativas. Tente novamente em {$seconds} segundos."],
                    429,
                    $e->getHeaders(),
                );
            }
        });

        $exceptions->render(function (NotFoundHttpException $e, Request $request) use ($isApi) {
            if ($isApi($request)) {
                return response()->json(['message' => 'Recurso não encontrado.'], 404);
            }
        });

        $exceptions->render(function (MethodNotAllowedHttpException $e, Request $request) use ($isApi) {
            if ($isApi($request)) {
                return response()->json(['message' => 'Método HTTP não permitido para esta rota.'], 405);
            }
        });

        // Erro inesperado: em produção, nunca vaza detalhes técnicos para o usuário.
        $exceptions->render(function (Throwable $e, Request $request) use ($isApi) {
            if ($isApi($request) && ! $e instanceof HttpExceptionInterface && ! config('app.debug')) {
                return response()->json(['message' => 'Ocorreu um erro interno. Tente novamente mais tarde.'], 500);
            }
        });
    })->create();
