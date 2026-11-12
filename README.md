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

```bash
cp .env.example .env
docker compose up -d --build
```

| Serviço | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:8000 |
| Health check | http://localhost:8000/up |
| MySQL (cliente externo) | `localhost:3307` |

Na primeira execução o container instala as dependências e aplica as migrations sozinho.

Para recriar o banco com usuários de demonstração (`alice` com R$ 100,00 e `bob` com R$ 0,00, ambos com a senha `password1`):

```bash
docker compose exec app php artisan migrate:fresh --seed
```

## Testar no Postman

Importe [docs/postman/wallet-transfer-system.postman_collection.json](docs/postman/wallet-transfer-system.postman_collection.json) no Postman (**Import → arquivo**). As pastas seguem a ordem de uso, cada uma dividida em **✅ Sucesso** e **❌ Erros esperados**, e o token é salvo sozinho após o login.

## Endpoints

Valores monetários são **inteiros em centavos** (`amount: 5075` = R$ 50,75).

| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| POST | `/api/auth/register` | Pública | Cadastro (email, nickname, senha) |
| POST | `/api/auth/login` | Pública | Login por email **ou** nickname |
| POST | `/api/auth/logout` | Bearer | Revoga o token atual |
| GET | `/api/auth/me` | Bearer | Dados do usuário logado |
| GET | `/api/wallet` | Bearer | Saldo atual |
| POST | `/api/wallet/deposit` | Bearer | Depósito (`amount`) |
| GET | `/api/users/lookup?identifier=` | Bearer | Confirma o destinatário antes de transferir |
| POST | `/api/wallet/transfer` | Bearer | Transferência (`recipient` = email ou nickname, `amount`) |
| GET | `/api/transactions` | Bearer | Extrato paginado |
| GET | `/api/transactions/{id}` | Bearer | Detalhe de uma transação |
| POST | `/api/transactions/{id}/reverse` | Bearer | Reverte um depósito ou uma transferência (`reason` opcional) |

## Status

- [x] **Fase 1:** monorepo, ambiente Docker (MySQL, PHP-FPM, Nginx, Vite)
- [x] **Fase 2:** autenticação (cadastro, login por email ou nickname, logout, token Bearer com Sanctum)
- [x] **Fase 3:** carteira (depósito, transferência, reversão, extrato) e coleção do Postman
- [ ] **Fase 4:** testes unitários e de integração
- [ ] **Fase 5:** frontend completo
- [ ] **Fase 6:** observabilidade (log de erros)
