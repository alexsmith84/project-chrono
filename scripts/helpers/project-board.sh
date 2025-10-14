#!/bin/bash
# Project Board Management Helper
# Simplifies GitHub Project Board operations for Project Chrono

set -e

PROJECT_ID="PVT_kwHOAA1B-c4BEzsW"
PROJECT_NUM="5"
OWNER="alexsmith84"

# Field IDs
EPIC_FIELD="PVTSSF_lAHOAA1B-c4BEzsWzg2Z2PM"
ROLE_FIELD="PVTSSF_lAHOAA1B-c4BEzsWzg2Z2YE"
PRIORITY_FIELD="PVTSSF_lAHOAA1B-c4BEzsWzg2Z2ew"
SUPPLY_FIELD="PVTSSF_lAHOAA1B-c4BEzsWzg2Z3zc"
STATUS_FIELD="PVTSSF_lAHOAA1B-c4BEzsWzg2U5wg"

# Epic option IDs
declare -A EPICS=(
  ["nexus"]="4c2e0f05"
  ["khala"]="69572fa2"
  ["chrono"]="0b141e0c"
  ["warp"]="0aa355fd"
  ["fleet"]="c42a270b"
)

# Role option IDs
declare -A ROLES=(
  ["oracle"]="20cb1e26"
  ["zealot"]="99af3a81"
  ["templar"]="4adc0fd2"
  ["marine"]="254eb9d9"
  ["overlord"]="8a138c43"
  ["observer"]="2568606f"
)

# Priority option IDs
declare -A PRIORITIES=(
  ["critical"]="5c5de61b"
  ["main"]="1bf0aaf4"
  ["side"]="9eb7939a"
  ["research"]="60a8499a"
)

# Supply option IDs
declare -A SUPPLIES=(
  ["1"]="8f2c0327"
  ["2"]="7d650237"
  ["3"]="4f420d58"
  ["5"]="6c38264c"
  ["8"]="e52899be"
)

# Status option IDs
declare -A STATUSES=(
  ["backlog"]="b89008ea"
  ["ready"]="be2c3b40"
  ["in-progress"]="47fc9ee4"
  ["in-review"]="be9d724e"
  ["done"]="98236657"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_usage() {
  cat << EOF
Project Chrono - GitHub Project Board Helper

USAGE:
  $0 <command> [options]

COMMANDS:
  create-issue <title> <epic> <role> <priority> <supply> <labels>
      Create new issue with all metadata
      Example: $0 create-issue "CHRONO-011: API Caching" khala overlord critical 3 "enhancement"

  add-to-board <issue_number>
      Add existing issue to project board
      Example: $0 add-to-board 25

  set-metadata <issue_number> <epic> <role> <priority> <supply>
      Set all project board metadata for an issue
      Example: $0 set-metadata 25 khala overlord critical 5

  update-status <issue_number> <status>
      Update issue status (backlog, ready, in-progress, in-review, done)
      Example: $0 update-status 25 in-progress

  show-board
      Display current project board status

  get-item-id <issue_number>
      Get project item ID for an issue number
      Example: $0 get-item-id 25

EPIC OPTIONS: nexus, khala, chrono, warp, fleet
ROLE OPTIONS: oracle, zealot, templar, marine, overlord, observer
PRIORITY OPTIONS: critical, main, side, research
SUPPLY OPTIONS: 1, 2, 3, 5, 8
STATUS OPTIONS: backlog, ready, in-progress, in-review, done

EOF
}

get_item_id() {
  local issue_num=$1
  gh project item-list $PROJECT_NUM --owner $OWNER --format json --limit 100 | \
    jq -r ".items[] | select(.content.number == $issue_num) | .id"
}

create_issue() {
  local title=$1
  local epic=$2
  local role=$3
  local priority=$4
  local supply=$5
  local extra_labels=$6

  # Convert to label format
  local epic_label="epic-${epic}"
  local role_label="${role}-"
  case $role in
    oracle) role_label="probe-data" ;;
    zealot) role_label="zealot-frontend" ;;
    templar) role_label="templar-blockchain" ;;
    marine) role_label="marine-devops" ;;
    overlord) role_label="overlord-backend" ;;
    observer) role_label="scv-qa" ;;
  esac

  local priority_label
  case $priority in
    critical) priority_label="Critical Mission" ;;
    main) priority_label="Main Objective" ;;
    side) priority_label="Side Quest" ;;
    research) priority_label="Research" ;;
  esac

  local supply_label="${supply}-supply"

  local labels="${epic_label},${role_label},${priority_label},${supply_label}"
  if [ -n "$extra_labels" ]; then
    labels="${labels},${extra_labels}"
  fi

  echo -e "${BLUE}Creating issue with labels: $labels${NC}"

  # Create issue
  local issue_url=$(gh issue create \
    --title "$title" \
    --body "See docs/specs/ for full specification" \
    --label "$labels" \
    --assignee @me)

  local issue_num=$(echo $issue_url | grep -oE '[0-9]+$')
  echo -e "${GREEN}✓ Created issue #$issue_num${NC}"

  # Add to project board
  echo -e "${BLUE}Adding to project board...${NC}"
  gh project item-add $PROJECT_NUM --owner $OWNER --url "$issue_url"
  echo -e "${GREEN}✓ Added to project board${NC}"

  # Wait a moment for GitHub to process
  sleep 2

  # Set metadata
  echo -e "${BLUE}Setting project metadata...${NC}"
  set_metadata $issue_num $epic $role $priority $supply

  echo -e "${GREEN}✓ Issue #$issue_num fully configured!${NC}"
  echo "View at: $issue_url"
}

