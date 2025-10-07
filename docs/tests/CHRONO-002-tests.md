# Test Specification: CHRONO-002

*"Every structure must be tested. The Khala demands perfection."*

---

## Test Overview

This document outlines the testing strategy for CHRONO-002: Repository Structure & Templates completion.

**Type**: Infrastructure / Documentation
**Test Approach**: Manual verification + script execution testing
**Risk Level**: Low (no production code, documentation/tooling only)

---

## Test Environment

### Requirements
- macOS environment (primary dev platform)
- Clean git working directory
- GitHub CLI authenticated
- Terminal access

### Setup
```bash
# Ensure on correct branch
git checkout warp-in/CHRONO-002-repo-structure

# Verify clean state
git status
```

---

## Test Cases

### TC-001: Documentation Completeness

**Objective**: Verify all required documentation files exist and are accessible

**Steps**:
1. Check for `docs/workflow/development-process.md`
2. Check for `docs/workflow/deployment.md`
3. Check for `docs/setup/production-deployment.md`

**Expected Result**:
```bash
$ ls docs/workflow/
README.md  development-process.md  deployment.md  ticket-creation.md

$ ls docs/setup/
README.md  cloudflare-workers.md  mac-mini-setup.md  production-deployment.md
```

**Pass Criteria**: All files exist and are non-empty (>100 lines each)

---

### TC-002: Documentation Link Validation

**Objective**: Ensure no broken links in documentation

**Steps**:
1. Run link checker on all markdown files
```bash
# Manual check for relative links
find docs -name "*.md" -exec grep -H "](../" {} \; | grep -v "http"
```

2. Verify each link points to existing file
3. Check PROJECT-CHRONO-BLUEPRINT.md references

**Expected Result**: All relative links resolve to existing files

**Pass Criteria**: Zero broken internal links

---

### TC-003: Helper Script - new-ticket.sh

**Objective**: Verify ticket creation script works correctly

**Test Steps**:
```bash
# Test 1: Missing arguments
./scripts/helpers/new-ticket.sh
# Expected: Usage error message

# Test 2: Valid execution
./scripts/helpers/new-ticket.sh CHRONO-999 "Test Ticket"
# Expected: Creates 3 files

# Test 3: Verify files created
ls docs/specs/CHRONO-999-test-ticket.md
ls docs/implementation/CHRONO-999-guide.md
ls docs/tests/CHRONO-999-tests.md

# Test 4: Verify file content (should be from templates)
head -5 docs/specs/CHRONO-999-test-ticket.md
```

**Expected Results**:
- Error handling: Script shows usage when args missing
- File creation: All 3 files created
- Naming convention: Files follow CHRONO-XXX-description pattern
- Content: Files contain template boilerplate

**Cleanup**:
```bash
rm docs/specs/CHRONO-999-*
rm docs/implementation/CHRONO-999-*
rm docs/tests/CHRONO-999-*
```

**Pass Criteria**: All expected behaviors confirmed, cleanup successful

---

### TC-004: Helper Script - dev-setup.sh

**Objective**: Verify development setup script (dry-run only)

**Test Steps**:
```bash
# Test with --dry-run flag (if implemented)
./scripts/helpers/dev-setup.sh --dry-run

# OR review script code to verify:
# - Checks for required tools
# - Provides clear error messages
# - Doesn't destructively overwrite existing config
```

**Expected Results**:
- Script executes without errors
- Clear output showing what would be installed
- Safety checks present (asks before overwriting)

**Pass Criteria**: Script is safe to run and has good UX

---

### TC-005: Helper Script - run-tests.sh

**Objective**: Verify test runner script

**Test Steps**:
```bash
# Run script (will likely show "no tests yet" - that's OK)
./scripts/helpers/run-tests.sh

# Verify script structure:
# - Executable
# - Has help flag
# - Handles missing test files gracefully
```

**Expected Results**:
- Script executes without crashing
- Provides helpful output about test status
- Exits with appropriate code

**Pass Criteria**: Script runs and handles current "no tests" state gracefully

---

### TC-006: GitHub Actions - CI Workflow

**Objective**: Verify CI workflow is valid and can be triggered

**Test Steps**:
1. Create test PR to trigger CI
```bash
git add .
git commit -m "Test CI workflow"
git push
gh pr create --base forge --title "Test: CHRONO-002 CI" --body "Testing CI"
```

2. Check Actions tab in GitHub
3. Verify workflow runs (may fail, that's OK - we're testing structure)

**Expected Results**:
- Workflow file is valid YAML
- Workflow appears in Actions tab
- Workflow attempts to run
- Clear error messages if it fails

**Pass Criteria**: Workflow triggers and shows structured steps (even if steps fail)

