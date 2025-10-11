# CHRONO-003: Mac Mini M4 Pro Setup

_"Constructing the Nexus. All systems shall be operational."_

---

## Context & Requirements

### Why This Exists

Project Chrono requires a fully configured development environment on the Mac Mini M4 Pro to develop, test, and eventually run the FTSO oracle. This specification documents the automated setup process that installs all required tools and services natively on macOS without Docker or virtualization.

### What It Must Do

**Functional Requirements**:

- Install Rust 1.90+ with cargo, clippy, and rustfmt
- Install Bun 1.2+ as the JavaScript/TypeScript runtime
- Install PostgreSQL 16+ with TimescaleDB extension
- Install Redis 8+ for caching and pub/sub
- Configure all services to run automatically via Homebrew services
- Set up development database `project_chrono_dev`
- Integrate with user's existing modular zsh configuration
- Install and configure pre-commit hooks (Husky + lint-staged)

**Non-Functional Requirements**:

- Performance: Native installation (no virtualization overhead)
- Usability: Fully automated, non-interactive installation
- Reliability: Idempotent script that can be re-run safely
- Maintainability: Modular shell configuration that integrates with existing setup

### Constraints

- **Technical**: macOS only (designed for Mac Mini M4 Pro, ARM64 architecture)
- **Technical**: Must work with user's custom modular zsh configuration in `~/.config/zsh/`
- **Business**: Quick setup time (< 30 minutes for all installations)

---

## Technical Architecture

### System Design

The Mac Mini M4 Pro serves as the primary development and eventually production environment for Project Chrono. All components run natively on macOS to maximize performance on the ARM64 architecture.

**Stack Architecture**:

- **Systems Layer**: Rust for high-performance oracle logic, data processing
- **Application Layer**: Bun/TypeScript for API server, workers, dashboard
- **Data Layer**: PostgreSQL with TimescaleDB for time-series data, Redis for caching
- **Development Layer**: Git, GitHub CLI, pre-commit hooks for code quality

### Setup Flow

1. **Homebrew Installation**: Package manager for macOS
2. **Runtime Installation**: Rust (via rustup), Bun (via curl installer)
3. **Database Installation**: PostgreSQL 16 (via Homebrew), TimescaleDB extension
4. **Cache Installation**: Redis (via Homebrew)
5. **Service Configuration**: Start services, create database, enable extensions
6. **Shell Integration**: Create modular zsh configs in `~/.config/zsh/configs/tools/`
7. **Project Setup**: Install Node.js dependencies, set up pre-commit hooks

### Dependencies

- **Requires**: CHRONO-002 (repository structure and documentation)
- **Blocks**: CHRONO-004+ (all future development requires working dev environment)

---

## Implementation Details

### Technology Stack

- **Shell Scripting**: Bash for automation (`dev-setup-auto.sh`)
- **Package Managers**: Homebrew (system packages), rustup (Rust), curl installers (Bun)
- **Runtime Environments**:
  - Rust 1.90+ (systems programming)
  - Bun 1.2+ (JavaScript/TypeScript runtime)
- **Databases**: PostgreSQL 16.10, TimescaleDB extension, Redis 8.2.2
- **Development Tools**: Git, GitHub CLI, jq, cmake

### Installation Scripts

**Main Setup Script**: `scripts/helpers/dev-setup-auto.sh`

**Key Features**:

- Non-interactive automated installation
- Idempotent (safe to re-run)
- Color-coded progress output
- Error handling with `set -euo pipefail`
- Service health verification
- Automatic PATH configuration

**Installation Steps**:

1. Check/install Homebrew
2. Install Rust via rustup with stable toolchain
3. Install Bun via curl installer
4. Install PostgreSQL 16 and start service
5. Install Redis and start service
6. Install development tools (git, gh, jq)
7. Install Rust components (clippy, rustfmt)
8. Install TimescaleDB extension (optional)
9. Configure shell environment (modular zsh configs)
10. Initialize database and create `project_chrono_dev`
11. Test Redis connection
12. Install Node.js dependencies with `bun install`

### Shell Configuration Structure

**Modular Zsh Integration**:

- `~/.config/zsh/configs/tools/bun.zsh` - Bun runtime configuration
- `~/.config/zsh/configs/tools/rust.zsh` - Rust/Cargo configuration
- `~/.config/zsh/configs/tools/postgresql.zsh` - PostgreSQL with convenience aliases
- `~/.config/zsh/configs/tools/redis.zsh` - Redis with convenience aliases

