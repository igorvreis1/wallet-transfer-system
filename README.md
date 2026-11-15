# Wallet Transfer System

Carteira financeira digital: cadastro, autenticação, depósito, transferência entre usuários (por **email** ou **nickname**) e reversão de operações.

> Documentação completa: [docs/DOCUMENTACAO.md](docs/DOCUMENTACAO.md)

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | PHP 8.5 · Laravel 13 · Sanctum (Bearer Token) |
| Frontend | React 19 · TypeScript · Vite |
| Banco | MySQL 8.4 |
| Infra | Docker · Docker Compose · Nginx |

## Como rodar

Pré-requisito: apenas o [Docker Desktop](https://www.docker.com/products/docker-desktop/).

Na pasta raiz do projeto (PowerShell, Git Bash, Linux ou macOS):

```bash
cp .env.example .env
docker compose up -d --build
```

> No **CMD** do Windows, use `copy .env.example .env` no lugar do `cp`.

Na **primeira execução**, os containers instalam as dependências (Composer e npm) e aplicam as migrations sozinhos. Isso leva cerca de **1 a 2 minutos**. Se a API responder **502 Bad Gateway** nesse meio-tempo, é só aguardar.

| Serviço | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:8000 |
| Health check (API + banco) | http://localhost:8000/api/health |
| MySQL (cliente externo) | `localhost:3307` (usuário `wallet`, senha `secret`) |

### Usuários de demonstração

Para criar `alice` (R$ 100,00) e `bob` (R$ 0,00), ambos com a senha `password1`:

```bash
docker compose exec app php artisan db:seed
```

Para **zerar** o banco e recriar só esses dois usuários (apaga todos os dados):

```bash
docker compose exec app php artisan migrate:fresh --seed
```

### Parar

```bash
docker compose down
```

Os dados do banco continuam salvos no volume. Para apagar tudo, inclusive o banco: `docker compose down -v`.

## Observabilidade

- Toda resposta da API traz o header **`X-Request-Id`**, o mesmo ID gravado nos logs.
- **Todo erro** fica na tabela `error_logs`: `error` (inesperado, 5xx) ou `warning` (esperado, 4xx). Senhas, tokens, número de cartão e CVV **nunca** são gravados.
- Registros antigos são apagados sozinhos todo dia pelo container `scheduler` (`warning` após 30 dias, `error` após 90).

Ver os últimos erros pelo terminal:

```bash
docker compose exec app php artisan wallet:errors --level=error
```

## Testes automatizados

```bash
docker compose exec app php artisan test
```

São 130 testes (unitários e de integração) que rodam no banco **separado** `wallet_testing`, sem tocar nos dados de desenvolvimento. Detalhes em [docs/DOCUMENTACAO.md](docs/DOCUMENTACAO.md#9-testes-automatizados).

## Testar no Postman

Importe [docs/postman/wallet-transfer-system.postman_collection.json](docs/postman/wallet-transfer-system.postman_collection.json) no Postman (**Import → arquivo**). As pastas seguem a ordem de uso, cada uma dividida em **✅ Sucesso** e **❌ Erros esperados**, e o token é salvo sozinho após o login.

## Endpoints

Valores monetários são **inteiros em centavos** (`amount: 5075` = R$ 50,75).

| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| GET | `/api/health` | Pública | Saúde da API e do banco (200 ok, 503 se o banco cair) |
| POST | `/api/auth/register` | Pública | Cadastro (email, nickname, senha) |
| POST | `/api/auth/login` | Pública | Login por email **ou** nickname |
| POST | `/api/auth/logout` | Bearer | Revoga o token atual |
| GET | `/api/auth/me` | Bearer | Dados do usuário logado |
| PATCH | `/api/account/privacy` | Bearer | Mostra ou oculta o email (`email_visible`); o nickname é sempre público |
| GET | `/api/wallet` | Bearer | Saldo atual |
| POST | `/api/wallet/deposit` | Bearer | Depósito (`amount`; `method` = `pix`, `boleto` ou `card` + `card_id`) |
| GET | `/api/cards` | Bearer | Meus cartões (só bandeira e 4 últimos dígitos) |
| POST | `/api/cards` | Bearer | Cadastrar cartão (`brand`, `last4`, `holder_name`, `exp_month`, `exp_year`, `nickname`) |
| PATCH | `/api/cards/{id}` | Bearer | Editar apelido, nome impresso ou validade |
| DELETE | `/api/cards/{id}` | Bearer | Excluir cartão |
| GET | `/api/users/lookup?identifier=` | Bearer | Confirma o destinatário antes de transferir |
| POST | `/api/wallet/transfer` | Bearer | Transferência (`recipient` = email ou nickname, `amount`, `description` opcional) |
| GET | `/api/transactions` | Bearer | Extrato paginado, com filtros opcionais: `from`, `to` (AAAA-MM-DD), `direction` (in/out), `type`, `counterpart` |
| GET | `/api/transactions/counterparts` | Bearer | Pessoas com quem você já transacionou (opções do filtro "Pessoa") |
| GET | `/api/transactions/{id}` | Bearer | Detalhe de uma transação |
| POST | `/api/transactions/{id}/reverse` | Bearer | Reverte um depósito ou uma transferência (`reason` opcional) |

## Status

- [x] **Fase 1:** monorepo, ambiente Docker (MySQL, PHP-FPM, Nginx, Vite)
- [x] **Fase 2:** autenticação (cadastro, login por email ou nickname, logout, token Bearer com Sanctum)
- [x] **Fase 3:** carteira (depósito, transferência, reversão, extrato) e coleção do Postman
- [x] **Fase 4:** testes unitários e de integração (130 testes, banco de testes separado)
- [x] **Fase 5:** frontend em React + TypeScript: login e cadastro, início com saldo animado, depósito por Pix, boleto ou cartão, transferência com confirmação e comprovante em PDF, reversão e extrato com filtros
- [x] **Fase 6:** observabilidade: ID por requisição (`X-Request-Id`), todo erro registrado em `error_logs` (sem dados sensíveis), limpeza automática e `/api/health`
- [ ] **Fase 7 (extra):** app em Flutter consumindo a mesma API (backend multiplataforma)
- [ ] **Fase 8 (extra):** multimoeda (BRL, USD, EUR) e câmbio entre as próprias carteiras