---

### TC-007: GitHub Actions - Staging Deployment (Skeleton)

**Objective**: Verify staging deployment workflow structure

**Test Steps**:
1. Review `.github/workflows/deploy-staging.yml`
2. Verify it has:
   - Correct trigger (push to `gateway`)
   - Checkout step
   - Placeholder deployment steps
   - Comments indicating future implementation

**Expected Results**:
- File is valid YAML
- Has appropriate structure for future deployment
- Won't trigger accidentally (only on `gateway` branch)

**Pass Criteria**: File structure is sound, ready for future implementation

---

### TC-008: Templates - PR Template

**Objective**: Verify PR template appears when creating PRs

**Test Steps**:
1. Create a test PR via GitHub UI
2. Verify PR description is pre-filled with template
3. Check template has all expected sections:
   - Summary
   - Related Issue
   - Type of Change
   - Test Plan
   - Checklist

**Expected Results**:
- Template loads automatically
- All sections present
- Markdown renders correctly

**Pass Criteria**: Template appears and is well-formatted

---

### TC-009: IDE Configuration - VSCode Settings

**Objective**: Verify VSCode picks up configuration

**Test Steps**:
1. Open project in VSCode
2. Check bottom-right for extension recommendations popup
3. Verify formatting works (format a Markdown file)
4. Check that Rust files use rust-analyzer

**Expected Results**:
- Extension recommendations shown
- Format on save works
- Rust analyzer activates for .rs files

**Pass Criteria**: VSCode configuration improves dev experience

---

### TC-010: Contributing Guide Completeness

**Objective**: Verify CONTRIBUTING.md is helpful and complete

**Test Steps**:
1. Read CONTRIBUTING.md
2. Verify it covers:
   - How to set up dev environment
   - Git workflow (branch strategy)
   - How to create issues
   - Code style guidelines
   - How to submit PRs

**Expected Results**:
- All key topics covered
- Links to relevant docs work
- Tone is welcoming to contributors

**Pass Criteria**: Document is comprehensive and helpful

---

## Integration Tests

### IT-001: End-to-End Ticket Creation Workflow

**Objective**: Simulate full ticket creation process

**Test Steps**:
1. Use `new-ticket.sh` to create CHRONO-998
2. Fill in spec, implementation guide, test spec
3. Create GitHub issue
4. Add issue to project board
5. Create feature branch for CHRONO-998
6. Make trivial change (add comment to README)
7. Run tests with `run-tests.sh`
8. Create PR
9. Verify CI runs
10. Merge PR
11. Clean up

**Expected Results**: Entire workflow works smoothly with new tooling

**Pass Criteria**: Can go from ticket creation to merged PR using provided tools

---

## Performance Tests

**N/A** - No performance requirements for documentation/scripts

---

## Security Tests

### ST-001: Script Injection Safety

**Objective**: Verify scripts don't have injection vulnerabilities

**Test Steps**:
```bash
# Test with malicious input
./scripts/helpers/new-ticket.sh "CHRONO-999" "'; rm -rf /"

# Verify: No command execution, only file creation
```

**Expected Results**: Scripts sanitize inputs, no command injection possible

**Pass Criteria**: Scripts are safe from basic injection attacks

---

## Regression Tests

**N/A** - No existing functionality to regress

---

## Test Execution Summary

### Manual Test Checklist

Execute tests in order:

- [ ] TC-001: Documentation Completeness
- [ ] TC-002: Documentation Link Validation
- [ ] TC-003: new-ticket.sh script
- [ ] TC-004: dev-setup.sh script
- [ ] TC-005: run-tests.sh script
- [ ] TC-006: CI Workflow
- [ ] TC-007: Staging Deployment Workflow
- [ ] TC-008: PR Template
- [ ] TC-009: VSCode Configuration
- [ ] TC-010: Contributing Guide
- [ ] IT-001: End-to-End Workflow
- [ ] ST-001: Script Injection Safety

### Pass/Fail Criteria

**Overall Pass Requirements:**
- All TC-* tests pass
- IT-001 completes successfully
- ST-001 shows no vulnerabilities
- Zero critical issues found

**Acceptable Failures:**
- GitHub Actions may fail due to missing actual code (that's expected)
- dev-setup.sh may need iteration based on system differences

---

## Bug Reporting

If tests fail, create GitHub issues with:
- Test case ID (e.g., TC-003)
- Expected vs actual result
- Steps to reproduce
- Screenshots if applicable

---

## Test Sign-Off

**Tester**: _____________
**Date**: _____________
**Result**: PASS / FAIL / CONDITIONAL PASS
**Notes**:

---

*"Tests complete. The structure holds strong. En Taro Tassadar!"*
