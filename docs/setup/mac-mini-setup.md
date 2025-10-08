# Mac Mini M4 Pro Setup Guide - Project Chrono

*"Constructing the Nexus. This is our command center."*

---

## Overview

This guide walks through complete Mac Mini M4 Pro configuration for Project Chrono, from initial unboxing to production-ready FTSO oracle.

**Hardware Specs**:

- Mac Mini M4 Pro
- 14-core CPU (10 performance + 4 efficiency)
- 48GB RAM
- 512GB+ SSD
- 500 Mbps internet connection

**Estimated Setup Time**: 4-6 hours (full guide) OR **15-20 minutes** (automated development setup)

---

## Quick Start: Automated Development Setup

**For development environment only** (not for production), use our automated setup script:

```bash
# Clone the repository
git clone https://github.com/alexsmith84/project-chrono.git
cd project-chrono

# Run automated setup (installs Rust, Bun, PostgreSQL, Redis)
./scripts/helpers/dev-setup-auto.sh
```

**What it installs**:
- Homebrew (if not present)
- Rust via rustup (stable toolchain)
- Bun runtime
- PostgreSQL 16 with TimescaleDB
- Redis
- Development tools (git, gh, jq)
- Rust components (clippy, rustfmt)
- Configures services to auto-start

**Documentation**:
- Specification: `docs/specs/CHRONO-003-mac-mini-m4-pro-setup.md`
- Implementation Guide: `docs/implementation/CHRONO-003-guide.md`
- Test Verification: `docs/tests/CHRONO-003-tests.md`

**Note**: For production deployment with full security hardening, monitoring, and networking setup, continue with the phases below.

---

## Phase 1: Initial macOS Setup

### Step 1: First Boot Configuration

1. **Power on** Mac Mini
2. **Select language** and region
3. **Connect to WiFi** (or Ethernet - recommended for oracle)
4. **Create admin account**:
   - Username: `chrono-admin` (or your preference)
   - Password: Strong password (save in password manager)
   - Enable FileVault encryption: **YES**

5. **Skip Apple ID** (optional for oracle server)
6. **Disable analytics sharing**
7. **Complete setup wizard**

### Step 2: System Preferences Configuration

```bash
# Disable sleep (critical for 24/7 operation)
sudo pmset -a displaysleep 0
sudo pmset -a sleep 0
sudo pmset -a disksleep 0

# Prevent automatic restarts
sudo pmset -a autorestart 0

# Disable wake for network access (can cause issues)
sudo pmset -a womp 0

# Check power settings
pmset -g
```

**System Settings**:

- **Energy Saver**: Never sleep, prevent automatic restart
- **Sharing**:
  - Enable "Remote Login" (SSH)
  - Computer name: `project-chrono-nexus`
- **Security**:
  - FileVault: ON
  - Firewall: ON (will configure later)
  - Allow apps from App Store and identified developers

### Step 3: Network Configuration

**Static IP (Recommended)**:

