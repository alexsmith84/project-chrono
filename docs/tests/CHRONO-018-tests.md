# CHRONO-018: Test Specification

**Objective**: Validate that all layers of workflow enforcement work correctly

**Test Environment**: macOS + Linux (GitHub Actions)

---

## Unit Tests

### Git Hook Tests

#### Test 1.1: Pre-commit Hook Blocks Missing Spec

**Setup**:
1. Create branch `CHRONO-999-test`
2. Create `docs/implementation/CHRONO-999-guide.md`
3. Create `docs/tests/CHRONO-999-tests.md`
4. DO NOT create spec file

**Action**:
```bash
git checkout -b CHRONO-999-test
touch docs/implementation/CHRONO-999-guide.md
touch docs/tests/CHRONO-999-tests.md
echo "test" > file.txt
git add file.txt
git commit -m "Test commit"
```

**Expected Result**: ❌ Commit blocked with message:
```
❌ Missing specification: docs/specs/CHRONO-999-*.md
🛑 Cannot commit without all 3 documentation files
```

**Pass Criteria**: Commit fails, error message clear

---

#### Test 1.2: Pre-commit Hook Blocks Missing Implementation Guide

**Setup**:
1. Create branch `CHRONO-999-test`
2. Create `docs/specs/CHRONO-999-spec.md`
3. Create `docs/tests/CHRONO-999-tests.md`
4. DO NOT create implementation guide

**Action**:
```bash
git checkout -b CHRONO-999-test
touch docs/specs/CHRONO-999-spec.md
touch docs/tests/CHRONO-999-tests.md
echo "test" > file.txt
git add file.txt
git commit -m "Test commit"
```

**Expected Result**: ❌ Commit blocked with message:
```
❌ Missing implementation guide: docs/implementation/CHRONO-999-guide.md
🛑 Cannot commit without all 3 documentation files
```

**Pass Criteria**: Commit fails, error message clear

---

#### Test 1.3: Pre-commit Hook Blocks Missing Test Spec

**Setup**:
1. Create branch `CHRONO-999-test`
2. Create `docs/specs/CHRONO-999-spec.md`
3. Create `docs/implementation/CHRONO-999-guide.md`
4. DO NOT create test spec

**Action**:
```bash
git checkout -b CHRONO-999-test
touch docs/specs/CHRONO-999-spec.md
touch docs/implementation/CHRONO-999-guide.md
echo "test" > file.txt
git add file.txt
git commit -m "Test commit"
```

**Expected Result**: ❌ Commit blocked with message:
```
❌ Missing test specification: docs/tests/CHRONO-999-tests.md
🛑 Cannot commit without all 3 documentation files
```

**Pass Criteria**: Commit fails, error message clear

---

#### Test 1.4: Pre-commit Hook Allows Commit With All Docs

**Setup**:
1. Create branch `CHRONO-999-test`
2. Create all 3 documentation files
3. Have content in each file

**Action**:
```bash
git checkout -b CHRONO-999-test
touch docs/specs/CHRONO-999-spec.md
touch docs/implementation/CHRONO-999-guide.md
touch docs/tests/CHRONO-999-tests.md
echo "test" > file.txt
git add file.txt
git add docs/specs/ docs/implementation/ docs/tests/
git commit -m "Test commit"
```

**Expected Result**: ✅ Commit succeeds

**Pass Criteria**: Commit goes through without blocking

---

#### Test 1.5: Prepare-commit-msg Auto-Injects Ticket Number

**Setup**:
1. Create branch `CHRONO-999-test`
2. All 3 docs exist
3. Create empty commit with generic message

**Action**:
```bash
git checkout -b CHRONO-999-test
# Ensure all 3 docs exist
git commit --allow-empty -m "Initial work"
```

**Expected Result**: ✅ Commit message auto-prefixed
```
CHRONO-999: Initial work
```

**Pass Criteria**:
```bash
git log -1 --format=%B
# Shows: CHRONO-999: Initial work
```

---

#### Test 1.6: Commit-msg Hook Rejects Non-Standard Format

**Setup**:
1. Create branch `CHRONO-999-test`
2. All 3 docs exist
3. Try to commit with message that doesn't start with CHRONO-XXX

