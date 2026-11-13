<?php

namespace Tests\Unit;

use App\Support\Money;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * Teste UNITÁRIO: testa a classe Money sozinha, sem banco, sem API, sem Laravel.
 */
class MoneyTest extends TestCase
{
    /**
     * Cada linha vira um teste: [centavos, texto esperado].
     *
     * @return array<string, array{int, string}>
     */
    public static function valores(): array
    {
        return [
            'zero' => [0, 'R$ 0,00'],
            'só centavos' => [5, 'R$ 0,05'],
            'reais e centavos' => [567, 'R$ 5,67'],
            'separador de milhar' => [123456, 'R$ 1.234,56'],
            'milhão' => [100_000_000, 'R$ 1.000.000,00'],
            'negativo (dívida)' => [-3000, '-R$ 30,00'],
        ];
    }

    #[DataProvider('valores')]
    public function test_formata_centavos_em_reais(int $centavos, string $esperado): void
    {
        $this->assertSame($esperado, Money::format($centavos));
    }
}
