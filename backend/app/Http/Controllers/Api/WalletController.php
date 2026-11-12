<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Wallet\DepositRequest;
use App\Http\Requests\Wallet\LookupRecipientRequest;
use App\Http\Requests\Wallet\TransferRequest;
use App\Http\Resources\RecipientResource;
use App\Http\Resources\TransactionResource;
use App\Models\Transaction;
use App\Models\User;
use App\Services\Wallet\DepositService;
use App\Services\Wallet\TransferService;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    public function __construct(
        private readonly DepositService $deposits,
        private readonly TransferService $transfers,
    ) {}

    /**
     * GET /api/wallet: saldo atual.
     */
    public function show(Request $request): JsonResponse
    {
        return response()->json($this->balancePayload($request->user()));
    }

    /**
     * POST /api/wallet/deposit
     */
    public function deposit(DepositRequest $request): JsonResponse
    {
        $transaction = $this->deposits->deposit($request->user(), (int) $request->validated('amount'));

        return $this->operationResponse($request, $transaction, 'Depósito realizado com sucesso.');
    }

    /**
     * GET /api/users/lookup?identifier=...: confirma o destinatário antes de transferir.
     */
    public function lookupRecipient(LookupRecipientRequest $request): RecipientResource
    {
        return new RecipientResource(
            $this->transfers->resolveRecipient($request->user(), $request->validated('identifier')),
        );
    }

    /**
     * POST /api/wallet/transfer
     */
    public function transfer(TransferRequest $request): JsonResponse
    {
        $transaction = $this->transfers->transfer(
            $request->user(),
            $request->validated('recipient'),
            (int) $request->validated('amount'),
        );

        return $this->operationResponse($request, $transaction, 'Transferência realizada com sucesso.');
    }

    private function operationResponse(Request $request, Transaction $transaction, string $message): JsonResponse
    {
        $transaction->load(['sender', 'receiver']);

        return response()->json([
            'message' => $message,
            'transaction' => new TransactionResource($transaction),
            ...$this->balancePayload($request->user()),
        ], 201);
    }

    /**
     * @return array{balance: int, balance_formatted: string}
     */
    private function balancePayload(User $user): array
    {
        $balance = $user->refresh()->balance; // relê do banco: o saldo pode ter mudado na operação

        return ['balance' => $balance, 'balance_formatted' => Money::format($balance)];
    }
}
