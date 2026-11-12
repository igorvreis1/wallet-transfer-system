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

Para criar usuários de demonstração (`alice` com R$ 100,00 e `bob`, senha `password1`):

```bash
docker compose exec app php artisan db:seed
```

## Endpoints

| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| POST | `/api/auth/register` | Pública | Cadastro (email, nickname, senha) |
| POST | `/api/auth/login` | Pública | Login por email **ou** nickname |
| POST | `/api/auth/logout` | Bearer | Revoga o token atual |
| GET | `/api/auth/me` | Bearer | Dados do usuário logado |

## Status

- [x] **Fase 1:** monorepo, ambiente Docker (MySQL, PHP-FPM, Nginx, Vite)
- [x] **Fase 2:** autenticação (cadastro, login por email ou nickname, logout, token Bearer com Sanctum)
- [ ] **Fase 3:** carteira (depósito, transferência, reversão)
- [ ] **Fase 4:** testes unitários e de integração
- [ ] **Fase 5:** frontend completo
- [ ] **Fase 6:** observabilidade e coleção do Postman
