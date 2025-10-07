# Specification: CHRONO-002 - Repository Structure & Templates

*"Build the foundation strong, and the Nexus will stand eternal."*

---

## Overview

Complete the repository structure and templates to establish a professional, well-organized codebase foundation for Project Chrono.

**Epic**: 🏗️ Nexus Construction
**Role**: 🟢 Marine (DevOps)
**Supply Cost**: 3 (Medium - High Templar level)
**Priority**: Critical Mission

---

## Current State

The repository bootstrap created initial structure, but several components are missing or incomplete:

### Existing Structure ✅
- Core directories: `src/`, `apps/`, `docs/`, `tests/`, `config/`, `scripts/`
- Templates: `SPEC-TEMPLATE.md`, `IMPL-TEMPLATE.md`, `TEST-TEMPLATE.md`
- Some workflow documentation
- Basic `.gitignore`, `package.json`, `Cargo.toml`

### Missing Components ❌
- **Workflow docs**: `development-process.md`, `deployment.md`
- **Setup docs**: `production-deployment.md`
- **GitHub Actions**: CI/CD workflow files
- **Helper scripts**: Development automation scripts
- **Additional templates**: PR template, contributing guide
- **IDE configuration**: VSCode settings for team consistency

---

## Requirements

### 1. Complete Workflow Documentation

**Files to create:**

#### `docs/workflow/development-process.md`
- Step-by-step guide for daily development
- How to use git-flow branches
- Running tests locally
- Code review process
- Using GitHub Projects board

#### `docs/workflow/deployment.md`
- Deployment procedures for each environment
- Rollback procedures
- Health check verification
- Post-deployment validation

### 2. Complete Setup Documentation

#### `docs/setup/production-deployment.md`
- Production environment setup from scratch
- Mac Mini M4 Pro configuration
- Cloudflare Workers deployment
- Database initialization
- Monitoring stack setup
- Backup procedures

### 3. GitHub Actions Workflows

#### `.github/workflows/ci.yml`
- Run tests on PR
- Lint checking
- Build verification
- Multi-language support (Rust + TypeScript)

#### `.github/workflows/deploy-staging.yml`
- Auto-deploy to gateway (staging) when merged to `gateway` branch
- Run smoke tests
- Notify on failure

#### `.github/workflows/deploy-production.yml`
- Deploy to khala (production) when release tag created
- Backup before deploy
- Health checks
- Rollback on failure

### 4. Helper Scripts

#### `scripts/helpers/new-ticket.sh`
- Interactive script to create CHRONO-XXX ticket
- Generates spec, implementation guide, test spec from templates
- Creates GitHub issue
- Adds to project board

#### `scripts/helpers/dev-setup.sh`
- One-command development environment setup
- Install dependencies (Rust, Bun, PostgreSQL, Redis)
- Initialize database
- Create `.env` file from template

#### `scripts/helpers/run-tests.sh`
- Run all tests (unit, integration, e2e)
- Generate coverage report
- Support for running specific test suites

### 5. Additional Templates

#### `.github/PULL_REQUEST_TEMPLATE.md`
- PR description template
- Checklist for reviewers
- Testing instructions

#### `CONTRIBUTING.md`
- How to contribute to Project Chrono
- Code style guidelines
- Git workflow
- Issue creation process

### 6. IDE Configuration

#### `.vscode/settings.json`
- Consistent formatting (Prettier for TS, rustfmt for Rust)
- Recommended extensions
- Debug configurations

#### `.vscode/extensions.json`
- List of recommended VSCode extensions
- Rust Analyzer, Prettier, GitLens, etc.

---

## Success Criteria

### Functional Requirements
- ✅ All workflow documentation complete and accessible
- ✅ All setup documentation tested and accurate
- ✅ GitHub Actions workflows functional (may be skeleton implementations)
- ✅ Helper scripts executable and working
- ✅ Templates available for PRs and contributions
- ✅ IDE configuration improves developer experience

### Quality Requirements
- ✅ Documentation follows existing style (StarCraft theme where appropriate)
- ✅ Scripts have error handling and helpful messages
- ✅ GitHub Actions use appropriate secrets management
- ✅ All file paths referenced in docs are correct

### Completeness
- ✅ All files mentioned in PROJECT-CHRONO-BLUEPRINT.md exist
- ✅ No broken links in documentation
- ✅ Scripts tested on macOS (primary dev environment)

---

## Non-Functional Requirements

### Documentation Quality
- Clear, concise writing
- Examples provided where helpful
- StarCraft theme integrated naturally (not forced)
- Searchable structure

### Script Robustness
- Error messages guide user to solution
- Non-destructive operations (ask before overwriting)
- Works on both Intel and Apple Silicon Macs

### Maintainability
- Templates easy to update
- Scripts modular and reusable
- GitHub Actions use matrix builds where appropriate

---

## Out of Scope

❌ **Not included in CHRONO-002:**
- Actual CI/CD implementation (skeleton only)
- Production deployment automation (documentation only)
- Code linting rules (will be CHRONO-004)
- Database migrations (future ticket)
- Docker containerization (future consideration)

---

## Dependencies

### Prerequisites
- ✅ CHRONO-001 complete (GitHub Projects board exists)
- ✅ Repository structure initialized
- ✅ Git-flow branches established

### Blocked By
- None (can proceed immediately)

### Blocks
- CHRONO-003: Mac Mini setup (needs `production-deployment.md`)
- CHRONO-004: Linting & formatting setup (needs script foundations)

---

## Technical Approach

### Documentation Strategy
1. Follow existing README.md style
2. Use clear headings and bullet points
3. Include code examples in fenced blocks
4. Link to related docs where appropriate

### Script Development
1. Start with POSIX-compliant shell scripts (bash)
2. Add error checking (`set -euo pipefail`)
3. Use functions for reusability
4. Provide `--help` flag for all scripts

### GitHub Actions
1. Start with basic workflow structure
2. Use official actions where possible (`actions/checkout`, `actions/setup-node`)
3. Add caching for dependencies
4. Include conditional steps for different branches

---

## Testing Strategy

See `docs/tests/CHRONO-002-tests.md` for detailed test plan.

**Summary:**
- Manual verification of all documentation links
- Script execution testing on clean macOS environment
- GitHub Actions triggered via test PR
- Template usage verification

---

## Migration & Rollout

### Phase 1: Documentation
1. Create workflow docs
2. Complete setup docs
3. Update any broken references

### Phase 2: Automation
1. Create helper scripts
2. Test scripts locally
3. Document script usage

### Phase 3: CI/CD
1. Create GitHub Actions skeletons
2. Test with dummy PR
3. Refine based on failures

### Phase 4: Developer Experience
1. Add IDE configuration
2. Create templates
3. Update CONTRIBUTING.md

---

## Future Enhancements

- **CHRONO-0XX**: Full CI/CD pipeline with deployment
- **CHRONO-0XX**: Docker development environment
- **CHRONO-0XX**: Pre-commit hooks for linting
- **CHRONO-0XX**: Automated dependency updates (Dependabot)

---

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Git-Flow Workflow](https://nvie.com/posts/a-successful-git-branching-model/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- PROJECT-CHRONO-BLUEPRINT.md - Overall architecture

---

*"The foundation is laid. Now we build. En Taro Adun!"*
