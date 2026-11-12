#!/bin/sh
# Prepara o Laravel na primeira execução (ex.: logo após um git clone).
set -e

if [ ! -f vendor/autoload.php ]; then
  echo "[entrypoint] Instalando dependências do Composer..."
  composer install --no-interaction --prefer-dist
fi

if [ ! -f .env ]; then
  echo "[entrypoint] Criando .env a partir de .env.example..."
  cp .env.example .env
  php artisan key:generate --force
fi

# O PHP-FPM roda como www-data: ele precisa gravar logs, cache e views compiladas
chown -R www-data:www-data storage bootstrap/cache
chmod -R ug+rwX storage bootstrap/cache

echo "[entrypoint] Aplicando migrations..."
php artisan migrate --force

# Entrega o controle ao comando principal do container (php-fpm)
exec "$@"
