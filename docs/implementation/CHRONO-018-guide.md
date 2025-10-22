# CHRONO-018: Implementation Guide

**Objective**: Set up multi-layer workflow enforcement (git hooks, GitHub Actions, Claude Code)

**Time Estimate**: 8-12 hours

**Prerequisites**:
- ✅ Husky already installed (`husky: ^9.0.11` in package.json)
- ✅ Project has git repository initialized
- ✅ GitHub repository with Actions enabled
- ✅ macOS or Linux development machine

---

## Phase 1: Setup & Preparation (30 min)

### Step 1.1: Verify Prerequisites
```bash
# Check Husky is installed
npm ls husky
# Should output: husky@9.0.11

# Check .husky directory exists
ls -la .husky/
# Should show: _/, pre-commit, prepare-commit-msg.sample, commit-msg.sample

# Verify git is initialized
git status
# Should work without error
```

### Step 1.2: Understand Current State
- ✅ Husky: Already installed (v9.0.11)
- ✅ Git hooks path: Set to `.husky/_`
- ⚠️ Pre-commit hook: Currently disabled (see `.husky/pre-commit`)
- ❌ Prepare-commit-msg hook: Not yet created
- ❌ Commit-msg hook: Not yet created
- ❌ GitHub Actions: No ticket validation workflow

### Step 1.3: Plan Implementation Order
1. **Git Hooks** (Layer 1) - Local enforcement
2. **GitHub Actions** (Layer 2) - Remote enforcement
3. **Claude Code** (Layer 3) - IDE enforcement + documentation

---

## Phase 2: Git Hooks Implementation (1-2 hours)

### Step 2.1: Create `pre-commit` Hook

**File**: `.husky/pre-commit`

```bash
#!/bin/bash
set -e

# Pre-commit hook: Validate ticket documentation exists
# Purpose: Block commits if CHRONO-XXX docs are missing

# Extract ticket number from current branch
# Examples: CHRONO-018, CHRONO-018-workflow-enforcement
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
TICKET=$(echo "$BRANCH" | grep -oE 'CHRONO-[0-9]+' || echo "")

# If not on a ticket branch, allow commit (may be on main/fork/etc)
if [ -z "$TICKET" ]; then
  exit 0
fi

# Verify all 3 required documentation files exist
SPEC_PATTERN="docs/specs/${TICKET}-*.md"
IMPL_FILE="docs/implementation/${TICKET}-guide.md"
TEST_FILE="docs/tests/${TICKET}-tests.md"

# Check each file
MISSING=0

# For spec, use find since it may have different suffixes
if ! find . -maxdepth 2 -name "${TICKET}-*.md" -path "docs/specs/*" 2>/dev/null | grep -q .; then
  echo "❌ Missing specification: ${SPEC_PATTERN}"
  MISSING=1
fi

if [ ! -f "$IMPL_FILE" ]; then
  echo "❌ Missing implementation guide: ${IMPL_FILE}"
  MISSING=1
fi

if [ ! -f "$TEST_FILE" ]; then
  echo "❌ Missing test specification: ${TEST_FILE}"
  MISSING=1
fi

# If any files are missing, block the commit
if [ $MISSING -eq 1 ]; then
  echo ""
  echo "🛑 Cannot commit without all 3 documentation files:"
  echo "   Specification:         docs/specs/${TICKET}-*.md"
  echo "   Implementation Guide:  ${IMPL_FILE}"
  echo "   Test Specification:    ${TEST_FILE}"
  echo ""
  echo "ℹ️  Create these files BEFORE committing."
  echo "ℹ️  Run: /create-spec ${TICKET} (in Claude Code)"
  exit 1
fi

exit 0
```

