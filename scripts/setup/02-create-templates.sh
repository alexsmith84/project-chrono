#!/bin/bash

# Project Chrono - Template Files Setup
# Script 2 of 3: Create all template files
# 
# "Standardized protocols engaged..."

set -e  # Exit on any error

echo "📋 PROJECT CHRONO - TEMPLATE CREATION"
echo "====================================="
echo ""

# Color output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create GitHub Issue Template
echo -e "${BLUE}Creating GitHub issue template...${NC}"

cat > .github/ISSUE_TEMPLATE/feature-ticket.md << 'EOF'
---
name: Feature Ticket
about: Standard ticket format for Project Chrono features
title: 'CHRONO-XXX: [Role] Brief Description'
labels: ''
assignees: ''
---

## Summary
[2-3 sentences describing what needs to be built and why it's important]

## Epic & Classification
- **Epic**: [Nexus Construction / Chrono Boost Network / Khala Connection / Warp Gate Portal / Protoss Fleet]
- **Role**: [Oracle / Zealot / Templar / Marine / Overlord / Observer]
- **Supply Cost**: [1 / 2 / 3 / 5 / 8]
- **Priority**: [Critical Mission / Main Objective / Side Quest / Research]

## Documentation
📋 **Full Spec**: `docs/specs/CHRONO-XXX-[description].md`  
🔧 **Implementation Guide**: `docs/implementation/CHRONO-XXX-guide.md`  
✅ **Test Specification**: `docs/tests/CHRONO-XXX-tests.md`

## Quick Reference
- **Key Technologies**: [List primary tech stack used]
- **Dependencies**: [Requires CHRONO-YYY, CHRONO-ZZZ]
- **Blocks**: [Blocks CHRONO-AAA, CHRONO-BBB]

## Definition of Done
- [ ] Implementation matches specification in `docs/specs/CHRONO-XXX-*.md`
- [ ] All tests passing per `docs/tests/CHRONO-XXX-tests.md`
- [ ] Code reviewed by human developer
- [ ] Performance benchmarks met (if applicable)
- [ ] Documentation updated (README, architecture docs)
- [ ] IMPLEMENTATION_LOG.md updated with learnings

## Claude Code Notes
[Any specific guidance for the implementing agent - common pitfalls, debugging tips, etc.]

## Reference Implementation
See `scripts/reference/CHRONO-XXX-*` for working reference code (if applicable)

---
*"My life for Aiur! This task serves the greater Khala."*
EOF

echo -e "${GREEN}✓ GitHub issue template created${NC}"
echo ""

# Create Spec Template
echo -e "${BLUE}Creating specification template...${NC}"

cat > docs/specs/SPEC-TEMPLATE.md << 'EOF'
# CHRONO-XXX: [Feature Title]

*"[StarCraft-themed flavor text related to this feature]"*

---

## Context & Requirements

### Why This Exists
[Business and technical context. What problem does this solve? How does it fit into the larger system?]

### What It Must Do
**Functional Requirements**:
- Requirement 1: [Clear, testable requirement]
- Requirement 2: [Clear, testable requirement]
- Requirement 3: [Clear, testable requirement]

**Non-Functional Requirements**:
- Performance: [Latency, throughput, or other performance targets]
- Scalability: [How it should scale with load]
- Reliability: [Uptime, error handling expectations]
- Security: [Security considerations]

### Constraints
- **Technical**: [Platform limitations, technology constraints]
- **Business**: [Budget, time, resource constraints]
- **Regulatory**: [Compliance requirements, if any]

---

## Technical Architecture

### System Design
[How this component fits into the overall system architecture. Include diagrams if helpful.]

### Data Flow
1. **Input**: [What data comes in, from where]
2. **Processing**: [How data is transformed]
3. **Output**: [What data goes out, to where]
4. **Storage**: [Any persistent data, cache strategy]

### Dependencies
- **Requires**: CHRONO-YYY (must be completed first)
- **Integrates With**: CHRONO-ZZZ (works alongside)
- **Blocks**: CHRONO-AAA (this must be done before AAA can start)

---

## Implementation Details

### Technology Stack
- **Primary Language**: [Rust / TypeScript / etc.]
- **Runtime**: [Bun / Deno / Native / etc.]
- **Libraries**: [Key dependencies]
- **Tools**: [Development tools needed]

### Core Data Structures

**TypeScript Types**:
```typescript
interface Example {
  field1: string;
  field2: number;
}
```

**Rust Types**:
```rust
struct Example {
    field1: String,
    field2: i64,
}
```

### Core Algorithm

[Conceptual explanation of the main algorithm or logic]

**Key Considerations**:
- Handle edge case X by doing Y
- Optimize for Z scenario
- Remember constraint from requirements

**Reference Implementation**:
See `/scripts/reference/CHRONO-XXX-impl.{rs,ts}` for working reference code.

### API Contracts (if applicable)

**REST Endpoint**:
```
POST /api/v1/endpoint
Request: { ... }
Response: { ... }
```

**WebSocket Message**:
```
Event: "eventName"
Payload: { ... }
```

### Database Schema (if applicable)

```sql
CREATE TABLE example (
    id SERIAL PRIMARY KEY,
    field1 VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_example_field1 ON example(field1);
```

### Configuration

```yaml
# Environment variables or config needed
EXAMPLE_API_KEY: "required"
EXAMPLE_TIMEOUT: 5000  # milliseconds
```

---

## Error Handling

### Error Scenarios
1. **Scenario**: Invalid input data
   - **Detection**: Validate at entry point
   - **Handling**: Return 400 Bad Request with detailed error
   - **Logging**: Log at WARN level with request context

2. **Scenario**: External service failure
   - **Detection**: Timeout or error response
   - **Handling**: Retry with exponential backoff (3 attempts)
   - **Logging**: Log at ERROR level, alert if persistent

### Retry Strategy
- **Transient Failures**: Retry 3 times with exponential backoff (100ms, 200ms, 400ms)
- **Permanent Failures**: Fail fast, log detailed error, alert if critical

---

## Performance Requirements

### Targets
- **Latency**: [P50: Xms, P95: Yms, P99: Zms]
- **Throughput**: [N requests/second]
- **Memory**: [Maximum RAM usage]
- **CPU**: [Expected CPU utilization]

### Optimization Strategies
- Strategy 1: [e.g., Use connection pooling]
- Strategy 2: [e.g., Implement caching with 5-minute TTL]
- Strategy 3: [e.g., Batch processing for efficiency]

### Benchmarking
See `docs/tests/CHRONO-XXX-tests.md` for performance test specifications.

---

## Security Considerations

### Authentication & Authorization
- [How authentication works for this component]
- [Authorization rules and access control]

### Data Validation
- [Input validation strategy]
- [Sanitization requirements]

### Attack Vectors
- **Threat 1**: [Description] → **Mitigation**: [How we prevent it]
- **Threat 2**: [Description] → **Mitigation**: [How we prevent it]

### Sensitive Data Handling
- [How secrets, keys, or PII are managed]

---

## Testing Requirements

### Unit Tests
- [ ] Test case 1: [Description of what to test]
- [ ] Test case 2: [Description of what to test]
- [ ] Test edge case: [Boundary conditions]
- [ ] Test error handling: [Failure scenarios]

### Integration Tests
- [ ] Test scenario 1: [End-to-end flow]
- [ ] Test scenario 2: [Integration with dependency]

### Performance Tests
- [ ] Load test: [N requests/second for X duration]
- [ ] Stress test: [Beyond normal capacity]
- [ ] Soak test: [Extended duration at normal load]

---

## Acceptance Criteria

**This feature is complete when**:
1. All functional requirements are implemented and verified
2. All tests pass (unit, integration, performance)
3. Performance benchmarks are met or exceeded
4. Security review completed (if applicable)
5. Documentation is updated
6. Code review approved by human developer
7. Successfully tested in development environment
8. Ready for production deployment

**User Perspective**:
"As a [user type], I should be able to [action] and see [result]."

---

## Reference Materials

### Documentation
- [Link to relevant external docs]
- [Link to related RFCs or standards]
- [Link to similar implementations]

### Related Specifications
- See also: `docs/specs/CHRONO-YYY-*.md` (related feature)
- Depends on: `docs/specs/CHRONO-ZZZ-*.md` (dependency)

### Open Questions
- [ ] Question 1: [Needs clarification from stakeholder/architect]
- [ ] Question 2: [Technical decision to be made]

**Decision Log**:
- [Date]: Decision on [topic] → [Resolution and rationale]

---

*"The Khala provides clarity. Follow the path illuminated."*
EOF

echo -e "${GREEN}✓ Specification template created${NC}"
echo ""

# Create Test Template
echo -e "${BLUE}Creating test specification template...${NC}"

cat > docs/tests/TEST-TEMPLATE.md << 'EOF'
# Test Specification: CHRONO-XXX

*"The Observer sees all. No defect shall remain cloaked."*

---

## Test Overview

### Feature Being Tested
[Brief description of the feature and what aspect we're testing]

### Testing Scope
- **Unit Tests**: [What units/functions are tested in isolation]
- **Integration Tests**: [What component interactions are tested]
- **E2E Tests**: [What user flows are tested end-to-end]
- **Performance Tests**: [What performance characteristics are validated]

### Test Environment
- **Development**: Local Mac Mini M4 Pro
- **CI/CD**: GitHub Actions runners
- **Staging**: [If applicable]

---

## Unit Tests

### Test Suite: [Component/Module Name]

**File**: `tests/unit/[language]/[module]_test.{rs,ts}`

#### Test Case 1: [Happy Path]
**Description**: [What this test verifies]

**Test Code**:
```typescript
test('should [expected behavior] when [condition]', () => {
  // Arrange
  const input = { ... };
  
  // Act
  const result = functionUnderTest(input);
  
  // Assert
  expect(result).toEqual(expectedOutput);
});
```

**Expected Result**: [What should happen]

#### Test Case 2: [Edge Case]
**Description**: [What edge case this covers]

**Expected Result**: [What should happen]

#### Test Case 3: [Error Handling]
**Description**: [What error scenario this tests]

**Expected Result**: [What error should be thrown]

### Additional Unit Tests
- [ ] Test with null/undefined inputs
- [ ] Test with empty arrays/objects
- [ ] Test with maximum values
- [ ] Test with minimum values
- [ ] Test boundary conditions

---

## Integration Tests

### Test Scenario 1: [End-to-End Flow]

**File**: `tests/integration/[feature]_test.{rs,ts}`

**Setup**:
```bash
# Prerequisites
- Database running with test data
- Redis cache available
- Mock external APIs ready
```

**Test Steps**:
1. **Given**: [Initial state setup]
2. **When**: [Action performed]
3. **Then**: [Expected outcome]

**Verification**:
- [ ] Database state is correct
- [ ] Cache updated properly
- [ ] External API called with correct params
- [ ] Response matches expected format

### Test Scenario 2: [Failure Handling]

**Test Steps**:
1. **Given**: [Setup with potential failure condition]
2. **When**: [Action that triggers failure]
3. **Then**: [Expected failure handling]

**Verification**:
- [ ] Error logged correctly
- [ ] Retry mechanism triggered
- [ ] Graceful degradation works
- [ ] User receives appropriate error message

---

## Performance Tests

### Load Test

**Objective**: Verify system handles expected load

**Configuration**:
- **Duration**: 5 minutes
- **Concurrent Users**: 100
- **Requests/Second**: 500
- **Ramp-up Time**: 30 seconds

**Success Criteria**:
- [ ] P95 latency < 200ms
- [ ] P99 latency < 500ms
- [ ] Error rate < 0.1%
- [ ] CPU usage < 70%
- [ ] Memory usage stable (no leaks)

### Stress Test

**Objective**: Find breaking point

**Configuration**:
- **Duration**: 10 minutes
- **Concurrent Users**: Start at 100, increase by 50 every minute
- **Target**: Find maximum sustainable load

**Success Criteria**:
- [ ] System degrades gracefully (no crashes)
- [ ] Error messages are informative
- [ ] Recovery is automatic when load decreases

---

## Manual Verification Steps

### For Infrastructure Tickets

**Verification Steps**:

#### Step 1: [Verification Action]
```bash
# Command to run
./scripts/verify-something.sh
```
**Expected Output**: [What should be displayed]

#### Step 2: [Visual Inspection]
- Navigate to [URL or location]
- Verify [specific element or behavior]
- Confirm [expected state]

### Checklist
- [ ] Component A is configured correctly
- [ ] Component B is running
- [ ] Component C can communicate with Component B
- [ ] Logs show expected output
- [ ] No errors in system logs

---

## Test Data

### Required Test Data
```json
{
  "testUser": {
    "wallet": "0x...",
    "delegation": 1000000
  },
  "testPrices": [
    { "symbol": "BTC", "price": 45000.00, "timestamp": "..." }
  ]
}
```

### Data Setup
```bash
./scripts/seed-test-data.sh
```

### Data Cleanup
```bash
./scripts/cleanup-test-data.sh
```

---

## Test Execution

### Run All Tests
```bash
# Unit tests
cargo test                    # Rust
bun test                      # TypeScript

# Integration tests
./scripts/run-integration-tests.sh
```

### Run Specific Test Suite
```bash
cargo test --test test_name    # Rust
bun test path/to/test.ts       # TypeScript
```

### CI/CD Integration
Tests run automatically on:
- [ ] Every commit to feature branch
- [ ] Pull request creation/update
- [ ] Merge to khala branch

---

*"All systems validated. The Observer confirms: defects detected and eliminated."*
EOF

echo -e "${GREEN}✓ Test specification template created${NC}"
echo ""

# Create Implementation Guide Template
echo -e "${BLUE}Creating implementation guide template...${NC}"

cat > docs/implementation/IMPL-TEMPLATE.md << 'EOF'
# Implementation Guide: CHRONO-XXX

*"The path is illuminated. Follow these steps to victory."*

---

## Prerequisites

### Required Knowledge
- [Technology 1]: Basic understanding of [concept]
- [Technology 2]: Familiarity with [pattern]

### Required Tools
- [ ] [Tool 1] installed (version X.X+)
- [ ] [Tool 2] configured
- [ ] [Service] running and accessible

### Dependencies
- [ ] CHRONO-YYY completed (provides [functionality])
- [ ] CHRONO-ZZZ completed (provides [dependency])

### Environment Setup
```bash
# Commands to prepare environment
export ENV_VAR="value"
./scripts/setup-for-chrono-xxx.sh
```

---

## Implementation Checklist

### Phase 1: Setup & Scaffolding
- [ ] Create directory structure
- [ ] Initialize configuration files
- [ ] Set up test files
- [ ] Create stub functions/modules

### Phase 2: Core Implementation
- [ ] Implement [Component A]
- [ ] Implement [Component B]
- [ ] Implement [Component C]
- [ ] Connect components

### Phase 3: Error Handling & Edge Cases
- [ ] Add input validation
- [ ] Implement error handling
- [ ] Handle edge cases
- [ ] Add retry logic (if applicable)

### Phase 4: Testing
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Run performance benchmarks
- [ ] Manual testing

### Phase 5: Documentation & Cleanup
- [ ] Update README if needed
- [ ] Add inline documentation
- [ ] Update architecture docs
- [ ] Clean up debug code

---

## Step-by-Step Implementation

### Step 1: [Initial Setup]

**Objective**: [What this step accomplishes]

**Commands**:
```bash
# Create necessary directories
mkdir -p src/[component]/[language]

# Initialize files
touch src/[component]/[language]/[file].{rs,ts}
```

**What to implement**:
```typescript
// Stub implementation
export function placeholder() {
  // TODO: Implement in next step
  throw new Error('Not implemented');
}
```

**Verification**:
```bash
./scripts/verify-step-1.sh
```

---

### Step 2: [Core Logic Implementation]

**Objective**: [What this step accomplishes]

**Reference**: See `docs/specs/CHRONO-XXX-*.md` section "[Section Name]"

**Key Considerations**:
- Remember to handle [edge case X]
- Optimize for [scenario Y]
- Don't forget to [important detail Z]

**Common Pitfall**: [Description of common mistake and how to avoid it]

---

### Step 3: [Integration]

**Objective**: [Connect components together]

**Integration Points**:
1. Component A → Component B: [How they communicate]
2. Component B → Database: [What data flows]
3. Component C → External API: [API calls made]

---

### Step 4: [Error Handling]

**Objective**: [Handle all failure scenarios]

**Error Scenarios to Handle**:
1. **Invalid Input**: Validate and reject
2. **External Service Failure**: Retry with backoff
3. **Resource Exhaustion**: Implement backpressure

---

### Step 5: [Testing]

**Objective**: [Ensure everything works correctly]

**Run Tests**:
```bash
bun test tests/unit/component_test.ts
```

---

## Debugging Guide

### Common Issues

#### Issue 1: [Problem Description]
**Symptoms**: [How you know this is the problem]
**Cause**: [Why this happens]
**Solution**: 
```bash
./scripts/fix-issue-1.sh
```

### Debugging Commands
```bash
# Enable debug logging
export DEBUG=chrono:*

# Check logs
tail -f logs/chrono-xxx.log
```

---

## Performance Optimization

### Optimization Checklist
- [ ] Use connection pooling for database
- [ ] Implement caching (5-minute TTL recommended)
- [ ] Batch operations instead of individual calls
- [ ] Profile with benchmarking tools

---

## Post-Implementation

### Update Documentation
- [ ] Add entry to IMPLEMENTATION_LOG.md with learnings
- [ ] Update README if new features added
- [ ] Document any new configuration options

### Knowledge Transfer
**Key Learnings**:
- [Learning 1]: [What you discovered]
- [Learning 2]: [What surprised you]

---

*"The task is complete. The Khala rejoices. En Taro Tassadar!"*
EOF

echo -e "${GREEN}✓ Implementation guide template created${NC}"
echo ""

# Summary
echo ""
echo "====================================="
echo -e "${GREEN}✨ TEMPLATES CREATION COMPLETE ✨${NC}"
echo "====================================="
echo ""
echo "Created:"
echo "  ✓ GitHub issue template (.github/ISSUE_TEMPLATE/feature-ticket.md)"
echo "  ✓ Specification template (docs/specs/SPEC-TEMPLATE.md)"
echo "  ✓ Test specification template (docs/tests/TEST-TEMPLATE.md)"
echo "  ✓ Implementation guide template (docs/implementation/IMPL-TEMPLATE.md)"
echo ""
echo "Next steps:"
echo "  1. Run: ./scripts/setup/03-create-docs.sh"
echo "  2. Commit: git add . && git commit -m 'Add documentation templates'"
echo ""
echo -e "${BLUE}Templates deployed. All units standardized!${NC}"
echo ""