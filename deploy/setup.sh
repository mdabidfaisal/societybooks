#!/bin/bash
set -euo pipefail

DOMAIN="societybooks.codeprophet.com.bd"
APP_DIR="/var/www/societybooks"
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"

echo "=== SocietyBooks Production Deployment ==="
echo ""

# 1. Install nginx + certbot if missing
if ! command -v nginx &>/dev/null; then
    echo "[1/5] Installing nginx..."
    apt-get update -qq && apt-get install -y -qq nginx
else
    echo "[1/5] nginx already installed"
fi

if ! command -v certbot &>/dev/null; then
    echo "[2/5] Installing certbot..."
    apt-get install -y -qq certbot python3-certbot-nginx
else
    echo "[2/5] certbot already installed"
fi

# 2. Create app directory and copy files
echo "[3/5] Copying frontend build to $APP_DIR ..."
mkdir -p "$APP_DIR"
cp -r dist/* "$APP_DIR/"

# 3. Setup nginx config
echo "[4/5] Setting up nginx..."
cp deploy/nginx.conf "$NGINX_CONF"
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test config
nginx -t

# 4. Obtain SSL certificate (first time)
echo "[5/5] Obtaining SSL certificate..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect -m admin@codeprophet.com.bd || true

# Reload nginx
systemctl reload nginx

echo ""
echo "=== Done! https://$DOMAIN ==="
echo ""