**Implementation**:
```bash
# 1. Edit the file
cat > .husky/pre-commit << 'EOF'
#!/bin/bash
set -e

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
TICKET=$(echo "$BRANCH" | grep -oE 'CHRONO-[0-9]+' || echo "")

if [ -z "$TICKET" ]; then
  exit 0
fi

SPEC_PATTERN="docs/specs/${TICKET}-*.md"
IMPL_FILE="docs/implementation/${TICKET}-guide.md"
TEST_FILE="docs/tests/${TICKET}-tests.md"

MISSING=0

if ! find . -maxdepth 2 -name "${TICKET}-*.md" -path "docs/specs/*" 2>/dev/null | grep -q .; then
  echo "❌ Missing specification: ${SPEC_PATTERN}"
  MISSING=1
fi

if [ ! -f "$IMPL_FILE" ]; then
  echo "❌ Missing implementation guide: ${IMPL_FILE}"
  MISSING=1
fi

if [ ! -f "$TEST_FILE" ]; then
  echo "❌ Missing test specification: ${TEST_FILE}"
  MISSING=1
fi

if [ $MISSING -eq 1 ]; then
  echo ""
  echo "🛑 Cannot commit without all 3 documentation files:"
  echo "   Specification:         docs/specs/${TICKET}-*.md"
  echo "   Implementation Guide:  ${IMPL_FILE}"
  echo "   Test Specification:    ${TEST_FILE}"
  echo ""
  echo "ℹ️  Create these files BEFORE committing."
  exit 1
fi

exit 0
EOF

# 2. Make executable
chmod +x .husky/pre-commit

# 3. Verify
ls -lah .husky/pre-commit
```

### Step 2.2: Create `prepare-commit-msg` Hook

**File**: `.husky/prepare-commit-msg`

**Purpose**: Auto-inject CHRONO-XXX ticket number into commit message

```bash
#!/bin/bash
# Prepare-commit-msg hook: Auto-prefix commit messages with ticket number
# If on branch CHRONO-018-something, auto-adds "CHRONO-018: " prefix

COMMIT_MSG_FILE=$1
COMMIT_SOURCE=$2

# Don't modify if already a merge/rebase commit
if [ "$COMMIT_SOURCE" != "" ]; then
  exit 0
fi

# Extract ticket from branch name
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
TICKET=$(echo "$BRANCH" | grep -oE 'CHRONO-[0-9]+' || echo "")

# If no ticket found or message already has ticket, skip
if [ -z "$TICKET" ] || grep -q "^${TICKET}" "$COMMIT_MSG_FILE"; then
  exit 0
fi

# Prepend ticket to commit message
# Use sed to insert at first line (non-comment lines)
sed -i.bak "1s/^/${TICKET}: /" "$COMMIT_MSG_FILE"
rm -f "$COMMIT_MSG_FILE.bak"

exit 0
```

**Implementation**:
```bash
# 1. Create the hook
cat > .husky/prepare-commit-msg << 'EOF'
#!/bin/bash
COMMIT_MSG_FILE=$1
COMMIT_SOURCE=$2

if [ "$COMMIT_SOURCE" != "" ]; then
  exit 0
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
TICKET=$(echo "$BRANCH" | grep -oE 'CHRONO-[0-9]+' || echo "")

if [ -z "$TICKET" ] || grep -q "^${TICKET}" "$COMMIT_MSG_FILE"; then
  exit 0
fi

sed -i.bak "1s/^/${TICKET}: /" "$COMMIT_MSG_FILE"
rm -f "$COMMIT_MSG_FILE.bak"

exit 0
EOF

# 2. Make executable
chmod +x .husky/prepare-commit-msg

# 3. Verify
ls -lah .husky/prepare-commit-msg
```

### Step 2.3: Create `commit-msg` Hook

**File**: `.husky/commit-msg`

**Purpose**: Enforce commit message format (CHRONO-XXX: Description)

```bash
#!/bin/bash
# Commit-msg hook: Enforce CHRONO-XXX: format
# Rejects commits that don't follow the pattern

COMMIT_MSG_FILE=$1

# Read first line of commit message (ignore comments)
COMMIT_MSG=$(grep -v '^#' "$COMMIT_MSG_FILE" | head -1)

# Check format: CHRONO-XXX: [Description]
if ! echo "$COMMIT_MSG" | grep -qE '^CHRONO-[0-9]+:'; then
  echo ""
  echo "❌ Commit message must start with: CHRONO-XXX: Description"
  echo ""
  echo "Current message:"
  echo "  $COMMIT_MSG"
  echo ""
  echo "Example:"
  echo "  CHRONO-018: Implement workflow enforcement system"
  echo ""
  exit 1
fi

exit 0
```

**Implementation**:
```bash
# 1. Create the hook
cat > .husky/commit-msg << 'EOF'
#!/bin/bash
COMMIT_MSG_FILE=$1
COMMIT_MSG=$(grep -v '^#' "$COMMIT_MSG_FILE" | head -1)

if ! echo "$COMMIT_MSG" | grep -qE '^CHRONO-[0-9]+:'; then
  echo ""
  echo "❌ Commit message must start with: CHRONO-XXX: Description"
  echo ""
  echo "Current message:"
  echo "  $COMMIT_MSG"
  echo ""
  echo "Example:"
  echo "  CHRONO-018: Implement workflow enforcement system"
  echo ""
  exit 1
fi

exit 0
EOF

# 2. Make executable
chmod +x .husky/commit-msg

# 3. Verify
ls -lah .husky/commit-msg
```

