#!/bin/bash
# Stop all Chrono Collectors workers
# Usage: ./scripts/deployment/stop-workers.sh [environment]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Environment
ENV="${1:-dev}"

echo -e "${BLUE}=== Stopping Chrono Collectors - Environment: $ENV ===${NC}\n"

# Function to stop a worker
stop_worker() {
    local exchange=$1
    local worker_id=$2

    # Use custom domain for production, dev domain otherwise
    if [ "$ENV" = "production" ]; then
        local worker_url="https://collectors-${exchange}.hayven.xyz"
    else
        local worker_url="https://chrono-${exchange}-${ENV}.hayven.xyz"
    fi

    echo -e "${BLUE}Stopping $worker_id...${NC}"

    local response=$(curl -s -X POST "$worker_url/stop" 2>&1)

    if echo "$response" | grep -q '"status":"stopped"\|"status":"not_running"'; then
        echo -e "${GREEN}✓ $worker_id stopped${NC}"
    else
        echo -e "${RED}✗ Failed to stop $worker_id${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Stop Coinbase workers
echo -e "${BLUE}=== Stopping Coinbase Workers ===${NC}"
stop_worker "coinbase" "worker-coinbase-major-$ENV"

# Stop Binance workers
echo -e "\n${BLUE}=== Stopping Binance Workers ===${NC}"
stop_worker "binance" "worker-binance-major-$ENV"
stop_worker "binance" "worker-binance-alts-$ENV"

# Stop Kraken workers
echo -e "\n${BLUE}=== Stopping Kraken Workers ===${NC}"
stop_worker "kraken" "worker-kraken-major-$ENV"

echo -e "\n${GREEN}=== All workers stopped ===${NC}\n"
echo "Check status with: ./scripts/deployment/check-workers.sh $ENV"
