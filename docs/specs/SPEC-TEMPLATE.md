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