1. System Settings → Network → Ethernet (or WiFi)
2. Click "Details"
3. TCP/IP tab → Configure IPv4: Manually
4. IP Address: `192.168.1.100` (or your network's available IP)
5. Subnet Mask: `255.255.255.0`
6. Router: `192.168.1.1` (your router IP)
7. DNS: `1.1.1.1, 1.0.0.1` (Cloudflare DNS)

**Port Forwarding (on your router)**:

- Forward ports 80, 443 → Mac Mini IP (192.168.1.100)

---

## Phase 2: Development Tools Installation

### Step 1: Install Homebrew

```bash
# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Add to PATH
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"

# Verify
brew --version
```

### Step 2: Install Core Development Tools

```bash
# Git
brew install git
git config --global user.name "alexsmith84"
git config --global user.email "your-email@example.com"

# GitHub CLI
brew install gh
gh auth login  # Follow prompts

# Essential CLI tools
brew install curl wget jq htop tree

# Install oh-my-zsh (optional but recommended)
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

### Step 3: Install Language Runtimes

**Rust**:

```bash
# Install Rust via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add to PATH (if not auto-added)
source $HOME/.cargo/env

# Verify
rustc --version
cargo --version

# Install useful tools
cargo install cargo-watch cargo-edit
```

**Bun** (TypeScript runtime):

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Add to PATH
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.zprofile
source ~/.zprofile

# Verify
bun --version
```

**Deno** (for secure configs):

```bash
# Install Deno
curl -fsSL https://deno.land/install.sh | sh

# Add to PATH
echo 'export DENO_INSTALL="$HOME/.deno"' >> ~/.zprofile
echo 'export PATH="$DENO_INSTALL/bin:$PATH"' >> ~/.zprofile
source ~/.zprofile

# Verify
deno --version
```

**Node.js** (backup/compatibility):

```bash
# Install via Homebrew
brew install node

# Verify
node --version
npm --version
```

---

## Phase 3: Database Setup

### PostgreSQL + TimescaleDB

```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Create database user
createuser -s chrono_admin

# Create database
createdb -O chrono_admin project_chrono

# Install TimescaleDB extension
brew tap timescale/tap
brew install timescaledb

# Run setup script
timescaledb-tune --quiet --yes

# Restart PostgreSQL
brew services restart postgresql@15

# Connect and enable extension
psql -d project_chrono -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"

# Verify
psql -d project_chrono -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'timescaledb';"
```

**PostgreSQL Configuration** (`/opt/homebrew/var/postgresql@15/postgresql.conf`):

```conf
# Connection settings
max_connections = 100
shared_buffers = 4GB          # 25% of RAM
effective_cache_size = 12GB   # 50% of RAM
maintenance_work_mem = 1GB
work_mem = 64MB

# WAL settings (for better write performance)
wal_buffers = 16MB
checkpoint_completion_target = 0.9

# TimescaleDB settings
timescaledb.max_background_workers = 8
```

### Redis

```bash
# Install Redis
brew install redis

# Start Redis service
brew services start redis

# Test connection
redis-cli ping
# Should return: PONG

# Set password (production)
redis-cli
> CONFIG SET requirepass "your-strong-redis-password"
> AUTH your-strong-redis-password
> SAVE
> EXIT

# Verify
redis-cli -a your-strong-redis-password ping
```

**Redis Configuration** (`/opt/homebrew/etc/redis.conf`):

```conf
# Security
requirepass your-strong-redis-password
bind 127.0.0.1

# Persistence
save 900 1
save 300 10
save 60 10000

# Memory
maxmemory 2gb
maxmemory-policy allkeys-lru

# Performance
tcp-backlog 511
timeout 0
tcp-keepalive 300
```

---

## Phase 4: Web Server & Reverse Proxy

### Caddy 2 Installation

```bash
# Install Caddy
brew install caddy

# Create config directory
sudo mkdir -p /usr/local/etc/caddy
sudo mkdir -p /var/log/caddy

# Copy Caddyfile from docs
sudo cp docs/architecture/networking.md /usr/local/etc/Caddyfile
# (Extract Caddyfile content from networking.md)

# Set permissions
sudo chown -R $(whoami) /var/log/caddy

# Test configuration
caddy validate --config /usr/local/etc/Caddyfile

# Start Caddy
sudo caddy start --config /usr/local/etc/Caddyfile

# Set up as LaunchDaemon (see networking.md)
```

---

## Phase 5: Security Hardening

### SSH Configuration

```bash
# Generate SSH key (if not exists)
ssh-keygen -t ed25519 -C "project-chrono-nexus"

# Add to authorized_keys
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Configure SSH
sudo nano /etc/ssh/sshd_config
```

**SSH Config** (`/etc/ssh/sshd_config`):

```conf
# Disable password authentication (key-only)
PasswordAuthentication no
ChallengeResponseAuthentication no

# Disable root login
PermitRootLogin no

# Use strong ciphers only
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com
KexAlgorithms curve25519-sha256,diffie-hellman-group-exchange-sha256

# Other security settings
X11Forwarding no
AllowTcpForwarding no
MaxAuthTries 3
```

```bash
# Restart SSH
sudo launchctl stop com.openssh.sshd
sudo launchctl start com.openssh.sshd
```

### Firewall Configuration

```bash
# Enable macOS firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on

# Enable stealth mode
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setstealthmode on

# Allow Caddy
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/caddy
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/caddy

# Configure PF (see networking.md for full config)
sudo nano /etc/pf.conf
# Add rules from docs/architecture/networking.md

# Enable PF
sudo pfctl -e -f /etc/pf.conf
```

### Automatic Security Updates

```bash
# Enable automatic updates
sudo softwareupdate --schedule on

# Check for updates weekly (cron)
(crontab -l 2>/dev/null; echo "0 3 * * 0 softwareupdate --install --all --restart") | crontab -
```

---

## Phase 6: Monitoring Stack

### Prometheus

```bash
# Install Prometheus
brew install prometheus

# Create config
mkdir -p ~/prometheus
cat > ~/prometheus/prometheus.yml << 'PROM'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
  
  - job_name: 'caddy'
    static_configs:
      - targets: ['localhost:2019']
  
  - job_name: 'rust-engine'
    static_configs:
      - targets: ['localhost:8080']
  
  - job_name: 'bun-api'
    static_configs:
      - targets: ['localhost:3000']
  
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']
PROM

# Start Prometheus
brew services start prometheus
```

### Grafana

```bash
# Install Grafana
brew install grafana

# Start Grafana
brew services start grafana

# Access at http://localhost:3002
# Default credentials: admin / admin
```

### Node Exporter (System Metrics)

```bash
# Install node_exporter
brew install node_exporter

# Start service
brew services start node_exporter

# Verify metrics
curl http://localhost:9100/metrics
```

---

## Phase 7: Project Chrono Setup

### Clone Repository

```bash
# Create projects directory
mkdir -p ~/projects
cd ~/projects

# Clone repository
git clone https://github.com/alexsmith84/project-chrono.git
cd project-chrono

# Checkout khala branch (should be default)
git checkout khala
```

### Run Bootstrap Scripts

```bash
# Make executable
chmod +x scripts/setup/*.sh

# Run all setup scripts in order
./scripts/setup/01-create-structure.sh
./scripts/setup/02-create-templates.sh
./scripts/setup/03-create-docs.sh
./scripts/setup/04-create-networking-docs.sh
./scripts/setup/05-create-mac-mini-guide.sh

# Commit
git add .
git commit -m "Complete Mac Mini setup documentation"
```

### Environment Configuration

```bash
# Create .env file
cat > .env << 'ENV'
# Database
DATABASE_URL=postgresql://chrono_admin@localhost:5432/project_chrono
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-strong-redis-password

# Flare Network
FLARE_RPC_URL=https://flare-api.flare.network/ext/C/rpc
WALLET_ADDRESS=0x...

# API Keys
COINBASE_API_KEY=your-key
BINANCE_API_KEY=your-key
KRAKEN_API_KEY=your-key

# Security
JWT_SECRET=generate-secure-random-string
API_MASTER_KEY=generate-secure-random-string

# Monitoring
PROMETHEUS_URL=http://localhost:9090
GRAFANA_URL=http://localhost:3002
ENV

# Secure .env
chmod 600 .env
```

### Install Dependencies

```bash
# Rust dependencies
cargo build

# TypeScript dependencies
bun install

# SvelteKit dependencies
cd apps/dashboard
bun install
cd ../..
```

---

## Phase 8: Hardware Wallet Setup

### Ledger Configuration

```bash
# Install Ledger Live
brew install --cask ledger-live

# Open Ledger Live and set up device
# - Initialize new device or restore from seed
# - Update firmware to latest version
# - Install Ethereum app (for Flare compatibility)

# Test connection
# (Will be done via Rust ethers-rs library in blockchain module)
```

**Security Notes**:

- Never store seed phrase digitally
- Keep recovery phrase in secure physical location (safe, safety deposit box)
- Use device PIN protection
- Enable additional passphrase for extra security

---

## Phase 9: Backup & Recovery

### Automated Backups

```bash
# Create backup script
mkdir -p ~/scripts
cat > ~/scripts/backup-chrono.sh << 'BACKUP'
#!/bin/bash
# Project Chrono Backup Script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=~/backups/chrono

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
pg_dump project_chrono | gzip > $BACKUP_DIR/postgres_$DATE.sql.gz

# Backup Redis
redis-cli -a your-strong-redis-password --rdb $BACKUP_DIR/redis_$DATE.rdb

# Backup config files
tar czf $BACKUP_DIR/config_$DATE.tar.gz \
  ~/projects/project-chrono/.env \
  /usr/local/etc/Caddyfile \
  /opt/homebrew/etc/redis.conf

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.rdb" -mtime +30 -delete

echo "Backup completed: $DATE"
BACKUP

chmod +x ~/scripts/backup-chrono.sh

# Schedule daily backups (3 AM)
(crontab -l 2>/dev/null; echo "0 3 * * * ~/scripts/backup-chrono.sh") | crontab -
```

### Disaster Recovery Plan

**RTO (Recovery Time Objective)**: 15 minutes  
**RPO (Recovery Point Objective)**: 24 hours (daily backups)

**Recovery Steps**:

1. Restore from Time Machine or backups
2. Restore PostgreSQL: `gunzip < postgres_YYYYMMDD.sql.gz | psql project_chrono`
3. Restore Redis: Copy .rdb file to `/opt/homebrew/var/db/redis/dump.rdb`
4. Restore configs: `tar xzf config_YYYYMMDD.tar.gz`
5. Restart services: `brew services restart --all`
6. Verify FTSO submissions resume

---

## Phase 10: Verification & Testing

### System Health Check

```bash
# Check all services
brew services list

# Test database connections
psql -d project_chrono -c "SELECT version();"
redis-cli -a your-strong-redis-password ping

# Test Caddy
curl -I https://nexus.hayven.xyz

# Check monitoring
curl http://localhost:9090/-/healthy  # Prometheus
curl http://localhost:3002/api/health # Grafana
```

### Performance Baseline

```bash
# CPU benchmark
sysctl -n machdep.cpu.brand_string
sysctl -n hw.ncpu

# Disk performance
diskutil info disk0 | grep -i speed

# Network speed test
brew install speedtest-cli
speedtest-cli
```

### Security Audit

```bash
# Check open ports
sudo lsof -iTCP -sTCP:LISTEN -n -P

# Verify firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
sudo pfctl -s rules

# Check for updates
softwareupdate --list
brew outdated
```

---

## Maintenance Checklist

### Daily

- [ ] Check FTSO submission success rate
- [ ] Monitor Grafana dashboards
- [ ] Review error logs

### Weekly

- [ ] Review backup logs
- [ ] Check disk space usage
- [ ] Update dependencies (`brew upgrade`, `cargo update`)

### Monthly

- [ ] macOS security updates
- [ ] Review and rotate logs
- [ ] Database vacuum and analyze
- [ ] Performance tuning review

---

## Troubleshooting

### Issue: Service won't start

```bash
# Check logs
brew services list
tail -f /opt/homebrew/var/log/postgresql@15.log
tail -f /opt/homebrew/var/log/redis.log
```

### Issue: Can't connect to database

```bash
# Check if PostgreSQL is running
brew services info postgresql@15

# Test connection
psql -d project_chrono -U chrono_admin

# Reset if needed
brew services restart postgresql@15
```

### Issue: Out of disk space

```bash
# Check usage
df -h

# Clear logs
sudo rm -rf /var/log/*.log
rm -rf ~/Library/Logs/*

# Clean Homebrew cache
brew cleanup
```

---

*"The Nexus is operational. All systems green. En Taro Tassadar!"*
