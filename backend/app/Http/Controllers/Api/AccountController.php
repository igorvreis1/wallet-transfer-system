<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Account\UpdatePrivacyRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;

/**
 * Preferências da conta do usuário logado.
 */
class AccountController extends Controller
{
    /**
     * PATCH /api/account/privacy: mostra ou oculta o email para outras pessoas.
     * O nickname é sempre público, porque é por ele que as pessoas te encontram.
     */
    public function updatePrivacy(UpdatePrivacyRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->update(['email_visible' => $request->boolean('email_visible')]);

        return response()->json([
            'message' => $user->email_visible
                ? 'Seu email agora está visível: outras pessoas podem transferir para você usando ele.'
                : 'Seu email agora está oculto: as pessoas só te encontram pelo nickname.',
            'user' => new UserResource($user),
        ]);
    }
}
