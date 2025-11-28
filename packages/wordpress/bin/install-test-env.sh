#!/usr/bin/env bash

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(dirname "$SCRIPT_DIR")"

# Change to plugin directory so .env can be found
cd "$PLUGIN_DIR"

# Load environment variables
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Default values
DB_NAME=${DB_NAME:-nextpress_tests}
DB_USER=${DB_USER:-root}
DB_PASS=${DB_PASSWORD:-}
DB_HOST=${DB_HOST:-127.0.0.1}
WP_VERSION=${WP_VERSION:-latest}
WP_ROOT=${WP_CORE_DIR:-tests/_wordpress}
TESTS_ROOT=${TESTS_ROOT:-tests}
SKIP_DB_CREATE=${SKIP_DB_CREATE:-false}
SKIP_WP_SETUP=${SKIP_WP_SETUP:-false}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

install_db() {
    if [ "$SKIP_DB_CREATE" = "true" ]; then
        print_warning "Skipping database creation."
        return
    fi

    print_status "Creating MySQL database '$DB_NAME'..."

    mysql -u"$DB_USER" -p"$DB_PASS" -h"$DB_HOST" -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

    print_status "Database '$DB_NAME' created successfully."
}

create_and_start_test_env() {
    print_status "Creating test environment files..."

    # Create phpunit.xml if it doesn't exist
    if [ ! -f "$TESTS_ROOT/.env" ]; then
        cat > "$TESTS_ROOT/.env" <<EOL
# The path to the WordPress root directory, the one containing the wp-load.php file.
# This can be a relative path from the directory that contains the codeception.yml file,
# or an absolute path.
WORDPRESS_ROOT_DIR=tests/_wordpress
WORDPRESS_PLUGINS_DIR=tests/_plugins

# Tests will require a MySQL database to run.
# The database will be created if it does not exist.
# Do not use a database that contains important data!
WORDPRESS_DB_URL=mysql://$DB_USER:$DB_PASS@$DB_HOST/$DB_NAME

# The Integration suite will use this table prefix for the WordPress tables.
TEST_TABLE_PREFIX=test_

# This table prefix used by the WordPress site in end-to-end tests.
WORDPRESS_TABLE_PREFIX=wp_

# The URL and domain of the WordPress site used in end-to-end tests.
WORDPRESS_URL=http://localhost:34331
WORDPRESS_DOMAIN=localhost:34331
WORDPRESS_ADMIN_PATH=/wp-admin

# The username and password of the administrator user of the WordPress site used in end-to-end tests.
WORDPRESS_ADMIN_USER=admin
WORDPRESS_ADMIN_PASSWORD=password

# The host and port of the ChromeDriver server that will be used in end-to-end tests.
CHROMEDRIVER_HOST=localhost
CHROMEDRIVER_PORT=8858

# The port on which the PHP built-in server will serve the WordPress installation.
BUILTIN_SERVER_PORT=34331
EOL
    fi

    vendor/bin/codecept dev:stop
    vendor/bin/codecept dev:start

    print_status "Test environment files created."
}

# Configure WordPress
configure_wordpress() {
    if [ "$SKIP_WP_SETUP" = "true" ]; then
        print_warning "Skipping WordPress setup."
        return
    fi

    print_status "Configuring WordPress..."

    cd "$WP_ROOT"

    # Create wp-config.php if it doesn't exist
    if [ ! -f "wp-config.php" ]; then
        wp config create \
            --dbname="$DB_NAME" \
            --dbuser="$DB_USER" \
            --dbpass="$DB_PASS" \
            --dbhost="$DB_HOST" \
            --skip-check \
            --allow-root
    fi

    # Install WordPress if not already installed
    if ! wp core is-installed --allow-root 2>/dev/null; then
        wp core install \
            --url="localhost:34331" \
            --title="NextPress Test" \
            --admin_user="${ADMIN_USERNAME:-admin}" \
            --admin_password="${ADMIN_PASSWORD:-password}" \
            --admin_email="${ADMIN_EMAIL:-admin@example.com}" \
            --skip-email \
            --allow-root

        # Set permalinks
        wp rewrite structure '/%postname%/' --allow-root
    else
        print_warning "WordPress already installed, skipping core install."
    fi

    print_status "WordPress configured successfully."
}

# Install Composer dependencies
install_dependencies() {
    print_status "Installing Composer dependencies..."

    cd "$PLUGIN_DIR"

    composer update --no-interaction --prefer-dist

    print_status "Dependencies installed."
}

# Main execution
main() {
    print_status "Setting up NextPress test environment..."
    print_status "WP_ROOT: $WP_ROOT"
    print_status "DB_NAME: $DB_NAME"

    install_dependencies
    install_db
    create_and_start_test_env
    configure_wordpress

    print_status "Test environment ready!"
    print_status "Run tests with: composer test"
}

main
