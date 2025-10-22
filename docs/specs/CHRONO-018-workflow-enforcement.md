# CHRONO-018: Workflow Enforcement System

**Date**: 2025-10-22
**Status**: In Progress
**Supply Cost**: 8 (Major system, 8-16 hours)
**Priority**: P0 - Foundational (blocks all future tickets)

---

## Context & Requirements

### Problem Statement

Project Chrono has completed 24 tickets with 0% adherence to the three-document specification system. Analysis shows:

- **CHRONO-016 (Dashboard)**: 15+ commits, 5,703+ additions, 200-300% token overhead
- **Root cause**: No enforcement mechanism to prevent discovery-driven development
- **Impact**: Higher token usage, more bugs, longer implementation time

### Business Goals

1. **Reduce token usage by 50-70%** through spec-first development
2. **Standardize workflow** across all team members and future AI assistants
3. **Enable predictable delivery** (fewer surprise migrations, changes, scope creep)
4. **Document tribal knowledge** (reference guides for Svelte 5, Bun, etc.)

### Success Criteria

After implementation, the next 5 tickets must:

1. ✅ Have all 3 documentation files created BEFORE implementation starts
2. ✅ Reduce commit count from 15+ to <5 per ticket
3. ✅ Complete within 25% of estimated token budget (vs 200% variance currently)
4. ✅ Have zero "fix" commits due to scope creep
5. ✅ Have GitHub issues properly closed within 24h of PR merge

---

## Technical Architecture

### Multi-Layer Enforcement System

#### Layer 1: Git Hooks (Local Machine)
- **Tool**: Husky (already installed)
- **Purpose**: Block commits without proper documentation
- **Hooks implemented**:
  1. `pre-commit` - Validate ticket format and doc existence
  2. `prepare-commit-msg` - Auto-inject CHRONO-XXX into message
  3. `commit-msg` - Enforce commit message format

#### Layer 2: GitHub Actions (Remote CI/CD)
- **Tool**: GitHub Actions workflow
- **Purpose**: Prevent merging PRs without complete documentation
- **Checks**:
  1. Extract ticket number from PR title/branch
  2. Verify spec exists: `docs/specs/CHRONO-XXX-*.md`
  3. Verify implementation guide: `docs/implementation/CHRONO-XXX-guide.md`
  4. Verify test spec: `docs/tests/CHRONO-XXX-tests.md`
  5. Verify PR links to GitHub issue
  6. Block merge if any checks fail

#### Layer 3: Claude Code (IDE/Session)
- **Tool**: Claude Code hooks + slash commands + CLAUDE.md
- **Purpose**: Guide developer through correct workflow during coding
- **Components**:
  1. `CLAUDE.md` - Project workflow guidance (loaded per session)
  2. Reference guides - Svelte 5 patterns, Bun compatibility, etc.
  3. Custom slash commands - `/ticket`, `/spec-ready`, `/start-work`
  4. `UserPromptSubmit` hook - Detect ticket and enforce gates
  5. Pre-ticket checklist - Verify before starting work

### File Structure

```
.
├── .husky/
│   ├── pre-commit                    # Validate docs exist
│   ├── prepare-commit-msg            # Auto-inject ticket number
│   └── commit-msg                    # Enforce message format
├── .github/workflows/
│   └── ticket-validation.yml         # Remote PR validation
├── .claude/
│   ├── CLAUDE.md                     # Main workflow guide
│   ├── commands/
│   │   ├── ticket.md                 # /ticket CHRONO-XXX
│   │   ├── spec-ready.md             # /spec-ready validation
│   │   └── start-work.md             # Pre-implementation gate
│   └── settings.json                 # Hook configuration
├── docs/
│   ├── claude/
│   │   ├── pre-ticket-checklist.md
│   │   ├── backend-patterns.md
│   │   ├── frontend-patterns.md
│   │   ├── implementation-phases.md
│   │   └── token-tracking.md
│   ├── reference/
│   │   ├── svelte5-patterns.md
│   │   ├── bun-compatibility.md
│   │   └── tech-decisions.md
│   └── specs/ / implementation/ / tests/
│       └── [Existing CHRONO-XXX files]
└── README.md                         # Updated with workflow docs
```

### Workflow Diagram

```
Developer starts new ticket
         ↓
Creates GitHub issue (CHRONO-XXX)
         ↓
Creates 3 docs: spec, impl guide, test spec
         ↓
Creates branch: git checkout -b CHRONO-XXX
         ↓
⏹️  Git hook checks: Do all 3 docs exist?
    ├─ NO → Commit blocked, create docs first
    └─ YES → Continue
         ↓
Claude Code: /ticket CHRONO-XXX command
         ↓
⏹️  Claude hook: /spec-ready validation
    ├─ FAIL → Refuse implementation, create docs
    └─ PASS → Load docs and show checklist
         ↓
Claude Code: /start-work command
         ↓
⏹️  Pre-implementation gate: Confirm all items checked
    ├─ Spec read and understood
    ├─ Implementation guide reviewed
    ├─ Test spec reviewed
    ├─ Tech stack locked (no changes mid-ticket)
    └─ Acceptance criteria clear
         ↓
Implementation begins (following guide step-by-step)
         ↓
Create feature branch: git checkout -b CHRONO-XXX-description
         ↓
⏹️  Git hook (prepare-commit-msg): Auto-inject CHRONO-XXX
         ↓
Commit after each major step
         ↓
⏹️  Git hook (commit-msg): Verify format
         ↓
Push to remote: git push origin CHRONO-XXX-description
         ↓
Create PR with title: "CHRONO-XXX: Description"
         ↓
⏹️  GitHub Actions (ticket-validation.yml):
    ├─ Extract ticket number
    ├─ Verify spec exists
    ├─ Verify impl guide exists
    ├─ Verify test spec exists
    ├─ Verify PR links to issue
    └─ Block merge if ANY check fails
         ↓
All tests pass + docs verified
         ↓
Merge PR to forge
         ↓
⏹️  Manual: Close GitHub issue + update project board
         ↓
Done! Measure actual vs estimated tokens
```

