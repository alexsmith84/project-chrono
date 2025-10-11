# Development Process - Project Chrono

*"The path is clear. Follow these steps to victory."*

---

## ⚠️ Before Starting ANY Work - Critical Checklist

**Stop and verify BEFORE coding:**

- [ ] Is there an open PR on my current branch? → **Merge it first, don't continue**
- [ ] Am I on the correct base branch? (`forge` for features, `khala` for hotfixes)
- [ ] Do I have a CHRONO ticket number for this work?
- [ ] Is this a NEW feature (different CHRONO-XXX)? → **Create new branch from updated base**
- [ ] Have I read the complete spec for this ticket?

**Golden Rule: One ticket = One branch = One PR = One merge BEFORE starting next ticket**

---

## Quick Start

1. **Pick a ticket** from [Project Board](https://github.com/users/alexsmith84/projects/5)
2. **Read the spec** in `docs/specs/CHRONO-XXX-*.md`
3. **Create feature branch**: `git checkout -b warp-in/CHRONO-XXX-description forge`
4. **Implement** following `docs/implementation/CHRONO-XXX-guide.md`
5. **Run tests**: `./scripts/helpers/run-tests.sh`
6. **Commit and push** changes
7. **Create PR** to `forge` ← **DO THIS BEFORE STARTING NEXT TICKET**
8. **Review and merge**
9. **Update log** in `IMPLEMENTATION_LOG.md`

---

## Detailed Workflow

### 1. Ticket Selection

**From Project Board:**

- View [Main Board](https://github.com/users/alexsmith84/projects/5) Kanban view
- Look in "Ready" column for well-specified tickets
- Check Supply Cost matches available time
- Assign ticket to yourself

**Ticket should have:**

- Spec document (`docs/specs/CHRONO-XXX-*.md`)
- Implementation guide (`docs/implementation/CHRONO-XXX-guide.md`)
- Test specification (`docs/tests/CHRONO-XXX-tests.md`)

---

### 2. Prepare Development Environment

```bash
# Ensure you're on forge (development branch)
git checkout forge
git pull origin forge

# Create feature branch (Fibonacci-like system)
git checkout -b warp-in/CHRONO-XXX-short-description

# Example:
# git checkout -b warp-in/CHRONO-003-mac-mini-setup
```

**Branch naming:**

- `warp-in/CHRONO-XXX-description` - Feature branches
- `recall/hotfix-description` - Emergency hotfixes

---

### 3. Read Documentation

**Before coding:**

1. Read spec thoroughly (`docs/specs/CHRONO-XXX-*.md`)
2. Review implementation guide step-by-step
3. Understand test requirements (`docs/tests/CHRONO-XXX-tests.md`)
4. Note any dependencies or blockers

**Ask questions:**

- Create GitHub discussion if spec is unclear
- Update spec if requirements change
- Document decisions in commit messages

---

### 4. Implementation

**Follow implementation guide:**

- Work through steps sequentially
- Check off items as you complete them
- Make atomic commits (one logical change per commit)

**Commit message format:**

```
Short description (50 chars or less)

Longer explanation if needed. Explain what and why,
not how (code shows how).

- Bullet points OK
- Reference issues: #16

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Best practices:**

- Commit frequently (every logical unit of work)
- Write descriptive commit messages
- Keep commits focused (single responsibility)
- Reference related issues

---

### 5. Testing

**Run tests locally:**

```bash
# Run all tests
./scripts/helpers/run-tests.sh

# Run specific suite
./scripts/helpers/run-tests.sh --unit
./scripts/helpers/run-tests.sh --integration

# Run with coverage
./scripts/helpers/run-tests.sh --coverage
```

**Manual testing:**

- Follow test spec (`docs/tests/CHRONO-XXX-tests.md`)
- Verify all acceptance criteria met
- Test edge cases

**Before pushing:**

- [ ] All tests pass
- [ ] No linting errors
- [ ] Documentation updated
- [ ] Manual testing complete

---

### 6. Create Pull Request ⚠️ CRITICAL CHECKPOINT

**STOP HERE BEFORE STARTING ANY NEW WORK**

This is a **mandatory checkpoint**. You must create a PR for your current work BEFORE starting the next feature or task.

#### Why This Matters

- **One feature = One branch = One PR**
- Different CHRONO numbers = Different PRs
- Even if features are related, they should be separate PRs
- Never continue working after completing a feature without creating a PR first

#### PR Creation Checklist

- [ ] Current feature is complete and tested
- [ ] All commits are pushed to branch
- [ ] I have NOT started working on the next feature yet
- [ ] If next task has a different CHRONO-XXX number → It needs a separate PR

#### Create the PR

```bash
# Push feature branch
git push -u origin warp-in/CHRONO-XXX-description

# Create PR via GitHub CLI
gh pr create --base forge \
  --title "CHRONO-XXX: Short description" \
  --body "See docs/specs/CHRONO-XXX-*.md for details"
```

**PR should include:**

- Link to spec document
- Summary of changes
- Testing performed
- Screenshots (if UI changes)

**PR template auto-fills** - complete all sections

#### After Creating PR

**DO NOT START NEW WORK YET**

- Wait for review and approval
- Address any feedback
- Get PR merged to base branch
- Pull updated base branch locally
- **ONLY THEN** start next feature on a fresh branch

**Example: Wrong vs Right**

❌ **WRONG**:
```bash
git commit -m "Complete CHRONO-007"
# Immediately start coding CHRONO-008 on same branch
```

✅ **RIGHT**:
```bash
git commit -m "Complete CHRONO-007"
git push
gh pr create --base forge  # CREATE PR NOW
# Wait for merge
git checkout forge
git pull
git checkout -b warp-in/CHRONO-008-websocket  # Fresh branch
# NOW start CHRONO-008
```

---

### 7. Code Review

**Self-review first:**

- Read your own PR diff
- Check for debug code, console.logs, TODOs
- Verify documentation is up to date
- Run tests one more time

**Reviewer responsibilities:**

- Check code quality and style
- Verify tests are sufficient
- Confirm spec requirements met
- Test locally if complex changes

**Address feedback:**

- Make requested changes
- Push new commits to same branch
- Respond to comments
- Request re-review when ready

---

### 8. Merge to Forge

**After approval:**

- Ensure CI passes (GitHub Actions)
- Squash commits if many small fixes
- Merge PR to `forge`

**Post-merge:**

- Delete feature branch
- Move ticket to "Done" on project board
- Update `IMPLEMENTATION_LOG.md`

---

## Git-Flow Branch Strategy

### Branch Structure

```
khala (production)
  ↑
gateway (staging)
  ↑
forge (development)
  ↑
warp-in/CHRONO-XXX (features) ← work here
```

### Branch Purposes

**`khala`** - Production/Main

- Only production-ready code
- Merge via release branches
- Protected branch (no direct pushes)

**`gateway`** - Staging

- Final verification before production
- Merge from `forge` when ready for release
- Deploy to staging environment

**`forge`** - Development

- Integration branch for features
- All feature branches merge here first
- Should always be in working state

**`warp-in/*`** - Feature Branches

- Individual ticket implementation
- Branch from `forge`
- Merge back to `forge` via PR

**`recall/*`** - Hotfix Branches

- Emergency production fixes
- Branch from `khala`
- Merge to `khala`, `gateway`, and `forge`

**`archives/*`** - Release Branches

- Version snapshots (e.g., `archives/v0.2.0`)
- Created from `gateway`
- Merged to `khala` for production release

---

## Development Tools

### Primary Tool: Claude Code

- Full ticket implementation from specs
- Complex refactoring
- Test writing
- Git commits

### Helper Scripts

```bash
# Create new ticket (spec + docs)
./scripts/helpers/new-ticket.sh CHRONO-XXX "Title"

# Set up development environment
./scripts/helpers/dev-setup.sh

# Run all tests
./scripts/helpers/run-tests.sh
```

### GitHub CLI

```bash
# Create PR
gh pr create --base forge

# Check PR status
gh pr status

# View issue
gh issue view 16
```

---

## Common Workflows

### Starting New Ticket

```bash
git checkout forge
git pull
git checkout -b warp-in/CHRONO-XXX-description
# Implement...
git add .
git commit -m "Implement CHRONO-XXX: Description"
git push -u origin warp-in/CHRONO-XXX-description
gh pr create --base forge
```

### Updating from Forge

```bash
# Your feature branch is behind forge
git checkout warp-in/CHRONO-XXX-description
git fetch origin
git rebase origin/forge
# Resolve conflicts if any
git push --force-with-lease
```

### Hotfix Workflow

```bash
# Critical bug in production
git checkout khala
git pull
git checkout -b recall/hotfix-critical-bug
# Fix the bug...
git commit -m "Hotfix: Description"
git push -u origin recall/hotfix-critical-bug

# Merge to khala (production)
gh pr create --base khala

# After merge, also merge to gateway and forge
git checkout gateway
git merge recall/hotfix-critical-bug
git push

git checkout forge
git merge recall/hotfix-critical-bug
git push
```

---

## Project Board Workflow

**Project Board**: [Project Chrono - Oracle Development](https://github.com/users/alexsmith84/projects/5)

### ⚠️ CRITICAL: Maintain Board Throughout Development

The GitHub Project Board MUST be kept up to date at EVERY step. This is not optional.

**Why This Matters:**
- Provides real-time visibility into project progress
- Tracks actual work completed vs planned
- Helps estimate future work based on supply costs
- Creates audit trail of development decisions
- Enables accurate project status reporting

### Kanban States

1. **Backlog** - Not yet ready to implement
2. **Ready** - Fully specified, ready to start
3. **In Progress** - Actively being worked on
4. **In Review** - PR created, awaiting review
5. **Done** - Merged and complete

### Complete Issue Lifecycle (Step-by-Step)

#### Step 1: Creating a New Issue

```bash
# Create issue via GitHub CLI
gh issue create \
  --title "CHRONO-XXX: [Role] Brief description" \
  --body "See docs/specs/CHRONO-XXX-*.md for full specification" \
  --label "epic-<epic>,<role>-<type>,<priority>,<supply>-supply" \
  --assignee @me

# Example:
gh issue create \
  --title "CHRONO-011: [Overlord] Real-time Price Aggregation" \
  --body "See docs/specs/CHRONO-011-price-aggregation.md" \
  --label "epic-khala,overlord-backend,Critical Mission,5-supply" \
  --assignee alexsmith84
```

**Required Labels (ALL must be present):**
- **Epic**: `epic-nexus`, `epic-khala`, `epic-chrono`, `epic-warp`, or `epic-fleet`
- **Role**: `marine-devops`, `overlord-backend`, `oracle-data`, `zealot-frontend`, `templar-blockchain`, or `scv-qa`
- **Priority**: `Critical Mission`, `Main Objective`, `Side Quest`, or `Research`
- **Supply**: `1-supply`, `2-supply`, `3-supply`, `5-supply`, or `8-supply`

**Optional Labels:**
- Type: `enhancement`, `bug`, `documentation`, `database`, etc.

#### Step 2: Add Issue to Project Board

```bash
# Add to project board
gh project item-add 5 --owner alexsmith84 \
  --url "https://github.com/alexsmith84/project-chrono/issues/XXX"
```

**Issue will default to "Backlog" status**

#### Step 3: Set Project Board Metadata

```bash
# Get project item ID
gh project item-list 5 --owner alexsmith84 --format json | \
  jq -r '.items[] | select(.content.number == XXX) | .id'

# Set Epic, Role, Priority, Supply Cost
gh project item-edit --project-id PVT_kwHOAA1B-c4BEzsW \
  --id <ITEM_ID> \
  --field-id PVTSSF_lAHOAA1B-c4BEzsWzg2Z2PM \
  --single-select-option-id <EPIC_ID>

# Repeat for Role, Priority, Supply (see field IDs below)
```

**Field IDs:**
- Epic: `PVTSSF_lAHOAA1B-c4BEzsWzg2Z2PM`
- Role: `PVTSSF_lAHOAA1B-c4BEzsWzg2Z2YE`
- Priority: `PVTSSF_lAHOAA1B-c4BEzsWzg2Z2ew`
- Supply: `PVTSSF_lAHOAA1B-c4BEzsWzg2Z3zc`
- Status: `PVTSSF_lAHOAA1B-c4BEzsWzg2U5wg`

**Option IDs:**

Epic:
- Nexus Construction: `4c2e0f05`
- Khala Connection: `69572fa2`
- Chrono Boost: `0b141e0c`
- Warp Gate: `0aa355fd`
- Protoss Fleet: `c42a270b`

Role:
- Oracle (Data): `20cb1e26`
- Zealot (Frontend): `99af3a81`
- Templar (Blockchain): `4adc0fd2`
- Marine (DevOps): `254eb9d9`
- Overlord (Backend): `8a138c43`
- Observer (QA): `2568606f`

Priority:
- Critical Mission: `5c5de61b`
- Main Objective: `1bf0aaf4`
- Side Quest: `9eb7939a`
- Research: `60a8499a`

Supply:
- 1: `8f2c0327`
- 2: `7d650237`
- 3: `4f420d58`
- 5: `6c38264c`
- 8: `e52899be`

Status:
- Backlog: `b89008ea`
- Ready: `be2c3b40`
- In Progress: `47fc9ee4`
- In Review: `be9d724e`
- Done: `98236657`

#### Step 4: Move to Ready (When Spec Complete)

```bash
# Manually move to Ready when:
# - Spec document exists and is complete
# - Implementation guide is written
# - Test spec is defined
# - No blockers exist

gh project item-edit --project-id PVT_kwHOAA1B-c4BEzsW \
  --id <ITEM_ID> \
  --field-id PVTSSF_lAHOAA1B-c4BEzsWzg2U5wg \
  --single-select-option-id be2c3b40
```

#### Step 5: Move to In Progress (When You Start Work)

```bash
# Move to In Progress when:
# - You've created feature branch
# - You've started implementation
# - You've assigned ticket to yourself

gh project item-edit --project-id PVT_kwHOAA1B-c4BEzsW \
  --id <ITEM_ID> \
  --field-id PVTSSF_lAHOAA1B-c4BEzsWzg2U5wg \
  --single-select-option-id 47fc9ee4
```

**⚠️ IMPORTANT**: Only ONE ticket should be "In Progress" at a time!

#### Step 6: Move to In Review (When PR Created)

```bash
# Move to In Review when:
# - PR has been created
# - Tests are passing
# - Ready for code review

gh project item-edit --project-id PVT_kwHOAA1B-c4BEzsW \
  --id <ITEM_ID> \
  --field-id PVTSSF_lAHOAA1B-c4BEzsWzg2U5wg \
  --single-select-option-id be9d724e
```

**This is when you link the PR to the issue:**

```bash
# In PR description, add:
Closes #XXX
```

#### Step 7: Move to Done (When PR Merged)

```bash
# AUTOMATICALLY happens when:
# - PR is merged
# - Issue is closed (via "Closes #XXX" in PR)

# OR manually:
gh issue close XXX --reason completed --comment "✅ Completed via PR #YYY"

# This will auto-update project board to "Done"
```

### Board Maintenance Checklist

**Daily (or before starting work):**
- [ ] Check that no tickets are stuck in wrong status
- [ ] Verify "In Progress" has only YOUR current ticket
- [ ] Update status if you've moved to next phase

**When creating new issue:**
- [ ] Add all required labels (epic, role, priority, supply)
- [ ] Add to project board (#5)
- [ ] Set Epic, Role, Priority, Supply Cost fields
- [ ] Assign to yourself
- [ ] Set status to "Backlog"

**When starting work:**
- [ ] Move ticket from "Ready" to "In Progress"
- [ ] Verify only one ticket is "In Progress"

**When creating PR:**
- [ ] Move ticket to "In Review"
- [ ] Link PR to issue with "Closes #XXX"
- [ ] Ensure PR title matches issue format

**When PR merged:**
- [ ] Verify issue auto-closed
- [ ] Verify board auto-updated to "Done"
- [ ] Update IMPLEMENTATION_LOG.md

### Automation

**Auto-transitions:**
- New issues → Automatically added to "Backlog"
- Closed issues → Automatically moved to "Done"
- PR merge with "Closes #XXX" → Auto-closes issue → Auto-moves to Done

**Manual updates required:**
- Backlog → Ready (when spec complete)
- Ready → In Progress (when work starts)
- In Progress → In Review (when PR created)
- Setting Epic, Role, Priority, Supply (on issue creation)

---

## Code Style Guidelines

### General Principles

- **Clarity over cleverness**
- **Consistent formatting** (enforced by tooling)
- **Self-documenting code** (good names > comments)
- **StarCraft theme** only where it adds value

### Rust

- Use `rustfmt` (auto-formats on save)
- Run `clippy` before committing
- Document public APIs
- Write unit tests inline

### TypeScript

- Use Prettier (auto-formats on save)
- Prefer functional style
- Type everything (no `any`)
- Use async/await over promises

### Documentation

- Use Markdown
- Include code examples
- Link to related docs
- Keep language clear and concise

---

## Troubleshooting

### Tests Failing Locally

```bash
# Clean and rebuild
cargo clean && cargo build
rm -rf node_modules && bun install

# Run tests with verbose output
./scripts/helpers/run-tests.sh --verbose
```

### Branch Out of Sync

```bash
# Rebase onto forge
git fetch origin
git rebase origin/forge

# If conflicts, resolve then:
git rebase --continue
```

### CI Failing but Local Passes

- Check CI logs for environment differences
- Verify all dependencies in `package.json` / `Cargo.toml`
- Ensure tests don't depend on local state

---

## Getting Help

- **Documentation**: Check `docs/` directory
- **Spec unclear**: Comment on GitHub issue
- **Technical question**: Create GitHub Discussion
- **Bug found**: Create new issue with `bug` label

---

*"The process is clear. The Khala guides your development. En Taro Tassadar!"*
