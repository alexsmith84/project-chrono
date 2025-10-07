# Production Deployment Setup - Project Chrono

*"Construct the Nexus with precision. Every component must align."*

---

## Overview

This guide covers setting up Project Chrono's production environment on a Mac Mini M4 Pro for FTSO oracle operations.

**Target Hardware**: Mac Mini M4 Pro (Apple Silicon)
**Operating System**: macOS Sequoia (15.x)
**Architecture**: Hybrid edge (Cloudflare Workers) + self-hosted (Mac Mini)

---

## Prerequisites

### Hardware
- Mac Mini M4 Pro (10-core CPU, 16GB RAM minimum)
- Reliable internet connection (>=100 Mbps)
- UPS for power protection
- External SSD for backups (optional but recommended)

### Accounts
- GitHub account with access to project-chrono repository
- Cloudflare account (for Workers)
- Flare Network wallet with FLR for FTSO submissions

### Knowledge
- Basic macOS terminal usage
- Understanding of git and deployment workflows
- Familiarity with database administration

---

## Phase 1: System Preparation

### Step 1: macOS Configuration

```bash
# Update macOS
softwareupdate --install --all

# Install Xcode Command Line Tools
xcode-select --install

# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Step 2: System Security

```bash
# Enable FileVault (disk encryption)
# System Settings → Privacy & Security → FileVault → Turn On

# Enable Firewall
# System Settings → Network → Firewall → Turn On

# Disable remote access (unless needed)
# System Settings → General → Sharing → Disable all
```

### Step 3: Power Settings

```bash
# Never sleep (critical for 24/7 operation)
sudo pmset -a sleep 0
sudo pmset -a disablesleep 1
sudo pmset -a hibernatemode 0

# Restart automatically after power failure
sudo pmset -a autorestart 1

# Disable display sleep (optional)
sudo pmset -a displaysleep 0
```

---

## Phase 2: Core Dependencies

### Step 1: Programming Languages

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Verify Rust installation
rustc --version
cargo --version

# Install Bun (TypeScript runtime)
curl -fsSL https://bun.sh/install | bash

# Verify Bun installation
bun --version

# Install Deno (for sandboxed operations)
curl -fsSL https://deno.land/install.sh | sh

# Add to PATH (if not automatic)
export PATH="$HOME/.deno/bin:$PATH"
```

### Step 2: Database Systems

```bash
# Install PostgreSQL
brew install postgresql@16
brew services start postgresql@16

# Install TimescaleDB extension
brew tap timescale/tap
brew install timescaledb
timescaledb-tune --quiet --yes

# Install Redis
brew install redis
brew services start redis

# Verify services running
brew services list
```

### Step 3: Web Server

```bash
# Install Caddy
brew install caddy

# Verify installation
caddy version
```

---

## Phase 3: Project Setup

### Step 1: Clone Repository

```bash
# Create projects directory
mkdir -p ~/projects
cd ~/projects

# Clone repository
git clone git@github.com:alexsmith84/project-chrono.git
cd project-chrono

# Checkout production branch
git checkout khala
```

### Step 2: Install Dependencies

```bash
# Install Rust dependencies
cargo build --release

# Install TypeScript dependencies
bun install

# Install frontend dependencies
cd apps/dashboard
bun install
cd ../..
```

### Step 3: Environment Configuration

```bash
# Copy environment template
cp .env.example .env.production

# Edit production configuration
nano .env.production
```

**Required environment variables:**
```bash
# Database
DATABASE_URL=postgresql://chrono:password@localhost/project_chrono_prod
REDIS_URL=redis://localhost:6379

# Flare Network
FLARE_RPC_URL=https://flare-api.flare.network/ext/bc/C/rpc
FLARE_PRIVATE_KEY=<your-hardware-wallet-connected-key>

# API Configuration
API_PORT=3000
API_HOST=0.0.0.0

# Cloudflare
CLOUDFLARE_API_TOKEN=<your-token>
CLOUDFLARE_ACCOUNT_ID=<your-account-id>

# Monitoring
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001

# Environment
NODE_ENV=production
RUST_LOG=info
```

**Security note**: Never commit `.env.production` to git!

---

## Phase 4: Database Initialization

### Step 1: Create Database

```bash
# Create PostgreSQL user
createuser -P chrono
# Enter password when prompted

# Create database
createdb -O chrono project_chrono_prod

# Enable TimescaleDB extension
psql -U chrono -d project_chrono_prod -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"
```

### Step 2: Run Migrations

```bash
# Run all migrations
./scripts/deployment/run-migrations.sh

# Verify tables created
psql -U chrono -d project_chrono_prod -c "\dt"
```

### Step 3: Seed Initial Data (if needed)

```bash
# Load initial configuration
./scripts/deployment/seed-production.sh
```

---

## Phase 5: Build & Deploy

### Step 1: Build Production Assets

```bash
# Build Rust binaries
cd src/oracle/rust
cargo build --release
cd ../../..

# Build TypeScript services
cd src/api/typescript
bun run build
cd ../../..

# Build frontend
cd apps/dashboard
bun run build
cd ../..
```

### Step 2: Configure Services

Create systemd-style launch agents for macOS:

