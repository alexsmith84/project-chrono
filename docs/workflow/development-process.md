# Development Process - Project Chrono

*"The path is clear. Follow these steps to victory."*

---

## Quick Start

1. **Pick a ticket** from [Project Board](https://github.com/users/alexsmith84/projects/5)
2. **Read the spec** in `docs/specs/CHRONO-XXX-*.md`
3. **Create feature branch**: `git checkout -b warp-in/CHRONO-XXX-description forge`
4. **Implement** following `docs/implementation/CHRONO-XXX-guide.md`
5. **Run tests**: `./scripts/helpers/run-tests.sh`
6. **Commit and push** changes
7. **Create PR** to `forge`
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

### 6. Create Pull Request

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

### Kanban States

1. **Backlog** - Not yet ready to implement
2. **Ready** - Fully specified, ready to start
3. **In Progress** - Actively being worked on
4. **In Review** - PR created, awaiting review
5. **Done** - Merged and complete

### Moving Tickets

**Manual moves:**

- Backlog → Ready: When spec is complete
- Ready → In Progress: When you start working
- In Progress → In Review: When PR is created
- In Review → Done: When PR is merged (may auto-transition)

**Automation:**

- New issues auto-add to "Backlog"
- Closed issues auto-move to "Done"
- PR merge may auto-close linked issue

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