**Action**:
```bash
git checkout -b CHRONO-999-test
# Disable prepare-commit-msg temporarily to test commit-msg directly
git commit --allow-empty --no-verify -m "Test: This should fail"
# Now commit without --no-verify to trigger hook
```

**Expected Result**: ❌ Commit message rejected
```
❌ Commit message must start with: CHRONO-XXX: Description
```

**Pass Criteria**: Hook catches improper format

---

#### Test 1.7: Hook Allows Commit on Non-Ticket Branches

**Setup**:
1. On branch `forge` or `main` (not a ticket branch)
2. Make any change

**Action**:
```bash
git checkout forge
echo "test" > file.txt
git add file.txt
git commit -m "Regular commit"
```

**Expected Result**: ✅ Commit succeeds (no ticket number required)

**Pass Criteria**: Hooks don't block non-ticket work

---

## Integration Tests

### Git Hooks End-to-End

#### Test 2.1: Full Workflow: Create Branch → Commit → Push

**Setup**:
All 3 documentation files exist for CHRONO-018

**Action**:
```bash
# Create feature branch
git checkout -b CHRONO-018-test-feature

# Make a change
echo "feature code" > src/feature.ts

# Stage change
git add src/feature.ts

# Commit (should auto-prefix)
git commit -m "Add feature"

# Verify message
git log -1 --format=%B
```

**Expected Result**: ✅ All steps succeed
- Branch created
- Commit succeeds
- Message is: "CHRONO-018: Add feature"

**Pass Criteria**: Full workflow works smoothly

---

### GitHub Actions Workflow Tests

#### Test 3.1: Workflow Extracts Ticket from PR Title

**Setup**:
Create a test PR with title: "CHRONO-018: Test PR"

**Action**:
```bash
gh pr create --title "CHRONO-018: Test PR" --body "Test workflow"
```

**Expected Result**: ✅ GitHub Actions workflow runs
- Step: "Extract ticket number" outputs "CHRONO-018"
- Workflow continues with validation

**Pass Criteria**: Ticket extracted correctly

---

#### Test 3.2: Workflow Extracts Ticket from Branch Name

**Setup**:
Create branch `CHRONO-018-feature` and PR

**Action**:
```bash
git checkout -b CHRONO-018-feature
git push origin CHRONO-018-feature
gh pr create --body "Test workflow"  # Title doesn't have CHRONO-018
```

**Expected Result**: ✅ GitHub Actions workflow runs
- Step: "Extract ticket number from PR title" doesn't find it
- Step: "Extract from branch name" finds "CHRONO-018"
- Workflow continues with validation

**Pass Criteria**: Fallback ticket extraction works

---

#### Test 3.3: Workflow Validates Spec Exists

**Setup**:
PR with CHRONO-018 title, spec file exists

**Action**:
1. Create branch with CHRONO-018
2. Ensure `docs/specs/CHRONO-018-*.md` exists
3. Create and push PR

**Expected Result**: ✅ GitHub Actions passes
```
✅ Found specification
```

**Pass Criteria**: Workflow correctly validates spec

---

#### Test 3.4: Workflow Validates Implementation Guide Exists

**Setup**:
PR with CHRONO-018 title, impl guide exists

**Action**:
1. Create branch with CHRONO-018
2. Ensure `docs/implementation/CHRONO-018-guide.md` exists
3. Create and push PR

**Expected Result**: ✅ GitHub Actions passes
```
✅ Found implementation guide
```

**Pass Criteria**: Workflow correctly validates guide

---

#### Test 3.5: Workflow Validates Test Spec Exists

**Setup**:
PR with CHRONO-018 title, test spec exists

**Action**:
1. Create branch with CHRONO-018
2. Ensure `docs/tests/CHRONO-018-tests.md` exists
3. Create and push PR

**Expected Result**: ✅ GitHub Actions passes
```
✅ Found test specification
```

**Pass Criteria**: Workflow correctly validates test spec

---

#### Test 3.6: Workflow Blocks PR Missing Spec

**Setup**:
PR with CHRONO-018 title, spec file MISSING

