# Documentação: Wallet Transfer System

## 1. Visão geral

Sistema de carteira financeira em que usuários se cadastram, depositam dinheiro, transferem saldo para outros usuários (identificados por email ou nickname) e podem reverter operações.

## 2. Arquitetura

Monorepo com frontend e backend separados, comunicando-se por uma API REST.

```
wallet-transfer-system/
├── backend/             API Laravel 13
├── frontend/            SPA React + TypeScript (Vite)
├── docker/
│   ├── php/             Dockerfile e entrypoint do PHP-FPM
│   └── nginx/           Configuração do servidor web
├── docs/                Documentação
├── docker-compose.yml   Orquestração dos containers
└── .env.example         Credenciais do banco (desenvolvimento)
```

### Containers

| Serviço | Imagem | Porta | Função |
|---|---|---|---|
| `mysql` | mysql:8.4 | 3307 → 3306 | Banco de dados, com volume persistente `mysql_data` |
| `app` | PHP 8.5-FPM Alpine (build próprio) | 9000 (interna) | Executa o Laravel |
| `nginx` | nginx:1.27-alpine | 8000 → 80 | Recebe HTTP e repassa o PHP ao `app` |
| `frontend` | node:22-alpine | 5173 | Servidor de desenvolvimento do Vite |

Fluxo de uma requisição: `Navegador → Nginx (8000) → PHP-FPM (app:9000) → Laravel → MySQL (mysql:3306)`.

O `app` só inicia quando o MySQL passa no *healthcheck*. O `entrypoint.sh` instala as dependências se faltarem, cria o `.env`, ajusta permissões e aplica as migrations.

## 3. Decisões técnicas

| Decisão | Justificativa |
|---|---|
| Laravel | Framework pedido na vaga; oferece autenticação (Sanctum), validação, ORM e testes prontos. |
| React + TypeScript | Separa frontend e backend por uma API; TypeScript detecta erros de tipo em tempo de desenvolvimento. |
| MySQL | Banco relacional com transações ACID e *row locking*, essenciais para operações financeiras. |
| Docker | Ambiente idêntico em qualquer máquina: o avaliador só precisa do Docker. |
| Valores monetários em centavos (inteiro) | Evita erros de arredondamento de ponto flutuante (`0.1 + 0.2 ≠ 0.3`). |
| Bloqueio pessimista (`lockForUpdate`) | Impede que duas operações simultâneas gastem o mesmo saldo. Os usuários são bloqueados sempre em ordem de id para evitar *deadlock*. |

## 4. Regras de negócio

1. Cadastro com **email** (validado), **nickname** (único) e **senha**.
2. Somente registro e login são rotas públicas; todas as outras exigem token Bearer (Sanctum).
3. Transferência por email **ou** nickname do destinatário, com confirmação no frontend.
4. **Transferência sem saldo suficiente é bloqueada.**
5. **Reversão é sempre aplicada por inteiro**, mesmo que deixe o saldo do destinatário negativo (modelo de estorno/chargeback).
6. **Depósito em conta com saldo negativo soma ao saldo existente**, quitando a dívida primeiro.
7. Quem pode reverter: quem **enviou** a transferência, ou o **dono** do depósito.
8. Uma operação só pode ser revertida **uma vez**, e uma reversão não pode ser revertida.
9. **Prazo de reversão: 90 dias** a partir da operação, inspirado na devolução do Pix e configurável por `REVERSAL_WINDOW_DAYS`. O comando administrativo (inconsistência) não tem prazo.
10. Receber uma transferência com saldo negativo também abate a dívida (mesmo efeito do depósito).
11. **Privacidade do email:** o **nickname é sempre público** (é a "chave" da carteira). O email é visível por padrão, mas o usuário pode ocultá-lo no cadastro ou depois (`PATCH /api/account/privacy`). Oculto, ele não aparece para ninguém (nem mascarado) e **não encontra o usuário** na busca, na transferência ou no filtro do extrato, porque uma busca que achasse o dono revelaria de quem é o email. O próprio dono continua entrando com o email normalmente.
12. **Mensagem na transferência:** opcional, até 140 caracteres (`description`), visível para quem envia e quem recebe, como a mensagem do Pix. Não confundir com `reason`, que é o motivo de uma reversão.
13. **Detalhes da operação:** o extrato informa até quando cada operação pode ser revertida (`reversible_until` = data + 90 dias) e, se já foi revertida, quando e por quê (`reversed`).
14. **Depósito por Pix ou cartão (simulado):** `method` = `pix` (padrão) ou `card` + `card_id`. O cartão precisa ser **do próprio usuário** (o de outra pessoa dá 404) e não pode estar vencido. O extrato guarda uma foto do meio de pagamento (`payment_detail`, ex.: "Visa •••• 4242"), que continua correta mesmo se o cartão for editado ou excluído.
15. **Cartões e segurança (PCI DSS):** o número completo e o CVV **nunca** chegam à API nem ao banco. O frontend valida o número (algoritmo de Luhn), descobre a bandeira e envia só a bandeira e os 4 últimos dígitos; a API recusa explicitamente `number` e `cvv` (`prohibited`). Máximo de 5 cartões por usuário. Num banco real, o número iria para um gateway de pagamento, que devolveria um token.

