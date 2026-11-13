-- Executado automaticamente pelo MySQL apenas na PRIMEIRA criação do volume.
-- Cria o banco usado exclusivamente pelos testes automatizados (php artisan test),
-- separado do banco "wallet" de desenvolvimento.
CREATE DATABASE IF NOT EXISTS wallet_testing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON wallet_testing.* TO 'wallet'@'%';
FLUSH PRIVILEGES;
