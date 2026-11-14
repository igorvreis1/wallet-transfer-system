<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Controller "magro": a validação está nos FormRequests e a regra no AuthService.
 */
class AuthController extends Controller
{
    public function __construct(
        private readonly AuthService $auth,
    ) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $result = $this->auth->register($request->safe()->only(['email', 'nickname', 'password', 'email_visible']));

        return $this->tokenResponse($result['user'], $result['token'], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->auth->login($request->validated('login'), $request->validated('password'));

        return $this->tokenResponse($result['user'], $result['token']);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->auth->logout($request->user());

        return response()->json(['message' => 'Logout realizado com sucesso.']);
    }

    public function me(Request $request): UserResource
    {
        return new UserResource($request->user());
    }

    private function tokenResponse(User $user, string $token, int $status = 200): JsonResponse
    {
        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => new UserResource($user),
        ], $status);
    }
}
