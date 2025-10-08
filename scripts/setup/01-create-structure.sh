#!/bin/bash

# Project Chrono - Repository Structure Setup
# Script 1 of 3: Create directory structure and basic files
# 
# "Constructing additional pylons..."

set -e  # Exit on any error

echo "🏗️  PROJECT CHRONO - STRUCTURE SETUP"
echo "=================================="
echo ""

# Color output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create main directory structure
echo -e "${BLUE}Creating directory structure...${NC}"

# GitHub
mkdir -p .github/ISSUE_TEMPLATE
mkdir -p .github/workflows

# Documentation
mkdir -p docs/architecture/decisions
mkdir -p docs/workflow
mkdir -p docs/setup
mkdir -p docs/specs
mkdir -p docs/implementation
mkdir -p docs/tests
mkdir -p docs/business

# Scripts
mkdir -p scripts/reference
mkdir -p scripts/setup
mkdir -p scripts/helpers
mkdir -p scripts/deployment

# Source code
mkdir -p src/oracle/rust
mkdir -p src/oracle/typescript
mkdir -p src/api/typescript
mkdir -p src/workers/typescript
mkdir -p src/blockchain/rust
mkdir -p src/shared/rust/types
mkdir -p src/shared/typescript/utils

# Apps
mkdir -p apps/dashboard/src/routes
mkdir -p apps/dashboard/src/lib
mkdir -p apps/dashboard/src/components
mkdir -p apps/dashboard/static

# Tests
mkdir -p tests/unit/rust
mkdir -p tests/unit/typescript
mkdir -p tests/integration/api
mkdir -p tests/integration/oracle
mkdir -p tests/e2e/dashboard

# Config
mkdir -p config/development
mkdir -p config/staging
mkdir -p config/production

# Migrations
mkdir -p migrations

echo -e "${GREEN}✓ Directory structure created${NC}"
echo ""

# Create .gitignore
echo -e "${BLUE}Creating .gitignore...${NC}"

cat > .gitignore << 'EOF'
# Environment files
.env
.env.local
.env.*.local

# Development databases
*.db
*.sqlite