**File**: `~/Library/LaunchAgents/com.projectchrono.oracle.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.projectchrono.oracle</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/alex/projects/project-chrono/target/release/oracle</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/alex/projects/project-chrono/logs/oracle.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/alex/projects/project-chrono/logs/oracle-error.log</string>
</dict>
</plist>
```

**Load service:**
```bash
launchctl load ~/Library/LaunchAgents/com.projectchrono.oracle.plist
launchctl start com.projectchrono.oracle
```

### Step 3: Configure Caddy

**File**: `/usr/local/etc/Caddyfile`

```
# Main FTSO API
nexus.hayven.xyz {
    reverse_proxy localhost:3000

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000;"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
    }

    # Logging
    log {
        output file /var/log/caddy/nexus.log
    }
}

# Monitoring (internal only)
templar.hayven.xyz {
    reverse_proxy localhost:3001

    # Restrict to local network
    @local {
        remote_ip 192.168.1.0/24
    }
    handle @local {
        reverse_proxy localhost:3001
    }
    handle {
        respond "Forbidden" 403
    }
}
```

**Start Caddy:**
```bash
sudo brew services start caddy
```

---

## Phase 6: Monitoring Setup

### Step 1: Prometheus

```bash
# Install Prometheus
brew install prometheus

# Configure Prometheus
nano /usr/local/etc/prometheus.yml
```

**Basic Prometheus config:**
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'project-chrono'
    static_configs:
      - targets: ['localhost:3000']
```

**Start Prometheus:**
```bash
brew services start prometheus
```

### Step 2: Grafana

```bash
# Install Grafana
brew install grafana

# Start Grafana
brew services start grafana

# Access at http://localhost:3001
# Default credentials: admin/admin
```

---

## Phase 7: Cloudflare Workers

### Step 1: Deploy Workers

```bash
# Navigate to workers directory
cd src/workers/typescript

# Authenticate with Cloudflare
bunx wrangler login

# Deploy workers
bunx wrangler deploy
```

### Step 2: Configure Routes

In Cloudflare dashboard:
- Set up routes for `probe.hayven.xyz`
- Configure worker triggers
- Set environment variables

---

## Phase 8: Backup Configuration

### Step 1: Database Backups

```bash
# Create backup directory
mkdir -p ~/backups/project-chrono

# Add to crontab (every 6 hours)
crontab -e
```

**Crontab entry:**
```
0 */6 * * * /Users/alex/projects/project-chrono/scripts/deployment/backup-database.sh
```

### Step 2: Configuration Backups

```bash
# Backup script backs up:
# - Database dumps
# - Environment configs (encrypted)
# - Caddy configuration
# - Launch agents

./scripts/deployment/backup-now.sh
```

---

## Phase 9: Verification

### Step 1: Health Checks

```bash
# Check all services running
brew services list

# Test API endpoint
curl http://localhost:3000/health

# Expected response: {"status":"ok","services":["database","redis","oracle"]}
```

### Step 2: FTSO Submission Test

```bash
# Dry-run FTSO submission
./scripts/deployment/test-ftso-submission.sh --dry-run

# Monitor logs
tail -f logs/oracle.log
```

### Step 3: Monitoring Verification

- Open Grafana: http://localhost:3001
- Verify metrics being collected
- Set up alert rules
- Test alert notifications

---

## Phase 10: Go Live

### Final Checklist

- [ ] All services running and healthy
- [ ] Database migrations applied
- [ ] Backups configured and tested
- [ ] Monitoring dashboards configured
- [ ] SSL certificates valid (Caddy auto-generates)
- [ ] Firewall rules configured
- [ ] DNS records pointing to server
- [ ] FTSO submissions working
- [ ] Alert notifications working
- [ ] Documentation complete

### Launch

```bash
# Start accepting traffic
sudo brew services restart caddy

# Monitor closely for first 24 hours
tail -f /var/log/caddy/nexus.log
tail -f logs/oracle.log
```

---

## Maintenance

### Regular Tasks

**Daily:**
- Check service health
- Review error logs
- Monitor FTSO submission success rate

**Weekly:**
- Review system resources (CPU, memory, disk)
- Check backup integrity
- Update dependencies (security patches)

**Monthly:**
- Review and rotate logs
- Test disaster recovery procedures
- Update documentation

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
launchctl list | grep chrono
cat ~/projects/project-chrono/logs/oracle-error.log

# Restart service
launchctl unload ~/Library/LaunchAgents/com.projectchrono.oracle.plist
launchctl load ~/Library/LaunchAgents/com.projectchrono.oracle.plist
```

### Database Connection Issues

```bash
# Check PostgreSQL running
brew services list | grep postgresql

# Test connection
psql -U chrono -d project_chrono_prod -c "SELECT version();"

# Check connection limits
psql -U chrono -d project_chrono_prod -c "SHOW max_connections;"
```

### High Resource Usage

```bash
# Check process usage
top -o cpu

# Check disk space
df -h

# Clean up old logs
./scripts/deployment/cleanup-logs.sh
```

---

## Future Enhancements

- [ ] Load balancer for multiple Mac Minis
- [ ] Database replication for high availability
- [ ] Automated failover
- [ ] Performance tuning based on metrics

---

*"The Nexus is complete. Now it serves. En Taro Tassadar!"*
