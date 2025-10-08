#!/bin/bash
set -euo pipefail

# dev-setup-auto.sh - Automated Project Chrono development environment setup
#
# Usage: ./scripts/helpers/dev-setup-auto.sh
#
# This script automatically installs all required tools without prompts.
# Everything runs natively on macOS - no Docker/virtualization.

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🏗️  Project Chrono - Automated Development Setup${NC}"
echo -e "${BLUE}====================================================${NC}"
echo ""
echo -e "${YELLOW}This will install all required development tools.${NC}"
echo -e "${YELLOW}No Docker - everything runs natively on macOS.${NC}"
echo ""

# Check if running on macOS
if [[ "$(uname)" != "Darwin" ]]; then
    echo -e "${RED}Error: This script is designed for macOS${NC}"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo -e "${BLUE}Step 1: Checking Homebrew...${NC}"
if command_exists brew; then
    echo -e "${GREEN}✓${NC} Homebrew already installed"
    brew update
else
    echo -e "${YELLOW}Installing Homebrew...${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # Add Homebrew to PATH for this session
    if [[ -f "/opt/homebrew/bin/brew" ]]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
fi
echo ""

echo -e "${BLUE}Step 2: Installing Rust...${NC}"
if command_exists rustc; then
    echo -e "${GREEN}✓${NC} Rust already installed: $(rustc --version)"
else
    echo -e "${YELLOW}Installing Rust via rustup...${NC}"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable

    # Source Rust environment
    source "$HOME/.cargo/env"

    echo -e "${GREEN}✓${NC} Rust installed: $(rustc --version)"
fi
echo ""

echo -e "${BLUE}Step 3: Installing Bun...${NC}"
if command_exists bun; then
    echo -e "${GREEN}✓${NC} Bun already installed: $(bun --version)"
else
    echo -e "${YELLOW}Installing Bun...${NC}"
    curl -fsSL https://bun.sh/install | bash

    # Add Bun to PATH for this session
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"

    echo -e "${GREEN}✓${NC} Bun installed: $(bun --version)"
fi
echo ""

echo -e "${BLUE}Step 4: Installing PostgreSQL 16...${NC}"
if command_exists psql; then
    echo -e "${GREEN}✓${NC} PostgreSQL already installed: $(psql --version)"
else
    echo -e "${YELLOW}Installing PostgreSQL 16...${NC}"
    brew install postgresql@16

    # Add PostgreSQL to PATH
    export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

    echo -e "${YELLOW}Starting PostgreSQL service...${NC}"
    brew services start postgresql@16

    # Wait for PostgreSQL to start
    sleep 3

    echo -e "${GREEN}✓${NC} PostgreSQL installed and started"
fi
echo ""

echo -e "${BLUE}Step 5: Installing Redis...${NC}"
if command_exists redis-cli; then
    echo -e "${GREEN}✓${NC} Redis already installed: $(redis-cli --version)"
else
    echo -e "${YELLOW}Installing Redis...${NC}"
    brew install redis

    echo -e "${YELLOW}Starting Redis service...${NC}"
    brew services start redis

    # Wait for Redis to start
    sleep 2

    echo -e "${GREEN}✓${NC} Redis installed and started"
fi
echo ""

echo -e "${BLUE}Step 6: Installing development tools...${NC}"

# Git (usually pre-installed, but check)
if ! command_exists git; then
    echo -e "${YELLOW}Installing Git...${NC}"
    xcode-select --install
fi
echo -e "${GREEN}✓${NC} Git: $(git --version)"

# GitHub CLI
if command_exists gh; then
    echo -e "${GREEN}✓${NC} GitHub CLI already installed"
else
    echo -e "${YELLOW}Installing GitHub CLI...${NC}"
    brew install gh
    echo -e "${GREEN}✓${NC} GitHub CLI installed"
fi

# jq (useful for JSON processing in scripts)
if command_exists jq; then
    echo -e "${GREEN}✓${NC} jq already installed"
else
    echo -e "${YELLOW}Installing jq...${NC}"
    brew install jq
    echo -e "${GREEN}✓${NC} jq installed"
fi
echo ""

echo -e "${BLUE}Step 7: Installing Rust components...${NC}"
source "$HOME/.cargo/env" 2>/dev/null || true
rustup component add clippy rustfmt
echo -e "${GREEN}✓${NC} Clippy and rustfmt installed"
echo ""

echo -e "${BLUE}Step 8: Installing TimescaleDB extension (optional)...${NC}"
if brew list timescaledb >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} TimescaleDB already installed"
else
    echo -e "${YELLOW}Installing TimescaleDB...${NC}"
    brew tap timescale/tap
    brew install timescaledb

    # Run timescaledb setup
    timescaledb-tune --quiet --yes 2>/dev/null || echo "Note: TimescaleDB tune skipped (run manually if needed)"

    echo -e "${GREEN}✓${NC} TimescaleDB installed"
