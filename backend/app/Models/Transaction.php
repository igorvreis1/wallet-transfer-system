<?php

namespace App\Models;

use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property int $id
 * @property TransactionType $type
 * @property TransactionStatus $status
 * @property int|null $sender_id De quem o saldo sai
 * @property int|null $receiver_id Para quem o saldo entra
 * @property int $amount Em centavos
 * @property int|null $reversal_of_id
 * @property string|null $reason
 */
class Transaction extends Model
{
    /**
     * Só os services de carteira criam transações, então nada fica bloqueado aqui.
     * A proteção está em não existir rota que aceite esses campos direto do usuário.
     */
    protected $guarded = [];

    /**
     * Espelha o default da migration, para o model já nascer com o status certo
     * (sem isso, logo após o create() o status ficaria nulo até reler do banco).
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => 'completed',
    ];

    protected function casts(): array
    {
        return [
            'type' => TransactionType::class,
            'status' => TransactionStatus::class,
            'amount' => 'integer',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    /** @return BelongsTo<User, $this> */
    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'receiver_id');
    }

    /** Operação original (quando esta é uma reversão). @return BelongsTo<Transaction, $this> */
    public function reversalOf(): BelongsTo
    {
        return $this->belongsTo(self::class, 'reversal_of_id');
    }

    /** Reversão desta operação, se houver. @return HasOne<Transaction, $this> */
    public function reversal(): HasOne
    {
        return $this->hasOne(self::class, 'reversal_of_id');
    }

    public function involves(User $user): bool
    {
        return $this->sender_id === $user->id || $this->receiver_id === $user->id;
    }

    /**
     * Regra de quem pode reverter (fonte única, usada pelo service e pela API):
     * - transferência: só quem ENVIOU;
     * - depósito: só o DONO;
     * - reversão nunca é revertida, e cada operação só é revertida uma vez.
     */
    public function isReversibleBy(User $user): bool
    {
        if ($this->status !== TransactionStatus::Completed) {
            return false;
        }

        return match ($this->type) {
            TransactionType::Transfer => $this->sender_id === $user->id,
            TransactionType::Deposit => $this->receiver_id === $user->id,
            TransactionType::Reversal => false,
        };
    }
}