---

## Implementation Details

### Pre-Ticket Documentation System

Every ticket requires:

1. **Specification** (`docs/specs/CHRONO-XXX-*.md`)
   - Concise title with ticket number
   - Problem context
   - Technical requirements
   - Acceptance criteria
   - ~300-500 words

2. **Implementation Guide** (`docs/implementation/CHRONO-XXX-guide.md`)
   - Prerequisites (tools, dependencies, knowledge)
   - Step-by-step checklist (5-15 items)
   - Common pitfalls for this type of work
   - Debugging tips
   - ~500-800 words

3. **Test Specification** (`docs/tests/CHRONO-XXX-tests.md`)
   - Unit test cases (what to test)
   - Integration test scenarios
   - Manual verification steps
   - Performance requirements (if applicable)
   - ~200-400 words

### Implementation Phases

**Phase 1: Design (Before Code)**
1. Create GitHub issue
2. Create 3 documentation files
3. Have them reviewed/approved
4. Update GitHub issue to link all 3 docs

**Phase 2: Development (Following Guide)**
1. Create feature branch
2. Follow implementation guide step-by-step
3. Write tests per test specification
4. Commit after each major step
5. Run all tests (unit, integration, E2E)

**Phase 3: Completion (Close Loop)**
1. Create PR with link to spec docs
2. Merge PR (squash to keep history clean)
3. Close GitHub issue with summary
4. Update project board
5. Track actual vs estimated tokens

### Error Handling

**Scenario 1: Missing documentation files**
- Git hook blocks commit with clear message
- Developer must create files before proceeding
- Error message includes path where file should be created

**Scenario 2: Commit without ticket number**
- Git hook blocks commit
- `prepare-commit-msg` auto-injects if on branch with CHRONO-XXX
- If not on branch with ticket, manual message required

**Scenario 3: PR missing doc files**
- GitHub Actions blocks merge
- Comment on PR lists missing files
- Blocks until all 3 docs present

**Scenario 4: Scope creep during implementation**
- Claude Code detects deviation from spec
- Creates follow-up ticket instead of expanding current
- Documents rationale in PR

### Performance Requirements

- Git hooks should execute in <1 second
- GitHub Actions validation should complete in <2 minutes
- No measurable impact on developer workflow

### Security Considerations

- Git hooks have read-only access to files
- No credentials stored in hooks
- GitHub Actions runs in standard Ubuntu environment
- No external API calls from hooks/actions

---

## Testing Requirements

### Unit Tests
- Verify bash scripts parse CHRONO-XXX correctly
- Test edge cases (no ticket number, multiple tickets, etc.)

### Integration Tests
- Create a test branch with CHRONO-XXX name
- Verify hook blocks commit without docs
- Verify hook allows commit with docs
- Test commit message formatting

### GitHub Actions Tests
- Create test PR without docs → verify blocked
- Create test PR with all 3 docs → verify passes
- Test ticket number extraction from branch name
- Test ticket number extraction from PR title

### Manual Verification
- End-to-end workflow with real ticket (CHRONO-018)
- Verify all gates function as intended
- Document any hook/action failures
- Validate developer experience

### Performance Tests
- Measure git hook execution time (<1s target)
- Measure GitHub Actions workflow time (<2m target)

---

## Acceptance Criteria

The implementation is complete when:

1. ✅ All git hooks functional and tested
2. ✅ GitHub Actions workflow passing on test PR
3. ✅ CLAUDE.md created with all reference guides linked
4. ✅ All slash commands functional and documented
5. ✅ README.md updated with workflow examples
6. ✅ CHRONO-018 itself follows the 3-doc system (this spec!)
7. ✅ No regressions to existing CI/CD workflows
8. ✅ Tested on macOS and Linux environments
9. ✅ All tests passing (unit, integration, GitHub Actions)
10. ✅ Documentation is clear and easy to follow

---

## Token Usage Estimate

- **Phase 1 (Design)**: 5-10k tokens
- **Phase 2 (Git hooks)**: 10-15k tokens
- **Phase 2 (GitHub Actions)**: 5-10k tokens
- **Phase 2 (Claude Code)**: 10-15k tokens
- **Phase 3 (Testing & docs)**: 10-15k tokens
- **Total estimate**: 40-65k tokens

**Budget**: 200k tokens available (supply cost 8 = 16h estimate)

---

## Related Documents

- See: `docs/implementation/CHRONO-018-guide.md` - Step-by-step implementation
- See: `docs/tests/CHRONO-018-tests.md` - Test requirements and validation
- See: `README.md` - User-facing workflow documentation

---

## Author Notes

This specification demonstrates the discipline we're implementing. CHRONO-018 itself follows the three-document system, with:

1. ✅ This spec (context, requirements, architecture)
2. ✅ Implementation guide (step-by-step how-to)
3. ✅ Test specification (how to verify it works)

This is the pattern all future tickets must follow.
