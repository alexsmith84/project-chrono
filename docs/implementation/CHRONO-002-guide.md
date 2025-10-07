# Implementation Guide: CHRONO-002

*"Step by step, the Nexus rises. Follow the path to completion."*

---

## Prerequisites

### Required Knowledge
- Basic shell scripting (bash)
- GitHub Actions concepts
- Markdown documentation

### Required Tools
- [x] Text editor or IDE
- [x] Git CLI
- [x] GitHub CLI (`gh`)
- [x] macOS terminal

### Dependencies
- [x] CHRONO-001 complete (GitHub Projects board)
- [x] Repository cloned locally
- [x] On `forge` branch or feature branch from `forge`

---

## Implementation Checklist

### Phase 1: Workflow Documentation
- [ ] Create `docs/workflow/development-process.md`
- [ ] Create `docs/workflow/deployment.md`

### Phase 2: Setup Documentation
- [ ] Create `docs/setup/production-deployment.md`

### Phase 3: Helper Scripts
- [ ] Create `scripts/helpers/new-ticket.sh`
- [ ] Create `scripts/helpers/dev-setup.sh`
- [ ] Create `scripts/helpers/run-tests.sh`
- [ ] Make scripts executable

### Phase 4: GitHub Actions
- [ ] Create `.github/workflows/ci.yml`
- [ ] Create `.github/workflows/deploy-staging.yml`
- [ ] Create `.github/workflows/deploy-production.yml`

### Phase 5: Templates & Contribution Guides
- [ ] Create `.github/PULL_REQUEST_TEMPLATE.md`
- [ ] Create `CONTRIBUTING.md`

### Phase 6: IDE Configuration
- [ ] Create `.vscode/settings.json`
- [ ] Create `.vscode/extensions.json`

### Phase 7: Testing & Validation
- [ ] Test all scripts locally
- [ ] Verify all documentation links
- [ ] Trigger GitHub Actions with test PR
- [ ] Update IMPLEMENTATION_LOG.md

---

## Step-by-Step Implementation

### Step 1: Create Feature Branch

```bash
# Ensure you're on forge
git checkout forge
git pull

# Create feature branch
git checkout -b warp-in/CHRONO-002-repo-structure
```

---

### Step 2: Workflow Documentation

#### File 1: `docs/workflow/development-process.md`

Create this file with the following content:

