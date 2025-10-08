# PROJECT CHRONO - COMPREHENSIVE BLUEPRINT

## Core Architecture & Structure

*"En Taro Tassadar! The Khala guides our development journey."*

---

## Executive Summary

Project Chrono is a high-performance Flare Time Series Oracle (FTSO) implementation featuring a StarCraft 2 Protoss theme and a hybrid edge + self-hosted architecture. Built as a part-time passion project (5-10 hours/week), it combines Rust's performance with TypeScript's ecosystem to deliver accurate cryptocurrency price data to the Flare Network.

### Reality Check

Current FLR token price (~$0.021) means FTSO operations aren't immediately profitable. Break-even requires 50-100M FLR delegated to cover $225-525/month in costs. **This is a learning project** with potential future upside if FLR price recovers or significant market share is achieved.

### Project Goals

- **Primary**: Build production-grade FTSO infrastructure and learn Rust + advanced TypeScript
- **Secondary**: Achieve profitability if FLR market conditions improve
- **Tertiary**: Create reusable oracle patterns for other blockchain networks

### Key Metrics

- **Target Delegation**: 100M+ FLR tokens
- **Accuracy Goal**: Top 25% of FTSO providers
- **Uptime Target**: 99.9% availability
- **Market Share**: 5%+ of total FTSO voting power

---

## Architecture Decisions

### 1. Hybrid Edge + Self-Hosted Approach

**Decision**: Cloudflare Workers for data collection + Mac Mini M4 Pro for core processing

**Rationale**:

- **Cost Optimization**: $70-220/month (MVP) vs $375-1,250/month (pure cloud)
- **Performance**: Native execution on Mac Mini (40% faster than Docker)
- **Geographic Distribution**: Edge workers bypass API geo-restrictions
- **Control**: Self-hosted processing for sensitive blockchain operations

### 2. Multi-Language Stack

**Languages**: Rust + TypeScript/Bun + Deno + SvelteKit

**Division of Labor**:

- **Rust**: Price aggregation (VWAP, TWAP), ML inference, consensus algorithms, blockchain interface
- **TypeScript/Bun**: API server, WebSocket real-time updates, Web3 integrations
- **Deno**: Secure configuration management, sandboxed API calls
- **SvelteKit**: Frontend delegation dashboard

**Why Multi-Language**: Performance-critical price processing needs Rust's speed (handles thousands of price points per minute), while TypeScript provides ecosystem advantages for API and frontend work.

### 3. Database Strategy

**Primary**: PostgreSQL 15 + TimescaleDB extension

**Rationale**:

- **Purpose-Built for Time Series**: 100-1000x faster for time-based queries
- **Compression**: 10-20x better storage efficiency
- **Built-in Policies**: Automated retention and compression
- **Ecosystem**: Better tooling than ClickHouse for initial development

**Schema Optimizations**:

- Hypertables with 1-hour chunks for price_feeds table
- Compression after 7 days, 2-year retention policy
- Indexes optimized for (symbol, timestamp) queries

**Future Consideration**: Add ClickHouse in Growth Phase only if PostgreSQL+TimescaleDB cannot handle scale.

### 4. Security-First Approach

**Core Principles**:

- SSH key-only authentication (no passwords)
- macOS firewall + advanced packet filter (PF) rules
- PostgreSQL SSL connections required
- Redis authentication enabled
- Multi-factor authentication for admin access
- Automated security monitoring and file integrity checks

### 5. Monitoring Philosophy

**Metrics Tracked**:

- **System**: CPU, memory, disk, network utilization
- **FTSO-Specific**: Submission success rate, accuracy score, rewards earned
- **Business**: Delegation amounts, market share, competition tracking

**Alerting Strategy**: Conservative rules for critical issues only (avoid alert fatigue)

---

## Monorepo Structure

Project Chrono uses a **function-first organization** with language separation within each domain:

```
project-chrono/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   └── feature-ticket.md
│   └── workflows/
│       ├── rust-ci.yml
│       ├── typescript-ci.yml
│       └── deploy.yml
│
├── docs/
│   ├── architecture/
│   │   ├── system-design.md
│   │   ├── networking.md              # Caddy configs, domain routing
│   │   ├── data-flow.md
│   │   └── decisions/                 # Architecture Decision Records
│   │       ├── 001-multi-language.md
│   │       ├── 002-timescaledb.md
│   │       └── ...
│   ├── workflow/
│   │   ├── ticket-creation.md
│   │   ├── development-process.md
│   │   └── deployment.md
│   ├── setup/
│   │   ├── mac-mini-setup.md
│   │   ├── cloudflare-workers.md
│   │   └── production-deployment.md
│   ├── specs/
│   │   ├── README.md
│   │   ├── SPEC-TEMPLATE.md
│   │   ├── CHRONO-001-github-projects.md
│   │   ├── CHRONO-002-repo-structure.md
│   │   └── ...
│   ├── implementation/
│   │   ├── README.md
│   │   ├── IMPL-TEMPLATE.md
│   │   ├── CHRONO-001-guide.md
│   │   └── ...
│   ├── tests/
│   │   ├── README.md
│   │   ├── TEST-TEMPLATE.md
│   │   ├── CHRONO-001-tests.md
│   │   └── ...
│   └── business/
│       ├── README.md
│       ├── pnl-model.xlsx
│       ├── delegation-tracking.xlsx
│       ├── ftso-metrics.xlsx
│       └── infrastructure-costs.xlsx
│
├── scripts/
│   ├── reference/                     # Reference implementations from specs
│   │   ├── CHRONO-001-setup.sh
│   │   ├── CHRONO-004-schema.sql
│   │   └── ...
│   ├── setup/
│   │   ├── setup-dev-environment.sh
│   │   ├── setup-github-projects.sh
│   │   └── setup-repo-structure.sh
│   ├── helpers/
│   │   ├── create-ticket-bundle.sh
│   │   ├── validate-spec.sh
│   │   └── dashboard.sh
│   └── deployment/
│       ├── deploy-workers.sh
│       ├── backup-database.sh
│       └── rollback.sh
│
├── src/
│   ├── oracle/                        # Core price processing
│   │   ├── rust/
│   │   │   ├── aggregation/          # VWAP, TWAP, median
│   │   │   ├── consensus/            # Multi-source truth
│   │   │   └── ml/                   # Anomaly detection
│   │   └── typescript/
│   │       └── orchestrator/         # Coordinates Rust modules
│   │
│   ├── api/                          # REST/WebSocket API
│   │   └── typescript/
│   │       ├── routes/
│   │       ├── websocket/
│   │       └── middleware/
│   │
│   ├── workers/                      # Edge data collection
│   │   └── typescript/
│   │       ├── coinbase/
│   │       ├── binance/
│   │       └── aggregator/
│   │
│   ├── blockchain/                   # Flare integration
│   │   └── rust/
│   │       ├── rpc/                  # Flare RPC client
│   │       ├── signing/              # Transaction signing
│   │       └── contracts/            # Smart contract interface
│   │
│   └── shared/                       # Common utilities
│       ├── rust/
│       │   └── types/
│       └── typescript/
│           └── utils/
│
├── apps/
│   └── dashboard/                    # SvelteKit frontend
│       ├── src/
│       │   ├── routes/
│       │   ├── lib/
│       │   └── components/
│       ├── static/
│       └── svelte.config.js
│
├── tests/
│   ├── unit/
│   │   ├── rust/
│   │   └── typescript/
│   ├── integration/
│   │   ├── api/
│   │   └── oracle/
│   └── e2e/
│       └── dashboard/
│
├── config/
│   ├── development/
│   ├── staging/
│   └── production/
│
├── migrations/                       # Database migrations
│   ├── 001_initial_schema.sql
│   ├── 002_add_indexes.sql
│   └── ...
│
├── PROJECT-CHRONO-BLUEPRINT.md      # This document
├── IMPLEMENTATION_LOG.md            # Progress tracking
├── README.md                        # Project overview
├── Cargo.toml                       # Rust workspace
├── package.json                     # TypeScript workspace
└── .gitignore
```

