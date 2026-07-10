#!/bin/bash
# APIRadar Domain & SSL Setup Script
# Usage: nano setup_domains.sh (paste content), chmod +x setup_domains.sh, ./setup_domains.sh

set -e

echo "=== 1. Updating Nginx Configuration ==="
NGINX_CONF="/etc/nginx/sites-available/apiradar"

# Backup old config
if [ -f "$NGINX_CONF" ]; then
    echo "Backing up existing Nginx config to ${NGINX_CONF}.bak"
    sudo cp "$NGINX_CONF" "${NGINX_CONF}.bak"
fi

# Write new configuration
echo "Writing Nginx configuration for apiradar.bot.nu and api.apiradar.bot.nu..."
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
echo "Testing and reloading Nginx..."
sudo nginx -t
sudo systemctl reload nginx

echo "=== 2. Updating .env.production ==="
ENV_FILE="/home/ubuntu/API-Radar/.env.production"
if [ -f "$ENV_FILE" ]; then
    echo "Updating .env.production domains..."
    sed -i 's|NEXTAUTH_URL=.*|NEXTAUTH_URL=https://apiradar.bot.nu|g' "$ENV_FILE"
    sed -i 's|NEXT_PUBLIC_BACKEND_URL=.*|NEXT_PUBLIC_BACKEND_URL=https://api.apiradar.bot.nu|g' "$ENV_FILE"
    echo ".env.production updated successfully."
else
    echo "Warning: .env.production file not found at $ENV_FILE. Please update it manually."
fi

echo "=== 3. Obtaining SSL Certificates with Certbot ==="
echo "Generating Let's Encrypt certificates..."
sudo certbot --nginx -d apiradar.bot.nu -d api.apiradar.bot.nu --non-interactive --agree-tos --redirect -m zaim.k.abbasi@gmail.com || {
    echo "Warning: Certbot SSL configuration failed. Please ensure DNS records have fully propagated and try running certbot manually."
}

echo "=== Domain and SSL Setup Complete! ==="
echo "Now push your local changes to trigger the GitHub Actions deployment pipeline."
