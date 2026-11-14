<?php

namespace App\Services;

use App\Exceptions\InvalidCredentialsException;
use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Support\Facades\Hash;

/**
 * Regras de cadastro e autenticação.
 * O controller só recebe a requisição e devolve a resposta; a lógica fica aqui.
 */
class AuthService
{
    private const TOKEN_NAME = 'api';

    public function __construct(
        private readonly UserRepositoryInterface $users,
    ) {}

    /**
     * Cria o usuário e já devolve um token, para ele entrar direto após o cadastro.
     *
     * @param  array{email: string, nickname: string, password: string, email_visible?: bool}  $data
     * @return array{user: User, token: string}
     */
    public function register(array $data): array
    {
        $user = $this->users->create($data);

        return ['user' => $user, 'token' => $this->issueToken($user)];
    }

    /**
     * @return array{user: User, token: string}
     *
     * @throws InvalidCredentialsException
     */
    public function login(string $identifier, string $password): array
    {
        $user = $this->users->findForLogin($identifier);

        if ($user === null || ! Hash::check($password, $user->password)) {
            throw new InvalidCredentialsException;
        }

        return ['user' => $user, 'token' => $this->issueToken($user)];
    }

    /**
     * Revoga apenas o token usado nesta requisição (os outros dispositivos continuam logados).
     */
    public function logout(User $user): void
    {
        $user->currentAccessToken()?->delete();
    }

    private function issueToken(User $user): string
    {
        return $user->createToken(self::TOKEN_NAME)->plainTextToken;
    }
}
