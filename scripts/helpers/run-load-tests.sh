#!/bin/bash
# =====================================================
# Project Chrono - Load Test Runner
# Run all k6 load tests or specific test suites
# =====================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOAD_TESTS_DIR="$PROJECT_ROOT/apps/api/tests/load"
API_URL="${API_URL:-http://localhost:3000}"
WS_URL="${WS_URL:-ws://localhost:3000}"
API_KEY="${API_KEY:-chrono_public_dev_key_001}"
INTERNAL_API_KEY="${INTERNAL_API_KEY:-chrono_internal_dev_key_001}"

# Print banner
print_banner() {
    echo -e "${BLUE}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Project Chrono - Load Test Runner"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${NC}"
}

# Check if k6 is installed
check_k6() {
    if ! command -v k6 &> /dev/null; then
        echo -e "${RED}❌ k6 is not installed${NC}"
        echo ""
        echo "Install k6:"
        echo "  macOS:   brew install k6"
        echo "  Linux:   https://k6.io/docs/getting-started/installation/"
        echo "  Windows: choco install k6"
        exit 1
    fi
    echo -e "${GREEN}✅ k6 found: $(k6 version)${NC}"
}

# Check if API is running
check_api() {
    echo -e "${YELLOW}🔍 Checking API health at $API_URL...${NC}"

    if curl -sf "$API_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ API is healthy${NC}"
    else
        echo -e "${RED}❌ API is not responding at $API_URL${NC}"
        echo ""
        echo "Start the API server:"
        echo "  cd apps/api"
        echo "  bun run dev"
        exit 1
    fi
}

# Run ingestion load test
run_ingestion_test() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📥 Ingestion Load Test${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

    API_URL="$API_URL" \
    API_KEY="$INTERNAL_API_KEY" \
        k6 run "$LOAD_TESTS_DIR/ingestion.load.js"
}

# Run query endpoints load test
run_queries_test() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📊 Query Endpoints Load Test${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

    API_URL="$API_URL" \
    API_KEY="$API_KEY" \
    INTERNAL_API_KEY="$INTERNAL_API_KEY" \
        k6 run "$LOAD_TESTS_DIR/queries.load.js"
}

# Run WebSocket load test
run_websocket_test() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🔌 WebSocket Load Test${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

    WS_URL="$WS_URL" \
    API_KEY="$API_KEY" \
        k6 run "$LOAD_TESTS_DIR/websocket.load.js"
}

# Show usage
show_usage() {
    echo "Usage: $0 [test-type] [options]"
    echo ""
    echo "Test Types:"
    echo "  all          Run all load tests (default)"
    echo "  ingestion    Run only ingestion load test"
    echo "  queries      Run only query endpoints load test"
    echo "  websocket    Run only WebSocket load test"
    echo ""
    echo "Options:"
    echo "  --api-url URL       API URL (default: http://localhost:3000)"
    echo "  --ws-url URL        WebSocket URL (default: ws://localhost:3000)"
    echo "  --api-key KEY       Public API key"
    echo "  --internal-key KEY  Internal API key"
    echo "  --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0"
    echo "  $0 queries"
    echo "  $0 all --api-url https://api.chrono.dev"
    echo "  $0 ingestion --api-key my_key"
}

# Parse arguments
TEST_TYPE="all"
while [[ $# -gt 0 ]]; do
    case $1 in
        all|ingestion|queries|websocket)
            TEST_TYPE="$1"
            shift
            ;;
        --api-url)
            API_URL="$2"
            shift 2
            ;;
        --ws-url)
            WS_URL="$2"
            shift 2
            ;;
        --api-key)
            API_KEY="$2"
            shift 2
            ;;
        --internal-key)
            INTERNAL_API_KEY="$2"
            shift 2
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown argument: $1${NC}"
            show_usage
            exit 1
            ;;
    esac
done

# Main execution
print_banner
check_k6
check_api

echo ""
echo "Configuration:"
echo "  API URL: $API_URL"
echo "  WebSocket URL: $WS_URL"
echo "  Test Type: $TEST_TYPE"
echo ""

case $TEST_TYPE in
    ingestion)
        run_ingestion_test
        ;;
    queries)
        run_queries_test
        ;;
    websocket)
        run_websocket_test
        ;;
    all)
        run_ingestion_test
        run_queries_test
        run_websocket_test
        ;;
esac

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Load tests complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Next steps:"
echo "  1. Review test results above"
echo "  2. Document baseline metrics in apps/api/tests/load/README.md"
echo "  3. Compare against performance targets"
echo "  4. Investigate any threshold violations"
echo ""
