<?php

namespace App\Http\Requests\Wallet;

use Illuminate\Foundation\Http\FormRequest;

class TransferRequest extends FormRequest
{
    use AmountRules;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * "recipient" aceita o email OU o nickname de quem vai receber.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'recipient' => ['required', 'string', 'max:255'],
            'amount' => $this->amountRules(),
            'description' => ['nullable', 'string', 'max:140'], // mensagem opcional, como a do Pix
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'recipient.required' => 'Informe o email ou nickname de quem vai receber.',
            ...$this->amountMessages(),
            'description.max' => 'A mensagem pode ter no máximo 140 caracteres.',
        ];
    }
}
