<?php

namespace App\Http\Requests\Account;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePrivacyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'email_visible' => ['required', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email_visible.required' => 'Informe se o email deve ficar visível (true) ou oculto (false).',
            'email_visible.boolean' => 'Informe se o email deve ficar visível (true) ou oculto (false).',
        ];
    }
}
