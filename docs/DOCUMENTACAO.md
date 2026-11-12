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

## 5. Modelagem de dados (planejada)

**users**: `id`, `email` (único), `nickname` (único), `password` (hash), `balance` (BIGINT com sinal, em centavos), timestamps.

**transactions**: `id`, `type` (`deposit` | `transfer` | `reversal`), `sender_id` (nulo em depósitos), `receiver_id`, `amount` (BIGINT sem sinal, > 0), `status` (`completed` | `reversed`), `reversal_of_id` (FK para a operação revertida), `reason`, timestamps.

**error_logs**: `id`, `request_id`, `user_id`, `method`, `route`, `exception`, `message`, `context` (JSON), `created_at`. Registra apenas erros inesperados; erros de regra de negócio (ex.: saldo insuficiente) não entram, pois são o sistema funcionando.

## 6. Comandos úteis

```bash
docker compose up -d --build          # sobe tudo
docker compose ps                     # status dos containers
docker compose logs -f app            # acompanha os logs do Laravel
docker compose exec app php artisan   # roda comandos do Artisan
docker compose down                   # para tudo (mantém o banco)
docker compose down -v                # para tudo e APAGA o banco
```