> **Futuro:** regras de contestação (ex.: o destinatário poder contestar uma reversão, como no MED do Pix).

## 5. Modelagem de dados

**users** *(implementada)*: `id`, `email` (único), `nickname` (único, até 30 caracteres), `password` (hash), `balance` (BIGINT com sinal, em centavos, padrão 0), timestamps.

**personal_access_tokens** *(implementada, do Sanctum)*: tokens de acesso. O banco guarda só o hash do token, nunca o valor em texto.

**transactions** *(implementada)*: o livro-razão (*ledger*) de toda movimentação. `id`, `type` (`deposit` | `transfer` | `reversal`), `status` (`completed` | `reversed`), `sender_id`, `receiver_id`, `amount` (BIGINT sem sinal, em centavos, > 0), `reversal_of_id` (FK para a operação revertida, **UNIQUE**), `reason`, timestamps. Índices em `(sender_id, created_at)` e `(receiver_id, created_at)` para o extrato.

Convenção: **`sender_id` é de quem o saldo sai e `receiver_id` é para quem o saldo entra.**

| Operação | sender_id | receiver_id |
|---|---|---|
| Depósito | nulo | dono |
| Transferência A → B | A | B |
| Reversão da transferência | B | A |
| Reversão do depósito | dono | nulo |

Com essa convenção, o saldo de qualquer usuário é sempre igual a **(soma do que entrou) − (soma do que saiu)** no ledger. É uma forma de auditar a consistência:

```sql
SELECT u.nickname, u.balance,
       COALESCE((SELECT SUM(amount) FROM transactions WHERE receiver_id = u.id), 0)
     - COALESCE((SELECT SUM(amount) FROM transactions WHERE sender_id   = u.id), 0) AS saldo_pelo_extrato
FROM users u;
```

**error_logs**: `id`, `request_id`, `user_id`, `method`, `route`, `exception`, `message`, `context` (JSON), `created_at`. Registra apenas erros inesperados; erros de regra de negócio (ex.: saldo insuficiente) não entram, pois são o sistema funcionando.

## 6. Autenticação

### Fluxo
1. O cliente chama `POST /api/auth/register` ou `POST /api/auth/login` e recebe um **token**.
2. Nas próximas requisições, envia o header `Authorization: Bearer <token>`.
3. O middleware `auth:sanctum` valida o token; sem ele, a resposta é `401`.
4. `POST /api/auth/logout` apaga o token usado, que deixa de funcionar na hora.

### Camadas (do HTTP ao banco)

```
routes/api.php
  └─ AuthController            recebe a requisição e devolve a resposta (controller "magro")
       ├─ RegisterRequest      validação e normalização do cadastro
       ├─ LoginRequest         validação do login
       └─ AuthService          regras de cadastro, login e logout
            └─ UserRepositoryInterface  ←  EloquentUserRepository  (acesso ao banco)
UserResource                   formato público do usuário na resposta (sem a senha)
```

| Peça | Princípio / padrão |
|---|---|
| `AuthController` só orquestra; validação e regra ficam em outras classes | **S**ingle Responsibility |
| `AuthService` depende de `UserRepositoryInterface`, não do Eloquent | **D**ependency Inversion + padrão **Repository** |
| A ligação interface → implementação fica no `AppServiceProvider` | Injeção de dependência pelo *service container* |
| `BusinessException` é a base dos erros de negócio; novos erros só estendem a classe | **O**pen/Closed |
| `UserResource` controla o que sai na API | Padrão **Resource / Transformer** |

