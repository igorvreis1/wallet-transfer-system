<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\TransactionNotFoundException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Wallet\ReverseTransactionRequest;
use App\Http\Resources\TransactionResource;
use App\Repositories\Contracts\TransactionRepositoryInterface;
use App\Services\Wallet\ReversalService;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TransactionController extends Controller
{
    public function __construct(
        private readonly TransactionRepositoryInterface $transactions,
        private readonly ReversalService $reversals,
    ) {}

    /**
     * GET /api/transactions: extrato paginado (?page=2).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return TransactionResource::collection(
            $this->transactions->paginateForUser($request->user()),
        );
    }

    /**
     * GET /api/transactions/{id}
     */
    public function show(Request $request, int $transaction): TransactionResource
    {
        $found = $this->transactions->findForUser($transaction, $request->user())
            ?? throw new TransactionNotFoundException;

        return new TransactionResource($found);
    }

    /**
     * POST /api/transactions/{id}/reverse
     */
    public function reverse(ReverseTransactionRequest $request, int $transaction): JsonResponse
    {
        $user = $request->user();
        $reversal = $this->reversals->reverse($transaction, $user, $request->validated('reason'));
        $reversal->load(['sender', 'receiver']);
        $balance = $user->refresh()->balance;

        return response()->json([
            'message' => 'Transação revertida com sucesso.',
            'transaction' => new TransactionResource($reversal),
            'balance' => $balance,
            'balance_formatted' => Money::format($balance),
        ], 201);
    }
}
