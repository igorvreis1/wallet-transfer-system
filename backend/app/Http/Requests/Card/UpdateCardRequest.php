<?php

namespace App\Http\Requests\Card;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Edição de cartão (a "canetinha"): apelido, nome impresso e validade.
 * Bandeira e final não mudam: um número diferente é outro cartão.
 */
class UpdateCardRequest extends FormRequest
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
            'brand' => ['prohibited'],
            'last4' => ['prohibited'],
            ...$this->commonRules(creating: false),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'brand.prohibited' => 'A bandeira não pode ser alterada. Cadastre um novo cartão.',
            'last4.prohibited' => 'O final do cartão não pode ser alterado. Cadastre um novo cartão.',
            ...$this->commonMessages(),
        ];
    }
}
