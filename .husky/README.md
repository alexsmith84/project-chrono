# Git Hooks - Project Chrono

This directory contains git hooks managed by [Husky](https://typicode.github.io/husky/).

## What Gets Auto-Fixed on Commit

When you commit, the pre-commit hook automatically:

1. **Markdown files** (`.md`):
   - Fixes formatting (blank lines, spacing)
   - Auto-corrects common markdown lint errors
   - Applies prettier formatting

2. **TypeScript files** (`.ts`, `.tsx`):
   - Runs ESLint auto-fix
   - Applies prettier formatting

3. **JSON files**:
   - Applies prettier formatting

## Setup

Hooks are automatically installed when you run:

```bash
bun install
```

The `prepare` script in `package.json` runs `husky` which sets up the git hooks.

## Bypassing Hooks

If you need to commit without running hooks (use sparingly):

```bash
git commit --no-verify -m "Your message"
```

## Testing Hooks Locally

Test what the pre-commit hook will do:

```bash
# Check markdown files
bun run lint:md

# Auto-fix markdown files
bun run lint:md:fix

# Run lint-staged manually
npx lint-staged
```

## Customization

Edit the hooks or lint-staged config in `package.json`:

```json
{
  "lint-staged": {
    "*.md": [
      "markdownlint-cli2 --fix"
    ]
  }
}
```

---

*"The hooks guard our code quality. En Taro Adun!"*
