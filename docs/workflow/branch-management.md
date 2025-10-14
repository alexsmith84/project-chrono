# Branch Management Workflow

## TL;DR - Never Commit Directly to `khala`

```bash
# ❌ WRONG - Committing directly to khala
git checkout khala
git add .
git commit -m "feature"

# ✅ CORRECT - Always use feature branches
git checkout khala
git pull origin khala
git checkout -b feature/chrono-XXX-description
# ... make changes ...
git commit -m "feature"
git push -u origin feature/chrono-XXX-description
gh pr create --base khala
```

---

## Branch Strategy

### Main Branch: `khala`

- **Purpose**: Production-ready code, always deployable
- **Protection**: Should be protected via GitHub branch rules
- **Updates**: Only via Pull Requests (PRs)
- **Never**: Commit directly to this branch

### Feature Branches

**Naming Convention**: `feature/chrono-XXX-short-description`

**Examples**:
- `feature/chrono-011-workers`
- `feature/chrono-012-web-portal`
- `feature/chrono-013-analytics`

**Lifecycle**:
1. Created from `khala`
2. Development happens here
3. PR created to merge back to `khala`
4. Deleted after merge

### Other Branch Types

**Hotfix branches**: `hotfix/critical-bug-description`
- For urgent production fixes
- Branch from `khala`, merge back immediately

**Archive branches**: `archives/v0.1.0`
- Long-lived branches for archival purposes
- Never deleted

**Experimental branches**: `forge`, `gateway`, etc.
- For exploratory work
- May or may not be merged

---

## Standard Workflow

### 1. Start New Work

```bash
# Always start from latest khala
git checkout khala
git pull origin khala

# Create feature branch
git checkout -b feature/chrono-XXX-description

# Verify you're on the feature branch
git branch --show-current
```

### 2. Work on Feature

```bash
# Make changes, commit frequently
git add .
git commit -m "CHRONO-XXX: descriptive message"

# Push to remote regularly (enables backup and collaboration)
git push -u origin feature/chrono-XXX-description
```

### 3. Keep Branch Up to Date

```bash
# If khala gets updated while you're working
git checkout khala
git pull origin khala
git checkout feature/chrono-XXX-description
git rebase khala  # or: git merge khala
```

### 4. Create Pull Request

```bash
# Ensure all changes are pushed
git push origin feature/chrono-XXX-description

# Create PR via GitHub CLI
gh pr create \
  --base khala \
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
# Switch back to khala
git checkout khala
git pull origin khala

# Delete local feature branch
git branch -d feature/chrono-XXX-description

# Delete remote feature branch (if not auto-deleted)
git push origin --delete feature/chrono-XXX-description

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
git branch --merged khala

# Remote branches that are merged
git branch -r --merged khala
```

**Delete local merged branches**:
```bash
# Safe delete (only if fully merged)
git branch -d feature/old-branch

# Force delete (use with caution)
git branch -D feature/old-branch
```

**Delete remote merged branches**:
```bash
# Single branch
git push origin --delete feature/old-branch

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
  echo "  git checkout -b feature/chrono-XXX-description"
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
  # Start new feature
  feature = "!f() { \
    git checkout khala && \
    git pull origin khala && \
    git checkout -b feature/$1; \
  }; f"

  # Finish feature (create PR)
  finish = "!f() { \
    branch=$(git branch --show-current) && \
    git push -u origin $branch && \
    gh pr create --base khala; \
  }; f"

  # Clean up merged branches
  cleanup = "!git branch --merged khala | grep -v 'khala\\|archives/' | xargs git branch -d"
```

Usage:
```bash
git feature chrono-011-workers
# ... work work work ...
git finish
```

---

## Emergency: Fixing Direct Commits to `khala`

If you accidentally committed directly to `khala`:

### Before Pushing (Local Only)

```bash
# Create feature branch from current position
git checkout -b feature/chrono-XXX-description

# Reset khala to remote state
git checkout khala
git reset --hard origin/khala

# Switch back to feature branch (has your commits)
git checkout feature/chrono-XXX-description
```

### After Pushing (Already on Remote)

**⚠️ WARNING**: This rewrites history. Only do this if:
- No one else has pulled the changes
- You're working solo or can coordinate with team

```bash
# Create feature branch from current position
git checkout -b feature/chrono-XXX-description

# Force reset khala to previous state
git checkout khala
git reset --hard HEAD~N  # N = number of commits to undo

# Force push (dangerous!)
git push --force origin khala

# Create PR from feature branch
git checkout feature/chrono-XXX-description
git push -u origin feature/chrono-XXX-description
gh pr create --base khala
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
git checkout -b feature/chrono-XXX-description

# Push new branch to remote
git push -u origin feature/chrono-XXX-description

# Update branch from khala
git checkout khala && git pull
git checkout feature/chrono-XXX-description
git rebase khala

# Create PR
gh pr create --base khala --title "CHRONO-XXX: Title"

# Delete local branch
git branch -d feature/old-branch

# Delete remote branch
git push origin --delete feature/old-branch

# Clean up all merged branches
git branch --merged khala | grep -v "khala" | xargs git branch -d
```

---

## Troubleshooting

### "I'm on `khala` and made changes but haven't committed"

```bash
# Stash changes
git stash

# Create feature branch
git checkout -b feature/chrono-XXX-description

# Apply stashed changes
git stash pop
```

### "I committed to `khala` but haven't pushed"

```bash
# Move commits to feature branch (see "Emergency" section above)
git checkout -b feature/chrono-XXX-description
git checkout khala
git reset --hard origin/khala
```

### "I pushed to `khala` by accident"

See "Emergency: After Pushing" section above. Consider if force push is appropriate.

### "My feature branch is behind `khala`"

```bash
git checkout khala
git pull origin khala
git checkout feature/chrono-XXX-description
git rebase khala  # or: git merge khala
```

---

*"Disciplined warriors maintain clean branches. Precise execution. Victory assured."*