add_to_board() {
  local issue_num=$1
  local issue_url="https://github.com/${OWNER}/project-chrono/issues/${issue_num}"

  echo -e "${BLUE}Adding issue #$issue_num to project board...${NC}"
  gh project item-add $PROJECT_NUM --owner $OWNER --url "$issue_url"
  echo -e "${GREEN}✓ Added to board${NC}"
}

set_metadata() {
  local issue_num=$1
  local epic=$2
  local role=$3
  local priority=$4
  local supply=$5

  # Get item ID
  local item_id=$(get_item_id $issue_num)
  if [ -z "$item_id" ]; then
    echo -e "${RED}✗ Issue #$issue_num not found on project board${NC}"
    echo "Run: $0 add-to-board $issue_num"
    exit 1
  fi

  echo -e "${BLUE}Updating project metadata for issue #$issue_num...${NC}"

  # Set Epic
  gh project item-edit --project-id $PROJECT_ID --id $item_id \
    --field-id $EPIC_FIELD --single-select-option-id ${EPICS[$epic]}
  echo -e "${GREEN}✓ Epic: $epic${NC}"

  # Set Role
  gh project item-edit --project-id $PROJECT_ID --id $item_id \
    --field-id $ROLE_FIELD --single-select-option-id ${ROLES[$role]}
  echo -e "${GREEN}✓ Role: $role${NC}"

  # Set Priority
  gh project item-edit --project-id $PROJECT_ID --id $item_id \
    --field-id $PRIORITY_FIELD --single-select-option-id ${PRIORITIES[$priority]}
  echo -e "${GREEN}✓ Priority: $priority${NC}"

  # Set Supply
  gh project item-edit --project-id $PROJECT_ID --id $item_id \
    --field-id $SUPPLY_FIELD --single-select-option-id ${SUPPLIES[$supply]}
  echo -e "${GREEN}✓ Supply: $supply${NC}"
}

update_status() {
  local issue_num=$1
  local status=$2

  # Get item ID
  local item_id=$(get_item_id $issue_num)
  if [ -z "$item_id" ]; then
    echo -e "${RED}✗ Issue #$issue_num not found on project board${NC}"
    exit 1
  fi

  echo -e "${BLUE}Updating status to: $status${NC}"
  gh project item-edit --project-id $PROJECT_ID --id $item_id \
    --field-id $STATUS_FIELD --single-select-option-id ${STATUSES[$status]}
  echo -e "${GREEN}✓ Status updated to: $status${NC}"
}

show_board() {
  echo -e "${BLUE}=== Project Chrono - Board Status ===${NC}\n"

  gh project item-list $PROJECT_NUM --owner $OWNER --format json --limit 100 | \
    jq -r '.items[] | "\(.content.number)\t\(.title)\t\(.status)"' | \
    sort -n | \
    while IFS=$'\t' read -r num title status; do
      local color=$NC
      case $status in
        "In Progress") color=$YELLOW ;;
        "In Review") color=$BLUE ;;
        "Done") color=$GREEN ;;
      esac
      echo -e "${color}#$num\t$status\t$title${NC}"
    done
}

# Main command dispatcher
case "$1" in
  create-issue)
    if [ $# -ne 7 ]; then
      echo -e "${RED}Error: create-issue requires 6 arguments${NC}"
      print_usage
      exit 1
    fi
    create_issue "$2" "$3" "$4" "$5" "$6" "$7"
    ;;
  add-to-board)
    if [ $# -ne 2 ]; then
      echo -e "${RED}Error: add-to-board requires issue number${NC}"
      print_usage
      exit 1
    fi
    add_to_board "$2"
    ;;
  set-metadata)
    if [ $# -ne 6 ]; then
      echo -e "${RED}Error: set-metadata requires 5 arguments${NC}"
      print_usage
      exit 1
    fi
    set_metadata "$2" "$3" "$4" "$5" "$6"
    ;;
  update-status)
    if [ $# -ne 3 ]; then
      echo -e "${RED}Error: update-status requires issue number and status${NC}"
      print_usage
      exit 1
    fi
    update_status "$2" "$3"
    ;;
  show-board)
    show_board
    ;;
  get-item-id)
    if [ $# -ne 2 ]; then
      echo -e "${RED}Error: get-item-id requires issue number${NC}"
      print_usage
      exit 1
    fi
    get_item_id "$2"
    ;;
  *)
    print_usage
    exit 1
    ;;
esac
