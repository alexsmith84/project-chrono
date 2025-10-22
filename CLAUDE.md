# Project Chrono Development Workflow

Welcome to Project Chrono! This file guides you through the correct process for working on tickets with us.

**TL;DR**: Every ticket needs 3 docs before coding. Git hooks, GitHub Actions, and Claude Code work together to keep us on track.

---

## 🚀 Quick Start for New Tickets

### Phase 1: Before You Write Any Code

1. **Create GitHub issue** with title: `CHRONO-XXX: Short description`
   ```bash
   gh issue create --title "CHRONO-XXX: Feature description"
   ```

2. **Create 3 documentation files** (in this order):
   - `docs/specs/CHRONO-XXX-short-name.md` - **What** to build, **why**, acceptance criteria
   - `docs/implementation/CHRONO-XXX-guide.md` - **How** to build it (step-by-step)
   - `docs/tests/CHRONO-XXX-tests.md` - **How** to test it, test cases

3. **Update GitHub issue** to link all 3 docs in description:
   ```markdown
   ## Documentation
   - docs/specs/CHRONO-XXX-*.md
   - docs/implementation/CHRONO-XXX-guide.md
   - docs/tests/CHRONO-XXX-tests.md
   ```

4. **In Claude Code**, load ticket context:
   ```
   /ticket CHRONO-XXX
   /spec-ready
   /start-work
   ```

### Phase 2: During Implementation

