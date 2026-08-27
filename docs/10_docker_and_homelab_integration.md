# 10. Homelab Docker & Nginx Proxy Manager Integration Guide

> **Target Homelab**: Raspberry Pi 4 Docker Host  
> **Existing Stack**: Docker Compose with `nginx-proxy-manager`, `stirling-pdf`, `adguardhome`, `uptime-kuma`, `vaultwarden`, `gitea`, `homepage`, `it-tools`.  
> **Network Integrations**: Tailscale mesh, Nginx Proxy Manager (Port 81), Cloudflare Tunnel.  

---

## 1. Homelab Container Topology

HomePrint OS can run directly alongside your existing homelab containers on the Raspberry Pi 4:

```
+-----------------------------------------------------------------------------+
|                          HOMELAB DOCKER ENVIRONMENT                         |
+-----------------------------------------------------------------------------+
|                                                                             |
|   [ Public Customer Traffic ] ---> [ Cloudflare Tunnel / NPM (Port 80/443) ]|
|                                                |                            |
|                                                V (Reverse Proxy)            |
|   [ Private Operator / LAN ]  ---> [ homeprint:5000 (Docker Container) ]    |
|                                                |                            |
|                                                +--> Volume: /mnt/storage    |
|                                                +--> IPP: HP Smart Tank 670  |
|                                                +--> Headless LibreOffice    |
|                                                                             |
+-----------------------------------------------------------------------------+
```

---

## 2. Integrating HomePrint into `~/homelab/docker-compose.yml`

You can add the `homeprint` service block directly to your existing `~/homelab/docker-compose.yml`:

```yaml
  # ----------------------------------------------------------------------------
  # HomePrint OS — Local Print Shop Web OS
  # ----------------------------------------------------------------------------
  homeprint:
    build:
      context: ../home-print
      dockerfile: Dockerfile
    image: homeprint:latest
    container_name: homeprint
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      - DATABASE_PATH=/data/homeprint.sqlite
    volumes:
      - /mnt/storage/homeprint_os/data:/data
    networks:
      - default
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/operator/printers/scan"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## 3. Configuring Nginx Proxy Manager (NPM)

Because your homelab already runs Nginx Proxy Manager (accessible via Tailscale / LAN at Port 81):

### Add Proxy Host for Customer Drop (`drop.yourdomain.com`)
1. Log in to **Nginx Proxy Manager** at `http://<your-tailscale-ip>:81`.
2. Go to **Hosts** -> **Proxy Hosts** -> **Add Proxy Host**.
3. **Details Tab**:
   - Domain Names: `drop.yourdomain.com` (or `print.yourdomain.com`)
   - Scheme: `http`
   - Forward Hostname / IP: `homeprint` (or `172.17.0.1` / Raspberry Pi LAN IP)
   - Forward Port: `5000`
   - Enable: **Cache Assets**, **Block Common Exploits**, **WebSockets Support** (Required for real-time live drop notifications).
4. **SSL Tab**:
   - SSL Certificate: Request a new Let's Encrypt Certificate (or use your Cloudflare Origin Cert).
   - Enable: **Force SSL**, **HTTP/2 Support**, **HSTS Enabled**.
5. **Custom Locations Tab (Security Hardening)**:
   - To strictly expose only the public customer drop endpoint to the internet while keeping operator controls private:
     - Add Location: `/drop` -> Forward to `homeprint:5000/drop`.
     - Add Location: `/api/public` -> Forward to `homeprint:5000/api/public`.
     - Add Location: `/assets` -> Forward to `homeprint:5000/assets`.

---

## 4. Cloudflare Tunnel Configuration

### Running Cloudflare Tunnel in Docker:
```yaml
  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared-tunnel
    restart: unless-stopped
    command: tunnel --no-autoupdate run
    environment:
      - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
```

---

## 5. Tailscale Remote Operator Management

Since your homelab runs Tailscale:
- Operators can securely access the Operator Station from outside the home over the encrypted mesh:
  `http://<homelab-node-name>.ts.net:5000`
- Zero router port forwarding required; 100% encrypted over WireGuard mesh.