### Structure Rationale

**Function-First Organization**: Organized by domain (oracle, api, workers) with language subdirectories. Makes it easier to understand data flow and component interactions while keeping language boundaries clear.

**Reorganization Flexibility**: Can easily switch to language-first organization later if Rust dominates. Just move directories - import paths change but module boundaries stay clean.

**Monorepo Benefits**:

- Shared types between Rust and TypeScript
- Coordinated version bumps across components
- Simplified dependency management
- Single source of truth for all code

---

## Quick Start Guide

### Prerequisites

- **Hardware**: Mac Mini M4 Pro (or similar)
- **OS**: macOS Sonoma or later
- **Tools**: Homebrew, GitHub CLI (`gh`)
- **Access**: GitHub account (username: `alexsmith84`)

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/alexsmith84/project-chrono.git
cd project-chrono

# 2. Set up GitHub Projects (CHRONO-001)
./scripts/setup/setup-github-projects.sh

# 3. Create repo structure (CHRONO-002)
./scripts/setup/setup-repo-structure.sh

# 4. Install development tools (CHRONO-003)
./scripts/setup/setup-dev-environment.sh

# 5. Initialize database (CHRONO-004)
./scripts/setup/initialize-database.sh
```

### Development Workflow

1. **Pick a ticket** from GitHub Projects backlog
2. **Read the spec** at `docs/specs/CHRONO-XXX.md`
3. **Follow implementation guide** at `docs/implementation/CHRONO-XXX-guide.md`
4. **Run tests** per `docs/tests/CHRONO-XXX-tests.md`
5. **Create PR** and move ticket to Review column
6. **Manual review** before merging to main
7. **Update IMPLEMENTATION_LOG.md** with learnings

### Primary Development Tool

**Claude Code** (included in Claude Pro subscription):

- Full ticket implementation from specs
- Complex refactoring and optimization
- Test writing and debugging
- Git commits and iteration

**Fallback Tools**:

- Ollama + Qwen3-Coder for offline/simple tasks
- Claude Chat for planning and architecture decisions

---

## Domain Architecture

Project Chrono will be deployed across multiple subdomains for service separation:

| Domain | Service | Technology | Port |
|--------|---------|------------|------|
| `nexus.hayven.xyz` | Main FTSO API | TypeScript/Bun | 3000 |
| `probe.hayven.xyz` | Data collection status | TypeScript/Bun | 3001 |
| `forge.hayven.xyz` | ML analytics API | Rust | 8080 |
| `gateway.hayven.xyz` | Public API (rate-limited) | TypeScript/Bun | 3000 |
| `templar.hayven.xyz` | Admin dashboard | SvelteKit | 5173 |

**Web Server**: Caddy 2 with automatic HTTPS and reverse proxy configuration

**Configuration Details**: See `docs/architecture/networking.md` for full Caddy setup and routing rules.

---

## Epic & Role Definitions, Workflow Reference

*"The Khala connects all knowledge. Access the archive."*

---

## Epic Definitions

Project Chrono is organized into **5 major epics**, each representing a critical system component. Epics are tracked via GitHub Projects Custom Fields and labels.

### 🏗️ Epic 1: Nexus Construction

**Core Infrastructure & Development Environment**

The foundation of Project Chrono - setting up the command center that powers all operations.

**Scope**:

- Mac Mini M4 Pro development environment setup
- Multi-language runtime installation (Rust, Bun, Deno, Node.js)
- Database cluster (PostgreSQL + TimescaleDB, Redis)
- Security hardening (firewall, SSH, SSL)
- Monitoring stack (Prometheus + Grafana)
- CI/CD pipeline (GitHub Actions)
- Backup and disaster recovery systems

**Key Deliverables**:

- Fully configured development environment
- Production-ready database with time-series optimizations
- Automated backup systems (15-minute RTO)
- Security baseline with automated monitoring
- CI/CD pipeline for multi-language testing

**Estimated Scope**: 12-15 tickets, 35-45 supply points

**Label**: `epic:nexus`

---

### ⚡ Epic 2: Chrono Boost Network

**Data Collection & Edge Processing**

The resource gathering system - like Probes collecting minerals, these workers collect price data from exchanges.

**Scope**:

- Cloudflare Workers deployment infrastructure
- Exchange API integrations (Coinbase, Binance, Kraken, Bybit, OKX)
- Real-time data validation and filtering
- Rate limit management and quota optimization
- Error handling and retry logic
- Data normalization and standardization
- WebSocket connection management for exchanges

**Key Deliverables**:

- Edge-distributed price collection across 5+ exchanges
- Real-time outlier detection (99.9% accuracy on data quality)
- Smart rate limiting (stay within free tier quotas)
- Fault-tolerant collection (automatic failover between sources)
- Normalized data format for downstream processing

**Estimated Scope**: 8-10 tickets, 22-28 supply points

**Label**: `epic:chrono-boost`

---

### 🧠 Epic 3: Khala Connection

**ML & Analytics Pipeline**

The collective consciousness - connecting all data points to determine truth through advanced analytics and machine learning.

**Scope**:

- Rust-based price aggregation engine (VWAP, TWAP, weighted median)
- ML anomaly detection pipeline
- Multi-source consensus algorithms
- Performance optimization (SIMD, zero-copy operations)
- Backtesting framework for algorithm validation
- Market prediction models (optional, Growth Phase)

**Key Deliverables**:

- Sub-10ms price aggregation calculations
- ML-powered outlier detection (catches flash crashes, manipulation)
- Consensus algorithm (determines "truth" from multiple sources)
- 99.5%+ accuracy on historical backtests
- Comprehensive performance benchmarks

**Estimated Scope**: 6-8 tickets, 20-30 supply points

**Label**: `epic:khala`

---

### 🌐 Epic 4: Warp Gate Portal

**User Interface & Public API**

The gateway for user interaction - first contact with delegators and developers.

**Scope**:

- SvelteKit delegation dashboard
- Real-time WebSocket price feeds
- Wallet integration (MetaMask, WalletConnect)
- Public REST API for developers
- Analytics and performance dashboards
- User authentication and authorization
- Rate limiting and API key management

**Key Deliverables**:

- Modern, responsive delegation dashboard
- Real-time price updates (<50ms WebSocket latency)
- Seamless wallet connection experience
- Developer-friendly REST API with OpenAPI docs
- Analytics dashboard (delegation stats, rewards tracking)

**Estimated Scope**: 6-8 tickets, 18-24 supply points

**Label**: `epic:warp-gate`

---

### ⚔️ Epic 5: Protoss Fleet

**Flare Network Integration**

The battle fleet - powerful blockchain operations that submit prices and manage rewards.

**Scope**:

- FTSO price submission automation
- Flare RPC client (Rust)
- Smart contract interactions (delegation, rewards)
- Transaction signing and management
- Reward calculation and distribution
- Network monitoring and competition analysis
- Gas optimization strategies

**Key Deliverables**:

- Automated FTSO submissions (every epoch, 99.9% success rate)
- Secure transaction signing (hardware wallet support)
- Automatic reward claiming and distribution
- Competition monitoring dashboard
- Gas cost optimization (<$0.10 per submission)

**Estimated Scope**: 4-6 tickets, 15-20 supply points

**Label**: `epic:protoss-fleet`

---

## Role Definitions

Tickets are tagged with **roles** indicating the type of work and skill set required. This helps with organization and filtering.

### 🔮 Oracle (Data Engineering)

**Gathers price data from the future**

**Responsibilities**:

- Exchange API integration and data collection
- Data normalization and validation
- Real-time streaming data pipelines
- Rate limit management
- WebSocket connection handling

**Technologies**: TypeScript, Cloudflare Workers, WebSocket, REST APIs

**Supply Cost Range**: 2-5 (Stalker to Colossus complexity)

**Label**: `role:oracle`

---

### 🔵 Zealot (Frontend Development)

**First contact with users**

**Responsibilities**:

- SvelteKit UI components
- User experience design
- Real-time data visualization
- Wallet integration
- Responsive design

**Technologies**: SvelteKit, TypeScript, Tailwind CSS, WebSocket

**Supply Cost Range**: 2-5 (simple components to complex dashboards)

**Label**: `role:zealot`

---

### 🔴 High Templar (Blockchain Development)

**Powerful, specialized Web3 abilities**

**Responsibilities**:

- Flare Network integration
- Smart contract interactions
- Transaction signing and management
- Reward distribution logic
- Gas optimization

**Technologies**: Rust, Web3, Ethers.js, Solidity (reading contracts)

**Supply Cost Range**: 3-8 (complex blockchain operations)

**Label**: `role:templar`

---

### 🟢 Marine (DevOps & Infrastructure)

**Reliable backbone that holds the line**

**Responsibilities**:

- Server setup and configuration
- CI/CD pipeline management
- Monitoring and alerting
- Security hardening
- Backup and disaster recovery
- Performance optimization

**Technologies**: Bash, GitHub Actions, Prometheus, Grafana, Caddy

**Supply Cost Range**: 2-5 (configuration to complex automation)

**Label**: `role:marine`

---

### 🟣 Overlord (Backend Development)

**Oversees system architecture**

**Responsibilities**:

- REST/WebSocket API development
- Database schema design
- Business logic implementation
- Performance optimization
- System architecture decisions

**Technologies**: Rust, TypeScript/Bun, PostgreSQL, Redis

**Supply Cost Range**: 3-8 (API endpoints to core algorithms)

**Label**: `role:overlord`

---

### 👁️ Observer (QA & Testing)

**Detects hidden bugs in the codebase**

**Responsibilities**:

- Test specification writing
- Unit and integration test implementation
- Performance benchmarking
- Security testing
- Bug detection and reporting

**Technologies**: Rust (cargo test), TypeScript (Vitest, Jest), Playwright

**Supply Cost Range**: 1-3 (simple tests to comprehensive suites)

**Label**: `role:observer`

---

## Supply Cost Estimation

Tickets use **StarCraft-inspired supply costs** to estimate complexity:

| Supply | Size | Complexity Level | Example Tasks | Time Estimate |
|--------|------|------------------|---------------|---------------|
| **1** | XS | Marine/Zealot | Simple config, docs, minor fixes | 0.5-1 hour |
| **2** | S | Stalker/Marauder | API endpoint, UI component | 1-2 hours |
| **3** | M | High Templar/Ghost | Complex feature, algorithm | 2-4 hours |
| **5** | L | Colossus/Thor | Major system, integration | 4-8 hours |
| **8** | XL | Carrier/Battlecruiser | Epic implementation, architecture | 8-16 hours |

**Velocity Tracking**: With 5-10 hours/week, expect 5-15 supply points completed per week.

---

## Priority Labels

Tickets are prioritized using mission-critical language:

| Priority | Description | Example |
|----------|-------------|---------|
| **Critical Mission** | MVP blockers, production issues | Database failure, submission failures |
| **Main Objective** | Important features for core functionality | Price aggregation, API endpoints |
| **Side Quest** | Nice-to-have features, improvements | UI polish, additional metrics |
| **Research** | Exploration, spikes, proof-of-concept | ML model experimentation |

---

## Development Workflow

### Git-Flow Branch Strategy

**Branch Structure** (StarCraft-themed):

- `khala` - Production/main branch (the psychic link binding all Protoss)
- `gateway` - Staging branch (portal to production for final verification)
- `forge` - Development branch (where features are crafted and integrated)
- `warp-in/CHRONO-XXX-description` - Feature branches (warping in new units/features)
- `recall/hotfix-description` - Hotfix branches (emergency recall to fix critical issues)
- `archives/vX.X.X` - Release branches (Templar Archives preserving versions)

**Branch Flow**:

```
khala (production)
  ↑