**Action**:
1. Create branch with CHRONO-018
2. Delete or don't create `docs/specs/CHRONO-018-*.md`
3. Create and push PR

**Expected Result**: ❌ GitHub Actions fails
```
❌ Missing specification: docs/specs/CHRONO-018-*.md
```

**Pass Criteria**: Workflow blocks incomplete PRs

---

#### Test 3.7: Workflow Blocks PR Missing Implementation Guide

**Setup**:
PR with CHRONO-018 title, impl guide MISSING

**Action**:
1. Create branch with CHRONO-018
2. Delete or don't create `docs/implementation/CHRONO-018-guide.md`
3. Create and push PR

**Expected Result**: ❌ GitHub Actions fails
```
❌ Missing implementation guide: docs/implementation/CHRONO-018-guide.md
```

**Pass Criteria**: Workflow blocks incomplete PRs

---

#### Test 3.8: Workflow Blocks PR Missing Test Spec

**Setup**:
PR with CHRONO-018 title, test spec MISSING

**Action**:
1. Create branch with CHRONO-018
2. Delete or don't create `docs/tests/CHRONO-018-tests.md`
3. Create and push PR

**Expected Result**: ❌ GitHub Actions fails
```
❌ Missing test specification: docs/tests/CHRONO-018-tests.md
```

**Pass Criteria**: Workflow blocks incomplete PRs

---

#### Test 3.9: Workflow Passes PR for CHRONO-018

**Setup**:
PR for CHRONO-018 with all 3 docs present

**Action**:
1. All 3 doc files exist in correct paths
2. Create PR for CHRONO-018
3. Wait for GitHub Actions to run

**Expected Result**: ✅ All checks pass
- Spec found ✅
- Implementation guide found ✅
- Test spec found ✅
- Summary: "All validation checks passed for CHRONO-018" ✅

**Pass Criteria**: Real PR passes all checks

---

## Manual Verification Tests

### Claude Code Integration

#### Test 4.1: CLAUDE.md Loads in New Session

**Action**:
1. Start new Claude Code session in project
2. Examine context

**Expected Result**: CLAUDE.md loaded and available for reference

**Pass Criteria**: Can reference CLAUDE.md content

---

#### Test 4.2: Slash Commands Available

**Action**:
1. Type `/ticket` in Claude Code
2. Type `/spec-ready` in Claude Code
3. Type `/start-work` in Claude Code

**Expected Result**: All 3 slash commands available

**Pass Criteria**: Commands show in autocomplete

---

#### Test 4.3: Slash Command: /ticket CHRONO-018

**Action**:
```
/ticket CHRONO-018
```

**Expected Result**: Claude Code loads all 3 documentation files and summarizes them

**Pass Criteria**: Can see ticket context without manually opening files

---

#### Test 4.4: Slash Command: /spec-ready CHRONO-018

**Action**:
```
/spec-ready CHRONO-018
```

**Expected Result**: Claude Code validates all 3 docs exist and reports success

**Pass Criteria**: Clear validation that docs exist

---

#### Test 4.5: Slash Command: /spec-ready CHRONO-999 (Missing)

**Action**:
```
/spec-ready CHRONO-999
```

**Expected Result**: Claude Code reports missing files

**Pass Criteria**: Clear indication of which files are missing

---

#### Test 4.6: Slash Command: /start-work

**Action**:
```
/start-work
```

**Expected Result**: Claude Code presents pre-implementation checklist

**Pass Criteria**: Must confirm all items before proceeding

---

## Performance Tests

### Hook Execution Time

#### Test 5.1: Pre-commit Hook Execution Time

**Measurement**:
```bash
# Time a commit with all docs present
time git commit --allow-empty -m "Performance test"
```

**Expected Result**: Hook executes in <1 second

**Pass Criteria**: `sys+user < 1.0s`

---

#### Test 5.2: Prepare-commit-msg Hook Execution Time

**Measurement**:
```bash
# Measure message rewriting
time git commit --allow-empty -m "Test"
```

**Expected Result**: Hook executes in <1 second

**Pass Criteria**: `sys+user < 1.0s`

---

#### Test 5.3: Commit-msg Hook Execution Time

