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
