# Architecture Decisions - Project Chrono

_"Every choice shapes our destiny. These decisions define our path."_

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

### Decision 002: Git-Flow Branch Strategy

**Date**: October 2025
**Status**: Accepted
**Decision**: Use StarCraft-themed git-flow branch structure:

- `khala` - Production/main branch
- `gateway` - Staging branch (portal to production for final verification)
- `forge` - Development branch (where features are crafted and integrated)
- `warp-in/CHRONO-XXX-description` - Feature branches
- `recall/hotfix-description` - Hotfix branches
- `archives/vX.X.X` - Release branches
  **Rationale**: Maintains StarCraft theme while following professional git-flow pattern for release management
  **Branch Flow**: warp-in/\* → forge → gateway → archives/vX.X.X → khala
  **Consequences**: More complex than simplified workflow, but provides professional release management even for solo developer

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

### Decision 022: GitHub Projects Configuration

**Date**: 2025-10-07
**Status**: Accepted
**Decision**: Use single GitHub Project v2 board with Kanban workflow
**Project**: [Project Chrono - Oracle Development](https://github.com/users/alexsmith84/projects/5)
**Workflow**: Kanban (continuous flow, no time-boxed sprints)

**Custom Fields**:

- **Supply Cost** (Single Select): 1-Trivial, 2-Small, 3-Medium, 5-Large, 8-Epic
- **Priority** (Single Select): Critical Mission, Main Objective, Side Quest, Research
- **Epic** (Single Select): Nexus Construction, Chrono Boost Network, Khala Connection, Warp Gate Portal, Protoss Fleet
- **Role** (Single Select): Oracle, Zealot, Templar, Marine, Overlord, Observer
- **Created at** (Date): For table view sorting

**Workflow States**: Backlog → Ready → In Progress → In Review → Done

**Views**:

- Main Board: Kanban flow showing all work by Status
- Backlog: Grouped by Epic/Priority for planning
- All Issues: Table view sorted by Created at
- Optional Epic-specific filtered views

**Automation**:

- Auto-add new issues to project (Status: Backlog)
- Auto-close issue when status → Done
- Auto-complete when PR merged → Done
- Auto-add sub-issues to project

**Estimation Policy**: Tasks estimated >8 supply must be decomposed into smaller, manageable tickets

**Rationale**:

- Kanban better suited for part-time solo development (5-10 hrs/week)
- Single Select for Supply Cost enforces valid values, prevents estimation drift
- Private visibility allows development without public scrutiny until launch-ready
- Comprehensive automation reduces manual overhead

**Consequences**:

- Must manually move items between In Progress and In Review states (limited GitHub automation)
- May need GitHub Actions for more advanced automation later

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

_"Decisions recorded in the archives. The Khala remembers all."_
