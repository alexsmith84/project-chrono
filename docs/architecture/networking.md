# Networking & Infrastructure - Project Chrono

*"The warp network connects all. From edge to core to blockchain."*

---

## Overview

Project Chrono uses a multi-tier networking architecture with Caddy 2 as the central reverse proxy, routing traffic across 5 subdomains to different services on the Mac Mini M4 Pro.

### Network Topology

```
Internet
    ↓
Cloudflare DNS (hayven.xyz)
    ↓
Caddy 2 (Ports 80/443)
    ├── nexus.hayven.xyz    → API Server (Port 3000)
    ├── probe.hayven.xyz    → Worker Status (Port 3001)
    ├── forge.hayven.xyz    → Rust Engine (Port 8080)
    ├── gateway.hayven.xyz  → Public API (Port 3000, rate-limited)
    └── templar.hayven.xyz  → Dashboard (Port 5173)
```

---

## Domain Configuration

### DNS Setup (Cloudflare)

All subdomains point to your Mac Mini's public IP:

```
Type: A
Name: nexus
Content: [Your Mac Mini Public IP]
TTL: Auto
Proxy: DNS only (orange cloud OFF)

Type: A
Name: probe
Content: [Your Mac Mini Public IP]
TTL: Auto
Proxy: DNS only

Type: A
Name: forge
Content: [Your Mac Mini Public IP]
TTL: Auto
Proxy: DNS only

Type: A
Name: gateway
Content: [Your Mac Mini Public IP]
TTL: Auto
Proxy: DNS only

Type: A
Name: templar
Content: [Your Mac Mini Public IP]
TTL: Auto
Proxy: DNS only
```

**Note**: Orange cloud OFF for now (direct connection). Enable Cloudflare proxy later for DDoS protection.

---

## Caddy 2 Configuration

### Installation

```bash
# Install Caddy on macOS
brew install caddy

# Verify installation
caddy version
```

### Main Caddyfile

**Location**: `/usr/local/etc/Caddyfile` (or `~/Caddyfile` for user install)

```caddy
# Project Chrono - Caddy Configuration
# "The gateway stands ready. All channels open."

# Global options
{
    # Email for Let's Encrypt
    email admin@hayven.xyz
    
    # Enable automatic HTTPS
    auto_https on
    
    # Admin API endpoint (localhost only)
    admin localhost:2019
}

# Main FTSO API - Nexus (Command Center)
nexus.hayven.xyz {
    # Reverse proxy to Bun API server
    reverse_proxy localhost:3000
    
    # Enable compression
    encode gzip zstd
    
    # Access logging
    log {
        output file /var/log/caddy/nexus-access.log
        format json
    }
    
    # Security headers
    header {
        # XSS Protection
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
        
        # HSTS (uncomment after testing)
        # Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        
        # Content Security Policy
        Content-Security-Policy "default-src 'self'"
        
        # Remove server info
        -Server
    }
    
    # Rate limiting (100 requests per minute per IP)
    rate_limit {
        zone nexus_api {
            key {remote_host}
            events 100
            window 1m
        }
    }
}

# Data Collection Status - Probe (Resource Gathering)
probe.hayven.xyz {
    reverse_proxy localhost:3001
    
    encode gzip zstd
    
    log {
        output file /var/log/caddy/probe-access.log
        format json
    }
    
    header {
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        -Server
    }
}

# ML Analytics - Forge (Research & Development)
forge.hayven.xyz {
    reverse_proxy localhost:8080
    
    encode gzip zstd
    
    log {
        output file /var/log/caddy/forge-access.log
        format json
    }
    
    header {
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        -Server
    }
    
    # Require API key for analytics endpoint
    @no_api_key {
        not header X-API-Key *
    }
    respond @no_api_key "API key required" 401
}

# Public API - Gateway (Rate-Limited Portal)
gateway.hayven.xyz {
    reverse_proxy localhost:3000
    
    encode gzip zstd
    
    log {
        output file /var/log/caddy/gateway-access.log
        format json
    }
    
    header {
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        -Server
    }
    
    # Stricter rate limiting for public API (30 req/min)
    rate_limit {
        zone gateway_api {
            key {remote_host}
            events 30
            window 1m
        }
    }
    
    # CORS for public API
    @cors_preflight {
        method OPTIONS
    }
    
    handle @cors_preflight {
        header {
            Access-Control-Allow-Origin "*"
            Access-Control-Allow-Methods "GET, POST, OPTIONS"
            Access-Control-Allow-Headers "Content-Type, Authorization, X-API-Key"
            Access-Control-Max-Age "3600"
        }
        respond 204
    }
    
    header {
        Access-Control-Allow-Origin "*"
        Access-Control-Allow-Methods "GET, POST, OPTIONS"
        Access-Control-Allow-Headers "Content-Type, Authorization, X-API-Key"
    }
}

# Admin Dashboard - Templar (High Command)
templar.hayven.xyz {
    reverse_proxy localhost:5173
    
    encode gzip zstd
    
    log {
        output file /var/log/caddy/templar-access.log
        format json
    }
    
    header {
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        -Server
    }
    
    # Basic auth for admin access (replace with proper auth later)
    basicauth {
        admin $2a$14$[bcrypt_hash_here]
    }
    
    # SvelteKit requires WebSocket support
    @websockets {
        header Connection *Upgrade*
        header Upgrade websocket
    }
    reverse_proxy @websockets localhost:5173
}
```