gateway (staging)
  ↑
forge (development)
  ↑
warp-in/CHRONO-XXX (features) ← work here
```

**Workflow**:

1. Create feature branch: `git checkout -b warp-in/CHRONO-XXX-description forge`
2. Implement and commit on feature branch
3. Create PR: `warp-in/CHRONO-XXX` → `forge`
4. After review, merge to `forge`
5. Test on `forge`, then merge `forge` → `gateway` for staging
6. Final verification on `gateway`
7. When ready for release, create `archives/vX.X.X` from `gateway`
8. Merge `archives/vX.X.X` to `khala` (production)
9. For hotfixes: branch from `khala` as `recall/hotfix-description`, then merge to `khala`, `gateway`, and `forge`

### Ticket Creation Process

1. **Identify Need**: Feature requirement or bug discovered
2. **Create Spec**: Write comprehensive spec at `docs/specs/CHRONO-XXX-spec.md`
3. **Create Implementation Guide**: Step-by-step guide at `docs/implementation/CHRONO-XXX-guide.md`
4. **Create Test Spec**: Test cases at `docs/tests/CHRONO-XXX-tests.md`
5. **Create GitHub Issue**: Using template, linking to all docs
6. **Add to Projects Board**: Set Epic, Role, Supply Cost, Priority

### Implementation Process

1. **Create Feature Branch**: `git checkout -b warp-in/CHRONO-XXX-description forge`
2. **Read Spec**: Thoroughly review `docs/specs/CHRONO-XXX-spec.md`
3. **Review Implementation Guide**: Follow steps in `docs/implementation/CHRONO-XXX-guide.md`
4. **Implement with Claude Code**: Use spec as context, implement feature
5. **Run Tests**: Validate per `docs/tests/CHRONO-XXX-tests.md`
6. **Commit Changes**: Make atomic commits with clear messages
7. **Create PR**: `warp-in/CHRONO-XXX` → `forge`
8. **Manual Review**: Human verification of implementation
9. **Merge to Forge**: After approval, merge feature branch
10. **Update Log**: Add learnings to `IMPLEMENTATION_LOG.md`

### GitHub Projects Setup

**Custom Fields**:

- **Epic** (Single Select): Nexus Construction, Chrono Boost Network, Khala Connection, Warp Gate Portal, Protoss Fleet
- **Role** (Single Select): Oracle, Zealot, Templar, Marine, Overlord, Observer
- **Supply Cost** (Number): 1, 2, 3, 5, 8
- **Priority** (Single Select): Critical Mission, Main Objective, Side Quest, Research

**Columns** (Kanban):

1. **Backlog** - Prioritized work queue
2. **Ready** - Fully specified, ready to implement
3. **In Progress** - Actively being worked
4. **Blocked** - Waiting on dependency or decision
5. **Review** - Implementation complete, needs verification
6. **Done** - Completed and verified

**Views**:

- **By Epic** - Group by Epic field
- **By Priority** - Filter Critical Mission and Main Objective
- **Timeline** - Gantt-style view for planning

---

## Documentation Reference

### Architecture Documentation

- `docs/architecture/system-design.md` - Complete system architecture
- `docs/architecture/networking.md` - Caddy configuration, domain routing
- `docs/architecture/data-flow.md` - How data moves through the system
- `docs/architecture/decisions/` - Architecture Decision Records (ADRs)

### Workflow Documentation

- `docs/workflow/ticket-creation.md` - How to create and specify tickets
- `docs/workflow/development-process.md` - Step-by-step development guide
- `docs/workflow/deployment.md` - Production deployment procedures

### Setup Documentation

- `docs/setup/mac-mini-setup.md` - Complete Mac Mini configuration
- `docs/setup/cloudflare-workers.md` - Edge worker deployment
- `docs/setup/production-deployment.md` - Production environment setup

### Template Documentation

- `docs/specs/SPEC-TEMPLATE.md` - Standard spec format
- `docs/implementation/IMPL-TEMPLATE.md` - Implementation guide template
- `docs/tests/TEST-TEMPLATE.md` - Test specification template
- `.github/ISSUE_TEMPLATE/feature-ticket.md` - GitHub issue template

### Business Documentation

- `docs/business/README.md` - Business model overview
- `docs/business/pnl-model.xlsx` - P&L projections and scenarios
- `docs/business/infrastructure-costs.xlsx` - Cost modeling and scaling
- `docs/business/ftso-metrics.xlsx` - Performance tracking (post-MVP)
- `docs/business/delegation-tracking.xlsx` - User growth metrics (post-MVP)

---

## First Four Tickets

### CHRONO-001: GitHub Projects Setup

- **Epic**: Nexus Construction
- **Role**: Marine (DevOps)
- **Supply Cost**: 2 (Stalker)
- **Priority**: Critical Mission
- **Scope**: Configure GitHub Projects board with custom fields, columns, views

### CHRONO-002: Repo Structure & Templates

- **Epic**: Nexus Construction
- **Role**: Marine (DevOps)
- **Supply Cost**: 3 (High Templar)
- **Priority**: Critical Mission
- **Scope**: Create all directories, templates, helper scripts

### CHRONO-003: Mac Mini Infrastructure Setup

- **Epic**: Nexus Construction
- **Role**: Marine (DevOps)
- **Supply Cost**: 5 (Colossus)
- **Priority**: Critical Mission
- **Scope**: Install Rust, Bun, PostgreSQL, Redis, Caddy, configure services

### CHRONO-004: Database Schema Design

- **Epic**: Nexus Construction
- **Role**: Overlord (Backend)
- **Supply Cost**: 5 (Colossus)
- **Priority**: Critical Mission
- **Scope**: PostgreSQL + TimescaleDB schema, migrations, indexes

---

## Key Learnings from Planning

### What We Discovered

1. **Lean Tickets are Essential**: Embedding code in GitHub issues causes escaping nightmares and token limits. Keep tickets simple with links to detailed specs.

2. **Specs Live in Docs**: Comprehensive specifications at `docs/specs/` provide full context without bloating tickets.

3. **One Spec, Multiple Tickets**: Complex features can have one detailed spec referenced by multiple implementation tickets.

4. **Claude Code is Included**: Already part of Claude Pro subscription - use it as primary development tool.

5. **Token Efficiency Matters**: Modular documentation (Option B) lets Claude Code load only what's needed per task.

### What NOT to Do

1. ❌ Don't embed 200+ line code blocks in GitHub issue bodies
2. ❌ Don't try to batch 5+ complex tickets in one response
3. ❌ Don't use `--assignee` with fictional role names
4. ❌ Don't assume comprehensive tickets won't hit length limits
5. ❌ Don't use double escaping for JSON/YAML in bash heredocs

---

## Success Criteria

### MVP Phase (Months 1-4)

- ✅ Infrastructure operational (Mac Mini, database, monitoring)
- ✅ 3-5 exchange integrations working
- ✅ Basic price aggregation (VWAP, TWAP)
- ✅ FTSO submissions automated (99% success rate)
- ✅ Simple delegation dashboard live

### Growth Phase (Months 5-8)

- ✅ ML anomaly detection operational
- ✅ 10+ exchange integrations
- ✅ Advanced analytics dashboard
- ✅ Public API with rate limiting
- ✅ 10M+ FLR delegated

### Scale Phase (Months 9-12)

- ✅ 100M+ FLR delegated (break-even)
- ✅ Top 25% accuracy ranking
- ✅ Revenue positive operations
- ✅ 5%+ market share achieved

---

*"En Taro Tassadar! The blueprint is complete. Now... we build!"* ⚡

**For Aiur... and accurate price feeds!**