### Segurança
| Medida | Onde |
|---|---|
| Senha com hash bcrypt (cast `hashed`) | `User` |
| Senha forte: mínimo 8 caracteres, com letras e números, e confirmação | `RegisterRequest` |
| Email e nickname normalizados (minúsculas, sem espaços) e únicos | `RegisterRequest` + índices `unique` |
| Mensagem de login genérica: não revela se o usuário existe | `InvalidCredentialsException` |
| Limite de 5 tentativas por minuto (IP + login) em cadastro e login | `RateLimiter 'auth'` |
| Token expira em 24h (`SANCTUM_EXPIRATION`) | `config/sanctum.php` |
| CORS liberado apenas para o frontend (`FRONTEND_URL`) | `config/cors.php` |
| `balance` fora do `$fillable`: o saldo não pode ser alterado pelo cadastro | `User` |

## 7. Carteira

### Camadas

```
WalletController ─┬─ DepositRequest / TransferRequest / LookupRecipientRequest   validação
                  ├─ DepositService      depósito
                  └─ TransferService     busca do destinatário + transferência
TransactionController ─┬─ TransactionRepository   extrato e detalhe
                       └─ ReversalService         reversão
TransactionResource    linha do extrato do ponto de vista de quem está logado
```

Cada operação tem **seu próprio service** (Single Responsibility), e todos dependem das interfaces `UserRepositoryInterface` e `TransactionRepositoryInterface` (Dependency Inversion).

### Depósito
1. Valida `amount` (inteiro em centavos, de 1 até 100.000.000).
2. Abre uma transação no banco e **trava a linha do usuário**.
3. Soma ao saldo. Se o saldo estiver negativo, o depósito quita a dívida (-R$ 30 + R$ 50 = R$ 20).
4. Registra a operação no ledger.

### Transferência
1. `recipient` aceita email ou nickname. Se não encontrar: **404** "Nenhum usuário encontrado com esse email ou nickname." Para si mesmo: **422**.
2. O frontend chama antes `GET /api/users/lookup` para mostrar a confirmação (*"Transferir R$ 30,00 para @bob?"*). A rota devolve só o nickname e o email mascarado (`bo***@example.com`).
3. Dentro de uma transação no banco, **trava os dois usuários** e só então confere o saldo.
4. Sem saldo: **422** "Saldo insuficiente. Seu saldo atual é R$ X." Com saldo: debita, credita e registra.

### Concorrência
Sem proteção, duas transferências simultâneas poderiam ler o mesmo saldo, as duas aprovarem e o dinheiro ser gasto duas vezes. A solução:

- **`DB::transaction()`**: tudo ou nada. Se algo falhar no meio, saldo e registro são desfeitos juntos.
- **`lockForUpdate()`** (`SELECT ... FOR UPDATE`): a segunda operação **espera** a primeira terminar e só então lê o saldo, já atualizado.
- **Ordem fixa dos locks** (menor id primeiro): evita *deadlock* quando A transfere para B ao mesmo tempo em que B transfere para A.
- **`attempts: 3`**: se o MySQL ainda assim detectar um deadlock, o Laravel tenta a operação de novo.

Teste realizado: com saldo para exatamente 6 transferências de R$ 30,00, foram disparadas **10 simultâneas**. Resultado: **6 aprovadas, 4 recusadas por saldo insuficiente**, saldo final de R$ 0,75, sem nunca ficar negativo.

### Extrato com filtros
`GET /api/transactions` aceita filtros opcionais, que podem ser combinados:

| Filtro | Exemplo | Efeito |
|---|---|---|
| `from` / `to` | `?from=2026-11-01&to=2026-11-30` | Período em dias inteiros (os dois dias entram) |
| `direction` | `?direction=out` | `in` = entrou no meu saldo; `out` = saiu |
| `type` | `?type=deposit` | `deposit`, `transfer` ou `reversal` |
| `counterpart` | `?counterpart=bob` | Transações entre mim e essa pessoa (email ou nickname), nos dois sentidos |

Decisões:
- **Os filtros só restringem.** A consulta começa sempre por "transações em que eu participei" (entre parênteses), e cada filtro entra com `AND`. Um filtro nunca consegue mostrar transações de outras pessoas, e há teste específico para isso.
- **Fuso horário.** O banco grava em UTC, mas o usuário pensa no horário de Brasília. As datas são convertidas para um intervalo em UTC, `[início de "from", início do dia seguinte a "to")`. Sem isso, uma transação às 23h do dia 30 (2h do dia 1º em UTC) ficaria fora do filtro "até dia 30". O fuso é configurável (`WALLET_TIMEZONE`, padrão `America/Sao_Paulo`).
- **Intervalo meio aberto** (`>= início` e `< dia seguinte`) em vez de `BETWEEN ... 23:59:59`: não perde transações nos milissegundos finais do dia.
- **Paginação preserva os filtros:** o link da próxima página mantém a query (`?type=deposit&page=2`).
- Os índices `(sender_id, created_at)` e `(receiver_id, created_at)` atendem exatamente a essas consultas.
- Validação com mensagens claras (data fora do formato `AAAA-MM-DD`, data final antes da inicial, direção ou tipo desconhecidos → 422; contraparte inexistente → 404).

