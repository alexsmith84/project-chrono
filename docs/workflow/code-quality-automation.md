# Code Quality Automation - Project Chrono

_"Automation is the path to perfection. Let the machines handle the mundane."_

---

## Overview

Project Chrono uses multiple layers of automated code quality checks to maintain consistency and catch issues early.

## Automation Layers

### 1. Pre-commit Hooks (Local) ⚡

**What**: Runs automatically when you `git commit`

**Tools**: Husky + lint-staged

**What it does**:

- ✅ Auto-fixes markdown formatting
- ✅ Auto-fixes TypeScript/JavaScript with ESLint
- ✅ Formats code with Prettier
- ✅ Only processes **staged files** (fast!)

**Setup**:

```bash
# Install dependencies
bun install

# Hooks are auto-installed via the "prepare" script
```

**Bypass when needed**:

```bash
# Skip hooks for this commit only
git commit --no-verify -m "Emergency fix"
```

**Configuration**: See `package.json` → `lint-staged` section

---

### 2. GitHub Actions CI (Remote) 🤖

**What**: Runs on every PR and push to `forge`, `gateway`, `master`

**Workflows**:

- `.github/workflows/ci.yml` - Main CI pipeline

**What it checks**:

- 🦀 Rust: `cargo fmt --check`, `cargo clippy`, `cargo test`
- 📘 TypeScript: Bun tests, build checks
- 📝 Markdown: `markdownlint-cli2` (read-only check, no auto-fix)

**Configuration**: See `.github/workflows/ci.yml`

---

### 3. VSCode Auto-formatting (Editor) 📝

**What**: Formats on save in VSCode

**Configuration**: `.vscode/settings.json`

**What it does**:

- Rust: `rustfmt` on save
- TypeScript: Prettier on save
- Markdown: Prettier on save (wraps long lines)

**Enable in VSCode**:

```json
{
  "editor.formatOnSave": true
}
```

Already configured for the project!

---

## Recommended Workflow

### Daily Development

1. **Write code** - VSCode auto-formats on save
2. **Stage files** - `git add .`
3. **Commit** - Pre-commit hook auto-fixes and re-stages
4. **Push** - GitHub Actions validates everything

### Manual Quality Checks

```bash
# Check markdown before committing
bun run lint:md

# Auto-fix all markdown files
bun run lint:md:fix

# Check TypeScript
bun run lint

# Format everything
bun run format

# Test lint-staged without committing
npx lint-staged
```

---

## Tool Comparison

| Tool                | When       | Speed         | Auto-fix | Scope             |
| ------------------- | ---------- | ------------- | -------- | ----------------- |
| **VSCode**          | On save    | Instant       | Yes      | Single file       |
| **Pre-commit Hook** | On commit  | Fast (1-3s)   | Yes      | Staged files only |
| **GitHub Actions**  | On push/PR | Slow (20-60s) | No       | All files         |

---

## Markdown Linting Rules

### Configuration Files

- `.markdownlint-cli2.jsonc` - Main config
- `.markdownlintignore` - Files to skip

### Key Rules

- **MD013**: Line length ≤ 120 chars (relaxed from 80)
- **MD022**: Blank lines around headings
- **MD032**: Blank lines around lists
- **MD031**: Blank lines around code blocks
- **MD040**: Code blocks must specify language

### Exceptions

- **MD041**: Disabled (allows H2 starts in templates)
- **MD036**: Disabled (allows emphasized text like StarCraft quotes)
- **MD033**: Disabled (allows HTML when needed)

---

## Common Scenarios

### Scenario 1: "Pre-commit is too slow"

If pre-commit hooks slow you down:

```bash
# Bypass hooks temporarily
git commit --no-verify

# Or disable hooks globally (not recommended)
git config core.hooksPath /dev/null
```

**Note**: CI will still catch issues, but later in the process.

### Scenario 2: "I want to format only certain files"

```bash
# Format specific markdown files
markdownlint-cli2 --fix "docs/**/*.md"

# Format specific TypeScript files
prettier --write "src/api/**/*.ts"
```

### Scenario 3: "Markdown auto-fix broke my table"

Some markdown structures can't be auto-fixed. Add exceptions:

```markdown
<!-- markdownlint-disable MD013 -->

| Very long table row that exceeds 120 characters but should stay as-is |

<!-- markdownlint-enable MD013 -->
```

### Scenario 4: "I want stricter/looser rules"

Edit `.markdownlint-cli2.jsonc`:

```jsonc
{
  "config": {
    "MD013": {
      "line_length": 100, // Change from 120 to 100
    },
  },
}
```

---

## Future Enhancements

### Phase 1 (Current)

- ✅ Pre-commit hooks with lint-staged
- ✅ GitHub Actions CI
- ✅ VSCode auto-formatting

### Phase 2 (Planned)

- [ ] Pre-push hooks (run tests before pushing)
- [ ] Commit message linting (conventional commits)
- [ ] Automated dependency updates (Dependabot)

### Phase 3 (Future)

- [ ] Code coverage requirements (minimum 80%)
- [ ] Performance regression detection
- [ ] Security scanning (SAST)

---

## Troubleshooting

### Pre-commit hook not running

```bash
# Reinstall hooks
rm -rf .husky/_
bun install
```

### "husky - command not found"

```bash
# Install dependencies
bun install

# Or install globally
bun add -g husky
```

### Markdown linter giving false positives

Add exceptions to `.markdownlintignore`:

```
# Ignore auto-generated docs
docs/api/generated/**
```

---

## References

- [Husky Documentation](https://typicode.github.io/husky/)
- [lint-staged Documentation](https://github.com/okonet/lint-staged)
- [markdownlint Rules](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md)
- [Prettier Documentation](https://prettier.io/)

---

_"Quality is not an accident. It is the result of systematic automation. En Taro Tassadar!"_