```markdown
# Development Process - Project Chrono

Daily development workflow for Project Chrono contributors.

## Quick Start

1. Pick ticket from [Project Board](https://github.com/users/alexsmith84/projects/5)
2. Read spec in `docs/specs/CHRONO-XXX-*.md`
3. Create feature branch: `git checkout -b warp-in/CHRONO-XXX-description forge`
4. Implement following `docs/implementation/CHRONO-XXX-guide.md`
5. Run tests: `./scripts/helpers/run-tests.sh`
6. Commit and push
7. Create PR to `forge`

## Detailed Workflow

[Add detailed sections on branch strategy, code review, etc.]

## Git-Flow Branches

- `khala` - Production
- `gateway` - Staging
- `forge` - Development
- `warp-in/*` - Feature branches
- `recall/*` - Hotfix branches
- `archives/*` - Release branches

See PROJECT-CHRONO-BLUEPRINT.md for full git-flow details.
```

**Action**: Create the file and expand with detailed workflow steps.

#### File 2: `docs/workflow/deployment.md`

Create skeleton deployment procedures documentation.

---

### Step 3: Setup Documentation

#### File: `docs/setup/production-deployment.md`

Create comprehensive production setup guide covering Mac Mini M4 Pro configuration, Cloudflare Workers, database setup, etc.

**Note**: This can be a skeleton for now since we haven't built the actual services yet.

---

### Step 4: Helper Scripts

#### Script 1: `scripts/helpers/new-ticket.sh`

```bash
#!/bin/bash
set -euo pipefail

# new-ticket.sh - Create new CHRONO ticket with all required files
#
# Usage: ./scripts/helpers/new-ticket.sh CHRONO-XXX "Ticket Title"

TICKET_ID="$1"
TICKET_TITLE="$2"

if [[ -z "$TICKET_ID" ]] || [[ -z "$TICKET_TITLE" ]]; then
    echo "Usage: $0 CHRONO-XXX \"Ticket Title\""
    exit 1
fi

# Create spec from template
SPEC_FILE="docs/specs/${TICKET_ID}-$(echo "$TICKET_TITLE" | tr '[:upper:]' '[:lower:]' | tr ' ' '-').md"
cp docs/specs/SPEC-TEMPLATE.md "$SPEC_FILE"

# Create implementation guide from template
IMPL_FILE="docs/implementation/${TICKET_ID}-guide.md"
cp docs/implementation/IMPL-TEMPLATE.md "$IMPL_FILE"

# Create test spec from template
TEST_FILE="docs/tests/${TICKET_ID}-tests.md"
cp docs/tests/TEST-TEMPLATE.md "$TEST_FILE"

echo "✅ Created:"
echo "   - $SPEC_FILE"
echo "   - $IMPL_FILE"
echo "   - $TEST_FILE"
echo ""
echo "Next steps:"
echo "1. Edit spec file and fill in details"
echo "2. Edit implementation guide with steps"
echo "3. Edit test spec with test cases"
echo "4. Create GitHub issue: gh issue create --title \"$TICKET_ID: $TICKET_TITLE\""
```

**Action**: Create this script and make it executable:
```bash
chmod +x scripts/helpers/new-ticket.sh
```

#### Script 2: `scripts/helpers/dev-setup.sh`

Create script to set up development environment (install deps, init database, create .env).

#### Script 3: `scripts/helpers/run-tests.sh`

Create script to run all test suites with coverage reporting.

---

### Step 5: GitHub Actions

#### Workflow 1: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
    branches: [forge, gateway, khala]
  push:
    branches: [forge]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Rust
        uses: actions-rust-lang/setup-rust-toolchain@v1

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: |
          cd src && cargo build
          bun install

      - name: Run tests
        run: |
          # Skeleton - will implement actual tests later
          echo "Tests would run here"

      - name: Build check
        run: |
          cargo build --release
          bun run build
```

**Action**: Create this file as a skeleton. It won't fully work until we have actual code, but establishes the structure.

#### Workflow 2: `.github/workflows/deploy-staging.yml`

Create skeleton for staging deployment workflow.

#### Workflow 3: `.github/workflows/deploy-production.yml`

Create skeleton for production deployment workflow.

---

### Step 6: Templates

#### File 1: `.github/PULL_REQUEST_TEMPLATE.md`

```markdown
## Summary
<!-- Brief description of changes -->

## Related Issue
Closes #<!-- issue number -->

## Type of Change
- [ ] 🏗️ Infrastructure/DevOps
- [ ] ✨ New feature
- [ ] 🐛 Bug fix
- [ ] 📝 Documentation
- [ ] ♻️ Refactoring

## Test Plan
<!-- How did you test this? -->

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] Documentation updated

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] No new warnings introduced
- [ ] Related documentation updated

## Screenshots (if applicable)
<!-- Add screenshots for UI changes -->

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

#### File 2: `CONTRIBUTING.md`

Create contribution guidelines covering git workflow, code style, issue creation, etc.

---

### Step 7: IDE Configuration

#### File 1: `.vscode/settings.json`

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer"
  },
  "[markdown]": {
    "editor.wordWrap": "on"
  },
  "rust-analyzer.checkOnSave.command": "clippy",
  "files.exclude": {
    "**/.git": true,
    "**/node_modules": true,
    "**/target": true
  }
}
```

#### File 2: `.vscode/extensions.json`

```json
{
  "recommendations": [
    "rust-lang.rust-analyzer",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "eamodio.gitlens",
    "github.vscode-pull-request-github",
    "ms-vscode.makefile-tools"
  ]
}
```

---

### Step 8: Testing & Validation

#### Test Scripts
```bash
# Test new-ticket.sh
./scripts/helpers/new-ticket.sh CHRONO-999 "Test Ticket"

# Verify files created
ls docs/specs/CHRONO-999-*
ls docs/implementation/CHRONO-999-*
ls docs/tests/CHRONO-999-*

# Clean up test files
rm docs/specs/CHRONO-999-*
rm docs/implementation/CHRONO-999-*
rm docs/tests/CHRONO-999-*
```

#### Verify Documentation Links
```bash
# Check for broken links in all markdown files
find docs -name "*.md" -exec grep -H "](../" {} \;
```

#### Test GitHub Actions
- Create test PR
- Verify CI workflow runs
- Check for any errors

---

### Step 9: Commit & Push

```bash
# Stage all new files
git add docs/ scripts/ .github/ .vscode/ CONTRIBUTING.md

# Commit with clear message
git commit -m "Implement CHRONO-002: Complete repository structure and templates

- Added workflow documentation (development-process, deployment)
- Added production deployment setup guide
- Created helper scripts (new-ticket, dev-setup, run-tests)
- Added GitHub Actions workflows (CI, staging, production)
- Created PR template and contributing guide
- Added VSCode configuration for consistent dev experience

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to remote
git push -u origin warp-in/CHRONO-002-repo-structure
```

---

### Step 10: Create Pull Request

```bash
gh pr create --base forge \
  --title "CHRONO-002: Repository structure and templates" \
  --body "See docs/specs/CHRONO-002-repo-structure.md for full details"
```

---

## Troubleshooting

### Script Permission Errors
```bash
chmod +x scripts/helpers/*.sh
```

### GitHub Actions Not Running
- Verify workflows are in `.github/workflows/` (not `.github/workflow/`)
- Check YAML syntax with a validator
- Ensure branch names match trigger conditions

### Broken Documentation Links
- Use relative paths: `[link](../other/file.md)`
- Verify paths are correct relative to the file location

---

## Post-Implementation

### Update Log
Add learnings to `IMPLEMENTATION_LOG.md`:
- What worked well
- Challenges encountered
- Time spent
- Improvements for next time

### Verify Completeness
- [ ] All files from spec created
- [ ] All scripts tested and working
- [ ] All documentation readable and accurate
- [ ] GitHub Actions trigger successfully
- [ ] PR created and ready for review

---

*"The structure is complete. The Nexus stands ready. En Taro Tassadar!"*
