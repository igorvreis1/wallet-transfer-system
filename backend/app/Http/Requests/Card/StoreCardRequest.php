<?php

namespace App\Http\Requests\Card;

use App\Enums\CardBrand;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Cadastro de cartão. O frontend valida o número (Luhn), descobre a bandeira
 * e manda SÓ: bandeira, 4 últimos dígitos, nome impresso e validade.
 */
class StoreCardRequest extends FormRequest
{
    use CardRules;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('holder_name'))) {
            $this->merge(['holder_name' => mb_strtoupper(trim($this->input('holder_name')))]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'brand' => ['required', Rule::enum(CardBrand::class)],
            'last4' => ['required', 'digits:4'],
            ...$this->commonRules(creating: true),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'brand.required' => 'Informe a bandeira do cartão.',
            'brand.enum' => 'Bandeira não reconhecida.',
            'last4.required' => 'Informe os 4 últimos dígitos do cartão.',
            'last4.digits' => 'Informe exatamente os 4 últimos dígitos do cartão.',
            ...$this->commonMessages(),
        ];
    }

    /** Depois das regras básicas: não aceita cartão já vencido. */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->hasAny(['exp_month', 'exp_year'])) {
                    return;
                }
                if ($this->isExpired((int) $this->input('exp_month'), (int) $this->input('exp_year'))) {
                    $validator->errors()->add('exp_month', 'Este cartão está vencido.');
                }
            },
        ];
    }
}
