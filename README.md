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

## Status

- [x] **Fase 1:** monorepo, ambiente Docker (MySQL, PHP-FPM, Nginx, Vite)
- [ ] **Fase 2:** autenticação (registro e login com Sanctum)
- [ ] **Fase 3:** carteira (depósito, transferência, reversão)
- [ ] **Fase 4:** testes unitários e de integração
- [ ] **Fase 5:** frontend completo
- [ ] **Fase 6:** observabilidade e coleção do Postman
