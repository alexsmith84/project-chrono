#!/bin/bash
# Check status of all Chrono Collectors workers
# Usage: ./scripts/deployment/check-workers.sh [environment]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Environment
ENV="${1:-dev}"

echo -e "${BLUE}=== Chrono Collectors Status - Environment: $ENV ===${NC}\n"

# Function to check worker status
check_worker() {
    local exchange=$1
    local worker_name=$2
    local worker_url="https://chrono-${exchange}-${ENV}.alexsmith84.workers.dev"

    echo -e "${BLUE}Checking $worker_name...${NC}"

    local response=$(curl -s "$worker_url/status" 2>&1)

    if [ $? -eq 0 ]; then
        # Parse JSON response
        local status=$(echo "$response" | jq -r '.status // "unknown"' 2>/dev/null)
        local state=$(echo "$response" | jq -r '.state // "unknown"' 2>/dev/null)
        local exchange_name=$(echo "$response" | jq -r '.exchange // "unknown"' 2>/dev/null)
        local symbols=$(echo "$response" | jq -r '.symbols // [] | join(", ")' 2>/dev/null)
        local feeds_collected=$(echo "$response" | jq -r '.feeds_collected // 0' 2>/dev/null)
        local batches_sent=$(echo "$response" | jq -r '.batches_sent // 0' 2>/dev/null)
        local uptime=$(echo "$response" | jq -r '.uptime_seconds // 0' 2>/dev/null)

        if [ "$status" = "not_running" ]; then
            echo -e "${YELLOW}  Status: Not Running${NC}"
        else
            # Determine color based on state
            local state_color=$GREEN
            if [ "$state" = "reconnecting" ] || [ "$state" = "failed" ]; then
                state_color=$RED
            elif [ "$state" = "connecting" ]; then
                state_color=$YELLOW
            fi

            echo -e "  ${state_color}State: $state${NC}"
            echo -e "  Exchange: $exchange_name"
            echo -e "  Symbols: $symbols"
            echo -e "  Feeds Collected: $feeds_collected"
            echo -e "  Batches Sent: $batches_sent"
            echo -e "  Uptime: ${uptime}s"
        fi
    else
        echo -e "${RED}  ✗ Failed to connect to worker${NC}"
    fi

    echo
}

# Check all workers
echo "Coinbase Workers:"
check_worker "coinbase" "worker-coinbase-major-$ENV"

echo "Binance Workers:"
check_worker "binance" "worker-binance-major-$ENV"
check_worker "binance" "worker-binance-alts-$ENV"

echo "Kraken Workers:"
check_worker "kraken" "worker-kraken-major-$ENV"

# Summary
echo -e "${BLUE}=== Summary ===${NC}"
echo "To start workers: ./scripts/deployment/start-workers.sh $ENV"
echo "To stop workers: ./scripts/deployment/stop-workers.sh $ENV"
echo "To view logs: wrangler tail chrono-coinbase-$ENV"
