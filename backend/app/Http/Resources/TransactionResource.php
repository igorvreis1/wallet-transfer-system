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
            'description' => $this->description, // mensagem da transferência (como a do Pix)
            'payment_method' => $this->payment_method?->value, // depósitos: "pix" ou "card"
            'payment_detail' => $this->payment_detail,          // ex.: "Pix" ou "Visa •••• 4242"
            'reason' => $this->reason,           // motivo, quando esta linha É uma reversão
            'reversal_of_id' => $this->reversal_of_id,
            'can_reverse' => $this->resource->isReversibleBy($me), // o frontend usa para mostrar o botão
            // Até quando quem tem direito pode pedir a reversão (null para reversões, que não se revertem)
            'reversible_until' => $this->type === TransactionType::Reversal
                ? null
                : $this->created_at?->copy()->addDays(Transaction::reversalWindowDays())->toIso8601String(),
            // Se esta operação já foi revertida: quando e por quê
            'reversed' => $this->whenLoaded('reversal', fn () => $this->reversal === null ? null : [
                'id' => $this->reversal->id,
                'reason' => $this->reversal->reason,
                'created_at' => $this->reversal->created_at?->toIso8601String(),
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
