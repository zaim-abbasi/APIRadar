#!/bin/bash
# APIRadar Migration and Redeployment Script
# Usage: chmod +x deploy.sh && ./deploy.sh

set -e

echo "=== 1. Updating Nginx Configuration ==="
NGINX_CONF="/etc/nginx/sites-available/apiradar"

# Backup old config if it exists
if [ -f "$NGINX_CONF" ]; then
    echo "Backing up existing Nginx config to ${NGINX_CONF}.bak"
    sudo cp "$NGINX_CONF" "${NGINX_CONF}.bak"
fi

# Write new configuration
echo "Writing new Nginx configuration for apiradar.bot.nu and api.apiradar.bot.nu..."
sudo bash -c "cat > $NGINX_CONF" << 'EOF'
server {
    listen 80;
    server_name apiradar.bot.nu;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name api.apiradar.bot.nu;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Link config to sites-enabled if not already done
if [ ! -f "/etc/nginx/sites-enabled/apiradar" ]; then
    echo "Enabling Nginx site configuration..."
    sudo ln -s "$NGINX_CONF" "/etc/nginx/sites-enabled/apiradar"
fi

# Test and reload Nginx
echo "Testing Nginx configuration..."
sudo nginx -t
echo "Reloading Nginx..."
sudo systemctl reload nginx

echo "=== 2. Obtaining SSL Certificates with Certbot ==="
echo "Generating Let's Encrypt certificates..."
# Request certificates for both domains and auto-configure redirect
sudo certbot --nginx -d apiradar.bot.nu -d api.apiradar.bot.nu --non-interactive --agree-tos --redirect -m zaim.k.abbasi@gmail.com || {
    echo "Warning: Certbot SSL configuration failed. Please ensure DNS records have fully propagated and try running certbot manually."
}

echo "=== 3. Pulling Code, Rebuilding & Restarting ==="
echo "Pulling latest code changes..."
git pull origin main || echo "Git pull warning: please make sure to pull latest changes manually."

echo "Rebuilding frontend Next.js application..."
npm run build

echo "Rebuilding backend Node.js application..."
cd backend
npm run build
cd ..

echo "Restarting PM2 processes..."
pm2 restart all || pm2 reload all

echo "=== Migration Complete! ==="
echo "Please visit https://apiradar.bot.nu to verify."