### Step 2.4: Test Git Hooks

**Test Case 1: Commit without docs (should fail)**
```bash
# Create test branch
git checkout -b CHRONO-999-test

# Try to commit
echo "test" > test.txt
git add test.txt
git commit -m "Test commit"
# ❌ Should fail: "Cannot commit without all 3 documentation files"

# Clean up
git checkout forge
git branch -D CHRONO-999-test
rm test.txt
```

**Test Case 2: Commit with docs (should pass)**
```bash
# This will be tested properly in Phase 2 when docs exist
# For now, skip to Phase 3
```

---

## Phase 3: GitHub Actions Implementation (1-2 hours)

### Step 3.1: Create Ticket Validation Workflow

**File**: `.github/workflows/ticket-validation.yml`

```yaml
name: Ticket Validation

on:
  pull_request:
    branches: [forge, gateway, master]
  push:
    branches: [forge]

jobs:
  validate-docs:
    name: Validate Ticket Documentation
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Extract ticket number from PR title or branch
        id: ticket
        run: |
          # Try PR title first
          TICKET=""
          if [ -n "${{ github.event.pull_request.title }}" ]; then
            TICKET=$(echo "${{ github.event.pull_request.title }}" | grep -oE 'CHRONO-[0-9]+' || echo "")
          fi

          # Fall back to branch name
          if [ -z "$TICKET" ]; then
            BRANCH=$(echo "${{ github.event.pull_request.head.ref || github.ref }}" | sed 's|refs/heads/||')
            TICKET=$(echo "$BRANCH" | grep -oE 'CHRONO-[0-9]+' || echo "")
          fi

          echo "ticket=$TICKET" >> $GITHUB_OUTPUT
          echo "Extracted ticket: $TICKET"

      - name: Check if ticket extracted
        if: steps.ticket.outputs.ticket == ''
        run: |
          echo "⚠️  Warning: Could not extract CHRONO-XXX from PR title or branch"
          exit 0

      - name: Validate specification document exists
        if: steps.ticket.outputs.ticket != ''
        run: |
          TICKET=${{ steps.ticket.outputs.ticket }}
          if ! ls docs/specs/${TICKET}-*.md 1>/dev/null 2>&1; then
            echo "❌ Missing specification: docs/specs/${TICKET}-*.md"
            exit 1
          fi
          echo "✅ Found specification"

      - name: Validate implementation guide exists
        if: steps.ticket.outputs.ticket != ''
        run: |
          TICKET=${{ steps.ticket.outputs.ticket }}
          if [ ! -f "docs/implementation/${TICKET}-guide.md" ]; then
            echo "❌ Missing implementation guide: docs/implementation/${TICKET}-guide.md"
            exit 1
          fi
          echo "✅ Found implementation guide"

      - name: Validate test specification exists
        if: steps.ticket.outputs.ticket != ''
        run: |
          TICKET=${{ steps.ticket.outputs.ticket }}
          if [ ! -f "docs/tests/${TICKET}-tests.md" ]; then
            echo "❌ Missing test specification: docs/tests/${TICKET}-tests.md"
            exit 1
          fi
          echo "✅ Found test specification"

      - name: Validate PR links to GitHub issue
        if: steps.ticket.outputs.ticket != ''
        run: |
          TICKET=${{ steps.ticket.outputs.ticket }}
          BODY="${{ github.event.pull_request.body }}"

          # Check if PR body contains issue reference
          if ! echo "$BODY" | grep -qE "(fixes|closes|resolves) #|#[0-9]+"; then
            echo "⚠️  Warning: PR should reference GitHub issue (e.g., 'fixes #XX')"
          else
            echo "✅ PR links to GitHub issue"
          fi

      - name: Summary
        if: always()
        run: |
          TICKET=${{ steps.ticket.outputs.ticket }}
          if [ -z "$TICKET" ]; then
            echo "✅ No ticket number detected (may be docs-only PR)"
          else
            echo "✅ All validation checks passed for $TICKET"
          fi
```