### Reversão
`POST /api/transactions/{id}/reverse`, com `reason` opcional.

| Regra | Resposta se violada |
|---|---|
| Transferência: só quem **enviou** pode reverter | 403 "Apenas quem enviou a transferência pode revertê-la." |
| Depósito: só o **dono** pode reverter | 403 "Apenas o dono do depósito pode revertê-lo." |
| Uma reversão não pode ser revertida | 403 "Uma reversão não pode ser revertida." |
| Cada operação só é revertida uma vez | 409 "Esta transação já foi revertida." |
| Até **90 dias** após a operação (`REVERSAL_WINDOW_DAYS`) | 422 "O prazo para reverter esta transação expirou. Reversões podem ser solicitadas em até 90 dias." |
| Transação inexistente ou de outra pessoa | 404 "Transação não encontrada." |

Fora do prazo, o extrato também devolve `can_reverse: false`, e o frontend esconde o botão de reverter. A regra fica num único lugar (`Transaction::isReversibleBy`, que combina `canRequestReversal` e `isWithinReversalWindow`), usado tanto pelo service quanto pela resposta da API.

Como funciona:
- **Nada é apagado.** A original vira `reversed` e uma nova linha `reversal` registra o estorno, então o histórico é auditável.
- A reversão é aplicada **por inteiro**, mesmo que deixe o saldo de quem recebeu **negativo** (modelo de estorno/chargeback). O próximo depósito quita a dívida.
- A operação original é travada (`lockForUpdate`), e o índice `UNIQUE` em `reversal_of_id` garante no próprio banco que não existam duas reversões da mesma operação.

**Reversão por inconsistência (uso administrativo).** Para quando o suporte identifica um problema, sem exigir ser o dono da operação e **sem prazo**:

```bash
docker compose exec app php artisan wallet:reverse 15 --reason="Transferência duplicada"
```

Além disso, qualquer falha **durante** uma operação é desfeita automaticamente pela transação do banco (rollback), então o sistema nunca fica num estado intermediário.

## 8. Coleção do Postman

Arquivo: `docs/postman/wallet-transfer-system.postman_collection.json`.

```
1. Saúde da API
2. Autenticação         ✅ Sucesso  |  ❌ Erros esperados
3. Carteira             ✅ Sucesso  |  ❌ Erros esperados
4. Transferências       ✅ Sucesso  |  ❌ Erros esperados
5. Extrato e Reversão   ✅ Sucesso  |  ❌ Erros esperados
```

- O login salva o token na variável `{{token}}`, e as demais rotas o usam automaticamente.
- Depósito e transferência salvam o id em `{{transaction_id}}`, usado no detalhe e na reversão.
- Cada requisição tem uma descrição e um teste que confere o status HTTP esperado.
- A coleção inteira pode ser executada de uma vez (*Run collection*): **40 requisições, 40 testes aprovados** com o banco recém-criado pelo seed.

## 9. Testes automatizados

```bash
docker compose exec app php artisan test                       # todos
docker compose exec app php artisan test --testsuite=Unit       # só unitários
docker compose exec app php artisan test --filter=ReversalTest  # só um arquivo
```

### Banco de testes separado
O MySQL tem dois bancos: `wallet` (desenvolvimento) e `wallet_testing` (testes). O `phpunit.xml` aponta os testes para `wallet_testing`, e o `tests/TestCase.php` tem uma **trava de segurança**: se por erro de configuração o banco não for `wallet_testing`, os testes param antes de executar qualquer coisa.

O banco de testes é criado automaticamente na primeira subida do MySQL, por `docker/mysql/init/01-create-testing-database.sql`.

Cada teste de integração usa `RefreshDatabase`: roda dentro de uma transação, que é desfeita (*rollback*) no final. Todo teste começa com o banco limpo e cria seus próprios dados, com **Alice** (R$ 100,00) e **Bob** (R$ 0,00) como usuários padrão (`$this->alice()` e `$this->bob()`).

### Estrutura

Todo teste segue **Arrange, Act, Assert** (preparar, agir, conferir).