fi
echo ""

echo -e "${BLUE}Step 9: Setting up shell environment...${NC}"

# Detect shell
SHELL_RC=""
if [[ "$SHELL" == *"zsh"* ]]; then
    SHELL_RC="$HOME/.zshrc"
elif [[ "$SHELL" == *"bash"* ]]; then
    SHELL_RC="$HOME/.bashrc"
fi

if [[ -n "$SHELL_RC" ]]; then
    # Add Rust to PATH
    if ! grep -q "cargo/env" "$SHELL_RC" 2>/dev/null; then
        echo "" >> "$SHELL_RC"
        echo "# Rust" >> "$SHELL_RC"
        echo 'source "$HOME/.cargo/env"' >> "$SHELL_RC"
        echo -e "${GREEN}✓${NC} Added Rust to $SHELL_RC"
    fi

    # Add Bun to PATH
    if ! grep -q "BUN_INSTALL" "$SHELL_RC" 2>/dev/null; then
        echo "" >> "$SHELL_RC"
        echo "# Bun" >> "$SHELL_RC"
        echo 'export BUN_INSTALL="$HOME/.bun"' >> "$SHELL_RC"
        echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> "$SHELL_RC"
        echo -e "${GREEN}✓${NC} Added Bun to $SHELL_RC"
    fi

    # Add PostgreSQL to PATH
    if ! grep -q "postgresql@16" "$SHELL_RC" 2>/dev/null; then
        echo "" >> "$SHELL_RC"
        echo "# PostgreSQL" >> "$SHELL_RC"
        echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> "$SHELL_RC"
        echo -e "${GREEN}✓${NC} Added PostgreSQL to $SHELL_RC"
    fi
else
    echo -e "${YELLOW}⚠${NC}  Could not detect shell config file"
    echo "    Please manually add tools to your PATH"
fi
echo ""

echo -e "${BLUE}Step 10: Initializing PostgreSQL database...${NC}"
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

# Check if PostgreSQL is running
if psql -U "$USER" -d postgres -c "SELECT 1" >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} PostgreSQL is running"

    # Create project database
    DB_NAME="project_chrono_dev"
    if psql -U "$USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        echo -e "${GREEN}✓${NC} Database '$DB_NAME' already exists"
    else
        echo -e "${YELLOW}Creating database '$DB_NAME'...${NC}"
        createdb "$DB_NAME"

        # Enable TimescaleDB extension
        psql -U "$USER" -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;" 2>/dev/null || \
            echo -e "${YELLOW}⚠${NC}  TimescaleDB extension not enabled (optional)"

        echo -e "${GREEN}✓${NC} Database '$DB_NAME' created"
    fi
else
    echo -e "${YELLOW}⚠${NC}  PostgreSQL may not be running yet"
    echo "    Run: brew services start postgresql@16"
fi
echo ""

echo -e "${BLUE}Step 11: Testing Redis connection...${NC}"
if redis-cli ping >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Redis is running and responding"
else
    echo -e "${YELLOW}⚠${NC}  Redis may not be running yet"
    echo "    Run: brew services start redis"
fi
echo ""

echo -e "${BLUE}Step 12: Installing Node.js dependencies...${NC}"
if [[ -f "package.json" ]]; then
    # Source Bun environment
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"

    echo -e "${YELLOW}Running bun install...${NC}"
    bun install
    echo -e "${GREEN}✓${NC} Dependencies installed"
else
    echo -e "${YELLOW}⚠${NC}  No package.json found, skipping"
fi
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Development environment setup complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Installed tools:${NC}"
echo "  • Rust:       $(rustc --version 2>/dev/null || echo 'Not in PATH yet')"
echo "  • Cargo:      $(cargo --version 2>/dev/null || echo 'Not in PATH yet')"
echo "  • Bun:        $(bun --version 2>/dev/null || echo 'Not in PATH yet')"
echo "  • PostgreSQL: $(psql --version 2>/dev/null || echo 'Not in PATH yet')"
echo "  • Redis:      $(redis-cli --version 2>/dev/null || echo 'Not in PATH yet')"
echo "  • Git:        $(git --version 2>/dev/null || echo 'Not in PATH yet')"
echo "  • GitHub CLI: $(gh --version 2>/dev/null | head -1 || echo 'Not in PATH yet')"
echo ""
echo -e "${BLUE}Services running:${NC}"
brew services list | grep -E "postgresql@16|redis" || echo "  Run 'brew services list' to check"
echo ""
echo -e "${YELLOW}⚠  Important: Restart your shell or run:${NC}"
echo "  source ~/.zshrc    # or ~/.bashrc"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Restart your terminal (or source your shell config)"
echo "  2. Verify tools are in PATH: rustc --version, bun --version"
echo "  3. Start building Project Chrono features!"
echo ""
echo -e "${GREEN}En Taro Tassadar! 🚀${NC}"
