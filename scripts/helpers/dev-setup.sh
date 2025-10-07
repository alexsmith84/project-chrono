#!/bin/bash
set -euo pipefail

# dev-setup.sh - Set up Project Chrono development environment
#
# Usage: ./scripts/helpers/dev-setup.sh [--dry-run]
#
# This script:
# - Checks for required tools
# - Installs missing dependencies
# - Initializes database
# - Creates .env file from template
# - Runs initial build

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
    DRY_RUN=true
    echo -e "${BLUE}Running in dry-run mode (no changes will be made)${NC}"
    echo ""
fi

echo -e "${BLUE}🏗️  Project Chrono - Development Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if running on macOS
if [[ "$(uname)" != "Darwin" ]]; then
    echo -e "${RED}Error: This script is designed for macOS${NC}"
    echo "For other platforms, please install dependencies manually."
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check tool version
check_tool() {
    local tool=$1
    local install_cmd=$2

    if command_exists "$tool"; then
        echo -e "${GREEN}✓${NC} $tool installed"
        return 0
    else
        echo -e "${YELLOW}✗${NC} $tool not found"
        if [[ "$DRY_RUN" == "false" ]]; then
            read -p "Install $tool? (y/N): " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                eval "$install_cmd"
            else
                echo -e "${RED}Skipping $tool installation${NC}"
                return 1
            fi
        fi
        return 1
    fi
}

echo -e "${BLUE}Checking required tools...${NC}"
echo ""

# Check Homebrew
if ! command_exists brew; then
    echo -e "${YELLOW}Homebrew not found${NC}"
    if [[ "$DRY_RUN" == "false" ]]; then
        read -p "Install Homebrew? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        else
            echo -e "${RED}Error: Homebrew is required. Aborting.${NC}"
            exit 1
        fi
    fi
else
    echo -e "${GREEN}✓${NC} Homebrew installed"
fi

# Check Rust
check_tool rustc "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"

# Check Bun
check_tool bun "curl -fsSL https://bun.sh/install | bash"

# Check PostgreSQL
check_tool psql "brew install postgresql@16 && brew services start postgresql@16"

# Check Redis
check_tool redis-cli "brew install redis && brew services start redis"

# Check Git
check_tool git "xcode-select --install"

# Check GitHub CLI
check_tool gh "brew install gh"

echo ""
echo -e "${BLUE}Installing project dependencies...${NC}"
echo ""

if [[ "$DRY_RUN" == "false" ]]; then
    # Install Rust dependencies
    echo -e "${YELLOW}Installing Rust dependencies...${NC}"
    cargo build

    # Install TypeScript dependencies
    echo -e "${YELLOW}Installing TypeScript dependencies...${NC}"
    bun install

    echo ""
    echo -e "${BLUE}Setting up database...${NC}"
    echo ""

    # Create database if it doesn't exist
    if ! psql -lqt | cut -d \| -f 1 | grep -qw project_chrono_dev; then
        echo -e "${YELLOW}Creating development database...${NC}"
        createdb project_chrono_dev
    else
        echo -e "${GREEN}✓${NC} Database already exists"
    fi

    echo ""
    echo -e "${BLUE}Creating environment file...${NC}"
    echo ""

    # Create .env.development if it doesn't exist
    if [[ ! -f .env.development ]]; then
        echo -e "${YELLOW}Creating .env.development...${NC}"
        cat > .env.development <<EOF
# Project Chrono - Development Environment

# Database
DATABASE_URL=postgresql://$(whoami)@localhost/project_chrono_dev
REDIS_URL=redis://localhost:6379

# API Configuration
API_PORT=3000
API_HOST=127.0.0.1

# Environment
NODE_ENV=development
RUST_LOG=debug

# Flare Network (testnet)
FLARE_RPC_URL=https://coston2-api.flare.network/ext/bc/C/rpc

# Feature Flags
ENABLE_CLOUDFLARE_WORKERS=false
ENABLE_ML_FEATURES=false
EOF
        echo -e "${GREEN}✓${NC} Created .env.development"
    else
        echo -e "${GREEN}✓${NC} .env.development already exists"
    fi
else
    echo -e "${BLUE}(Dry run - would install dependencies and set up database)${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Development environment ready!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Authenticate with GitHub:"
echo "   \$ gh auth login"
echo ""
echo "2. Start PostgreSQL and Redis (if not already running):"
echo "   \$ brew services start postgresql@16"
echo "   \$ brew services start redis"
echo ""
echo "3. Run tests to verify setup:"
echo "   \$ ./scripts/helpers/run-tests.sh"
echo ""
echo "4. Start development:"
echo "   \$ gh issue list    # Find a ticket"
echo "   \$ ./scripts/helpers/new-ticket.sh CHRONO-XXX \"Title\"    # Or create new ticket"
echo ""
echo -e "${GREEN}En Taro Tassadar! Happy coding! 🚀${NC}"