**Measurement**:
Measured as part of commit above

**Expected Result**: Hook executes in <1 second

**Pass Criteria**: Total commit time <2 seconds

---

### GitHub Actions Workflow Time

#### Test 6.1: Ticket Validation Workflow Duration

**Measurement**:
```bash
# Create a PR and check GitHub Actions tab
# Record total execution time
```

**Expected Result**: Workflow completes in <2 minutes

**Pass Criteria**: "Summary" step shows total time <120s

---

## Cross-Platform Tests

### macOS Verification

**Environment**: macOS (Haiku development machine)

**Tests**:
- ✅ All git hooks functional
- ✅ Bash syntax compatible
- ✅ File paths work with sed/grep

---

### Linux Verification

**Environment**: GitHub Actions (Ubuntu 22.04)

**Tests**:
- ✅ All git hooks functional
- ✅ GitHub Actions workflow runs
- ✅ File system paths work

---

## Rollback & Recovery Tests

### Test 7.1: Disable Hooks Temporarily

**Action**:
```bash
# Commit without running hooks
git commit --no-verify -m "Bypass hooks"
```

**Expected Result**: ✅ Commit succeeds, bypasses all hooks

**Pass Criteria**: Can bypass if truly necessary (emergency only)

---

### Test 7.2: Remove Hooks Gracefully

**Action**:
```bash
rm .husky/pre-commit .husky/prepare-commit-msg .husky/commit-msg
```

**Expected Result**: ✅ Git continues working, just no hook validation

**Pass Criteria**: No git errors after removing hooks

---

## Test Summary

| Layer | Component | Status | Notes |
|-------|-----------|--------|-------|
| 1 | pre-commit | To Test | Should block missing docs |
| 1 | prepare-commit-msg | To Test | Should auto-prefix ticket |
| 1 | commit-msg | To Test | Should enforce format |
| 2 | ticket-validation.yml | To Test | Should block missing docs |
| 2 | workflow execution | To Test | Should complete in <2min |
| 3 | CLAUDE.md | To Test | Should load on session start |
| 3 | Slash commands | To Test | Should be available |
| 3 | Reference guides | To Test | Should load via @ syntax |

---

## Test Execution Checklist

Before merging CHRONO-018:

### Local Tests (macOS)
- [ ] Test 1.1: Pre-commit blocks missing spec
- [ ] Test 1.2: Pre-commit blocks missing impl guide
- [ ] Test 1.3: Pre-commit blocks missing test spec
- [ ] Test 1.4: Pre-commit allows complete commit
- [ ] Test 1.5: Prepare-commit-msg auto-injects ticket
- [ ] Test 1.6: Commit-msg rejects bad format
- [ ] Test 1.7: Hooks allow non-ticket branches
- [ ] Test 2.1: Full E2E workflow works
- [ ] Test 5.1: Hook execution <1s
- [ ] Test 5.2: Message rewriting <1s
- [ ] Test 5.3: Total commit <2s

### GitHub Actions Tests (Automated)
- [ ] Test 3.1: Extract ticket from title
- [ ] Test 3.2: Extract ticket from branch
- [ ] Test 3.3: Validate spec exists
- [ ] Test 3.4: Validate impl guide exists
- [ ] Test 3.5: Validate test spec exists
- [ ] Test 3.6: Block missing spec
- [ ] Test 3.7: Block missing impl guide
- [ ] Test 3.8: Block missing test spec
- [ ] Test 3.9: Pass CHRONO-018 PR

### Manual Verification (Claude Code)
- [ ] Test 4.1: CLAUDE.md loads
- [ ] Test 4.2: Slash commands available
- [ ] Test 4.3: /ticket works
- [ ] Test 4.4: /spec-ready works
- [ ] Test 4.5: /spec-ready detects missing
- [ ] Test 4.6: /start-work shows checklist

---

## Success Criteria

CHRONO-018 is complete when:

✅ All 11 local tests pass on macOS
✅ All 9 GitHub Actions tests pass
✅ All 6 manual verification tests pass
✅ Performance tests show <1s hook time
✅ No regressions to existing workflows
✅ README updated with workflow examples
✅ Team can follow workflow on next ticket
