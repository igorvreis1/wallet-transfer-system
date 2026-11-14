<?php

namespace App\Data;

use App\Enums\TransactionType;
use Carbon\CarbonImmutable;

/**
 * Filtros do extrato já validados e convertidos (objeto imutável).
 *
 * As datas chegam como dias do calendário do usuário (fuso do Brasil) e viram
 * um intervalo em UTC, que é como o banco grava: [início do dia "from", início do dia seguinte a "to").
 */
final readonly class StatementFilters
{
    public function __construct(
        public ?CarbonImmutable $from = null,
        public ?CarbonImmutable $toExclusive = null,
        public ?string $direction = null,
        public ?TransactionType $type = null,
        public ?int $counterpartId = null,
    ) {}

    /**
     * @param  array{from?: ?string, to?: ?string, direction?: ?string, type?: ?string}  $input
     */
    public static function fromInput(array $input, ?int $counterpartId = null): self
    {
        $timezone = config('wallet.timezone');

        return new self(
            from: isset($input['from'])
                ? CarbonImmutable::parse($input['from'], $timezone)->startOfDay()->utc()
                : null,
            toExclusive: isset($input['to'])
                ? CarbonImmutable::parse($input['to'], $timezone)->addDay()->startOfDay()->utc()
                : null,
            direction: $input['direction'] ?? null,
            type: isset($input['type']) ? TransactionType::from($input['type']) : null,
            counterpartId: $counterpartId,
        );
    }
}
