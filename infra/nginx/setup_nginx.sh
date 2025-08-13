#!/usr/bin/env bash
set -euo pipefail
if [[ $EUID -ne 0 ]]; then echo "Please run as root" >&2; exit 1; fi
apt-get update && apt-get install -y nginx
cp /var/www/infra/nginx/nginx.conf.hbs /etc/nginx/nginx.conf
nginx -t
systemctl restart nginx
echo "[nginx] configured and restarted"
