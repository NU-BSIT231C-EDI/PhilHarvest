FROM php:8.2-fpm

WORKDIR /app

# Install system dependencies
# default-libmysqlclient-dev provides headers needed to compile pdo_mysql
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpq-dev \
    default-libmysqlclient-dev \
    && rm -rf /var/lib/apt/lists/*

# Install built-in PHP extensions
RUN docker-php-ext-install pdo pdo_mysql

# Install Redis extension via PECL
RUN pecl install redis \
    && docker-php-ext-enable redis

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copy application files
COPY . .

# Install PHP dependencies
RUN composer install --no-interaction

# Set permissions
RUN chown -R www-data:www-data /app

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0"]