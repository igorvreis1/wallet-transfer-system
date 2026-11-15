<?php

namespace App\Http\Resources;

use App\Models\Card;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Cartão como o frontend precisa: nunca existe número completo para devolver.
 *
 * @mixin Card
 */
class CardResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'brand' => $this->brand->value,
            'brand_label' => $this->brand->label(),
            'last4' => $this->last4,
            'label' => $this->resource->label(),             // "Visa •••• 4242"
            'holder_name' => $this->holder_name,
            'exp_month' => $this->exp_month,
            'exp_year' => $this->exp_year,
            'expires' => sprintf('%02d/%02d', $this->exp_month, $this->exp_year % 100), // "12/29"
            'expired' => $this->resource->isExpired(),
            'nickname' => $this->nickname,
        ];
    }
}