# Rust
target/
Cargo.lock
**/*.rs.bk
*.pdb

# TypeScript/JavaScript
node_modules/
dist/
build/
.next/
.turbo/
*.tsbuildinfo
.cache/

# Bun
.bun/
bun.lockb

# Test coverage
coverage/
*.lcov
.nyc_output/

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# OS
.DS_Store
Thumbs.db
desktop.ini

# Temporary files
*.tmp
*.temp
.temp/

# Build artifacts
*.wasm
*.exe

# Secrets (double-check these never get committed)
*.pem
*.key
*.cert
secrets/
.secrets/

# Database dumps
*.dump
*.sql.gz

# Production configs (use templates instead)
config/production/*.yaml
!config/production/*.example.yaml
EOF

echo -e "${GREEN}✓ .gitignore created${NC}"
echo ""

# Create placeholder READMEs
echo -e "${BLUE}Creating README files...${NC}"

# docs/architecture/README.md
cat > docs/architecture/README.md << 'EOF'
# Architecture Documentation

This directory contains comprehensive architecture documentation for Project Chrono.

## Documents

- `system-design.md` - Complete system architecture and component design
- `networking.md` - Caddy configuration and domain routing
- `data-flow.md` - How data moves through the system
- `decisions/` - Architecture Decision Records (ADRs)

## Reading Order

1. Start with `system-design.md` for the big picture
2. Review `data-flow.md` to understand information flow
3. Check `networking.md` for deployment details
4. Explore `decisions/` for rationale behind key choices

---

*"The architecture of the Protoss, refined over millennia."*
EOF

# docs/specs/README.md
cat > docs/specs/README.md << 'EOF'
# Specification Directory

This directory contains detailed specifications for all Project Chrono features.

## Structure

Each ticket has a corresponding specification file: `CHRONO-XXX-[description].md`

## Using the Spec Template

1. Copy `SPEC-TEMPLATE.md` to create a new spec
2. Fill in all sections thoroughly
3. Link the spec from the GitHub issue
4. Update as requirements evolve

## Spec Format

- **Context & Requirements**: Why this exists, what it must do
- **Technical Architecture**: How it fits into the system
- **Implementation Details**: Technology stack, algorithms, data structures
- **Testing Requirements**: How to verify it works
- **Acceptance Criteria**: When is it truly done

## For Implementing Agents

Read the entire spec before starting implementation. The spec provides:
- Complete context for the feature
- Technical details and constraints
- Error handling scenarios
- Performance requirements
- Security considerations

---

*"The Khala provides clarity. Follow the specification illuminated."*
EOF

# docs/implementation/README.md
cat > docs/implementation/README.md << 'EOF'
# Implementation Guides

Step-by-step implementation guides for Project Chrono features.

## Purpose

While specs define **WHAT** to build, implementation guides define **HOW** to build it:

- Prerequisites and setup steps
- Detailed implementation checklist
- Code examples and patterns
- Common pitfalls and solutions
- Debugging guidance
- Verification steps

## Using Implementation Guides

1. Read the corresponding spec first (`docs/specs/CHRONO-XXX-*.md`)
2. Follow the implementation guide step-by-step
3. Check off items as you complete them
4. Refer to debugging section if stuck
5. Verify completion per the guide's checklist

## Template

Use `IMPL-TEMPLATE.md` as the starting point for all implementation guides.

---

*"The path is illuminated. Follow these steps to victory."*
EOF

# docs/tests/README.md
cat > docs/tests/README.md << 'EOF'
# Test Specifications

Comprehensive test specifications for all Project Chrono features.

## Coverage

Every ticket has an associated test specification that includes:

- **Unit Tests**: Testing individual functions/components
- **Integration Tests**: Testing component interactions
- **Performance Tests**: Load, stress, and soak testing
- **Security Tests**: Authentication, authorization, input validation
- **Manual Verification**: For infrastructure and configuration tickets

## Test Strategy

- Unit tests run on every commit
- Integration tests run on PR creation
- Performance tests run before deployment
- Security tests run weekly and before releases

## Using Test Specs

1. Write test spec alongside feature spec
2. Implement tests before or during feature development (TDD encouraged)
3. All tests must pass before merging
4. Update test spec when requirements change

## Template

Use `TEST-TEMPLATE.md` for creating new test specifications.

---

*"The Observer sees all. No defect shall remain cloaked."*
EOF

# docs/workflow/README.md
cat > docs/workflow/README.md << 'EOF'
# Workflow Documentation

Development processes and workflows for Project Chrono.

## Documents

- `ticket-creation.md` - How to create and specify tickets
- `development-process.md` - Step-by-step development workflow
- `deployment.md` - Production deployment procedures

## Standard Workflow

1. **Planning**: Identify feature/fix needed
2. **Specification**: Write comprehensive spec
3. **Implementation Guide**: Create step-by-step guide
4. **Test Spec**: Define test requirements
5. **Ticket Creation**: Create GitHub issue with links
6. **Development**: Implement using Claude Code
7. **Testing**: Verify per test spec
8. **Review**: Human review and approval
9. **Deployment**: Ship to production
10. **Documentation**: Update logs and learnings

---

*"Disciplined warriors. Precise execution. Victory assured."*
EOF

# docs/setup/README.md
cat > docs/setup/README.md << 'EOF'
# Setup Documentation

Infrastructure and environment setup guides.

## Documents

- `mac-mini-setup.md` - Complete Mac Mini M4 Pro configuration
- `cloudflare-workers.md` - Edge worker deployment guide
- `production-deployment.md` - Production environment setup

## Setup Order

1. **Development Environment**: Follow `mac-mini-setup.md`
2. **Edge Layer**: Configure workers per `cloudflare-workers.md`
3. **Production**: Deploy using `production-deployment.md`

## Prerequisites

- Mac Mini M4 Pro (or equivalent hardware)
- macOS Sonoma or later
- Domain name configured (`hayven.xyz`)
- Cloudflare account
- GitHub account

---

*"Construct additional infrastructure!"*
EOF

# docs/business/README.md
cat > docs/business/README.md << 'EOF'
# Business Intelligence & Tracking

Financial models and performance tracking for Project Chrono.

## Spreadsheets

- `pnl-model.xlsx` - P&L projections and break-even analysis
- `infrastructure-costs.xlsx` - Cost modeling and scaling scenarios
- `ftso-metrics.xlsx` - Performance tracking (post-MVP)
- `delegation-tracking.xlsx` - User growth and market share (post-MVP)

## Key Metrics

### Financial
- Monthly operating costs: $70-220 (MVP), $225-525 (Growth)
- Break-even delegation: 50-100M FLR at current prices
- Revenue per delegation: Based on FLR price and accuracy

### Performance
- Submission success rate: Target 99.9%
- Price accuracy: Target top 25% of providers
- Uptime: Target 99.9%

### Growth
- Total delegation: Track toward 100M+ FLR goal
- Market share: Target 5%+ of FTSO voting power
- User count: Delegators and API consumers

## P&L Scenarios

Model different FLR price scenarios:
- Current ($0.021): Break-even requires high delegation
- Recovery ($0.05): Profitable at 50M FLR
- Bull market ($0.10+): Significant returns possible

---

*"We require more minerals... and accurate financial projections!"*
EOF

echo -e "${GREEN}✓ README files created${NC}"
echo ""

# Create IMPLEMENTATION_LOG.md
echo -e "${BLUE}Creating IMPLEMENTATION_LOG.md...${NC}"

cat > IMPLEMENTATION_LOG.md << 'EOF'
# Implementation Log

Track progress, learnings, and decisions as we build Project Chrono.

## How to Use This Log

After completing each ticket:
1. Add entry with ticket number and title
2. Note key learnings and challenges
3. Document any deviations from spec
4. Record time spent and actual vs estimated complexity

---

## Repository Setup

### Initial Structure (Current)
- **Date**: [Current Date]
- **Status**: In Progress
- **Actions**:
  - Initialized repository with `khala` as main branch
  - Created comprehensive blueprint document
  - Set up modular bootstrap scripts
- **Next**: Execute CHRONO-001 (GitHub Projects Setup)

---

## Tickets

### CHRONO-001: GitHub Projects Setup
- **Started**: TBD
- **Status**: Not Started
- **Epic**: Nexus Construction
- **Supply Cost**: 2 (Stalker)
- **Notes**: Will configure custom fields, columns, and views

### CHRONO-002: Repo Structure & Templates
- **Started**: TBD
- **Status**: Not Started
- **Epic**: Nexus Construction
- **Supply Cost**: 3 (High Templar)
- **Notes**: Bootstrap scripts partially complete

---

## Decisions Log

### Repository Setup Decisions
- **[Date]**: Chose `khala` as main branch name (Protoss theme)
- **[Date]**: Selected function-first organization with language subdirs
- **[Date]**: Decided on modular documentation structure (Option B)
- **[Date]**: Oracle for Data Engineering, Observer for QA/Testing roles
- **[Date]**: Primary development tool: Claude Code

### Architecture Decisions
- **[Date]**: Hybrid edge (Cloudflare) + self-hosted (Mac Mini) approach
- **[Date]**: Multi-language stack: Rust + TypeScript + Deno + SvelteKit
- **[Date]**: PostgreSQL + TimescaleDB over ClickHouse for MVP
- **[Date]**: Bun runtime for TypeScript (3x faster than Node.js)

---

## Velocity Tracking

### Week 1 (TBD)
- **Supply Points Committed**: TBD
- **Supply Points Completed**: TBD
- **Hours Invested**: TBD
- **Learnings**: TBD

---

## Technical Learnings

### Development Environment
- [Add learnings about Mac Mini setup, tools, etc.]

### Architecture
- [Add insights about system design decisions]

### Performance
- [Add performance optimization discoveries]

---

*"Knowledge is power. Document everything. En Taro Tassadar!"*
EOF

echo -e "${GREEN}✓ IMPLEMENTATION_LOG.md created${NC}"
echo ""

# Create basic Cargo.toml for Rust workspace
echo -e "${BLUE}Creating Cargo.toml (Rust workspace)...${NC}"

cat > Cargo.toml << 'EOF'
[workspace]
resolver = "2"

members = [
    "src/oracle/rust",
    "src/blockchain/rust",
    "src/shared/rust",
]

[workspace.package]
version = "0.1.0"
edition = "2021"
authors = ["Project Chrono Team"]
license = "MIT"

[workspace.dependencies]
tokio = { version = "1.35", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

[profile.release]
opt-level = 3
lto = true
codegen-units = 1
EOF

echo -e "${GREEN}✓ Cargo.toml created${NC}"
echo ""

# Create basic package.json for TypeScript workspace
echo -e "${BLUE}Creating package.json (TypeScript workspace)...${NC}"

cat > package.json << 'EOF'
{
  "name": "project-chrono",
  "version": "0.1.0",
  "private": true,
  "description": "StarCraft 2 themed Flare Time Series Oracle (FTSO)",
  "author": "alexsmith84",
  "license": "MIT",
  "workspaces": [
    "src/api/typescript",
    "src/oracle/typescript",
    "src/workers/typescript",
    "src/shared/typescript",
    "apps/dashboard"
  ],
  "scripts": {
    "dev": "bun run --filter '*' dev",
    "build": "bun run --filter '*' build",
    "test": "bun test",
    "lint": "eslint . --ext .ts,.tsx",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\""
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.3.0",
    "prettier": "^3.1.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "bun": ">=1.0.0"
  }
}
EOF

echo -e "${GREEN}✓ package.json created${NC}"
echo ""

# Summary
echo ""
echo "=================================="
echo -e "${GREEN}✨ STRUCTURE SETUP COMPLETE ✨${NC}"
echo "=================================="
echo ""
echo "Created:"
echo "  ✓ Complete directory structure"
echo "  ✓ .gitignore"
echo "  ✓ 7 README files (docs directories)"
echo "  ✓ IMPLEMENTATION_LOG.md"
echo "  ✓ Cargo.toml (Rust workspace)"
echo "  ✓ package.json (TypeScript workspace)"
echo ""
echo "Next steps:"
echo "  1. Run: ./scripts/setup/02-create-templates.sh"
echo "  2. Run: ./scripts/setup/03-create-docs.sh"
echo "  3. Commit: git add . && git commit -m 'Add project structure'"
echo ""
echo -e "${BLUE}En Taro Tassadar! The foundation is laid.${NC}"
echo ""