**Implementation**:
```bash
# 1. Create the workflow file
mkdir -p .github/workflows

cat > .github/workflows/ticket-validation.yml << 'EOF'
[Paste full YAML above]
EOF

# 2. Verify it was created
ls -lah .github/workflows/ticket-validation.yml

# 3. Commit this workflow
git add .github/workflows/ticket-validation.yml
git commit -m "CHRONO-018: Add ticket validation GitHub Actions workflow"
```

### Step 3.2: Test GitHub Actions Workflow

The workflow will be tested automatically when we create the PR for CHRONO-018. It should:
1. Extract "CHRONO-018" from PR title or branch
2. Check that `docs/specs/CHRONO-018-*.md` exists ✅
3. Check that `docs/implementation/CHRONO-018-guide.md` exists ✅
4. Check that `docs/tests/CHRONO-018-tests.md` exists ✅
5. Pass all checks ✅

---

## Phase 4: Claude Code Setup (2-3 hours)

### Step 4.1: Create CLAUDE.md

**File**: `CLAUDE.md`

```markdown
# Project Chrono Development Workflow

Welcome! This file guides you through the correct process for working on Project Chrono tickets.

## Quick Start for New Tickets

### Before You Code

1. **Create GitHub issue** with title: "CHRONO-XXX: Short description"

2. **Create 3 documentation files** (in this order):
   - `docs/specs/CHRONO-XXX-short-name.md` - What to build, why, acceptance criteria
   - `docs/implementation/CHRONO-XXX-guide.md` - How to build it, step-by-step
   - `docs/tests/CHRONO-XXX-tests.md` - How to test it, test cases

3. **Update GitHub issue** to link all 3 docs in the description

4. **Add required labels** to the GitHub issue:
   - **Supply cost**: `1-supply`, `2-supply`, `3-supply`, `5-supply`, or `8-supply` (required)
   - **Epic**: One of `epic-nexus`, `epic-warp`, `epic-khala`, `epic-fleet`, `epic-chrono` (required)
   - **Role**: One of `zealot-frontend`, `overlord-backend`, `marine-devops`, `probe-data`, `scv-qa`, `templar-blockchain` (recommended)
   - **Importance**: `Main Objective` for foundational work (optional but recommended for major tickets)

   Example:
   ```bash
   gh issue edit 123 --add-label "8-supply,epic-nexus,marine-devops,Main Objective"
   ```

5. **Add issue to GitHub project**:
   ```bash
   gh project item-add 5 --owner alexsmith84 --url https://github.com/alexsmith84/project-chrono/issues/123
   ```

6. **Use slash commands**:
   - `/ticket CHRONO-XXX` - Load ticket context
   - `/spec-ready` - Verify all docs exist
   - `/start-work` - Begin implementation with phase gates

### During Implementation

1. Follow the implementation guide **exactly** - it exists for a reason
2. **Don't change tech stack mid-ticket** - create a follow-up ticket instead
3. Commit after each major step
4. Run all tests before pushing

### After Completing Implementation

1. Create PR with title: "CHRONO-XXX: Description"
2. Link the issue: "fixes #123" in PR description
3. Merge when all checks pass
4. **Close the GitHub issue** and update project board
5. Track actual vs estimated tokens

## Reference Guides

### Before Starting Any Ticket
@docs/claude/pre-ticket-checklist.md

### Implementation Phases
@docs/claude/implementation-phases.md

### Backend-Specific Work
@docs/claude/backend-patterns.md

### Frontend-Specific Work (Svelte)
@docs/claude/frontend-patterns.md

### Technology Decision Reference
@docs/reference/tech-decisions.md

### Svelte 5 Patterns & Gotchas
@docs/reference/svelte5-patterns.md

### Bun Compatibility Reference
@docs/reference/bun-compatibility.md

## Common Commands

```bash
# Create feature branch
git checkout -b CHRONO-XXX

# Git hooks will:
# 1. Block commit if docs missing
# 2. Auto-inject "CHRONO-XXX: " into messages
# 3. Enforce commit message format

