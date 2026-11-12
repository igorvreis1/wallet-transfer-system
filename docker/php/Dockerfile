# Imagem base oficial: Linux Alpine (leve) + PHP 8.5 no modo FPM
FROM php:8.5-fpm-alpine

# Extensão para o PHP conversar com o MySQL
RUN docker-php-ext-install pdo_mysql

# Copia o binário do Composer da imagem oficial (sem instalar nada extra)
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Script que prepara o Laravel toda vez que o container inicia
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 9000
ENTRYPOINT ["entrypoint.sh"]
CMD ["php-fpm"]
