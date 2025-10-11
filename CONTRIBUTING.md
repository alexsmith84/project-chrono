# Contributing to Project Chrono

_"My life for Aiur! Your contributions make the FTSO oracle stronger."_

Thank you for considering contributing to Project Chrono! This document provides guidelines and instructions for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Testing](#testing)

---

## Code of Conduct

### Our Pledge - The Protoss Code of Honor

We are committed to providing a welcoming and inspiring community for all. We pledge to:

- **Be Respectful**: Treat all contributors with respect and kindness
- **Be Collaborative**: Work together toward the common goal of building a great FTSO oracle
- **Be Constructive**: Provide helpful feedback and be open to receiving it
- **Be Excellent**: Strive for quality in code, documentation, and communication

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Trolling, insulting, or derogatory remarks
- Public or private harassment
- Publishing others' private information without permission
- Any conduct that could reasonably be considered inappropriate in a professional setting

---

## Getting Started

### Prerequisites

- **macOS** (primary development platform)
- **Homebrew** package manager
- **Git** version control
- **GitHub CLI** (`gh`) for workflow automation
- **Rust** (latest stable)
- **Bun** runtime (for TypeScript/JavaScript)
- **PostgreSQL** and **Redis** (for local development)

### Initial Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**

   ```bash
   git clone https://github.com/YOUR_USERNAME/project-chrono.git
   cd project-chrono
   ```

3. **Add upstream remote**

   ```bash
   git remote add upstream https://github.com/alexsmith84/project-chrono.git
   ```

4. **Run development setup**

   ```bash
   ./scripts/helpers/dev-setup.sh
   ```

5. **Install dependencies (sets up pre-commit hooks)**

   ```bash
   bun install
   ```

   This automatically installs git hooks that will auto-fix markdown and code formatting on commit.

6. **Verify installation**

   ```bash
   cargo --version
   bun --version
   psql --version
   redis-cli --version
   ```

---

## Code Quality Automation

This project uses automated code quality checks. See [Code Quality Automation Guide](docs/workflow/code-quality-automation.md) for details.

**Pre-commit hooks** automatically:

- Fix markdown formatting
- Fix TypeScript linting errors
- Format code with Prettier

**To bypass hooks** (use sparingly):

```bash
git commit --no-verify -m "Message"
```

---

## Development Workflow

### 1. Pick a Ticket

Browse the [Project Board](https://github.com/users/alexsmith84/projects/5) and select a ticket from the "Ready" column.

**Good first issues** are tagged with `good-first-issue` label.

### 2. Create Feature Branch

```bash
# Update forge branch
git checkout forge
git pull upstream forge

# Create feature branch
git checkout -b warp-in/CHRONO-XXX-short-description
```

**Branch naming conventions:**

- `warp-in/CHRONO-XXX-description` - New features
- `recall/hotfix-description` - Emergency hotfixes
- `archives/vX.Y.Z` - Release branches (maintainers only)

### 3. Implement Changes

Follow the implementation guide in `docs/implementation/CHRONO-XXX-guide.md`.

**Development principles:**

- Write clean, readable code
- Add tests for new functionality
- Update documentation as you go
- Commit frequently with clear messages

### 4. Test Your Changes

```bash
# Run all tests
./scripts/helpers/run-tests.sh

# Run specific test suites
cargo test                    # Rust tests
bun test                      # TypeScript/JavaScript tests
```

### 5. Create Pull Request

```bash
# Push to your fork
git push origin warp-in/CHRONO-XXX-description

# Create PR via GitHub CLI
gh pr create --base forge \
  --title "CHRONO-XXX: Short description" \
  --body "See docs/specs/CHRONO-XXX-*.md"
```

---

## Coding Standards

### General Principles

1. **Clarity over cleverness** - Write code that is easy to understand
2. **Consistency** - Follow existing patterns and conventions
3. **Documentation** - Document complex logic and public APIs
4. **Testing** - Write tests for all new functionality
5. **Performance** - Optimize for speed without sacrificing readability

### Rust Style

- Follow official [Rust Style Guide](https://doc.rust-lang.org/1.0.0/style/)
- Use `rustfmt` for automatic formatting
- Run `clippy` for linting: `cargo clippy -- -D warnings`
- Document public APIs with doc comments (`///`)
- Write unit tests inline with code
- Use descriptive variable names
- Prefer iterators over explicit loops

**Example:**

```rust
/// Calculates the weighted median price from multiple sources
///
/// # Arguments
/// * `prices` - Vector of (price, weight) tuples
///
/// # Returns
/// * `Option<f64>` - Weighted median or None if empty
pub fn calculate_weighted_median(prices: Vec<(f64, f64)>) -> Option<f64> {
    if prices.is_empty() {
        return None;
    }

    // Implementation...
}
```

### TypeScript/JavaScript Style

- Use **TypeScript** for type safety
- Follow [Prettier](https://prettier.io/) formatting (auto-formatted on save)
- Use ESLint for code quality
- Prefer `async/await` over raw promises
- Use functional programming patterns where appropriate
- No `any` types - use proper typing

**Example:**

```typescript
/**
 * Fetches price data from exchange API
 *
 * @param exchange - Exchange identifier
 * @param symbol - Trading pair symbol
 * @returns Promise resolving to price data
 */
async function fetchPrice(
  exchange: ExchangeId,
  symbol: TradingPair,
): Promise<PriceData> {
  // Implementation...
}
```

### Documentation (Markdown)

- Use clear, concise language
- Include code examples where helpful
- Keep line length reasonable (80-100 characters preferred)
- Use relative links for internal references
- Follow existing document structure

---

## Commit Guidelines

### Commit Message Format

```
Short summary (50 chars or less)

More detailed explanation if needed. Explain what and why,
not how (the code shows how).

- Bullet points are fine
- Reference related issues: #16

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Good Commit Examples

✅ **Good:**

```
Add VWAP calculation to price aggregator

Implements volume-weighted average price calculation
with support for multiple time windows.

Closes #23
```

❌ **Bad:**

```
fixed stuff
```

❌ **Bad:**

```
Updated files, changed some functions, fixed bugs, added features
```

### Commit Best Practices

- Make atomic commits (one logical change per commit)
- Write descriptive commit messages
- Reference related issues with `#issue-number`
- Use imperative mood ("Add feature" not "Added feature")
- Commit frequently during development

---

## Pull Request Process

### Before Creating PR

1. **Self-review your changes**
   - Read through the entire diff
   - Remove debug code, console.logs, TODOs
   - Verify all tests pass
   - Check documentation is up to date

2. **Update documentation**
   - README.md (if public API changes)
   - Spec documents (if requirements evolved)
   - Code comments (for complex logic)

3. **Run final checks**

   ```bash
   cargo fmt --check
   cargo clippy -- -D warnings
   cargo test
   bun test
   ```

### PR Template

Our PR template will guide you through providing:

- Summary of changes
- Related issue link
- Type of change (feature, bugfix, etc.)
- Test plan
- Documentation updates
- Screenshots (for UI changes)

### Review Process

1. **Automated checks** - CI must pass
2. **Code review** - At least one approval required
3. **Testing** - Reviewer may test locally
4. **Feedback** - Address comments and suggestions
5. **Approval** - Once approved, PR can be merged

### Merge Strategy

- **Squash and merge** - For feature branches with many small commits
- **Merge commit** - For release branches
- **Rebase and merge** - For clean, atomic commits

After merge:

- Delete feature branch
- Update project board (move ticket to "Done")
- Update `IMPLEMENTATION_LOG.md`

---

## Issue Reporting

### Before Creating an Issue

1. **Search existing issues** - Your issue may already exist
2. **Check documentation** - Answer might be in docs
3. **Verify it's reproducible** - Can you consistently reproduce it?

### Bug Reports

Use the bug report template and include:

- Clear title describing the issue
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, versions, etc.)
- Screenshots or error logs
- Possible solution (if you have ideas)

**Example:**

```markdown
**Title:** Price aggregation fails with empty data sources

**Steps to reproduce:**

1. Start oracle with no exchange connections
2. Wait for aggregation cycle
3. Observe error in logs

**Expected:** Graceful handling with warning
**Actual:** Panic with stack trace

**Environment:**

- macOS 14.2
- Rust 1.75.0
- Project Chrono v0.2.0

**Error log:**
[paste error]
```

### Feature Requests

Use the feature request template and include:

- Problem statement (what need does this address?)
- Proposed solution
- Alternative solutions considered
- Impact on existing functionality
- User stories (who benefits and how?)

---

## Testing

### Test Requirements

All new code must include tests:

- **Rust code** - Unit tests in same file, integration tests in `tests/`
- **TypeScript code** - Tests in `*.test.ts` files
- **Integration tests** - For cross-component functionality
- **End-to-end tests** - For critical user paths

### Writing Good Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_weighted_median_with_valid_data() {
        let prices = vec![
            (100.0, 1.0),
            (105.0, 2.0),
            (110.0, 1.0),
        ];

        let result = calculate_weighted_median(prices);
        assert_eq!(result, Some(105.0));
    }

    #[test]
    fn test_weighted_median_with_empty_data() {
        let prices = vec![];
        let result = calculate_weighted_median(prices);
        assert_eq!(result, None);
    }
}
```

### Running Tests

```bash
# All tests
./scripts/helpers/run-tests.sh

# Rust unit tests
cargo test

# Rust tests with output
cargo test -- --nocapture

# TypeScript tests
bun test

# With coverage
./scripts/helpers/run-tests.sh --coverage
```

---

## Questions?

- **Documentation**: Check `docs/` directory
- **Spec unclear**: Comment on the GitHub issue
- **Technical question**: Create a GitHub Discussion
- **Chat**: Join our Discord community

---

## Recognition

Contributors will be:

- Listed in `CONTRIBUTORS.md`
- Acknowledged in release notes
- Co-authors on commits (if using Claude Code)
- Heroes of Aiur in our community

---

_"En Taro Tassadar! Together we build the future of FTSO oracles."_

🤖 Generated with [Claude Code](https://claude.com/claude-code)
