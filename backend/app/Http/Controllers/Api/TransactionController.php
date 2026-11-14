<?php

namespace App\Http\Controllers\Api;

use App\Data\StatementFilters;
use App\Exceptions\TransactionNotFoundException;
use App\Exceptions\UserNotFoundException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Wallet\ReverseTransactionRequest;
use App\Http\Requests\Wallet\StatementFilterRequest;
use App\Http\Resources\TransactionResource;
use App\Repositories\Contracts\TransactionRepositoryInterface;
use App\Repositories\Contracts\UserRepositoryInterface;
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
        private readonly UserRepositoryInterface $users,
    ) {}

    /**
     * GET /api/transactions: extrato paginado, com filtros opcionais
     * (?from=2026-11-01&to=2026-11-30&direction=in|out&type=deposit|transfer|reversal&counterpart=bob&page=2).
     */
    public function index(StatementFilterRequest $request): AnonymousResourceCollection
    {
        $counterpartId = null;

        if ($request->filled('counterpart')) {
            $counterpartId = $this->users->findByEmailOrNickname($request->validated('counterpart'))?->id
                ?? throw new UserNotFoundException;
        }

        $filters = StatementFilters::fromInput($request->validated(), $counterpartId);

        return TransactionResource::collection(
            $this->transactions->paginateForUser($request->user(), $filters),
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
