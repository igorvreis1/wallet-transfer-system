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
     * Regra completa para o USUÁRIO reverter (fonte única, usada pelo service e pela API):
     * - ainda não revertida;
     * - é quem tem direito de pedir (ver canRequestReversal);
     * - dentro do prazo (ver isWithinReversalWindow).
     */
    public function isReversibleBy(User $user): bool
    {
        return $this->status === TransactionStatus::Completed
            && $this->canRequestReversal($user)
            && $this->isWithinReversalWindow();
    }

    /**
     * Quem pode pedir a reversão:
     * - transferência: só quem ENVIOU;
     * - depósito: só o DONO;
     * - reversão: ninguém (estorno de estorno não existe).
     */
    public function canRequestReversal(User $user): bool
    {
        return match ($this->type) {
            TransactionType::Transfer => $this->sender_id === $user->id,
            TransactionType::Deposit => $this->receiver_id === $user->id,
            TransactionType::Reversal => false,
        };
    }

    /**
     * Prazo para o usuário pedir reversão (config/wallet.php, padrão 90 dias, como a devolução do Pix).
     * Uma transação ainda não gravada (sem created_at) conta como recém-criada.
     */
    public function isWithinReversalWindow(): bool
    {
        $createdAt = $this->created_at ?? now();

        return $createdAt->greaterThanOrEqualTo(now()->subDays(self::reversalWindowDays()));
    }

    public static function reversalWindowDays(): int
    {
        return (int) config('wallet.reversal_window_days');
    }
}
