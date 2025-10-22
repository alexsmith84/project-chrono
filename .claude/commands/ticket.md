# Load Ticket Context

Load all documentation for a specific CHRONO ticket.

## Usage

```
/ticket CHRONO-123
```

Replace `CHRONO-123` with your actual ticket number.

## What This Does

When you run this command, I will:

1. Extract the ticket number from your message
2. Load the specification: `docs/specs/CHRONO-XXX-*.md`
3. Load the implementation guide: `docs/implementation/CHRONO-XXX-guide.md`
4. Load the test specification: `docs/tests/CHRONO-XXX-tests.md`
5. Summarize the acceptance criteria and requirements
6. Set a reminder: "Follow the implementation guide step-by-step"
7. Provide context-aware guidance specific to your ticket

## Example

```
You: /ticket CHRONO-019

I will then:
✅ Load specification
✅ Load implementation guide
✅ Load test specification
✅ Summarize requirements
✅ Ask clarifying questions if needed
✅ Be ready to help with implementation
```

## Why Use This?

- **Single command** loads all ticket documentation
- **No manual file opening** needed
- **Context-aware help** for your specific ticket
- **Prevents missing context** when asking for help

## Related Commands

- `/spec-ready` - Validate all 3 docs exist
- `/start-work` - Begin implementation with checklist
