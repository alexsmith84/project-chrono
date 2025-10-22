# Begin Implementation with Phase Gates

Confirm all pre-implementation requirements are met before you start coding.

## Usage

```
/start-work
```

No arguments needed. I'll provide a checklist.

## What This Does

When you run this command, I will:

1. Present a pre-implementation checklist
2. Ask you to confirm each item is complete
3. If you confirm all items: **ALLOW implementation to begin**
4. If any items are unchecked: **ASK you to address them first**
5. Set up phase tracking and token usage monitoring
6. Guide you through the first step of the implementation guide

## The Pre-Implementation Checklist

You'll be asked to confirm:

```
PRE-IMPLEMENTATION GATE

Please confirm all items are complete:

[ ] I've read and understood the specification
    (Understand WHAT and WHY we're building this)

[ ] I've reviewed the implementation guide
    (Understand HOW to build it, step-by-step)

[ ] I've reviewed the test specification
    (Understand HOW to test it)

[ ] Acceptance criteria are clear to me
    (Know when this ticket is "done")

[ ] Tech stack is locked
    (No mid-ticket framework upgrades, dependency changes, etc.)

[ ] I'm ready to follow the guide exactly
    (No deviations without creating follow-up tickets)

Ready to proceed? (type 'yes' to continue)
```

## Example Workflow

```
You: /start-work

I'll ask you to confirm the checklist above.

You: yes, all items confirmed

I'll then:
✅ Set token budget based on estimated supply cost
✅ Remind you to create feature branch: git checkout -b CHRONO-XXX
✅ Guide you through Step 1 of the implementation guide
✅ Set reminders for common pitfalls
✅ Track progress through each phase
```

## What Happens During Implementation

After you confirm the checklist:

1. **Feature Branch**: You'll create `git checkout -b CHRONO-XXX-description`
2. **Step-by-Step**: Follow the implementation guide exactly
3. **Commit Strategy**: Commit after each major step
4. **Token Tracking**: I'll monitor token usage against budget
5. **Git Hooks**: Husky will enforce ticket format and doc presence
6. **Testing**: Run tests frequently during development

## What Happens If You Get Stuck

If you need to deviate from the spec:

```
I need to:
- Add a new dependency
- Change the database schema
- Upgrade framework versions
- Add new features not in spec

I'll respond:
🛑 STOP. This is scope creep.

Instead:
1. Document why this change is needed
2. Create a FOLLOW-UP ticket (CHRONO-XXX-FOLLOWUP)
3. Continue with original ticket scope
4. Keep this ticket focused

This prevents token waste and keeps delivery predictable.
```

## After Implementation Complete

When you're done and ready to merge:

```
I'll:
✅ Verify all acceptance criteria met
✅ Confirm all tests passing
✅ Remind you to create PR with proper format
✅ Track final token usage vs estimate
✅ Suggest next steps (PR, issue close, project board update)
```

## Related Commands

- `/ticket CHRONO-123` - Load all documentation
- `/spec-ready CHRONO-123` - Validate docs exist before this