### Environment-Specific Configs

**Development** (`Caddyfile.dev`):

```caddy
# Development - No HTTPS, localhost only
http://localhost:3000 {
    reverse_proxy localhost:3000
}

http://localhost:5173 {
    reverse_proxy localhost:5173
}
```

**Staging** (`Caddyfile.staging`):

```caddy
# Staging - Use staging subdomains
staging-nexus.hayven.xyz {
    reverse_proxy localhost:3000
}

staging-templar.hayven.xyz {
    reverse_proxy localhost:5173
}
```

---

## Port Allocation

| Service | Port | Protocol | Access |
|---------|------|----------|--------|
| Caddy HTTP | 80 | HTTP | Public (redirects to HTTPS) |
| Caddy HTTPS | 443 | HTTPS | Public |
| Caddy Admin | 2019 | HTTP | Localhost only |
| Bun API Server | 3000 | HTTP | Localhost only |
| Worker Status | 3001 | HTTP | Localhost only |
| SvelteKit Dev | 5173 | HTTP | Localhost only |
| PostgreSQL | 5432 | TCP | Localhost only |
| Redis | 6379 | TCP | Localhost only |
| Rust Engine | 8080 | HTTP | Localhost only |
| Prometheus | 9090 | HTTP | Localhost only |
| Grafana | 3002 | HTTP | Localhost only |

**Security Note**: Only Caddy (80/443) exposed to internet. All services behind reverse proxy.

---

## Firewall Configuration

### macOS Firewall (System Preferences)

```bash
# Enable macOS firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on

# Allow Caddy
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/caddy
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/caddy

# Enable stealth mode (don't respond to ping)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setstealthmode on
```

### Advanced Packet Filter (PF)

**Location**: `/etc/pf.conf`

```pf
# Project Chrono - Packet Filter Rules
# "Shields up. Only authorized connections permitted."

# Macros
ext_if = "en0"  # Replace with your network interface
table <bruteforce> persist

# Options
set skip on lo0
set block-policy drop
set loginterface $ext_if

# Scrub incoming packets
scrub in all

# Default deny
block all

# Allow outgoing traffic
pass out quick on $ext_if keep state

# Allow established connections
pass in quick on $ext_if proto tcp from any to any port {80, 443} flags S/SA keep state

# Rate limiting - Block IPs with >20 connections/10 seconds
pass in quick on $ext_if proto tcp to port {80, 443} \
    keep state (max-src-conn 20, max-src-conn-rate 20/10, \
    overload <bruteforce> flush global)

# Block bruteforcers for 24 hours
block in quick from <bruteforce>

# Allow SSH (key-only, non-standard port recommended)
# pass in quick on $ext_if proto tcp to port 22 keep state

# Allow ICMP (ping) - optional, remove for stealth
# pass in quick on $ext_if proto icmp all
```

**Enable PF**:

```bash
# Load rules
sudo pfctl -f /etc/pf.conf

# Enable PF
sudo pfctl -e

# Check status
sudo pfctl -s rules
```

---

## SSL/TLS Configuration

### Let's Encrypt (Automatic)

Caddy handles this automatically! Just ensure:

1. **DNS is configured** correctly (A records pointing to your IP)
2. **Ports 80 and 443** are open
3. **Email is set** in Caddyfile for renewal notices

