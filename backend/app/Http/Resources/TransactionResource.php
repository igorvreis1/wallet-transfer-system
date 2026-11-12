<?php

namespace App\Http\Resources;

use App\Enums\TransactionType;
use App\Models\Transaction;
use App\Models\User;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Uma linha do extrato, sempre do ponto de vista de quem está logado.
 *
 * @mixin Transaction
 */
class TransactionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var User $me */
        $me = $request->user();
        $isIncoming = $this->receiver_id === $me->id;
        $counterpart = $isIncoming ? $this->sender : $this->receiver;

        return [
            'id' => $this->id,
            'type' => $this->type->value,
            'type_label' => $this->type->label(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'direction' => $isIncoming ? 'in' : 'out', // entrou ou saiu do MEU saldo
            'amount' => $this->amount,
            'amount_formatted' => ($isIncoming ? '+ ' : '- ').Money::format($this->amount),
            'counterpart' => $this->type === TransactionType::Deposit || $counterpart === null
                ? null
                : $counterpart->nickname,
            'reason' => $this->reason,
            'reversal_of_id' => $this->reversal_of_id,
            'can_reverse' => $this->resource->isReversibleBy($me), // o frontend usa para mostrar o botão
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
