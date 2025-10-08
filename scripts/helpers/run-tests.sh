#!/bin/bash
set -euo pipefail

# run-tests.sh - Run Project Chrono test suites
#
# Usage: ./scripts/helpers/run-tests.sh [OPTIONS]
#
# Options:
#   --all         Run all test suites (default)
#   --unit        Run only unit tests
#   --integration Run only integration tests
#   --e2e         Run only end-to-end tests
#   --coverage    Generate coverage report
#   --verbose     Show verbose output
#   --help        Show this help message

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default options
RUN_UNIT=true
RUN_INTEGRATION=true
RUN_E2E=true
COVERAGE=false
VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --unit)
            RUN_UNIT=true
            RUN_INTEGRATION=false
            RUN_E2E=false
            shift
            ;;
        --integration)
            RUN_UNIT=false
            RUN_INTEGRATION=true
            RUN_E2E=false
            shift
            ;;
        --e2e)
            RUN_UNIT=false
            RUN_INTEGRATION=false
            RUN_E2E=true
            shift
            ;;
        --coverage)
            COVERAGE=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --all         Run all test suites (default)"
            echo "  --unit        Run only unit tests"
            echo "  --integration Run only integration tests"
            echo "  --e2e         Run only end-to-end tests"
            echo "  --coverage    Generate coverage report"
            echo "  --verbose     Show verbose output"
            echo "  --help        Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Error: Unknown option $1${NC}"
            echo "Run with --help for usage information"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🧪  Project Chrono - Test Runner${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Track overall success
ALL_PASSED=true

# Function to run tests
run_test_suite() {
    local suite_name=$1
    local command=$2

    echo -e "${BLUE}Running ${suite_name} tests...${NC}"

    if eval "$command"; then
        echo -e "${GREEN}✓${NC} ${suite_name} tests passed"
        echo ""
        return 0
    else
        echo -e "${RED}✗${NC} ${suite_name} tests failed"
        echo ""
        ALL_PASSED=false
        return 1
    fi
}

# Rust unit tests
if [[ "$RUN_UNIT" == "true" ]]; then
    if [[ "$COVERAGE" == "true" ]]; then
        run_test_suite "Rust unit (with coverage)" \
            "cargo tarpaulin --out Html --output-dir coverage/rust"
    elif [[ "$VERBOSE" == "true" ]]; then
        run_test_suite "Rust unit" \
            "cargo test --verbose"
    else
        run_test_suite "Rust unit" \
            "cargo test"
    fi
fi

# TypeScript unit tests
if [[ "$RUN_UNIT" == "true" ]]; then
    if [[ -f "package.json" ]] && grep -q '"test"' package.json; then
        if [[ "$COVERAGE" == "true" ]]; then
            run_test_suite "TypeScript unit (with coverage)" \
                "bun test --coverage"
        elif [[ "$VERBOSE" == "true" ]]; then
            run_test_suite "TypeScript unit" \
                "bun test --verbose"
        else
            run_test_suite "TypeScript unit" \
                "bun test"
        fi
    else
        echo -e "${YELLOW}ℹ${NC}  No TypeScript unit tests configured yet"
        echo ""
    fi
fi

# Integration tests
if [[ "$RUN_INTEGRATION" == "true" ]]; then
    if [[ -d "tests/integration" ]]; then
        echo -e "${YELLOW}ℹ${NC}  Integration tests not yet implemented"
        echo ""
    fi
fi

# E2E tests
if [[ "$RUN_E2E" == "true" ]]; then
    if [[ -d "tests/e2e" ]]; then
        echo -e "${YELLOW}ℹ${NC}  E2E tests not yet implemented"
        echo ""
    fi
fi

# Summary
echo -e "${BLUE}================================${NC}"
if [[ "$ALL_PASSED" == "true" ]]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    if [[ "$COVERAGE" == "true" ]]; then
        echo -e "${YELLOW}Coverage reports generated:${NC}"
        echo "  Rust: coverage/rust/index.html"
        echo "  TypeScript: coverage/typescript/index.html"
        echo ""
        echo "Open in browser:"
        echo "  \$ open coverage/rust/index.html"
        echo ""
    fi
    echo -e "${GREEN}En Taro Tassadar! 🎉${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Review failure output above"
    echo "2. Fix failing tests"
    echo "3. Run tests again"
    echo ""
    exit 1
fi
