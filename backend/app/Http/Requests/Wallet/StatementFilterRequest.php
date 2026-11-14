<?php

namespace App\Http\Requests\Wallet;

use App\Enums\TransactionType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Filtros opcionais do extrato. Todos podem ser combinados:
 * GET /api/transactions?from=2026-11-01&to=2026-11-30&direction=out&type=transfer&counterpart=bob
 */
class StatementFilterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        foreach (['direction', 'type', 'counterpart'] as $field) {
            if (is_string($this->input($field))) {
                $this->merge([$field => mb_strtolower(trim($this->input($field)))]);
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'direction' => ['nullable', Rule::in(['in', 'out'])],
            'type' => ['nullable', Rule::enum(TransactionType::class)],
            'counterpart' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'from.date_format' => 'A data inicial deve estar no formato AAAA-MM-DD.',
            'to.date_format' => 'A data final deve estar no formato AAAA-MM-DD.',
            'to.after_or_equal' => 'A data final deve ser igual ou posterior à data inicial.',
            'direction.in' => 'A direção deve ser "in" (entradas) ou "out" (saídas).',
            'type.enum' => 'O tipo deve ser "deposit", "transfer" ou "reversal".',
        ];
    }
}
