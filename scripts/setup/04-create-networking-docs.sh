#!/bin/bash

# Project Chrono - Networking Documentation Setup
# Script 4 of 6: Create networking and Caddy configuration docs
# Phase 2c
# 
# "Establishing warp network. All gateways online."

set -e  # Exit on any error

echo "🌐 PROJECT CHRONO - NETWORKING DOCUMENTATION"
echo "============================================"
echo ""

# Color output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create Networking Documentation
echo -e "${BLUE}Creating networking documentation...${NC}"

cat > docs/architecture/networking.md << 'EOF'
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
EOF

echo -e "${GREEN}✓ Networking documentation created${NC}"
echo ""

# Create Data Flow Documentation
echo -e "${BLUE}Creating data flow documentation...${NC}"

cat > docs/architecture/data-flow.md << 'EOF'
# Data Flow Architecture - Project Chrono

*"From edge to core to blockchain. The path of data through the Khala."*

---

## Overview

This document details how data flows through Project Chrono's architecture, from initial price collection at the edge to final FTSO submission on the Flare Network.

---

## Flow 1: Real-Time Price Collection

### Step-by-Step Flow

```
1. Cloudflare Worker (Edge)
   └─> Poll exchange API every 30 seconds
   └─> Normalize: { symbol, price, volume, timestamp, source }
   └─> POST to nexus.hayven.xyz/internal/ingest

2. Caddy Reverse Proxy
   └─> Authenticate internal request
   └─> Forward to Bun API (localhost:3000)

3. Bun API Server
   └─> Validate payload schema
   └─> Enrich with metadata
   └─> INSERT into PostgreSQL (price_feeds table)
   └─> PUBLISH to Redis channel "prices"

4. Redis Pub/Sub
   └─> Broadcast to all WebSocket subscribers

5. WebSocket Server (Bun)
   └─> Receive from Redis
   └─> Push to connected clients (SvelteKit UI)

6. SvelteKit Dashboard
   └─> Update UI in real-time
   └─> Display latest price feed
```

### Data Transformation

**Worker Output**:
```json
{
  "symbol": "BTC/USD",
  "price": 45123.45,
  "volume": 123.456,
  "timestamp": "2025-10-04T12:00:00Z",
  "source": "coinbase"
}
```

**After API Enrichment**:
```json
{
  "id": "uuid-here",
  "symbol": "BTC/USD",
  "price": 45123.45,
  "volume": 123.456,
  "timestamp": "2025-10-04T12:00:00Z",
  "source": "coinbase",
  "ingested_at": "2025-10-04T12:00:01Z",
  "worker_id": "worker-1",
  "metadata": {
    "exchange_timestamp": "2025-10-04T11:59:58Z",
    "api_latency_ms": 45
  }
}
```

---

## Flow 2: Price Aggregation & Consensus

### Step-by-Step Flow

```
1. Scheduler (Cron/Tokio)
   └─> Trigger every 90 seconds (FTSO epoch)

2. Bun Orchestrator
   └─> Query PostgreSQL: SELECT prices WHERE timestamp > NOW() - INTERVAL '3 minutes'
   └─> Group by symbol
   └─> POST to Rust Engine: forge.hayven.xyz/aggregate

3. Rust Aggregation Engine
   └─> Calculate VWAP (Volume-Weighted Average Price)
   └─> Calculate TWAP (Time-Weighted Average Price)
   └─> Calculate weighted median
   └─> Run ML anomaly detection
   └─> Determine consensus price (multi-algorithm voting)
   └─> Return aggregated price

4. Bun API
   └─> Receive aggregated price from Rust
   └─> INSERT into aggregated_prices table
   └─> SET in Redis: price:BTC:latest (5-min TTL)
   └─> Return to scheduler

5. FTSO Submission Preparation
   └─> Price ready for blockchain submission
```

### Aggregation Algorithm

**Input** (from PostgreSQL):
```json
[
  { "source": "coinbase", "price": 45120, "volume": 100, "timestamp": "12:00:00" },
  { "source": "binance", "price": 45125, "volume": 150, "timestamp": "12:00:15" },
  { "source": "kraken", "price": 45118, "volume": 80, "timestamp": "12:00:30" }
]
```

**Rust Processing**:
```rust
// VWAP Calculation
total_value = Σ(price × volume) = (45120×100) + (45125×150) + (45118×80)
total_volume = Σ(volume) = 100 + 150 + 80 = 330
vwap = total_value / total_volume = 45121.82

// Anomaly Detection
if |price - median| > 3×std_dev { flag_as_outlier() }

// Consensus
consensus_price = weighted_vote([vwap, twap, median])
```

**Output**:
```json
{
  "symbol": "BTC/USD",
  "consensus_price": 45121.82,
  "confidence": 0.95,
  "sources_used": 3,
  "algorithm": "weighted_consensus",
  "timestamp": "2025-10-04T12:01:30Z"
}
```

---

## Flow 3: FTSO Blockchain Submission

### Step-by-Step Flow

```
1. Epoch Timer
   └─> Trigger at FTSO epoch boundary (every 90s)

2. Blockchain Module (Rust)
   └─> Fetch consensus price from Redis/DB
   └─> Format for FTSO contract
   └─> Prepare transaction data

3. Hardware Wallet (Ledger)
   └─> Load private key (never touches disk)
   └─> Sign transaction
   └─> Return signed transaction

4. RPC Client (Rust)
   └─> Submit to Flare Network RPC
   └─> Monitor transaction hash
   └─> Wait for confirmation

5. Confirmation Handler
   └─> Transaction confirmed
   └─> INSERT into submissions_log
   └─> Update success metrics
   └─> If failed: Retry logic

6. Reward Monitoring (Scheduled)
   └─> Query FTSO contract for rewards
   └─> Calculate earned FLR
   └─> Auto-claim if threshold met
```

