#!/bin/bash
# =============================================================================
# Project Chrono - Database Migration Runner
# =============================================================================
# Description: Run database migrations on project_chrono_dev
# Usage: ./scripts/database/run-migration.sh [migration_file]
# Example: ./scripts/database/run-migration.sh migrations/001_initial_schema.sql
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_NAME="${DB_NAME:-project_chrono_dev}"
DB_USER="${DB_USER:-$(whoami)}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Check if PostgreSQL is running
check_postgres() {
    print_info "Checking PostgreSQL status..."

    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; then
        print_error "PostgreSQL is not running or not accessible"
        print_info "Try: brew services start postgresql@16"
        exit 1
    fi

    print_success "PostgreSQL is running"
}

# Check if database exists
check_database() {
    print_info "Checking database '$DB_NAME'..."

    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        print_error "Database '$DB_NAME' does not exist"
        print_info "Try: createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME"
        exit 1
    fi

    print_success "Database '$DB_NAME' exists"
}

# Check if TimescaleDB extension is available
check_timescaledb() {
    print_info "Checking TimescaleDB extension..."

    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT 1 FROM pg_available_extensions WHERE name='timescaledb'" | grep -q 1; then
        print_warning "TimescaleDB extension not available"
        print_info "The migration will attempt to create it, but may fail if not installed"
    else
        print_success "TimescaleDB extension is available"
    fi
}

# Run migration file
run_migration() {
    local migration_file="$1"

    if [ ! -f "$migration_file" ]; then
        print_error "Migration file not found: $migration_file"
        exit 1
    fi

    print_header "Running Migration: $(basename "$migration_file")"

    print_info "Database: $DB_NAME"
    print_info "User: $DB_USER"
    print_info "Host: $DB_HOST:$DB_PORT"
    print_info "File: $migration_file"
    echo ""

    # Run the migration
    print_info "Executing migration..."

    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file"; then
        print_success "Migration completed successfully!"
    else
        print_error "Migration failed!"
        exit 1
    fi
}

# Run all pending migrations
run_all_migrations() {
    print_header "Running All Pending Migrations"

    local migrations_dir="migrations"

    if [ ! -d "$migrations_dir" ]; then
        print_error "Migrations directory not found: $migrations_dir"
        exit 1
    fi

    # Get list of migration files (sorted by number)
    local migration_files=($(ls -1 "$migrations_dir"/*.sql 2>/dev/null | sort))

    if [ ${#migration_files[@]} -eq 0 ]; then
        print_warning "No migration files found in $migrations_dir"
        exit 0
    fi

    print_info "Found ${#migration_files[@]} migration file(s)"
    echo ""

    # Run each migration
    for migration_file in "${migration_files[@]}"; do
        run_migration "$migration_file"
        echo ""
    done

    print_success "All migrations completed!"
}

# Show migration status
show_status() {
    print_header "Migration Status"

    print_info "Applied migrations:"
    echo ""

    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT
            version,
            name,
            applied_at
        FROM schema_migrations
        ORDER BY version;
    " 2>/dev/null || print_warning "schema_migrations table not found (no migrations applied yet)"

    echo ""

    print_info "Available migration files:"
    echo ""

    if [ -d "migrations" ]; then
        ls -1 migrations/*.sql 2>/dev/null || print_warning "No migration files found"
    else
        print_warning "Migrations directory not found"
    fi
}

# Rollback last migration (placeholder - manual for now)
rollback_migration() {
    print_warning "Rollback functionality not yet implemented"
    print_info "To manually rollback:"
    print_info "  1. Identify tables to drop from the migration file"
    print_info "  2. Run: psql -d $DB_NAME -c 'DROP TABLE table_name CASCADE;'"
    print_info "  3. Delete entry from schema_migrations table"
}

# Main script
main() {
    local command="${1:-}"

    case "$command" in
        "run")
            if [ -z "${2:-}" ]; then
                print_error "Usage: $0 run <migration_file>"
                exit 1
            fi
            check_postgres
            check_database
            check_timescaledb
            run_migration "$2"
            ;;
        "all")
            check_postgres
            check_database
            check_timescaledb
            run_all_migrations
            ;;
        "status")
            check_postgres
            check_database
            show_status
            ;;
        "rollback")
            rollback_migration
            ;;
        *)
            print_header "Project Chrono - Database Migration Runner"
            echo "Usage:"
            echo "  $0 run <migration_file>    Run a specific migration"
            echo "  $0 all                     Run all pending migrations"
            echo "  $0 status                  Show migration status"
            echo "  $0 rollback                Rollback last migration (manual)"
            echo ""
            echo "Examples:"
            echo "  $0 run migrations/001_initial_schema.sql"
            echo "  $0 all"
            echo "  $0 status"
            echo ""
            exit 1
            ;;
    esac
}

# Run main with all arguments
main "$@"
