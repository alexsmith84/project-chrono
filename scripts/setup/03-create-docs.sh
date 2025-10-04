#!/bin/bash

# Project Chrono - Architecture Documentation Setup
# Script 3 of 3: Create architecture and decision documentation
# 
# "The archives are complete. Knowledge preserved for eternity."

set -e  # Exit on any error

echo "📚 PROJECT CHRONO - ARCHITECTURE DOCUMENTATION"
echo "=============================================="
echo ""

# Color output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create System Design Document
echo -e "${BLUE}Creating system design documentation...${NC}"

cat > docs/architecture/system-design.md << 'EOF'
# System Design - Project Chrono

*"The architecture of the Protoss, refined over millennia. Efficiency. Power. Unity."*

---

## Overview

Project Chrono implements a hybrid edge + self-hosted architecture for FTSO price oracle operations. The system combines Cloudflare Workers for geographically distributed data collection with self-hosted Mac Mini M4 Pro processing for performance and cost optimization.

### Core Design Principles

1. **Performance First**: Sub-10ms price aggregation, <200ms API responses
2. **Cost Optimization**: Self-hosted core ($70-220/month) vs pure cloud ($375-1,250/month)
3. **Fault Tolerance**: Multi-source redundancy, automatic failover, graceful degradation
4. **Security by Design**: Multi-layer defense, zero-trust internal communication
5. **Observable Systems**: Comprehensive monitoring, proactive alerting, debugging insights

---

## High-Level Architecture

```
Edge Layer (Cloudflare Workers)
    ↓
Core Processing (Mac Mini M4 Pro)
    ├── Rust Engine (Price Aggregation, ML, Consensus)
    ├── TypeScript API (REST, WebSocket, Orchestration)
    ├── PostgreSQL + TimescaleDB (Time-series storage)
    └── Redis (Cache + Pub/Sub)
    ↓
Blockchain Layer (Flare Network)
    ↓
Frontend (SvelteKit Dashboard)
```

---

## Component Architecture

### 1. Edge Layer (Cloudflare Workers)

**Purpose**: Geographically distributed price data collection

**Technology**: TypeScript/JavaScript (Cloudflare Workers runtime)

**Responsibilities**:
- Collect price data from exchange APIs
- Normalize data to common format
- Handle rate limiting and quotas
- Implement retry logic with exponential backoff
- Forward sanitized data to core processing

**Why Edge**: Bypass geo-restrictions, lower latency to exchanges, isolation per worker

---

### 2. Rust Engine (Core Processing)

**Purpose**: High-performance price aggregation and consensus

**Technology**: Rust 1.75+, Tokio async runtime, Actix-web

**Responsibilities**:
- VWAP (Volume-Weighted Average Price) calculation
- TWAP (Time-Weighted Average Price) calculation
- Weighted median calculation
- Multi-source consensus algorithm
- ML-based anomaly detection
- Performance-critical blockchain operations

**Performance Targets**:
- Aggregation: <10ms for 1000 data points
- Memory: <500MB under normal load
- Throughput: 10,000+ calculations/second

**Why Rust**: 40% faster than Docker containers, memory safety, zero-cost abstractions

---

### 3. TypeScript API (Bun Runtime)

**Purpose**: REST/WebSocket API, orchestration, Web3 integration

**Technology**: Bun 1.0+, Hono framework, ws library, ethers.js

**Responsibilities**:
- REST API for external consumers
- WebSocket server for real-time price feeds
- Orchestrate Rust engine calls
- Web3 wallet integration
- User authentication and authorization
- Rate limiting and API key management

**Performance Targets**:
- API Response: P95 <200ms, P99 <500ms
- WebSocket Latency: <50ms for price updates
- Concurrent Connections: 1000+ WebSocket clients

**Why Bun**: 3x faster than Node.js, native TypeScript, built-in WebSocket

---

### 4. Database Layer

#### PostgreSQL + TimescaleDB

**Purpose**: Time-series optimized price data storage

**Technology**: PostgreSQL 15, TimescaleDB 2.13+

**Key Features**:
- Hypertables with 1-hour chunks for price_feeds
- Compression after 7 days (10-20x storage savings)
- 2-year retention policy
- Indexes optimized for (symbol, timestamp) queries
- Continuous aggregates for pre-computed summaries

