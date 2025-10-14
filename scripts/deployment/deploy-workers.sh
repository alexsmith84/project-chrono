#!/bin/bash
# Deploy all Chrono Collectors workers
# Usage: ./scripts/deployment/deploy-workers.sh [environment]
# Environment: dev (default), staging, production

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
WORKERS_DIR="$PROJECT_ROOT/workers/chrono-collectors"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Environment (default: dev)
ENV="${1:-dev}"

echo -e "${BLUE}=== Deploying Chrono Collectors - Environment: $ENV ===${NC}\n"

# Change to workers directory
cd "$WORKERS_DIR"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}✗ wrangler CLI not found${NC}"
    echo "Install with: npm install -g wrangler"
    exit 1
fi

# Check if logged in
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}⚠ Not logged in to Cloudflare${NC}"
    echo "Run: wrangler login"
    exit 1
fi

# Deploy function
deploy_worker() {
    local worker_name=$1
    local env_flag=""

    if [ "$ENV" != "dev" ]; then
        env_flag="--env $ENV"
    fi

    echo -e "${BLUE}Deploying $worker_name...${NC}"

    if wrangler deploy $env_flag --name "chrono-$worker_name"; then
        echo -e "${GREEN}✓ Deployed chrono-$worker_name${NC}\n"
    else
        echo -e "${RED}✗ Failed to deploy chrono-$worker_name${NC}\n"
        exit 1
    fi
}

# Deploy workers for different exchanges
echo "Deploying exchange collectors..."

# Coinbase worker
deploy_worker "coinbase-$ENV"

# Binance worker
deploy_worker "binance-$ENV"

# Kraken worker
deploy_worker "kraken-$ENV"

echo -e "${GREEN}=== All workers deployed successfully ===${NC}\n"

# Print worker URLs
echo -e "${BLUE}Worker URLs:${NC}"
echo "  Coinbase: https://chrono-coinbase-$ENV.alexsmith84.workers.dev"
echo "  Binance:  https://chrono-binance-$ENV.alexsmith84.workers.dev"
echo "  Kraken:   https://chrono-kraken-$ENV.alexsmith84.workers.dev"
echo

echo -e "${YELLOW}Next steps:${NC}"
echo "1. Set secrets: ./scripts/deployment/set-secrets.sh $ENV"
echo "2. Start workers: ./scripts/deployment/start-workers.sh $ENV"
echo "3. Check status: ./scripts/deployment/check-workers.sh $ENV"