| Tipo | Pasta | O que testa | Arquivos |
|---|---|---|---|
| **Unitário** | `tests/Unit` | Uma classe isolada, sem API | `MoneyTest` (formatação), `TransactionReversalRulesTest` (regra de quem pode reverter), `TransferServiceTest` (service com **repositórios falsos/mocks**, sem banco) |
| **Integração** | `tests/Feature` | O caminho completo: rota → middleware → validação → controller → service → MySQL | `AuthTest`, `DepositTest`, `TransferTest`, `ReversalTest`, `StatementTest`, `StatementFilterTest`, `EmailPrivacyTest`, `TransferDetailsTest`, `CardTest` |

### Cobertura das regras do desafio
| Requisito | Testado em |
|---|---|
| Cadastro e autenticação | `AuthTest` (12 testes: validação, unicidade, login por email/nickname, token, logout, força bruta, *mass assignment*) |
| Depositar | `DepositTest` |
| Depósito em saldo negativo soma ao valor | `DepositTest::test_deposito_em_saldo_negativo_quita_a_divida_primeiro` |
| Enviar e receber | `TransferTest` |
| Validar saldo antes da transferência | `TransferTest::test_transferencia_sem_saldo_e_recusada_e_nada_muda` |
| Reversão por solicitação do usuário | `ReversalTest` (regras de quem pode, uma vez só, reversão de reversão) |
| Prazo de 90 dias para reverter | `ReversalTest` e `TransactionReversalRulesTest` (no limite exato, 1 segundo depois, configurável, admin sem prazo). Usam a "viagem no tempo" do Laravel (`$this->travel(90)->days()`). |
| Reversão por inconsistência | `ReversalTest::test_comando_administrativo_reverte_por_inconsistencia_sem_ser_o_dono` |
| Consistência saldo × extrato | `StatementTest::test_saldo_sempre_bate_com_a_soma_do_extrato` |
| Filtros do extrato (período, direção, tipo, contraparte) | `StatementFilterTest` (bordas do dia no horário de Brasília, filtros combinados, nunca mostra transações de terceiros, validação) |
| Privacidade do email (nickname sempre público) | `EmailPrivacyTest` (padrão visível, cadastro oculto, busca/transferência/filtro pelo email oculto não encontram, login do dono continua, alternar a preferência) |
| Mensagem, prazo e motivo da reversão | `TransferDetailsTest` (mensagem visível aos dois lados, opcional e com limite, `reversible_until`, dados da reversão) |
| Cartões e depósito por Pix/cartão | `CardTest` (CRUD, cartão de outra pessoa = 404, vencido, limite de 5, número completo e CVV recusados, depósito por Pix e por cartão) |

O teste de unidade `TransferServiceTest` só é possível porque o service depende de **interfaces** (`UserRepositoryInterface`): no teste, o banco é substituído por um objeto falso. É a Inversão de Dependência (SOLID) na prática.

A concorrência (várias transferências simultâneas) foi validada com requisições paralelas reais à API (seção 7). Ela não entra no PHPUnit porque cada teste roda numa única conexão com o banco.

## 10. Tratamento de erros

Toda resposta de erro da API segue o formato `{ "message": "..." }`, em português. Erros de validação também trazem `errors`, com as mensagens de cada campo. A configuração fica em `bootstrap/app.php`.

| Situação | Status | Exemplo de `message` |
|---|---|---|
| Dados inválidos | 422 | "Verifique os dados informados." + `errors` por campo |
| Login incorreto | 401 | "Email/nickname ou senha inválidos." |
| Sem token / token inválido ou expirado | 401 | "Sessão inválida ou expirada. Faça login novamente." |
| Excesso de tentativas | 429 | "Muitas tentativas. Tente novamente em 55 segundos." |
| Rota inexistente | 404 | "Recurso não encontrado." |
| Método HTTP errado | 405 | "Método HTTP não permitido para esta rota." |
| Erro inesperado (produção) | 500 | "Ocorreu um erro interno. Tente novamente mais tarde." |

Erros de negócio (`BusinessException`) **não** são registrados em log, porque são o sistema funcionando corretamente. Apenas erros inesperados serão registrados (fase 6).

## 11. Comandos úteis

```bash
docker compose up -d --build          # sobe tudo
docker compose ps                     # status dos containers
docker compose logs -f app            # acompanha os logs do Laravel
docker compose exec app php artisan   # roda comandos do Artisan
docker compose down                   # para tudo (mantém o banco)
docker compose down -v                # para tudo e APAGA o banco
```