**Why TimescaleDB**: 100-1000x faster than vanilla PostgreSQL for time queries

#### Redis Cache

**Purpose**: High-speed caching and pub/sub

**Technology**: Redis 7.2+, Redis Streams

**Usage Patterns**:
- Cache recent prices (5-minute TTL)
- Pub/Sub for real-time updates
- Rate limiting (sliding window)
- Session storage

**Why Redis**: Sub-millisecond latency, perfect for real-time needs

---

### 5. Blockchain Integration (Rust)

**Purpose**: Flare Network FTSO submissions

**Technology**: Rust, ethers-rs, Hardware wallet support (Ledger)

**Responsibilities**:
- Connect to Flare RPC nodes
- Sign and submit price data transactions
- Monitor transaction status
- Calculate and claim rewards
- Gas optimization

**Why Rust for Blockchain**: Memory safety critical for financial operations, hardware wallet never touches disk

**Gas Optimization**: <$0.10 per submission target

---

### 6. Frontend (SvelteKit)

**Purpose**: Delegation dashboard and analytics UI

**Technology**: SvelteKit 2.0+, Tailwind CSS, Chart.js, ethers.js

**Responsibilities**:
- Display real-time price feeds
- Show delegation statistics
- Wallet connection (MetaMask, WalletConnect)
- Analytics dashboards
- Admin controls

**Why SvelteKit**: Fast, small bundle size, excellent DX, SSR with client hydration

---

## Data Flow Patterns

### Real-Time Price Collection Flow

1. Cloudflare Worker polls exchange API (every 30s)
2. Worker normalizes data → `{ symbol, price, volume, timestamp, source }`
3. Worker POSTs to API: `POST /internal/ingest`
4. API validates & stores in PostgreSQL
5. API publishes to Redis: `PUBLISH prices`
6. WebSocket server receives from Redis
7. WebSocket broadcasts to connected clients
8. SvelteKit UI updates in real-time

### Price Aggregation Flow

1. Scheduler triggers aggregation (every 90s for FTSO epoch)
2. API queries PostgreSQL for recent prices (last 3 minutes)
3. API calls Rust engine: `POST /aggregate`
4. Rust calculates VWAP, TWAP, median
5. Rust runs ML anomaly detection
6. Rust determines consensus price
7. Return to API → Store in DB → Cache in Redis
8. Price ready for FTSO submission

### FTSO Submission Flow

1. Epoch timer triggers (every 90 seconds)
2. Fetch aggregated price from cache/DB
3. Rust blockchain module prepares transaction
4. Sign with hardware wallet
5. Submit to Flare Network
6. Monitor transaction status
7. Update submission_log table
8. Alert if submission fails

---

## Security Architecture

### Multi-Layer Defense

