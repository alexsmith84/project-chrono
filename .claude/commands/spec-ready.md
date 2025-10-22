# Validate Ticket Specification

Verify all 3 required documentation files exist before starting implementation.

## Usage

```
/spec-ready CHRONO-123
```

Replace `CHRONO-123` with your actual ticket number.

## What This Does

When you run this command, I will:

1. Check if `docs/specs/CHRONO-XXX-*.md` exists
2. Check if `docs/implementation/CHRONO-XXX-guide.md` exists
3. Check if `docs/tests/CHRONO-XXX-tests.md` exists
4. Report which files exist (✅) and which are missing (❌)
5. If any files are missing: **REFUSE to start implementation** and tell you which to create
6. If all files exist: **ALLOW you to proceed** and provide next steps

## This is a GATE

This command is a **critical workflow gate**. You cannot proceed without all 3 docs.

```
/spec-ready CHRONO-123

All checks:
✅ Specification found: docs/specs/CHRONO-123-feature.md
✅ Implementation guide found: docs/implementation/CHRONO-123-guide.md
✅ Test specification found: docs/tests/CHRONO-123-tests.md

✅ Ready to proceed! Run /start-work next.
```

## What If Docs Are Missing?

```
/spec-ready CHRONO-123

Missing files:
❌ Specification: docs/specs/CHRONO-123-*.md
✅ Implementation guide found
❌ Test specification: docs/tests/CHRONO-123-tests.md

🛑 Cannot proceed. Missing 2 of 3 required docs.

Create the missing files:
1. docs/specs/CHRONO-123-feature-name.md
2. docs/tests/CHRONO-123-tests.md

Then run /spec-ready again.
```

## Example Workflow

```bash
# 1. Create GitHub issue (gets CHRONO-123 number)
gh issue create --title "CHRONO-123: My feature"

# 2. Create 3 doc files
touch docs/specs/CHRONO-123-feature.md
touch docs/implementation/CHRONO-123-guide.md
touch docs/tests/CHRONO-123-tests.md

# 3. In Claude Code, validate
/spec-ready CHRONO-123

# 4. If all pass, continue
/start-work
```

## Related Commands

- `/ticket CHRONO-123` - Load all documentation
- `/start-work` - Begin implementation with checklist
