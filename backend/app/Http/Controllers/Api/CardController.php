<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\CardLimitReachedException;
use App\Exceptions\CardNotFoundException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Card\StoreCardRequest;
use App\Http\Requests\Card\UpdateCardRequest;
use App\Http\Resources\CardResource;
use App\Models\Card;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

/**
 * CRUD dos cartões do usuário logado. Toda busca parte de $user->cards():
 * o cartão de outra pessoa simplesmente "não existe" (404), sem revelar nada.
 */
class CardController extends Controller
{
    /** GET /api/cards */
    public function index(Request $request): AnonymousResourceCollection
    {
        return CardResource::collection($request->user()->cards()->latest('id')->get());
    }

    /** POST /api/cards */
    public function store(StoreCardRequest $request): JsonResponse
    {
        $user = $request->user();
        if ($user->cards()->count() >= Card::MAX_PER_USER) {
            throw new CardLimitReachedException;
        }

        $card = $user->cards()->create($request->safe()->except(['number', 'cvv']));

        return response()->json(['message' => 'Cartão salvo.', 'card' => new CardResource($card)], 201);
    }

    /** PATCH /api/cards/{id}: apelido, nome impresso e validade */
    public function update(UpdateCardRequest $request, int $card): JsonResponse
    {
        $found = $this->findOwn($request, $card);
        $found->fill($request->validated());

        if ($found->isDirty(['exp_month', 'exp_year']) && $found->isExpired()) {
            throw ValidationException::withMessages(['exp_month' => 'A nova validade já está vencida.']);
        }

        $found->save();

        return response()->json(['message' => 'Cartão atualizado.', 'card' => new CardResource($found)]);
    }

    /** DELETE /api/cards/{id}. Depósitos antigos continuam mostrando o cartão (payment_detail). */
    public function destroy(Request $request, int $card): JsonResponse
    {
        $this->findOwn($request, $card)->delete();

        return response()->json(['message' => 'Cartão excluído.']);
    }

    private function findOwn(Request $request, int $id): Card
    {
        return $request->user()->cards()->find($id) ?? throw new CardNotFoundException;
    }
}
