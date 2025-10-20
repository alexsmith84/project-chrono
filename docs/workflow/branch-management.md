# Branch Management Workflow

## TL;DR - All Feature Work Must Branch from `forge`

```bash
# ❌ WRONG - Branching from khala or committing directly
git checkout khala
git commit -m "feature"

# ❌ ALSO WRONG - Branching from khala instead of forge
git checkout khala
git checkout -b warp-in/CHRONO-XXX-description

# ✅ CORRECT - Always branch from forge for feature work
git checkout forge
git pull origin forge
git checkout -b warp-in/CHRONO-XXX-description
# ... make changes ...
git commit -m "CHRONO-XXX: feature description"
git push -u origin warp-in/CHRONO-XXX-description
gh pr create --base forge  # ← CRITICAL: PRs merge to forge, NOT khala
```

---

## Branch Strategy

### Production Branch: `khala`

- **Purpose**: Production-ready code, always deployable
- **Protection**: Protected via GitHub branch rules
- **Updates**: Only via PRs from `gateway` (staging)
- **Never**: Feature branches should NOT be created from khala
- **Never**: PRs should NOT target khala directly (except hotfixes)

### Development Branch: `forge`

- **Purpose**: Integration branch for all feature work
- **Updates**: Feature branches merge here via PR
- **Base for**: All `warp-in/*` feature branches
- **Protection**: Should be stable and tested before merging to gateway

### Feature Branches

**Naming Convention**: `warp-in/CHRONO-XXX-short-description`

**Examples**:
- `warp-in/CHRONO-011-workers`
- `warp-in/CHRONO-012-web-portal`
- `warp-in/CHRONO-013-analytics`

**Lifecycle**:
1. **CRITICAL**: Created from `forge` (NOT khala)
2. Development happens here
3. PR created to merge back to `forge` (NOT khala)
4. Deleted after merge

### Other Branch Types

**Hotfix branches**: `recall/hotfix-critical-bug-description`
- For urgent production fixes
- Branch from `khala`, merge to khala, gateway, AND forge

**Staging Branch**: `gateway`
- Pre-production testing environment
- Merges from `forge` when ready for release
- Merges to `khala` after verification

**Archive branches**: `archives/v0.1.0`
- Long-lived branches for release snapshots
- Never deleted

---

## Standard Workflow

### 1. Start New Work

```bash
# CRITICAL: Always start from latest forge (NOT khala)
git checkout forge
git pull origin forge

# Create feature branch with warp-in prefix
git checkout -b warp-in/CHRONO-XXX-description

# Verify you're on the feature branch
git branch --show-current
```

### 2. Work on Feature

```bash
# Make changes, commit frequently
git add .
git commit -m "CHRONO-XXX: descriptive message"

# Push to remote regularly (enables backup and collaboration)
git push -u origin warp-in/CHRONO-XXX-description
```

### 3. Keep Branch Up to Date

```bash
# If forge gets updated while you're working
git checkout forge
git pull origin forge
git checkout warp-in/CHRONO-XXX-description
git rebase forge  # or: git merge forge
```

### 4. Create Pull Request

```bash
# Ensure all changes are pushed
git push origin warp-in/CHRONO-XXX-description

# Create PR via GitHub CLI - CRITICAL: Base must be forge
gh pr create \
  --base forge \
  --title "CHRONO-XXX: Feature Name" \
  --body "Closes #XXX

## Summary
[Brief description]

## Changes
- Change 1
- Change 2

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing complete"

# Or create via web: https://github.com/alexsmith84/project-chrono/pulls
```

### 5. After PR Merged

```bash
# Switch back to forge
git checkout forge
git pull origin forge

# Delete local feature branch
git branch -d warp-in/CHRONO-XXX-description

# Delete remote feature branch (if not auto-deleted)
git push origin --delete warp-in/CHRONO-XXX-description

# Or use GitHub CLI
gh pr list --state merged
```

---

## Branch Cleanup

### Automatic Cleanup

GitHub can auto-delete branches after PR merge. Enable via:
- Repository Settings → General → "Automatically delete head branches"

### Manual Cleanup

**List merged branches**:
```bash
# Local branches that are merged
git branch --merged forge

# Remote branches that are merged
git branch -r --merged forge
```

**Delete local merged branches**:
```bash
# Safe delete (only if fully merged)
git branch -d warp-in/old-branch

# Force delete (use with caution)
git branch -D warp-in/old-branch
```

**Delete remote merged branches**:
```bash
# Single branch
git push origin --delete warp-in/old-branch

# Multiple branches
git push origin --delete feature/branch1 feature/branch2 feature/branch3
```

**Prune deleted remote branches**:
```bash
# Remove local references to deleted remote branches
git fetch --prune origin
```

---

## Preventing Direct Commits to `khala`

