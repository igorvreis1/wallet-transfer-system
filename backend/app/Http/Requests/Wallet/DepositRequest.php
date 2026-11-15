<?php

namespace App\Http\Requests\Wallet;

use App\Enums\PaymentMethod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DepositRequest extends FormRequest
{
    use AmountRules;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * Ex.: { "amount": 5000, "method": "card", "card_id": 3 }
     * "method" é opcional: sem ele, o depósito é por Pix.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'amount' => $this->amountRules(),
            'method' => ['sometimes', Rule::enum(PaymentMethod::class)],
            'card_id' => ['required_if:method,card', 'prohibited_unless:method,card', 'integer'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            ...$this->amountMessages(),
            'method.enum' => 'Forma de pagamento inválida. Use "pix" ou "card".',
            'card_id.required_if' => 'Escolha o cartão para o depósito.',
            'card_id.prohibited_unless' => 'Informe o cartão só quando o depósito for por cartão.',
        ];
    }
}