### Transaction Flow

**FTSO Submission Payload**:
```rust
struct FTSOSubmission {
    epoch_id: u64,
    prices: Vec<PriceData>,
    timestamp: u64,
    signature: Vec<u8>,
}

// Price data format
struct PriceData {
    symbol: String,      // "BTC"
    price: u128,         // 45121820000 (8 decimals)
    confidence: u8,      // 95 (0-100)
}
```

**Gas Optimization**:
- Batch multiple symbols in one transaction
- Dynamic gas price based on network congestion
- Target: <$0.10 per submission

---

## Flow 4: WebSocket Real-Time Updates

### Step-by-Step Flow

```
1. Client Connection
   └─> SvelteKit opens WebSocket: wss://nexus.hayven.xyz/ws
   └─> Caddy upgrades connection
   └─> Routes to Bun WebSocket server

2. Subscription
   └─> Client sends: { "action": "subscribe", "symbols": ["BTC", "ETH"] }
   └─> Server stores subscription in memory

3. Price Update (triggered by Redis)
   └─> Redis: PUBLISH prices { ... }
   └─> Bun WebSocket server receives
   └─> Filter by client subscriptions
   └─> Send to subscribed clients only

4. Client Receives
   └─> { "type": "price_update", "data": { ... } }
   └─> SvelteKit updates UI
   └─> Chart updates in real-time
```

### WebSocket Message Protocol

**Client → Server**:
```json
{
  "action": "subscribe",
  "symbols": ["BTC", "ETH", "FLR"],
  "client_id": "uuid"
}
```

**Server → Client** (Price Update):
```json
{
  "type": "price_update",
  "data": {
    "symbol": "BTC/USD",
    "price": 45121.82,
    "change_24h": 2.5,
    "timestamp": "2025-10-04T12:01:30Z"
  }
}
```

**Server → Client** (FTSO Submission):
```json
{
  "type": "ftso_submission",
  "data": {
    "epoch": 12345,
    "status": "confirmed",
    "tx_hash": "0x...",
    "gas_used": 45000
  }
}
```

---

## Flow 5: API Request Handling

### Public API Request Flow

```
1. Client Request
   └─> GET gateway.hayven.xyz/api/v1/price/BTC
   └─> Include: X-API-Key header

2. Caddy
   └─> Apply rate limit (30 req/min)
   └─> Check CORS headers
   └─> Forward to Bun API

3. Bun API
   └─> Validate API key
   └─> Check Redis cache: GET price:BTC:latest

4a. Cache Hit
   └─> Return cached price (sub-ms response)

4b. Cache Miss
   └─> Query PostgreSQL
   └─> Calculate on-demand (if no recent aggregation)
   └─> Cache result (5-min TTL)
   └─> Return price

5. Response
   └─> JSON with price data
   └─> Headers: rate limit info
```

### Response Format

```json
{
  "symbol": "BTC/USD",
  "price": 45121.82,
  "timestamp": "2025-10-04T12:01:30Z",
  "sources": 3,
  "confidence": 0.95,
  "cache": {
    "hit": true,
    "ttl_seconds": 287
  },
  "rate_limit": {
    "limit": 30,
    "remaining": 25,
    "reset_at": "2025-10-04T12:02:00Z"
  }
}
```

---

## Data Storage Strategy

### Hot Data (Redis - 5 min TTL)
- Latest aggregated prices
- Active WebSocket sessions
- Rate limit counters

### Warm Data (PostgreSQL - Recent)
- Last 7 days: Uncompressed, fast queries
- Used for real-time aggregation

### Cold Data (PostgreSQL + TimescaleDB - Compressed)
- 7 days to 2 years: Compressed, slower queries
- Used for historical analysis, backtesting

### Archive (Future - S3-compatible)
- >2 years: Compressed archives
- Used for long-term analysis only

---

## Performance Characteristics

### Latency Targets

| Flow | Target | Typical |
|------|--------|---------|
| Worker → API | <100ms | 45ms |
| API → Database Insert | <50ms | 20ms |
| Redis Pub/Sub | <10ms | 3ms |
| WebSocket Push | <50ms | 15ms |
| Price Aggregation | <10ms | 7ms |
| FTSO Submission | <5s | 2.5s |
| API Response (cached) | <50ms | 5ms |
| API Response (uncached) | <200ms | 85ms |

### Throughput

- **Price Ingestion**: 100 prices/second (3 exchanges × 30 symbols)
- **WebSocket Updates**: 1000 concurrent connections
- **API Requests**: 500 req/second sustained
- **Aggregation**: 10,000 calculations/second (Rust)

---

*"The data flows. The Khala unites all. En Taro Tassadar!"*
EOF

echo -e "${GREEN}✓ Data flow documentation created${NC}"
echo ""

# Summary
echo ""
echo "=============================================="
echo -e "${GREEN}✨ PHASE 2C COMPLETE - NETWORKING DOCS ✨${NC}"
echo "=============================================="
echo ""
echo "Created:"
echo "  ✓ Networking & Caddy configuration (docs/architecture/networking.md)"
echo "  ✓ Data flow architecture (docs/architecture/data-flow.md)"
echo ""
echo "Next steps:"
echo "  1. Review Caddy configuration"
echo "  2. Continue with Phase 2d (Setup Guides)"
echo "  3. Then Phase 2e (Business Spreadsheets)"
echo ""
echo -e "${BLUE}Warp network established. All gateways operational!${NC}"
echo ""