```bash
# Check certificate status
caddy list-certificates

# Force renewal (if needed)
caddy reload --config /usr/local/etc/Caddyfile
```

### Certificate Locations

Caddy stores certificates at:

- **macOS**: `~/Library/Application Support/Caddy/certificates/`
- **Linux**: `~/.local/share/caddy/certificates/`

---

## Service Management

### Caddy as a Service (macOS LaunchDaemon)

**Location**: `/Library/LaunchDaemons/com.caddyserver.caddy.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.caddyserver.caddy</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/caddy</string>
        <string>run</string>
        <string>--config</string>
        <string>/usr/local/etc/Caddyfile</string>
        <string>--adapter</string>
        <string>caddyfile</string>
    </array>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <true/>
    
    <key>StandardOutPath</key>
    <string>/var/log/caddy/stdout.log</string>
    
    <key>StandardErrorPath</key>
    <string>/var/log/caddy/stderr.log</string>
    
    <key>WorkingDirectory</key>
    <string>/usr/local/etc</string>
</dict>
</plist>
```

**Service Commands**:

```bash
# Load service (start on boot)
sudo launchctl load /Library/LaunchDaemons/com.caddyserver.caddy.plist

# Start service
sudo launchctl start com.caddyserver.caddy

# Stop service
sudo launchctl stop com.caddyserver.caddy

# Reload configuration
caddy reload --config /usr/local/etc/Caddyfile

# Check status
sudo launchctl list | grep caddy
```

---

## Monitoring & Logging

### Access Logs

Caddy logs to `/var/log/caddy/`:

- `nexus-access.log` - Main API traffic
- `probe-access.log` - Worker status requests
- `forge-access.log` - Analytics queries
- `gateway-access.log` - Public API usage
- `templar-access.log` - Dashboard access

**Log Format** (JSON):

```json
{
  "ts": 1234567890.123,
  "request": {
    "method": "GET",
    "uri": "/api/v1/price/BTC",
    "remote_addr": "1.2.3.4"
  },
  "status": 200,
  "duration": 0.123
}
```

### Log Rotation

```bash
# Using macOS newsyslog
# Add to /etc/newsyslog.conf:
/var/log/caddy/*.log    644  7    *    @T00  GZ
```

### Real-Time Monitoring

```bash
# Watch access logs
tail -f /var/log/caddy/nexus-access.log | jq

# Monitor all Caddy logs
multitail /var/log/caddy/*.log

# Check Caddy metrics
curl localhost:2019/metrics
```

---

## Performance Tuning

### Caddy Optimization

```caddy
# In global options
{
    # Increase max header size for large API responses
    max_header_bytes 16384
    
    # Connection timeouts
    timeouts {
        read_body   10s
        read_header 10s
        write       30s
        idle        120s
    }
}
```

### macOS Network Tuning

```bash
# Increase connection limits
sudo sysctl -w kern.maxfiles=65536
sudo sysctl -w kern.maxfilesperproc=32768

# TCP tuning
sudo sysctl -w net.inet.tcp.mssdflt=1460
sudo sysctl -w net.inet.tcp.sendspace=65536
sudo sysctl -w net.inet.tcp.recvspace=65536

# Make permanent (add to /etc/sysctl.conf)
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Certificate Renewal Fails

```bash
# Check Caddy logs
tail -f /var/log/caddy/stderr.log

# Ensure DNS is correct
dig nexus.hayven.xyz

# Test renewal manually
caddy reload --config /usr/local/etc/Caddyfile
```

#### Issue 2: Port Already in Use

```bash
# Find process using port 80 or 443
sudo lsof -i :80
sudo lsof -i :443

# Kill the process
sudo kill -9 [PID]
```

#### Issue 3: Reverse Proxy Not Working

```bash
# Test backend directly
curl http://localhost:3000/api/health

# Check Caddy config syntax
caddy validate --config /usr/local/etc/Caddyfile

# Enable debug logging
caddy run --config /usr/local/etc/Caddyfile --debug
```

---

## Security Checklist

- [ ] Firewall enabled (macOS + PF)
- [ ] Only ports 80/443 exposed to internet
- [ ] Let's Encrypt SSL/TLS active
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] API key authentication on sensitive endpoints
- [ ] Access logs enabled
- [ ] Brute force protection (PF table)
- [ ] Regular security updates (Caddy, macOS)

---

*"The network is secured. All gateways operational. En Taro Tassadar!"*