**Design Pattern**: Each tool gets its own config file that can be independently managed

### Database Configuration

**PostgreSQL Setup**:

- Version: 16.10 (arm64)
- Database: `project_chrono_dev`
- Extensions: TimescaleDB (optional, for time-series optimization)
- Service: Managed by Homebrew services
- Path: `/opt/homebrew/opt/postgresql@16/bin`

**Redis Setup**:

- Version: 8.2.2
- Default port: 6379
- Service: Managed by Homebrew services
- Use: Caching, pub/sub messaging

### Shell Aliases Created

**PostgreSQL aliases** (`~/.config/zsh/configs/tools/postgresql.zsh`):

```bash
pg_start       # Start PostgreSQL service
pg_stop        # Stop PostgreSQL service
pg_restart     # Restart PostgreSQL service
pg_status      # Show PostgreSQL service status
```

**Redis aliases** (`~/.config/zsh/configs/tools/redis.zsh`):

```bash
redis_start    # Start Redis service
redis_stop     # Stop Redis service
redis_restart  # Restart Redis service
redis_status   # Show Redis service status
redis_cli      # Launch Redis CLI
```

---

## Error Handling

### Common Setup Issues

1. **Scenario**: Bun not in PATH after installation
   - **Detection**: `command not found: bun` after installation
   - **Handling**: Script adds to shell RC file, user must restart shell or source config
   - **Resolution**: Run `source ~/.zshrc` or restart terminal

2. **Scenario**: PostgreSQL service fails to start
   - **Detection**: `brew services start postgresql@16` shows error
   - **Handling**: Script waits 3 seconds after start before testing connection
   - **Resolution**: Check logs at `/opt/homebrew/var/log/postgresql@16.log`

3. **Scenario**: Package.json workspaces not found
   - **Detection**: `bun install` fails with workspace errors
   - **Handling**: Workspaces array emptied (will be populated when code exists)
   - **Resolution**: Normal for initial setup before creating TypeScript packages

4. **Scenario**: Modular zsh config conflicts
   - **Detection**: Duplicate PATH entries or command conflicts
   - **Handling**: Manual cleanup of duplicate entries from main `.zshrc`
   - **Resolution**: Keep tool configs in `~/.config/zsh/configs/tools/*.zsh` only

### Script Safety Features

- **Platform Check**: Exits if not running on macOS (Darwin)
- **Idempotency**: Checks if tools exist before installing
- **Error Propagation**: Uses `set -euo pipefail` to fail fast on errors
- **Service Verification**: Tests connections after starting services

---

## Performance Requirements

### Setup Time Targets

- **Homebrew Installation**: ~2 minutes (if not already installed)
- **Rust Installation**: ~5 minutes (compile toolchain)
- **Bun Installation**: ~30 seconds
- **PostgreSQL + TimescaleDB**: ~3 minutes
- **Redis**: ~1 minute
- **Total Setup Time**: ~15-20 minutes (fresh install), ~5 minutes (partial)

### Resource Utilization

- **Disk Space**: ~2 GB for all tools and dependencies
- **Build Artifacts**: ~500 MB (Rust compilation cache)
- **Running Services**: PostgreSQL (~100 MB RAM), Redis (~50 MB RAM)

### Optimization Strategies

- Native ARM64 binaries for maximum performance on M4 Pro
- No Docker/virtualization overhead
- Services managed by Homebrew for automatic restart on boot
- Connection pooling in PostgreSQL configuration (configured later)

### Verification

See `docs/tests/CHRONO-003-tests.md` for verification steps

---

## Security Considerations

### Installation Security

- **Homebrew**: Official installer from GitHub, uses HTTPS
- **Rust**: Official rustup installer with TLS 1.2+
- **Bun**: Official installer from bun.sh, uses HTTPS
- **Package Verification**: Homebrew verifies checksums, rustup verifies signatures

### Database Security

- **PostgreSQL**: Listening on localhost only by default
- **Redis**: No external access, localhost binding only
- **Credentials**: No passwords set in development (localhost only)
- **Production**: See `docs/setup/mac-mini-setup.md` for hardening

### Secrets Management

- **Shell Configs**: No secrets stored in zsh config files
- **Environment Variables**: `.env` file for project secrets (gitignored)
- **Future**: Proper secrets management via encrypted store or vault

