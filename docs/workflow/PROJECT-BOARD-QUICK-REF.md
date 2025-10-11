# GitHub Project Board - Quick Reference

**Project**: [Project Chrono - Oracle Development](https://github.com/users/alexsmith84/projects/5)

---

## TL;DR - Using the Helper Script

```bash
# Show current board
./scripts/helpers/project-board.sh show-board

# Create new issue (fully configured)
./scripts/helpers/project-board.sh create-issue \
  "CHRONO-011: [Overlord] Feature Name" \
  khala overlord critical 5 "enhancement"

# Update status when you start work
./scripts/helpers/project-board.sh update-status 11 in-progress

# Update status when creating PR
./scripts/helpers/project-board.sh update-status 11 in-review
```

---

## Quick Workflows

### Creating a New Ticket (Automated)

```bash
# One command does everything:
# - Creates GitHub issue
# - Adds to project board
# - Sets Epic, Role, Priority, Supply
# - Assigns to you

./scripts/helpers/project-board.sh create-issue \
  "CHRONO-XXX: [Role] Title" \
  <epic> <role> <priority> <supply> "<extra-labels>"

# Example:
./scripts/helpers/project-board.sh create-issue \
  "CHRONO-011: [Overlord] Rate Limiting" \
  khala overlord critical 3 "enhancement"
```

### Updating Status During Development

```bash
# When spec is ready
./scripts/helpers/project-board.sh update-status 11 ready

# When you start coding
./scripts/helpers/project-board.sh update-status 11 in-progress

# When you create PR
./scripts/helpers/project-board.sh update-status 11 in-review

# Done happens automatically when PR merges
```

### Checking Board Status

```bash
# See all tickets
./scripts/helpers/project-board.sh show-board

# Check what's in progress
gh project item-list 5 --owner alexsmith84 --format json | \
  jq -r '.items[] | select(.status == "In Progress") | "\(.content.number): \(.title)"'
```

---

## Manual Operations (When Script Doesn't Work)

### Get Project Item ID

```bash
ISSUE_NUM=25
gh project item-list 5 --owner alexsmith84 --format json | \
  jq -r ".items[] | select(.content.number == $ISSUE_NUM) | .id"
```

### Update Single Field

```bash
PROJECT_ID="PVT_kwHOAA1B-c4BEzsW"
ITEM_ID="<from above>"

# Update status to In Progress
gh project item-edit --project-id $PROJECT_ID --id $ITEM_ID \
  --field-id PVTSSF_lAHOAA1B-c4BEzsWzg2U5wg \
  --single-select-option-id 47fc9ee4
```

---

## Reference Tables

### Epics

| Name | ID | Label |
|------|----|----|
| Nexus Construction | `4c2e0f05` | `epic-nexus` |
| Khala Connection | `69572fa2` | `epic-khala` |
| Chrono Boost | `0b141e0c` | `epic-chrono` |
| Warp Gate | `0aa355fd` | `epic-warp` |
| Protoss Fleet | `c42a270b` | `epic-fleet` |

### Roles

| Name | ID | Label | Description |
|------|----|----|------|
| Oracle | `20cb1e26` | `probe-data` | Data Engineering |
| Zealot | `99af3a81` | `zealot-frontend` | Frontend Dev |
| Templar | `4adc0fd2` | `templar-blockchain` | Blockchain |
| Marine | `254eb9d9` | `marine-devops` | DevOps |
| Overlord | `8a138c43` | `overlord-backend` | Backend Dev |
| Observer | `2568606f` | `scv-qa` | QA/Testing |

### Priorities

| Name | ID | Label |
|------|----|----|
| Critical Mission | `5c5de61b` | `Critical Mission` |
| Main Objective | `1bf0aaf4` | `Main Objective` |
| Side Quest | `9eb7939a` | `Side Quest` |
| Research | `60a8499a` | `Research` |

### Supply Costs

| Size | ID | Label | Meaning |
|------|----|----|------|
| 1 | `8f2c0327` | `1-supply` | XS (Marine/Zealot) |
| 2 | `7d650237` | `2-supply` | S (Stalker/Marauder) |
| 3 | `4f420d58` | `3-supply` | M (Templar/Ghost) |
| 5 | `6c38264c` | `5-supply` | L (Colossus/Thor) |
| 8 | `e52899be` | `8-supply` | XL (Carrier/BC) |

### Statuses

| Name | ID | When to Use |
|------|----|-------------|
| Backlog | `b89008ea` | Issue created, spec not ready |
| Ready | `be2c3b40` | Spec complete, ready to start |
| In Progress | `47fc9ee4` | Actively coding |
| In Review | `be9d724e` | PR created |
| Done | `98236657` | PR merged (auto) |

---

## Field IDs (For Manual Updates)

```bash
EPIC_FIELD="PVTSSF_lAHOAA1B-c4BEzsWzg2Z2PM"
ROLE_FIELD="PVTSSF_lAHOAA1B-c4BEzsWzg2Z2YE"
PRIORITY_FIELD="PVTSSF_lAHOAA1B-c4BEzsWzg2Z2ew"
SUPPLY_FIELD="PVTSSF_lAHOAA1B-c4BEzsWzg2Z3zc"
STATUS_FIELD="PVTSSF_lAHOAA1B-c4BEzsWzg2U5wg"

PROJECT_ID="PVT_kwHOAA1B-c4BEzsW"
```

---

## Checklists

### Before Starting ANY Work

- [ ] Create GitHub issue (or use existing)
- [ ] Add to project board
- [ ] Set Epic, Role, Priority, Supply
- [ ] Move to "Ready" (if spec complete)
- [ ] Assign to yourself
- [ ] Move to "In Progress" when you start

### When Creating PR

- [ ] Move ticket to "In Review"
- [ ] Link issue with "Closes #XXX" in PR body
- [ ] Ensure PR title matches "CHRONO-XXX: Title" format

### After PR Merge

- [ ] Verify issue auto-closed
- [ ] Verify board auto-moved to "Done"
- [ ] Update IMPLEMENTATION_LOG.md

---

## Troubleshooting

### Issue Not Appearing on Board

```bash
# Add it manually
./scripts/helpers/project-board.sh add-to-board <issue_number>
```

### Status Not Auto-Updating

```bash
# Update manually
./scripts/helpers/project-board.sh update-status <issue_number> <status>
```

### Multiple Issues "In Progress"

❌ **WRONG** - Only one ticket should be "In Progress" at a time!

Fix: Move completed work to "In Review" before starting new work.

---

## Best Practices

1. **One ticket in progress at a time** - Focus!
2. **Update status immediately** - Don't batch updates
3. **Link PRs to issues** - Use "Closes #XXX"
4. **Complete metadata on creation** - Don't leave fields empty
5. **Check board daily** - Ensure it reflects reality

---

*"The board is clear. The Khala shows our progress. En Taro Tassadar!"*