### Option 1: GitHub Branch Protection (Recommended)

Set up in GitHub repository settings:

1. Go to Settings → Branches → Branch protection rules
2. Add rule for `khala`:
   - ✅ Require pull request before merging
   - ✅ Require approvals: 1 (or 0 for solo projects)
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Include administrators (applies rules to you too!)

### Option 2: Pre-commit Hook (Local Safety Net)

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Prevent commits directly to khala branch

branch="$(git rev-parse --abbrev-ref HEAD)"

if [ "$branch" = "khala" ]; then
  echo ""
  echo "❌ ERROR: Cannot commit directly to 'khala' branch!"
  echo ""
  echo "Please create a feature branch:"
  echo "  git checkout -b warp-in/CHRONO-XXX-description"
  echo ""
  exit 1
fi

exit 0
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

### Option 3: Git Alias (Convenience)

Add to `.gitconfig`:

```bash
[alias]
  # Start new feature from forge
  feature = "!f() { \
    git checkout forge && \
    git pull origin forge && \
    git checkout -b warp-in/CHRONO-$1; \
  }; f"

  # Finish feature (create PR to forge)
  finish = "!f() { \
    branch=$(git branch --show-current) && \
    git push -u origin $branch && \
    gh pr create --base forge; \
  }; f"

  # Clean up merged branches
  cleanup = "!git branch --merged forge | grep -v 'forge\\|khala\\|gateway\\|archives/' | xargs git branch -d"
```

Usage:
```bash
git feature 011-workers  # Creates warp-in/CHRONO-011-workers from forge
# ... work work work ...
git finish  # Creates PR to forge
```

---

## Emergency: Fixing Direct Commits to `khala`

If you accidentally committed directly to `khala`:

### Before Pushing (Local Only)

```bash
# Create feature branch from current position
git checkout -b warp-in/CHRONO-XXX-description

# Reset khala to remote state
git checkout khala
git reset --hard origin/khala

# Switch back to feature branch (has your commits)
git checkout warp-in/CHRONO-XXX-description
```

### After Pushing (Already on Remote)

**⚠️ WARNING**: This rewrites history. Only do this if:
- No one else has pulled the changes
- You're working solo or can coordinate with team

```bash
# Create feature branch from current position
git checkout -b warp-in/CHRONO-XXX-description

# Force reset khala to previous state
git checkout khala
git reset --hard HEAD~N  # N = number of commits to undo

# Force push (dangerous!)
git push --force origin khala

# Create PR from feature branch
git checkout warp-in/CHRONO-XXX-description
git push -u origin warp-in/CHRONO-XXX-description
gh pr create --base forge
```

---

## Checklists

### Before Starting Any Work

- [ ] On `khala` branch
- [ ] Pulled latest changes
- [ ] Created feature branch with proper naming
- [ ] Verified current branch is NOT `khala`

### Before Creating PR

- [ ] All changes committed
- [ ] Pushed to remote feature branch
- [ ] Tests passing
- [ ] Branch up to date with `khala`
- [ ] Issue linked in PR description

### After PR Merged

- [ ] Switched back to `khala`
- [ ] Pulled latest changes
- [ ] Deleted local feature branch
- [ ] Verified remote feature branch deleted
- [ ] Updated project board

---

## Quick Reference Commands

```bash
# Show current branch
git branch --show-current

# List all branches
git branch -a

# Create and switch to feature branch
git checkout -b warp-in/CHRONO-XXX-description

# Push new branch to remote
git push -u origin warp-in/CHRONO-XXX-description

# Update branch from forge
git checkout forge && git pull
git checkout warp-in/CHRONO-XXX-description
git rebase forge

# Create PR
gh pr create --base forge --title "CHRONO-XXX: Title"

# Delete local branch
git branch -d warp-in/old-branch

# Delete remote branch
git push origin --delete warp-in/old-branch

# Clean up all merged branches
git branch --merged forge | grep -v "khala" | xargs git branch -d
```

---

## Troubleshooting

### "I'm on `khala` and made changes but haven't committed"

```bash
# Stash changes
git stash

# Create feature branch
git checkout -b warp-in/CHRONO-XXX-description

# Apply stashed changes
git stash pop
```

### "I committed to `khala` but haven't pushed"

```bash
# Move commits to feature branch (see "Emergency" section above)
git checkout -b warp-in/CHRONO-XXX-description
git checkout khala
git reset --hard origin/khala
```

### "I pushed to `khala` by accident"

See "Emergency: After Pushing" section above. Consider if force push is appropriate.

### "My feature branch is behind `forge`"

```bash
git checkout forge
git pull origin forge
git checkout warp-in/CHRONO-XXX-description
git rebase forge  # or: git merge forge
```

---

*"Disciplined warriors maintain clean branches. Precise execution. Victory assured."*
