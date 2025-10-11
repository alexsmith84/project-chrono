# Ticket Creation Guide

_"Precise specifications lead to flawless execution."_

---

## Overview

This guide explains how to create well-specified tickets for Project Chrono using our three-document system:

1. **Specification** (`docs/specs/CHRONO-XXX-*.md`) - WHAT to build
2. **Implementation Guide** (`docs/implementation/CHRONO-XXX-guide.md`) - HOW to build
3. **Test Specification** (`docs/tests/CHRONO-XXX-tests.md`) - HOW to verify

---

## Step-by-Step Process

### Step 1: Identify the Need

Determine:

- What problem needs solving?
- What feature is required?
- Which epic does this belong to?
- What role (skill set) is needed?

### Step 2: Create the Specification

```bash
# Copy template
cp docs/specs/SPEC-TEMPLATE.md docs/specs/CHRONO-XXX-description.md

# Fill in all sections:
# - Context & Requirements
# - Technical Architecture
# - Implementation Details
# - Error Handling
# - Performance Requirements
# - Security Considerations
# - Testing Requirements
# - Acceptance Criteria
```

**Key Principles**:

- Be comprehensive but concise
- Include code examples for clarity
- Define clear success criteria
- Reference dependencies

### Step 3: Create Implementation Guide

```bash
# Copy template
cp docs/implementation/IMPL-TEMPLATE.md docs/implementation/CHRONO-XXX-guide.md

# Fill in:
# - Prerequisites
# - Step-by-step checklist
# - Detailed implementation steps
# - Common pitfalls
# - Debugging guidance
```

**Key Principles**:

- Assume reader has basic knowledge only
- Break complex tasks into small steps
- Include verification steps after each phase
- Document known issues and workarounds

### Step 4: Create Test Specification

```bash
# Copy template
cp docs/tests/TEST-TEMPLATE.md docs/tests/CHRONO-XXX-tests.md

# Fill in:
# - Unit test cases
# - Integration test scenarios
# - Performance test requirements
# - Manual verification steps (for infra tickets)
```

**Key Principles**:

- Every requirement needs a test
- Include success criteria for each test
- Provide test data setup/cleanup scripts
- Document expected outputs

### Step 5: Create GitHub Issue

Use the GitHub issue template:

```bash
# Create issue manually via GitHub web UI
# OR use GitHub CLI:

gh issue create \
  --title "CHRONO-XXX: [Role] Brief Description" \
  --body-file .github/ISSUE_TEMPLATE/feature-ticket.md \
  --label "epic:nexus,role:marine,supply:2,priority:critical"
```

**Fill in the template**:

- Summary (2-3 sentences)
- Epic & Classification (epic, role, supply cost, priority)
- Documentation links (to the three docs you created)
- Quick reference (technologies, dependencies)
- Definition of done (checklist)

### Step 6: Add to GitHub Projects

1. Open the ticket
2. Add to "Project Chrono Roadmap" project
3. Set custom fields:
   - Epic: [Select from dropdown]
   - Role: [Select from dropdown]
   - Supply Cost: [1, 2, 3, 5, or 8]
   - Priority: [Select from dropdown]
4. Place in "Backlog" column

---

## Ticket Numbering

- Use sequential numbers: CHRONO-001, CHRONO-002, etc.
- No gaps or ranges
- Check existing tickets to find next number

---

## Supply Cost Guidelines

| Supply | Size | Time   | Example                           |
| ------ | ---- | ------ | --------------------------------- |
| 1      | XS   | 0.5-1h | Config change, doc update         |
| 2      | S    | 1-2h   | Simple API endpoint, UI component |
| 3      | M    | 2-4h   | Complex feature, algorithm        |
| 5      | L    | 4-8h   | Major system, integration         |
| 8      | XL   | 8-16h  | Epic implementation               |

---

## Quality Checklist

Before creating the GitHub issue, verify:

- [ ] Spec is comprehensive and clear
- [ ] Implementation guide has step-by-step instructions
- [ ] Test spec covers all requirements
- [ ] Dependencies are identified
- [ ] Acceptance criteria are measurable
- [ ] Supply cost is realistic
- [ ] Epic and role are correct

---

_"Specification complete. Ready for implementation. En Taro Tassadar!"_