1. Create feature branch: `git checkout -b CHRONO-XXX-description`
2. Follow the implementation guide **exactly** (it's there for a reason)
3. Git hooks will automatically:
   - ✅ Block commits if any docs are missing
   - ✅ Auto-inject "CHRONO-XXX: " into commit messages
   - ✅ Enforce commit message format
4. Commit after each major step (small, focused commits)
5. Run tests frequently: `bun test`

### Phase 3: After Implementation

1. Push branch: `git push origin CHRONO-XXX-description`
2. Create PR with title: `CHRONO-123: Your feature`
3. GitHub Actions will:
   - ✅ Extract ticket number from PR title
   - ✅ Verify all 3 docs exist
   - ✅ Block merge if docs missing
4. Merge when all checks pass
5. Close GitHub issue and update project board

---

## 📋 The Three-Document System

Every ticket requires exactly 3 documents:

### 1. Specification (`docs/specs/CHRONO-XXX-*.md`)

**Purpose**: Define WHAT you're building and WHY

**Contents**:
- Problem context (why are we building this?)
- Technical requirements (what needs to work)
- Acceptance criteria (how do we know it's done?)
- Architecture/design decisions
- ~300-500 words

**Example structure**:
```markdown
# CHRONO-XXX: Feature Name

## Context
Why are we building this? What problem does it solve?

## Requirements
- Requirement 1
- Requirement 2
- Requirement 3

## Technical Architecture
How should this be designed?

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
```

### 2. Implementation Guide (`docs/implementation/CHRONO-XXX-guide.md`)

**Purpose**: Define HOW to build it (step-by-step)

**Contents**:
- Prerequisites (tools, knowledge, dependencies)
- Step-by-step checklist (5-15 items)
- Common pitfalls (what can go wrong)
- Debugging tips
- ~500-800 words

**Example structure**:
```markdown
# CHRONO-XXX: Implementation Guide

## Prerequisites
- [ ] Node/Bun installed
- [ ] Database running
- [ ] Read the specification

## Step-by-Step Checklist
1. [ ] Create database schema
2. [ ] Implement API endpoint
3. [ ] Add request validation
4. [ ] Write unit tests
5. [ ] Add integration tests

## Common Pitfalls
- Pitfall 1: Description and how to avoid it
- Pitfall 2: Description and how to avoid it

## Debugging Tips
If X breaks, try Y...
```

### 3. Test Specification (`docs/tests/CHRONO-XXX-tests.md`)

**Purpose**: Define HOW to verify it works

**Contents**:
- Unit test cases (what to test)
- Integration test scenarios (end-to-end)
- Manual verification steps
- Performance requirements (if applicable)
- ~200-400 words

**Example structure**:
```markdown
# CHRONO-XXX: Test Specification

## Unit Tests
- Test case 1: description
- Test case 2: description

## Integration Tests
- Scenario 1: user does X, expects Y
- Scenario 2: user does A, expects B

## Manual Verification
1. Start dev server
2. Navigate to page
3. Verify UI renders
4. Check console for errors
```

---

## 🔧 Multi-Layer Enforcement

### Layer 1️⃣: Git Hooks (Your Local Machine)

Enforced by **Husky** when you `git commit`:

**Pre-commit hook**:
- ✅ Checks that branch name contains `CHRONO-XXX`
- ✅ Verifies all 3 docs exist
- ❌ Blocks commit if any docs missing

```bash
$ git commit -m "Add feature"
❌ Missing specification: docs/specs/CHRONO-123-*.md
🛑 Cannot commit without all 3 documentation files
```

**Prepare-commit-msg hook**:
- ✅ Automatically prefixes commit message with ticket number

```bash
# You type:
$ git commit -m "Add feature"

# Git hook transforms it to:
CHRONO-123: Add feature
```

**Commit-msg hook**:
- ✅ Enforces format: `CHRONO-XXX: Description`
- ❌ Rejects commits that don't match format

### Layer 2️⃣: GitHub Actions (Remote CI/CD)

Enforced when you create a PR:

**ticket-validation.yml workflow**:
1. Extract ticket number from PR title or branch name
2. Verify `docs/specs/CHRONO-XXX-*.md` exists
3. Verify `docs/implementation/CHRONO-XXX-guide.md` exists
4. Verify `docs/tests/CHRONO-XXX-tests.md` exists
5. ✅ Allow merge if all checks pass
6. ❌ Block merge if any check fails

**Example**:
```
PR #42: "CHRONO-123: Add feature"
  ↓
GitHub Actions runs ticket-validation.yml
  ✅ Extract ticket: CHRONO-123
  ✅ Spec found: docs/specs/CHRONO-123-feature.md
  ✅ Impl guide found: docs/implementation/CHRONO-123-guide.md
  ✅ Test spec found: docs/tests/CHRONO-123-tests.md
  ✅ All checks passed! Ready to merge
```

### Layer 3️⃣: Claude Code (IDE/Session)

Guided workflow via **CLAUDE.md** + slash commands:

**Slash commands available**:

- `/ticket CHRONO-XXX` - Load all ticket documentation and context
- `/spec-ready CHRONO-XXX` - Validate all 3 docs exist
- `/start-work` - Pre-implementation checklist before you begin

**Example**:
```
You: /ticket CHRONO-123
Claude Code:
✅ Loaded specification: docs/specs/CHRONO-123-feature.md
✅ Loaded implementation guide: docs/implementation/CHRONO-123-guide.md
✅ Loaded test specification: docs/tests/CHRONO-123-tests.md

Acceptance criteria:
1. Add API endpoint
2. Write tests
3. Update documentation
```

---

## 📚 Reference Documents

Available in every Claude Code session:

### Implementation Resources

- **Pre-Ticket Checklist** (`docs/claude/pre-ticket-checklist.md`)
  - Use before starting ANY ticket
  - Verify all prerequisites are met

- **Implementation Phases** (`docs/claude/implementation-phases.md`)
  - Understand the 3 phases: Design, Development, Completion
  - Token budgets and expectations for each phase

- **Backend Patterns** (`docs/claude/backend-patterns.md`)
  - Database migration patterns
  - API design best practices
  - Common pitfalls for backend work

- **Frontend Patterns** (`docs/claude/frontend-patterns.md`)
  - Svelte 5 runes and gotchas
  - State management with stores
  - Performance optimization tips

### Technology References

- **Svelte 5 Patterns** (`docs/reference/svelte5-patterns.md`)
  - Rune usage patterns ($state, $derived, $effect)
  - Common reactivity bugs
  - Store integration patterns

- **Bun Compatibility** (`docs/reference/bun-compatibility.md`)
  - Native RedisClient API
  - PostgreSQL client compatibility
  - WebSocket library choices

- **Tech Decisions** (`docs/reference/tech-decisions.md`)
  - Why Bun over Node
  - Why Svelte over React
  - Why PostgreSQL + TimescaleDB
  - Locked versions (no changes mid-ticket)

---

## 💡 Why This System Works

### 50-70% Token Savings

**Without specs** (discovery-driven):
- Start coding, discover issues mid-way
- Refactor, migrate frameworks, change approaches
- 15+ commits on a single ticket
- ~150k tokens (for CHRONO-016)

**With specs** (planned):
- Specify upfront what and how
- Execute the plan with minimal surprises
- 3-5 commits per ticket
- ~50k tokens (estimated saving)

### Prevents Scope Creep

When you need to deviate from the spec:
1. ✅ Document the reason
2. ✅ Create a **follow-up ticket** for the new work
3. ❌ Don't expand the current ticket

This keeps scope predictable and token usage under control.

### Clear Acceptance Criteria

Spec document includes acceptance criteria:
- You know exactly when you're done
- No ambiguity about requirements
- Team can independently verify completion

---

## 🆘 Common Problems & Solutions

### ❌ Problem: Git hook blocks my commit

**Solution**: You're missing one of the 3 required docs.

```bash
# Check which docs exist
ls docs/specs/CHRONO-XXX-*.md
ls docs/implementation/CHRONO-XXX-guide.md
ls docs/tests/CHRONO-XXX-tests.md

# If any are missing, create them first
```

**Emergency bypass** (only if absolutely necessary):
```bash
git commit --no-verify -m "Your message"  # Bypasses all hooks
```

---

### ❌ Problem: GitHub Actions blocks my PR

**Solution**: Check the workflow logs - a doc file is missing.

```bash
# On your PR page:
# 1. Click "Checks" tab
# 2. Click "ticket-validation" workflow
# 3. See which docs are missing
# 4. Add the missing file
# 5. Push again
```

---

### ❌ Problem: Commit message format rejected

**Solution**: Make sure prepare-commit-msg hook is executable.

```bash
# Verify hooks are executable
ls -lah .husky/prepare-commit-msg
# Should show: -rwxr-xr-x

# Make executable if needed
chmod +x .husky/prepare-commit-msg .husky/pre-commit .husky/commit-msg
```

---

### ❌ Problem: I need to deviate from the spec

**Solution**: Create a follow-up ticket instead.

```markdown
# CHRONO-XXX-FOLLOWUP: [Issue discovered]

Original ticket: CHRONO-XXX
Reason: [Explain what changed and why]
Estimate: [Supply cost]
```

This keeps the current ticket focused and lets future tickets address scope creep.

---

## 📊 Success Metrics

After implementation, we measure:

| Metric | Before | Target |
|--------|--------|--------|
| Documentation Compliance | 0% | 100% |
| Commits per Ticket | 15+ | <5 |
| Token Usage Variance | 200% | <25% |
| Issue Closure Time | Varies | <24h of PR merge |
| Rework Rate | Unknown | <5% |

---

## 🎯 Philosophy

> **"Failing to prepare is preparing to fail."**

This workflow enforces:
- ✅ Specs force you to think before coding
- ✅ Implementation guides prevent trial-and-error
- ✅ Test specs ensure quality from the start
- ✅ Git hooks catch issues locally
- ✅ GitHub Actions catch issues before merge
- ✅ Claude Code guides you toward best practices

The discipline here means:
- Fewer bugs
- Faster implementation
- Lower token usage
- Better code quality
- Clearer team communication

---

## 🔄 Example: Working on CHRONO-019

```bash
# 1. Create issue (will be assigned CHRONO-019)
gh issue create --title "CHRONO-019: Add webhook support"

# 2. Create 3 docs
cat > docs/specs/CHRONO-019-webhooks.md << EOF
# CHRONO-019: Webhook Support

## Context
Users need to receive real-time price updates...

## Requirements
- [requirements]

## Acceptance Criteria
- [ ] API endpoint for webhook registration
- [ ] Webhooks fire on price updates
- [ ] Retry logic for failed deliveries
EOF

cat > docs/implementation/CHRONO-019-guide.md << EOF
# Implementation Guide

## Prerequisites
- [ ] Redis pub/sub understanding
- [ ] HTTP client library familiarity

## Step-by-Step
1. [ ] Add webhook table to database
2. [ ] Create API endpoint for registration
...
EOF

cat > docs/tests/CHRONO-019-tests.md << EOF
# Test Specification

## Unit Tests
- Test webhook registration

## Integration Tests
- Test webhook delivery

## Manual Verification
- Register webhook
- Trigger price update
- Verify webhook called
EOF

# 3. Update issue to link docs
gh issue comment 42 << EOF
## Documentation
- docs/specs/CHRONO-019-webhooks.md
- docs/implementation/CHRONO-019-guide.md
- docs/tests/CHRONO-019-tests.md
EOF

# 4. Create branch and start implementation
git checkout -b CHRONO-019-webhooks

# 5. Claude Code guidance
/ticket CHRONO-019
/spec-ready
/start-work

# 6. Follow the guide step-by-step
# Git hooks will handle ticket prefixing and doc validation

# 7. Create PR when done
gh pr create --title "CHRONO-019: Add webhook support" \
  --body "Fixes #42

See documentation:
- docs/specs/CHRONO-019-webhooks.md
- docs/implementation/CHRONO-019-guide.md
- docs/tests/CHRONO-019-tests.md"

# 8. GitHub Actions verifies docs exist ✅

# 9. Merge and close
gh pr merge <pr-number>
gh issue close 42

# 10. Done! Next ticket follows same pattern
```

---

## 📖 Additional Resources

- **GitHub Issues Guide**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **API Documentation**: `docs/api/`
- **Architecture Guide**: `docs/architecture/`
- **Setup Instructions**: `docs/setup/`

---

## 💬 Questions?

Check the relevant reference guide or ask in Claude Code:
- Frontend questions? See `docs/claude/frontend-patterns.md`
- Backend questions? See `docs/claude/backend-patterns.md`
- Svelte questions? Ask for `mcp__mcp-svelte-docs__svelte_definition`

---

*"Failing to prepare is preparing to fail. Specification complete. Ready for disciplined execution."*

**May the Khala guide your commits!** ⚡