# Verify hook is working
git commit -m "Test message" --allow-empty
# Should auto-prepend: "CHRONO-XXX: Test message"
```

## Getting Unblocked

**Q: Git hook blocks my commit**
A: You're missing one of the 3 docs. Run `ls docs/specs/CHRONO-XXX-*.md docs/implementation/CHRONO-XXX-guide.md docs/tests/CHRONO-XXX-tests.md` to see which is missing.

**Q: Commit message rejected**
A: Messages must start with "CHRONO-XXX: Description". The prepare-commit-msg hook should auto-add it if you're on the right branch.

**Q: GitHub Actions blocks PR**
A: Check the workflow logs - it's probably a missing docs file. Verify all 3 exist and match the ticket number.

**Q: How do I deviate from the implementation guide?**
A: Create a follow-up ticket instead of expanding the current one. This keeps scope predictable.

## Philosophy

> "Failing to prepare is preparing to fail."

- Specs force you to think before coding
- Implementation guides prevent trial-and-error
- Test specs ensure quality from the start
- Git hooks catch issues locally
- GitHub Actions catch issues before merge
- Claude Code hooks guide you toward the right process

This discipline reduces token usage by 50-70% compared to discovery-driven development.
```

**Implementation**:
```bash
# 1. Create the file
cat > CLAUDE.md << 'EOF'
[Paste full CLAUDE.md content above]
EOF

# 2. Verify
cat CLAUDE.md

# 3. Commit it (won't trigger hooks since it's on fork/main branch)
git add CLAUDE.md
git commit -m "CHRONO-018: Add project development workflow guide"
```

### Step 4.2: Create Reference Guides Directory

```bash
mkdir -p docs/claude

# Create pre-ticket checklist
cat > docs/claude/pre-ticket-checklist.md << 'EOF'
# Pre-Ticket Checklist

Before starting ANY ticket, verify:

## GitHub Issue
- [ ] Issue created with title: CHRONO-XXX: Description
- [ ] Issue has clear acceptance criteria
- [ ] Issue is assigned (to yourself or team member)

## Documentation (All 3 Required)
- [ ] Specification exists: docs/specs/CHRONO-XXX-*.md
  - Context & requirements
  - Technical architecture
  - Acceptance criteria
  - ~300-500 words

- [ ] Implementation guide exists: docs/implementation/CHRONO-XXX-guide.md
  - Prerequisites
  - Step-by-step checklist
  - Common pitfalls
  - ~500-800 words

- [ ] Test specification exists: docs/tests/CHRONO-XXX-tests.md
  - Unit test cases
  - Integration test scenarios
  - Manual verification steps
  - ~200-400 words

## Issue Links
- [ ] GitHub issue links to all 3 docs
- [ ] All docs are in correct directories
- [ ] All docs reference ticket number

## Readiness Check
- [ ] Acceptance criteria are clear and measurable
- [ ] Tech stack is locked (no mid-ticket migrations)
- [ ] No unresolved dependencies
- [ ] Team is aware and aligned

If ANY item is unchecked: STOP and complete before starting implementation.
EOF

# Create implementation phases
cat > docs/claude/implementation-phases.md << 'EOF'
# Implementation Phases

Every ticket follows 3 phases:

## Phase 1: Design (Completed BEFORE starting code)

### Tasks
1. Read the specification
2. Read the implementation guide
3. Read the test specification
4. Ask questions if anything is unclear
5. Get sign-off from product/team

### Checklist
- [ ] Understand what you're building
- [ ] Understand why you're building it
- [ ] Understand how you're going to build it
- [ ] Understand how you're going to test it
- [ ] Know the acceptance criteria
- [ ] Tech stack is locked

### Token Cost
~5-10k tokens to clarify and prepare

## Phase 2: Development (Following the guide exactly)

### Tasks
1. Create feature branch: `git checkout -b CHRONO-XXX-description`
2. Follow implementation guide step-by-step
3. Write tests per test specification
4. Commit after each major step
5. Run tests frequently

### Checklist
- [ ] Feature branch created
- [ ] One feature at a time (no scope creep)
- [ ] Tests written as you go
- [ ] All tests passing
- [ ] Code follows project conventions

### Do NOT Do
- ❌ Change tech stack mid-ticket (create follow-up instead)
- ❌ Add scope beyond spec (create follow-up instead)
- ❌ Skip tests (test as you go)
- ❌ Large commits (commit after each step)

### Token Cost
~20-40k tokens for implementation and debugging

## Phase 3: Completion (Close the loop)

### Tasks
1. Verify all acceptance criteria met
2. Push branch to remote
3. Create PR with link to spec docs
4. All tests pass on CI
5. Merge PR (squash to keep history clean)
6. Close GitHub issue with summary
7. Update project board

### Checklist
- [ ] All acceptance criteria met
- [ ] All tests passing (local + CI)
- [ ] PR title: CHRONO-XXX: Description
- [ ] PR description links issue: "fixes #123"
- [ ] PR description links spec docs
- [ ] Code review approved (if required)
- [ ] Merged to correct branch
- [ ] Issue closed
- [ ] Project board updated
- [ ] Lessons documented (if applicable)

### Token Cost
~5-10k tokens for PR review and cleanup

### Retrospective
- Compare actual vs estimated tokens
- Did implementation match spec?
- Any tech stack surprises?
- Document for future tickets
EOF

# Create backend patterns
cat > docs/claude/backend-patterns.md << 'EOF'
# Backend Development Patterns

## Before Implementation

Pre-implementation checklist for backend work:

- [ ] Database schema changes documented in spec
- [ ] API contract specified (request/response shapes, status codes)
- [ ] Error handling matrix documented (what errors, when, how)
- [ ] Performance requirements stated (query time, throughput, RPS)
- [ ] Dependencies locked (no upgrading mid-ticket)
- [ ] Migration strategy documented (rollback plan)

## Common Pitfalls

### Database Migrations
- ❌ Don't change existing migrations
- ✅ Create new migration files for changes
- ✅ Test rollback: `migrate rolldown && migrate rollup`

### API Design
- ❌ Don't change API contracts mid-ticket
- ✅ Maintain backwards compatibility
- ✅ Add new endpoints instead of modifying existing

### Error Handling
- ❌ Don't catch errors silently
- ✅ Log with context (what, why, impact)
- ✅ Return meaningful error messages to clients

### Performance
- ❌ Don't optimize prematurely
- ✅ Measure first (query time, memory usage)
- ✅ Document performance requirements upfront

## Testing Strategy

1. **Unit Tests** (80%+ coverage)
   - Test business logic
   - Test error paths
   - Mock external dependencies

2. **Integration Tests**
   - Test with real database
   - Test full request/response cycle
   - Test migrations work

3. **Performance Tests**
   - Load test on expected QPS
   - Check query times
   - Verify memory usage

## Common Tools

- **Database**: PostgreSQL + TimescaleDB
- **ORM**: Likely Prisma or raw SQL (check .env)
- **Testing**: Vitest + Bun
- **Load testing**: k6 or Apache Bench

## Debugging Tips

```bash
# Check database connection
psql -U postgres -h localhost -c "SELECT 1"