### Development Security

- **Pre-commit Hooks**: Prevent committing sensitive files
- **.gitignore**: Excludes `.env`, credentials, private keys
- **Husky**: Runs lint-staged to catch issues before commit

---

## Testing Requirements

### Manual Verification (Infrastructure Ticket)

- [x] Homebrew installed and accessible (`brew --version`)
- [x] Rust installed with correct version (`rustc --version` shows 1.90+)
- [x] Cargo installed and working (`cargo --version`)
- [x] Bun installed and in PATH (`bun --version` shows 1.2+)
- [x] PostgreSQL installed (`psql --version` shows 16.10)
- [x] PostgreSQL service running (`brew services list | grep postgresql`)
- [x] Database `project_chrono_dev` created
- [x] TimescaleDB extension available (optional)
- [x] Redis installed and running (`redis-cli ping` returns PONG)
- [x] Git configured (`git --version`)
- [x] GitHub CLI authenticated (`gh --version`)
- [x] Zsh configs created in `~/.config/zsh/configs/tools/`
- [x] No duplicate PATH entries in `.zshrc`
- [x] `bun install` succeeds (dependencies installed)
- [x] Pre-commit hooks functional (`git commit` runs lint-staged)
- [x] Husky updated to v9+ format (no deprecation warnings)

### Idempotency Test

- [ ] Run `./scripts/helpers/dev-setup-auto.sh` a second time
- [ ] Verify: No errors, skips already-installed tools
- [ ] Verify: No duplicate shell config entries created

---

## Acceptance Criteria

**This feature is complete when**:

1. ✅ All required tools installed (Rust, Bun, PostgreSQL, Redis)
2. ✅ All services running and verified healthy
3. ✅ Development database created and accessible
4. ✅ Modular zsh configuration integrated without conflicts
5. ✅ Node.js dependencies installed successfully
6. ✅ Pre-commit hooks configured and working
7. ✅ Setup script is idempotent (can be re-run safely)
8. ✅ Documentation updated with actual implementation
9. ✅ Ready for CHRONO-004 and beyond

**Developer Perspective**:
"As a developer, I should be able to run `./scripts/helpers/dev-setup-auto.sh` on a fresh Mac Mini M4 Pro and have a fully working development environment in under 30 minutes, with all tools properly configured and accessible in my shell."

**Verification**:

```bash
# All these commands should work without errors:
rustc --version
cargo --version
bun --version
psql -d project_chrono_dev -c "SELECT version();"
redis-cli ping
pg_status    # Custom alias
redis_status # Custom alias
```

---

## Reference Materials

### Documentation

- **Homebrew**: https://brew.sh/
- **Rust**: https://www.rust-lang.org/tools/install
- **Bun**: https://bun.sh/docs/installation
- **PostgreSQL**: https://www.postgresql.org/docs/16/
- **TimescaleDB**: https://docs.timescale.com/
- **Redis**: https://redis.io/docs/

### Related Specifications

- Depends on: `docs/specs/CHRONO-002-repo-structure.md` (repository structure)
- Related: `docs/setup/mac-mini-setup.md` (comprehensive setup guide with production hardening)
- Blocks: All future CHRONO tickets (requires working dev environment)

### Implementation Files

- **Setup Script**: `scripts/helpers/dev-setup-auto.sh` (automated installer)
- **Manual Script**: `scripts/helpers/dev-setup.sh` (interactive version)
- **Zsh Configs**:
  - `~/.config/zsh/configs/tools/bun.zsh`
  - `~/.config/zsh/configs/tools/rust.zsh`
  - `~/.config/zsh/configs/tools/postgresql.zsh`
  - `~/.config/zsh/configs/tools/redis.zsh`

### Decision Log

- **2025-10-07**: Use native macOS installation (no Docker) → Maximizes M4 Pro performance
- **2025-10-07**: Modular zsh configs → Integrates with existing user configuration pattern
- **2025-10-07**: Empty package.json workspaces → Will populate when TypeScript code exists
- **2025-10-07**: Bypass markdown lint for setup commit → User preference to not fix until implementation exists
- **2025-10-07**: Update Husky to v9+ format → Removes deprecated boilerplate

---

_"The Nexus is constructed. All warriors may now report for duty. En Taro Tassadar!"_
