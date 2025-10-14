#!/bin/bash
# Start all Chrono Collectors workers
# Usage: ./scripts/deployment/start-workers.sh [environment]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Environment
ENV="${1:-dev}"

echo -e "${BLUE}=== Starting Chrono Collectors - Environment: $ENV ===${NC}\n"

# Configuration based on environment
case $ENV in
    dev)
        API_BASE_URL="http://localhost:3000"
        ;;
    staging)
        API_BASE_URL="https://api-staging.projectchrono.io"
        ;;
    production)
        API_BASE_URL="https://api.projectchrono.io"
        ;;
    *)
        echo -e "${RED}✗ Unknown environment: $ENV${NC}"
        exit 1
        ;;
esac

# Worker configuration
BATCH_SIZE=100
BATCH_INTERVAL_MS=5000
MAX_RECONNECT_ATTEMPTS=10

# Symbol sets for different worker types
MAJOR_PAIRS='["BTC/USD","ETH/USD","SOL/USD"]'
ALTCOINS='["ADA/USD","DOGE/USD","DOT/USD","AVAX/USD","MATIC/USD"]'
STABLECOINS='["USDT/USD","USDC/USD","DAI/USD"]'

# Function to start a worker
start_worker() {
    local exchange=$1
    local worker_id=$2
    local symbols=$3
    local worker_url="https://chrono-${exchange}-${ENV}.alexsmith84.workers.dev"

    echo -e "${BLUE}Starting $worker_id...${NC}"

    # Create start request
    local response=$(curl -s -X POST "$worker_url/start" \
        -H "Content-Type: application/json" \
        -d "{
            \"workerId\": \"$worker_id\",
            \"apiBaseUrl\": \"$API_BASE_URL\",
            \"apiKey\": \"$API_KEY\",
            \"batchSize\": $BATCH_SIZE,
            \"batchIntervalMs\": $BATCH_INTERVAL_MS,
            \"maxReconnectAttempts\": $MAX_RECONNECT_ATTEMPTS,
            \"symbols\": $symbols
        }" 2>&1)

    if echo "$response" | grep -q '"status":"started"\|"status":"already_running"'; then
        echo -e "${GREEN}✓ $worker_id started${NC}"
    else
        echo -e "${RED}✗ Failed to start $worker_id${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Check for API_KEY
if [ -z "$API_KEY" ]; then
    echo -e "${YELLOW}⚠ API_KEY not set${NC}"
    echo "Set with: export API_KEY=your-api-key"
    echo "Or for dev: export API_KEY=chrono_internal_dev_key_001"
    exit 1
fi

echo "Configuration:"
echo "  Environment: $ENV"
echo "  API Base URL: $API_BASE_URL"
echo "  Batch Size: $BATCH_SIZE"
echo "  Batch Interval: ${BATCH_INTERVAL_MS}ms"
echo

# Start Coinbase workers
echo -e "${BLUE}=== Starting Coinbase Workers ===${NC}"
start_worker "coinbase" "worker-coinbase-major-$ENV" "$MAJOR_PAIRS"

# Start Binance workers
echo -e "\n${BLUE}=== Starting Binance Workers ===${NC}"
start_worker "binance" "worker-binance-major-$ENV" "$MAJOR_PAIRS"
start_worker "binance" "worker-binance-alts-$ENV" "$ALTCOINS"

# Start Kraken workers
echo -e "\n${BLUE}=== Starting Kraken Workers ===${NC}"
start_worker "kraken" "worker-kraken-major-$ENV" "$MAJOR_PAIRS"

echo -e "\n${GREEN}=== All workers started ===${NC}\n"
echo "Check status with: ./scripts/deployment/check-workers.sh $ENV"
