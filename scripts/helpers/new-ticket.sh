#!/bin/bash
set -euo pipefail

# new-ticket.sh - Create new CHRONO ticket with all required files
#
# Usage: ./scripts/helpers/new-ticket.sh CHRONO-XXX "Ticket Title"
#
# This script creates:
# - Spec document from template
# - Implementation guide from template
# - Test spec from template
#
# Example:
#   ./scripts/helpers/new-ticket.sh CHRONO-003 "Mac Mini Setup"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [[ $# -lt 2 ]]; then
    echo -e "${RED}Error: Missing arguments${NC}"
    echo ""
    echo "Usage: $0 CHRONO-XXX \"Ticket Title\""
    echo ""
    echo "Example:"
    echo "  $0 CHRONO-003 \"Mac Mini Infrastructure Setup\""
    echo ""
    exit 1
fi

TICKET_ID="$1"
TICKET_TITLE="$2"

# Validate ticket ID format
if [[ ! "$TICKET_ID" =~ ^CHRONO-[0-9]+$ ]]; then
    echo -e "${RED}Error: Invalid ticket ID format${NC}"
    echo "Expected format: CHRONO-XXX (e.g., CHRONO-003)"
    echo "Got: $TICKET_ID"
    exit 1
fi

# Create slug from title (lowercase, spaces to hyphens)
SLUG=$(echo "$TICKET_TITLE" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/[^a-z0-9-]//g')

# File paths
SPEC_FILE="docs/specs/${TICKET_ID}-${SLUG}.md"
IMPL_FILE="docs/implementation/${TICKET_ID}-guide.md"
TEST_FILE="docs/tests/${TICKET_ID}-tests.md"

# Check if files already exist
if [[ -f "$SPEC_FILE" ]] || [[ -f "$IMPL_FILE" ]] || [[ -f "$TEST_FILE" ]]; then
    echo -e "${YELLOW}Warning: Some files already exist:${NC}"
    [[ -f "$SPEC_FILE" ]] && echo "  - $SPEC_FILE"
    [[ -f "$IMPL_FILE" ]] && echo "  - $IMPL_FILE"
    [[ -f "$TEST_FILE" ]] && echo "  - $TEST_FILE"
    echo ""
    read -p "Overwrite existing files? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

# Create spec from template
echo -e "${GREEN}Creating spec document...${NC}"
cp docs/specs/SPEC-TEMPLATE.md "$SPEC_FILE"

# Replace placeholder text in spec
sed -i '' "s/CHRONO-XXX/${TICKET_ID}/g" "$SPEC_FILE" 2>/dev/null || true
sed -i '' "s/Feature Title/${TICKET_TITLE}/g" "$SPEC_FILE" 2>/dev/null || true

# Create implementation guide from template
echo -e "${GREEN}Creating implementation guide...${NC}"
cp docs/implementation/IMPL-TEMPLATE.md "$IMPL_FILE"

# Replace placeholder text in implementation guide
sed -i '' "s/CHRONO-XXX/${TICKET_ID}/g" "$IMPL_FILE" 2>/dev/null || true

# Create test spec from template
echo -e "${GREEN}Creating test spec...${NC}"
cp docs/tests/TEST-TEMPLATE.md "$TEST_FILE"

# Replace placeholder text in test spec
sed -i '' "s/CHRONO-XXX/${TICKET_ID}/g" "$TEST_FILE" 2>/dev/null || true

echo ""
echo -e "${GREEN}✅ Created ticket documentation:${NC}"
echo "   📄 $SPEC_FILE"
echo "   📋 $IMPL_FILE"
echo "   🧪 $TEST_FILE"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Edit spec file and fill in requirements:"
echo "   \$ open $SPEC_FILE"
echo ""
echo "2. Edit implementation guide with step-by-step instructions:"
echo "   \$ open $IMPL_FILE"
echo ""
echo "3. Edit test spec with test cases:"
echo "   \$ open $TEST_FILE"
echo ""
echo "4. Create GitHub issue:"
echo "   \$ gh issue create --title \"${TICKET_ID}: ${TICKET_TITLE}\" \\"
echo "       --body \"See ${SPEC_FILE} for details\""
echo ""
echo "5. Add to project board:"
echo "   \$ gh project item-add 5 --owner alexsmith84 --url <issue-url>"
echo ""
echo -e "${GREEN}En Taro Adun!${NC} 🛠️"
