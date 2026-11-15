<?php

namespace App\Models;

use App\Enums\CardBrand;
use Database\Factories\CardFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Cartão salvo pelo usuário. Só bandeira e 4 últimos dígitos: o número completo nunca é guardado.
 *
 * @property int $id
 * @property int $user_id
 * @property CardBrand $brand
 * @property string $last4
 * @property string $holder_name
 * @property int $exp_month
 * @property int $exp_year
 * @property string|null $nickname
 */
#[Fillable(['brand', 'last4', 'holder_name', 'exp_month', 'exp_year', 'nickname'])] // user_id vem do usuário logado
class Card extends Model
{
    /** @use HasFactory<CardFactory> */
    use HasFactory;

    /** Limite de cartões por usuário */
    public const MAX_PER_USER = 5;

    protected function casts(): array
    {
        return [
            'brand' => CardBrand::class,
            'exp_month' => 'integer',
            'exp_year' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Vencido = já passou o último dia do mês de validade. */
    public function isExpired(): bool
    {
        return now()->greaterThan(now()->setDate($this->exp_year, $this->exp_month, 1)->endOfMonth());
    }

    /** "Visa •••• 4242" */
    public function label(): string
    {
        return $this->brand->label().' •••• '.$this->last4;
    }
}