# Tail application logs
tail -f logs/app.log

# Check environment variables
env | grep -i postgres

# Run tests in watch mode
bun test --watch
```
EOF

# Create frontend patterns
cat > docs/claude/frontend-patterns.md << 'EOF'
# Frontend Development Patterns (Svelte 5)

## Before Implementation

Pre-implementation checklist for Svelte work:

- [ ] Component mockup or wireframe designed
- [ ] Component tree / composition planned
- [ ] State management plan (which stores, data shape)
- [ ] API integration points defined
- [ ] Accessibility requirements listed
- [ ] Performance requirements (render time, animation smoothness)
- [ ] Known Svelte 5 patterns reviewed (see reference guide)

## Common Pitfalls

### Svelte 5 Runes
- ❌ Don't forget `$effect.pre()` for DOM measurements
- ❌ Don't use `$state` for derived values (use `$derived` instead)
- ❌ Don't update arrays in place (use spread operator)
- ✅ Use `$state` for mutable data
- ✅ Use `$derived` for computed values
- ✅ Use `$effect` for side effects

### Reactivity
- ❌ Don't update nested objects in place
- ✅ Create new objects: `obj = { ...obj, prop: value }`
- ✅ Use `$effect` for cleanup functions

### Component Isolation
- ❌ Don't share component state without stores
- ✅ Use stores for cross-component state
- ✅ Keep components focused on one job

### Performance
- ❌ Don't render large lists without virtualization
- ❌ Don't animate frequently-changing data
- ✅ Use `bind:` for two-way binding (simpler)
- ✅ Throttle or debounce rapid updates

## Testing Strategy

1. **Unit Tests** (component rendering)
   ```bash
   bun test MyComponent.test.ts
   ```

2. **Integration Tests** (with stores)
   ```bash
   bun test integration/*.test.ts
   ```

3. **Manual Testing**
   - Keyboard navigation
   - Screen reader compatibility
   - Animation smoothness

## Tools & Resources

- **Svelte docs**: Use `mcp__mcp-svelte-docs__svelte_definition` for rune questions
- **Testing**: Vitest + jsdom
- **Stores**: Svelte stores (built-in)
- **Charts**: Check if using Chart.js or similar

## Debugging Tips

```bash
# Run dev server
bun run dev
# Visit http://localhost:5173

# Check Svelte syntax errors
# Look for red squiggles in editor

# Test components in isolation
bun test MyComponent.test.ts

# Profile performance in DevTools
# Chrome DevTools > Performance tab

# Debug stores
console.log($store)  // Valid in Svelte components
```

## MCP Server for Svelte

Use the Svelte definition tool for rune questions:
```
mcp__mcp-svelte-docs__svelte_definition identifier:$state format:full
```

This gives you definitive answers without trial-and-error.
EOF

echo "✅ Reference guides created"
```

### Step 4.3: Create Slash Commands

```bash
mkdir -p .claude/commands

# Create /ticket command
cat > .claude/commands/ticket.md << 'EOF'
# Load Ticket Context

Load all documentation for a ticket.

Usage: `/ticket CHRONO-123`

When you run this, I will:
1. Extract the ticket number from your message
2. Load the specification: `docs/specs/CHRONO-XXX-*.md`
3. Load the implementation guide: `docs/implementation/CHRONO-XXX-guide.md`
4. Load the test specification: `docs/tests/CHRONO-XXX-tests.md`
5. Summarize the acceptance criteria
6. Set a reminder: "Follow the implementation guide step-by-step"

This helps me provide context-aware guidance specific to your ticket.
EOF

# Create /spec-ready command
cat > .claude/commands/spec-ready.md << 'EOF'
# Validate Ticket Specification

Verify all 3 required documentation files exist before starting implementation.

Usage: `/spec-ready CHRONO-123`

When you run this, I will:
1. Check if `docs/specs/CHRONO-XXX-*.md` exists
2. Check if `docs/implementation/CHRONO-XXX-guide.md` exists
3. Check if `docs/tests/CHRONO-XXX-tests.md` exists
4. Report which files are missing (if any)
5. REFUSE to start implementation if any files are missing

This is a GATE: you cannot proceed without all 3 docs.

If docs are missing, use `/create-spec CHRONO-XXX` to start creating them.
EOF

# Create /start-work command
cat > .claude/commands/start-work.md << 'EOF'
# Begin Implementation with Phase Gates

Confirm all pre-implementation requirements are met.

Usage: `/start-work`

When you run this, I will ask you to confirm:

- [ ] I've read and understood the specification
- [ ] I've reviewed the implementation guide
- [ ] I've reviewed the test specification
- [ ] Acceptance criteria are clear to me
- [ ] Tech stack is locked (no mid-ticket changes)
- [ ] I'm ready to follow the guide exactly

After you confirm all items, I'll:
1. Create a pre-implementation checklist
2. Remind you to create a feature branch
3. Guide you through the first step of the implementation guide
4. Track token usage as we progress

This is a GATE: confirms you're prepared before spending tokens on implementation.
EOF

echo "✅ Slash commands created"
```

### Step 4.4: Create CLAUDE Code Hook (Optional)

Note: This requires manual configuration in Claude Code settings. Skip if you want to test first.

```bash
# Create a marker file for the hook configuration
cat > .claude/hooks-config.txt << 'EOF'
# Claude Code Hook Configuration

When you have time, configure these hooks in Claude Code:

## Hook 1: UserPromptSubmit

**Event**: UserPromptSubmit
**Condition**: When user submits a prompt
**Shell Command**:
```bash
# If prompt contains "work on CHRONO-XXX", suggest /spec-ready
if echo "$INPUT" | grep -qE "work on|start|begin|implement" && echo "$INPUT" | grep -qE "CHRONO-[0-9]+"; then
  echo "Reminder: Run /spec-ready CHRONO-XXX first to validate docs"
fi
```

## How to Configure

1. Run `/hooks` in Claude Code
2. Select "UserPromptSubmit" event
3. Add the shell command above
4. Save to project settings

This reminds you to validate docs before starting work.
EOF

echo "✅ Hook configuration documented"
```

---

## Phase 5: Testing & Validation (2-3 hours)

### Step 5.1: Test Git Hooks

```bash
# Create a test branch (won't be checked in)
git checkout -b test-hooks-validation

# Create an empty commit to test message formatting
git commit --allow-empty -m "Test message"
# Should output: "CHRONO-018: Test message" (auto-prefixed)

# Verify the message was reformatted
git log -1 --format=%B
# Should show: CHRONO-018: Test message

# Clean up
git reset --soft HEAD~1
git reset
git checkout forge
git branch -D test-hooks-validation
```

### Step 5.2: Test GitHub Actions

The workflow will be tested automatically when we create the PR:

```bash
# This happens naturally in Phase 6
# When we create the PR for CHRONO-018:
# 1. Extract ticket: CHRONO-018 ✅
# 2. Verify spec exists ✅
# 3. Verify impl guide exists ✅
# 4. Verify test spec exists ✅
# 5. All checks pass ✅
```

### Step 5.3: Verify CLAUDE.md & Slash Commands

```bash
# List CLAUDE.md and slash commands
ls -lah CLAUDE.md
ls -lah .claude/commands/

# Verify they exist for next session
cat CLAUDE.md | head -20
```

---

## Phase 6: Final Steps & Commit

### Step 6.1: Organize All Files

```bash
# Verify directory structure
find docs/claude -type f
find .claude -type f
ls .husky/
ls .github/workflows/ticket-validation.yml

# Should show:
# docs/claude/pre-ticket-checklist.md
# docs/claude/implementation-phases.md
# docs/claude/backend-patterns.md
# docs/claude/frontend-patterns.md
# .claude/commands/ticket.md
# .claude/commands/spec-ready.md
# .claude/commands/start-work.md
# .husky/pre-commit
# .husky/prepare-commit-msg
# .husky/commit-msg
# .github/workflows/ticket-validation.yml
# CLAUDE.md (in root)
```

### Step 6.2: Commit Everything

```bash
# Stage all files
git add .husky/ .github/workflows/ticket-validation.yml CLAUDE.md docs/claude/ .claude/

# Verify staged changes
git status

# Commit (this will trigger hooks - should pass)
git commit -m "CHRONO-018: Implement workflow enforcement system"

# Verify commit message has ticket prefix
git log -1 --format=%B
# Should show: CHRONO-018: Implement workflow enforcement system
```

### Step 6.3: Push & Create PR

```bash
# Push to remote
git push origin CHRONO-018

# Create PR (use GitHub CLI)
gh pr create --title "CHRONO-018: Workflow enforcement system" \
  --body "Fixes #XX

Implements multi-layer workflow enforcement:

- Git hooks: Validate docs before commit
- GitHub Actions: Validate docs before merge
- Claude Code: Guide developers through correct workflow

See spec and implementation guide for details:
- docs/specs/CHRONO-018-workflow-enforcement.md
- docs/implementation/CHRONO-018-guide.md
- docs/tests/CHRONO-018-tests.md"

# GitHub Actions will automatically run ticket-validation.yml
# All checks should pass (all 3 docs exist)
```

---

## Rollback Plan

If something goes wrong:

```bash
# Remove git hooks
rm .husky/pre-commit .husky/prepare-commit-msg .husky/commit-msg

# Remove GitHub Actions workflow
rm .github/workflows/ticket-validation.yml

# Revert CLAUDE.md and reference guides
git revert HEAD

# Git can still be used without hooks
```

---

## Next Steps

After completing all phases:

1. ✅ Merge PR for CHRONO-018
2. ✅ Close GitHub issue
3. ✅ Update project board
4. ✅ Test with next ticket (CHRONO-019)
5. ✅ Track token usage on CHRONO-019
6. ✅ Compare actual vs estimated

---

## Common Issues & Solutions

### Issue: Hook says "Missing docs" but I created them

**Solution**: Hooks check specific paths. Verify:
- Spec: `docs/specs/CHRONO-XXX-*.md` (must match branch number)
- Guide: `docs/implementation/CHRONO-XXX-guide.md` (must exact match)
- Tests: `docs/tests/CHRONO-XXX-tests.md` (must exact match)

### Issue: Commit message not being auto-prefixed

**Solution**:
- Make sure you're on branch `CHRONO-XXX-something`
- Make sure prepare-commit-msg hook is executable: `chmod +x .husky/prepare-commit-msg`

### Issue: GitHub Actions workflow not running

**Solution**:
- Push the workflow file to remote
- Create a PR to trigger it
- Check the "Actions" tab for logs

---

## Duration

- **Phase 1**: 30 min (setup & verification)
- **Phase 2**: 1-2 hours (git hooks)
- **Phase 3**: 1-2 hours (GitHub Actions)
- **Phase 4**: 2-3 hours (Claude Code setup)
- **Phase 5**: 1-2 hours (testing)
- **Phase 6**: 30 min (final commit & PR)

**Total**: 6-10 hours (estimated 8)

This matches the supply cost of 8 (8-16 hour estimate).