**Layer 1: Network** (Caddy + macOS Firewall)
- HTTPS only (automatic Let's Encrypt)
- Rate limiting (100 req/min per IP)
- DDoS protection (Cloudflare)

**Layer 2: Application** (API + Authentication)
- API key authentication
- JWT tokens (15-minute expiry)
- Role-based access control (RBAC)

**Layer 3: Data** (Encryption)
- PostgreSQL SSL connections required
- Redis AUTH enabled
- Secrets in environment variables

**Layer 4: Blockchain** (Hardware Wallet)
- Private keys on Ledger device
- Transaction signing requires physical confirmation
- Multi-sig for high-value operations (future)

---

## Monitoring & Observability

### Metrics Collection (Prometheus)

**System Metrics**: CPU, memory, disk, network utilization

**Application Metrics**: API response times, WebSocket connections, aggregation speed

**Business Metrics**: FTSO submission success, accuracy score, rewards earned, delegation amounts

### Visualization (Grafana)

**Dashboards**:
1. System Health (infrastructure metrics)
2. API Performance (response times, error rates)
3. FTSO Operations (submissions, accuracy, rewards)
4. Business Analytics (delegation growth, market share)

---

## Deployment Architecture

### Domain Routing (via Caddy)

- `nexus.hayven.xyz` → API (port 3000)
- `probe.hayven.xyz` → Worker status (port 3001)
- `forge.hayven.xyz` → Rust engine metrics (port 8080)
- `gateway.hayven.xyz` → Public API (rate-limited)
- `templar.hayven.xyz` → SvelteKit dashboard (port 5173)

---

## Technology Decision Matrix

| Component | Technology | Alternative | Why Chosen |
|-----------|------------|-------------|------------|
| Core Processing | Rust | Go, C++ | Memory safety + speed |
| API Server | Bun | Node.js, Deno | 3x faster, native TS |
| Database | PostgreSQL + TimescaleDB | ClickHouse | Better tooling |
| Cache | Redis | Memcached | Pub/sub + persistence |
| Frontend | SvelteKit | React, Vue | Small bundle, fast |
| Edge | Cloudflare Workers | AWS Lambda@Edge | Better DX, lower cost |

---

*"The architecture stands complete. Purity of form. Purity of function. En Taro Tassadar!"*
EOF

echo -e "${GREEN}✓ System design documentation created${NC}"
echo ""

# Create Architecture Decisions Record
echo -e "${BLUE}Creating architecture decisions log...${NC}"

cat > docs/architecture/DECISIONS.md << 'EOF'
# Architecture Decisions - Project Chrono

*"Every choice shapes our destiny. These decisions define our path."*

---

## Repository & Workflow Decisions

### Decision 001: Main Branch Name
**Date**: October 2025  
**Status**: Accepted  
**Context**: Need thematically appropriate main branch name  
**Decision**: Use `khala` as main branch (Protoss psychic connection)  
**Rationale**: 
- Represents unified source of truth (like the Khala unites Protoss)
- Thematically perfect for StarCraft 2 project
- Short and memorable
**Consequences**: All feature branches merge to `khala`, not `main`

### Decision 002: Branch Naming Strategy
**Date**: October 2025  
**Status**: Accepted  
**Decision**: Use themed branch prefixes:
- `forge/` for feature development
- `gateway/` for staging
- `hotfix/` for emergency fixes
**Rationale**: Maintains StarCraft theme, clear purpose per prefix
**Consequences**: Team must learn new convention vs standard `feature/`, `release/`

### Decision 003: Monorepo Structure
**Date**: October 2025  
**Status**: Accepted  
**Decision**: Function-first organization with language subdirectories
**Structure**:
```
src/oracle/rust/     # Not src/rust/oracle/
src/oracle/typescript/
```
**Rationale**: Easier to follow data flow, understand component boundaries
**Consequences**: Can reorganize to language-first later if needed (just moving directories)

### Decision 004: Frontend Location
**Date**: October 2025  
**Status**: Accepted  
**Decision**: Place SvelteKit in `apps/dashboard/`  
**Alternatives Considered**: `src/web/`, `frontend/`  
**Rationale**: Allows future apps (CLI tool, mobile app) in same pattern  
**Consequences**: Slightly deeper nesting, but better scalability

---

## Team & Process Decisions

### Decision 005: Role Definitions
**Date**: October 2025  
**Status**: Accepted  
**Decision**: Use StarCraft units for work type labels:
- **Oracle**: Data Engineering (gathers price data from the future!)
- **Zealot**: Frontend Development
- **High Templar**: Blockchain/Web3
- **Marine**: DevOps/Infrastructure
- **Overlord**: Backend Development
- **Observer**: QA/Testing (detects hidden bugs)

**Rationale**: Thematic consistency, memorable, helps with filtering/organization  
**Note**: Originally considered "Probe" for data engineering, but Oracle is more meta for an oracle project. Observer chosen over Sentry for QA (Observers detect cloaked units).

### Decision 006: Epic Tracking Method
**Date**: October 2025  
**Status**: Accepted  
**Decision**: Use GitHub Projects Custom Field + Labels combo  
**Implementation**:
- Custom Field "Epic" for visual organization
- Labels (`epic:nexus`, `epic:chrono-boost`, etc.) for CLI filtering
- NO GitHub Milestones (reserved for version releases)
**Rationale**: Best of both worlds - visual board + command-line filtering

### Decision 007: Documentation Structure
**Date**: October 2025  
**Status**: Accepted  
**Decision**: Modular documentation (Option B) over single mega-doc  
**Structure**:
- Separate files for specs, implementation guides, tests
- Blueprint links to detailed docs
- Each doc 1500-3000 words max
**Rationale**: Claude Code can load only what it needs, token efficiency  
**Consequences**: More files to manage, but better for AI agent context

### Decision 008: Test Specs for All Tickets
**Date**: October 2025  
**Status**: Accepted  
**Decision**: Every ticket gets a test spec, even infrastructure tickets  
**Rationale**: Verification steps critical for reproducibility  
**Example**: Infrastructure ticket gets manual verification checklist instead of unit tests

---

## Technology Stack Decisions

### Decision 009: Hybrid Architecture
**Date**: October 2025  
**Status**: Accepted  
**Decision**: Cloudflare Workers (edge) + Mac Mini M4 Pro (core)  
**Cost Analysis**:
- Hybrid: $70-220/month (MVP)
- Pure Cloud: $375-1,250/month
**Rationale**: 60-70% cost savings while maintaining performance  
**Trade-offs**: Self-hosting complexity vs cost savings

### Decision 010: Multi-Language Stack
**Date**: October 2025  
**Status**: Accepted  
**Decision**: Rust + TypeScript + Deno + SvelteKit  
**Division of Labor**:
- **Rust**: Price aggregation, ML, consensus, blockchain
- **TypeScript/Bun**: API server, WebSocket, orchestration
- **Deno**: Secure config, sandboxed API calls
- **SvelteKit**: Frontend dashboard
**Rationale**: Performance where needed (Rust), ecosystem where helpful (TypeScript)  
**Consequences**: Multi-language complexity, but achieves <10ms aggregation target

### Decision 011: Database Choice
**Date**: October 2025  
**Status**: Accepted  
**Decision**: PostgreSQL + TimescaleDB for MVP  
**Alternatives Considered**: ClickHouse, InfluxDB  
**Rationale**:
- TimescaleDB: 100-1000x faster for time queries vs vanilla PostgreSQL
- Better tooling ecosystem than ClickHouse
- 80% of benefits with lower complexity
**Future**: Add ClickHouse in Growth Phase only if TimescaleDB insufficient

### Decision 012: TypeScript Runtime
**Date**: October 2025  
**Status**: Accepted  
**Decision**: Bun over Node.js or Deno  
**Rationale**:
- 3x faster than Node.js
- Native TypeScript support
- Built-in WebSocket
- Single executable, simple deployment
**Trade-offs**: Newer ecosystem, fewer packages, but performance gains worth it

### Decision 013: Frontend Framework
**Date**: October 2025  
**Status**: Accepted  
**Decision**: SvelteKit over React or Vue  
**Rationale**:
- Smallest bundle size
- Fastest runtime performance
- Excellent developer experience
- SSR + client hydration out of the box
**Consequences**: Smaller talent pool, but solo developer project

---

## Development Tooling Decisions

### Decision 014: Primary Development Tool
**Date**: October 2025  
**Status**: Accepted  
**Decision**: Claude Code as primary development tool  
**Rationale**:
- Included in Claude Pro subscription (no extra cost)
- Terminal integration, git commits, file navigation
- Can iterate quickly on implementation
**Fallbacks**: Ollama + Qwen3-Coder for offline/simple tasks

### Decision 015: Ticket Specification Approach
**Date**: October 2025  
**Status**: Accepted  
**Decision**: Lean tickets with links to comprehensive specs  
**Ticket Size**: 300-500 tokens  
**Spec Size**: 2000-3000 tokens  
**Rationale**: 
- Avoids bash escaping nightmares
- Prevents hitting token/length limits
- Implementation belongs in code files, not issue bodies
**Key Learning**: Embedding 200+ line code blocks in GitHub issues = bad time

### Decision 016: Spec Granularity
**Date**: October 2025  
**Status**: Accepted  
**Decision**: One comprehensive spec can spawn multiple implementation tickets  
**Pattern**:
- CHRONO-020-vwap-aggregation.md (spec)
  - CHRONO-020: Implement basic VWAP
  - CHRONO-021: Add SIMD optimizations
  - CHRONO-022: Benchmark & tune
**Rationale**: Prevents spec duplication, allows incremental implementation

---

## Security & Operations Decisions

### Decision 017: Hardware Wallet for Private Keys
**Date**: October 2025  
**Status**: Accepted  
**Decision**: Use Ledger hardware wallet, keys never touch disk  
**Rationale**: Financial system requires maximum security for blockchain operations  
**Consequences**: Requires physical device for FTSO submissions

### Decision 018: Monitoring Stack
**Date**: October 2025  
**Status**: Accepted  
**Decision**: Prometheus + Grafana (self-hosted)  
**Alternatives Considered**: Datadog, New Relic  
**Rationale**: No recurring costs, full control, proven reliability  
**Consequences**: Must maintain monitoring infrastructure ourselves

### Decision 019: Web Server Choice
**Date**: October 2025  
**Status**: Accepted  
**Decision**: Caddy 2 over Nginx or Traefik  
**Rationale**:
- Automatic HTTPS with Let's Encrypt
- Simpler configuration syntax
- Built-in reverse proxy
- Perfect for self-hosted Mac Mini deployment

---

## Business & Planning Decisions

### Decision 020: Part-Time Development Pace
**Date**: October 2025  
**Status**: Accepted  
**Decision**: 5-10 hours/week, Kanban workflow (not sprints)  
**Rationale**: Solo developer, passion project, no artificial deadlines  
**Velocity Estimate**: 5-15 supply points per week  
**Timeline**: 4-6 months to MVP (not 3 months)

### Decision 021: Profitability Reality Check
**Date**: October 2025  
**Status**: Accepted  
**Decision**: Build for learning + future upside, not immediate profit  
**Context**: At $0.021 FLR, need 50-100M delegated to break even  
**Rationale**: Market conditions may improve, meanwhile gain Rust + FTSO expertise  
**Success Metrics**: Learning > Immediate revenue

---

## Future Decisions (To Be Made)

### Decision TBD: ClickHouse Integration
**Status**: Deferred to Growth Phase  
**Question**: Add ClickHouse for historical analytics?  
**Decision Point**: When PostgreSQL + TimescaleDB cannot handle scale

### Decision TBD: Multi-Node Scaling
**Status**: Deferred to Scale Phase  
**Question**: Add multiple Mac Minis or cloud VMs?  
**Decision Point**: When single Mac Mini reaches capacity (>100M FLR delegated)

### Decision TBD: Mobile App
**Status**: Future consideration  
**Question**: Build mobile app for delegation management?  
**Decision Point**: After web dashboard proven successful

---

## How to Use This Document

When making new architectural decisions:

1. Document the decision using this template
2. Include context, alternatives considered, rationale
3. Note consequences and trade-offs
4. Update PROJECT-CHRONO-BLUEPRINT.md if it affects core architecture
5. Communicate to team (or future self)

---

*"Decisions recorded in the archives. The Khala remembers all."*
EOF

echo -e "${GREEN}✓ Architecture decisions log created${NC}"
echo ""

# Create initial workflow documentation
echo -e "${BLUE}Creating workflow documentation...${NC}"

cat > docs/workflow/ticket-creation.md << 'EOF'
# Ticket Creation Guide

*"Precise specifications lead to flawless execution."*

---

## Overview

This guide explains how to create well-specified tickets for Project Chrono using our three-document system:

1. **Specification** (`docs/specs/CHRONO-XXX-*.md`) - WHAT to build
2. **Implementation Guide** (`docs/implementation/CHRONO-XXX-guide.md`) - HOW to build
3. **Test Specification** (`docs/tests/CHRONO-XXX-tests.md`) - HOW to verify

---

## Step-by-Step Process

### Step 1: Identify the Need

Determine:
- What problem needs solving?
- What feature is required?
- Which epic does this belong to?
- What role (skill set) is needed?

### Step 2: Create the Specification

```bash
# Copy template
cp docs/specs/SPEC-TEMPLATE.md docs/specs/CHRONO-XXX-description.md

# Fill in all sections:
# - Context & Requirements
# - Technical Architecture
# - Implementation Details
# - Error Handling
# - Performance Requirements
# - Security Considerations
# - Testing Requirements
# - Acceptance Criteria
```

**Key Principles**:
- Be comprehensive but concise
- Include code examples for clarity
- Define clear success criteria
- Reference dependencies

### Step 3: Create Implementation Guide

```bash
# Copy template
cp docs/implementation/IMPL-TEMPLATE.md docs/implementation/CHRONO-XXX-guide.md

# Fill in:
# - Prerequisites
# - Step-by-step checklist
# - Detailed implementation steps
# - Common pitfalls
# - Debugging guidance
```

**Key Principles**:
- Assume reader has basic knowledge only
- Break complex tasks into small steps
- Include verification steps after each phase
- Document known issues and workarounds

### Step 4: Create Test Specification

```bash
# Copy template
cp docs/tests/TEST-TEMPLATE.md docs/tests/CHRONO-XXX-tests.md

# Fill in:
# - Unit test cases
# - Integration test scenarios
# - Performance test requirements
# - Manual verification steps (for infra tickets)
```

**Key Principles**:
- Every requirement needs a test
- Include success criteria for each test
- Provide test data setup/cleanup scripts
- Document expected outputs

### Step 5: Create GitHub Issue

Use the GitHub issue template:

```bash
# Create issue manually via GitHub web UI
# OR use GitHub CLI:

gh issue create \
  --title "CHRONO-XXX: [Role] Brief Description" \
  --body-file .github/ISSUE_TEMPLATE/feature-ticket.md \
  --label "epic:nexus,role:marine,supply:2,priority:critical"
```

**Fill in the template**:
- Summary (2-3 sentences)
- Epic & Classification (epic, role, supply cost, priority)
- Documentation links (to the three docs you created)
- Quick reference (technologies, dependencies)
- Definition of done (checklist)

### Step 6: Add to GitHub Projects

1. Open the ticket
2. Add to "Project Chrono Roadmap" project
3. Set custom fields:
   - Epic: [Select from dropdown]
   - Role: [Select from dropdown]
   - Supply Cost: [1, 2, 3, 5, or 8]
   - Priority: [Select from dropdown]
4. Place in "Backlog" column

---

## Ticket Numbering

- Use sequential numbers: CHRONO-001, CHRONO-002, etc.
- No gaps or ranges
- Check existing tickets to find next number

---

## Supply Cost Guidelines

| Supply | Size | Time | Example |
|--------|------|------|---------|
| 1 | XS | 0.5-1h | Config change, doc update |
| 2 | S | 1-2h | Simple API endpoint, UI component |
| 3 | M | 2-4h | Complex feature, algorithm |
| 5 | L | 4-8h | Major system, integration |
| 8 | XL | 8-16h | Epic implementation |

---

## Quality Checklist

Before creating the GitHub issue, verify:

- [ ] Spec is comprehensive and clear
- [ ] Implementation guide has step-by-step instructions
- [ ] Test spec covers all requirements
- [ ] Dependencies are identified
- [ ] Acceptance criteria are measurable
- [ ] Supply cost is realistic
- [ ] Epic and role are correct

---

*"Specification complete. Ready for implementation. En Taro Tassadar!"*
EOF

echo -e "${GREEN}✓ Workflow documentation created${NC}"
echo ""

# Create a quick start guide
echo -e "${BLUE}Creating quick start guide...${NC}"

cat > docs/QUICK-START.md << 'EOF'
# Project Chrono - Quick Start Guide

*"Warp in the Nexus. Construction begins now."*

---

## For New Developers

Welcome to Project Chrono! This guide gets you up and running quickly.

## Prerequisites

- Mac Mini M4 Pro (or equivalent)
- macOS Sonoma or later
- Homebrew installed
- GitHub account (username: alexsmith84)
- GitHub CLI (`gh`) installed

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/alexsmith84/project-chrono.git
cd project-chrono
```

### 2. Run Bootstrap Scripts

```bash
# Make scripts executable
chmod +x scripts/setup/*.sh

# Run in order
./scripts/setup/01-create-structure.sh
./scripts/setup/02-create-templates.sh
./scripts/setup/03-create-docs.sh

# Commit the setup
git add .
git commit -m "Complete repository bootstrap"
```

### 3. Read the Blueprint

```bash
# Open the comprehensive blueprint
open PROJECT-CHRONO-BLUEPRINT.md

# Or view in terminal
cat PROJECT-CHRONO-BLUEPRINT.md
```

## Understanding the Project

### Key Documents

1. **PROJECT-CHRONO-BLUEPRINT.md** - Complete architecture and workflow
2. **docs/architecture/system-design.md** - Technical architecture
3. **docs/architecture/DECISIONS.md** - Why we made key choices
4. **docs/workflow/ticket-creation.md** - How to create tickets
5. **IMPLEMENTATION_LOG.md** - Track progress and learnings

### Branch Strategy

- `khala` - Main branch (source of truth)
- `forge/chrono-XXX` - Feature development
- `gateway/staging-vX.X` - Staging/pre-production
- `hotfix/description` - Emergency fixes

## First Steps

### For Your First Ticket

1. **Read the spec**: `docs/specs/CHRONO-001-*.md`
2. **Follow the guide**: `docs/implementation/CHRONO-001-guide.md`
3. **Run tests**: Per `docs/tests/CHRONO-001-tests.md`
4. **Update log**: Add learnings to `IMPLEMENTATION_LOG.md`

### Using Claude Code

```bash
# Start Claude Code
claude-code

# Give context
"I'm working on Project Chrono. Read PROJECT-CHRONO-BLUEPRINT.md 
and docs/specs/CHRONO-XXX-*.md for context. Let's implement this ticket."
```

## Development Workflow

```
Pick Ticket → Read Spec → Follow Guide → Implement → Test → Review → Merge → Log
```

### Detailed Steps

1. **Pick ticket** from GitHub Projects Backlog
2. **Create branch**: `git checkout -b forge/chrono-XXX khala`
3. **Read all three docs**: spec, implementation guide, test spec
4. **Implement** using Claude Code or manually
5. **Run tests** and verify per test spec
6. **Create PR** and move ticket to Review
7. **Human review** and approval
8. **Merge to khala**
9. **Update IMPLEMENTATION_LOG.md** with learnings

## Helpful Commands

```bash
# View project structure
tree -L 3

# Check ticket status
gh issue list --state open

# Run tests
cargo test              # Rust
bun test               # TypeScript

# View logs
tail -f logs/chrono.log

# Check git status
git status
git log --oneline -10
```

## Getting Help

- **Blueprint**: `PROJECT-CHRONO-BLUEPRINT.md`
- **Architecture**: `docs/architecture/system-design.md`
- **Decisions**: `docs/architecture/DECISIONS.md`
- **Workflow**: `docs/workflow/`
- **Templates**: `docs/specs/SPEC-TEMPLATE.md` and others

## Next Steps

1. Complete CHRONO-001: GitHub Projects Setup
2. Complete CHRONO-002: Repo Structure (already done via bootstrap!)
3. Complete CHRONO-003: Mac Mini Infrastructure Setup
4. Complete CHRONO-004: Database Schema Design

---

*"The archives are open. Knowledge awaits. En Taro Tassadar!"*
EOF

echo -e "${GREEN}✓ Quick start guide created${NC}"
echo ""

# Summary
echo ""
echo "============================================="
echo -e "${GREEN}✨ ARCHITECTURE DOCUMENTATION COMPLETE ✨${NC}"
echo "============================================="
echo ""
echo "Created:"
echo "  ✓ System design documentation (docs/architecture/system-design.md)"
echo "  ✓ Architecture decisions log (docs/architecture/DECISIONS.md)"
echo "  ✓ Ticket creation workflow (docs/workflow/ticket-creation.md)"
echo "  ✓ Quick start guide (docs/QUICK-START.md)"
echo ""
echo -e "${YELLOW}ALL THREE BOOTSTRAP SCRIPTS COMPLETE!${NC}"
echo ""
echo "Repository is now fully structured and documented."
echo ""
echo "Final steps:"
echo "  1. Review created files"
echo "  2. Commit everything:"
echo "     git add ."
echo "     git commit -m 'Complete repository bootstrap - All docs and structure'"
echo "  3. Push to GitHub:"
echo "     git push -u origin khala"
echo "  4. Begin implementation with CHRONO-001"
echo ""
echo -e "${BLUE}En Taro Tassadar! The Nexus is complete. Construction successful!${NC}"
echo ""