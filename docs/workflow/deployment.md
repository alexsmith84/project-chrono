# Deployment Procedures - Project Chrono

_"Deploy with precision. The Khala tolerates no errors."_

---

## Overview

Project Chrono uses a git-flow deployment strategy with three environments:

- **Development** (`forge` branch) - Continuous integration
- **Staging** (`gateway` branch) - Pre-production verification
- **Production** (`khala` branch) - Live FTSO oracle

---

## Deployment Environments

### Development (Forge)

- **Branch**: `forge`
- **Purpose**: Feature integration and testing
- **Deploy**: Manual (local development)
- **Audience**: Developers only

### Staging (Gateway)

- **Branch**: `gateway`
- **Purpose**: Pre-production verification
- **Deploy**: Automated on merge to `gateway`
- **Audience**: Internal testing
- **Infrastructure**: TBD (future: staging Mac Mini or cloud VM)

### Production (Khala)

- **Branch**: `khala`
- **Purpose**: Live FTSO oracle
- **Deploy**: Manual via release process
- **Audience**: Public (FTSO delegators, API consumers)
- **Infrastructure**: Mac Mini M4 Pro (self-hosted)

---

## Release Process

### Standard Release (forge → gateway → khala)

#### Step 1: Prepare for Release

```bash
# Ensure forge is in good state
git checkout forge
git pull origin forge

# Run full test suite
./scripts/helpers/run-tests.sh --all

# Verify all critical issues resolved
gh issue list --label "Critical Mission" --state open
```

**Pre-release checklist:**

- [ ] All planned tickets for release are merged
- [ ] All tests passing on `forge`
- [ ] No open Critical Mission issues
- [ ] Documentation updated
- [ ] IMPLEMENTATION_LOG.md up to date

---

#### Step 2: Merge to Gateway (Staging)

```bash
# Switch to gateway
git checkout gateway
git pull origin gateway

# Merge forge into gateway
git merge forge --no-ff -m "Merge forge to gateway for vX.X.X release"

# Push to trigger staging deployment
git push origin gateway
```

**Post-merge:**

- CI/CD pipeline deploys to staging
- Automated smoke tests run
- Manual verification on staging environment

---

#### Step 3: Staging Verification

**Automated checks:**

- [ ] Deployment successful
- [ ] All services running
- [ ] Health checks pass
- [ ] Smoke tests pass

**Manual verification:**

- [ ] Test critical user flows
- [ ] Verify API endpoints
- [ ] Check monitoring dashboards
- [ ] Test FTSO submission (if applicable)

**If issues found:**

```bash
# Fix on forge
git checkout forge
# Make fixes...
git commit -m "Fix staging issue: description"
git push origin forge

# Re-merge to gateway
git checkout gateway
git merge forge
git push origin gateway
```

---

#### Step 4: Create Release Branch

```bash
# Create release branch from gateway
git checkout gateway
git pull origin gateway

# Create archives branch (version number)
git checkout -b archives/v0.X.0

# Push release branch
git push -u origin archives/v0.X.0
```

**Update version numbers:**

- `package.json`
- `Cargo.toml`
- Any version constants in code

```bash
# Commit version bump
git add package.json Cargo.toml
git commit -m "Bump version to v0.X.0"
git push
```

---

#### Step 5: Deploy to Production

```bash
# Switch to khala (production)
git checkout khala
git pull origin khala

# Merge release branch
git merge archives/v0.X.0 --no-ff -m "Release v0.X.0"

# Tag the release
git tag -a v0.X.0 -m "Release v0.X.0: Brief description

Changes:
- Feature 1
- Feature 2
- Bug fix 3

🤖 Generated with [Claude Code](https://claude.com/claude-code)"

# Push to production
git push origin khala
git push origin --tags
```

**Production deployment steps:**

1. Backup current state (automated or manual)
2. Pull latest `khala` on production server
3. Build production assets
4. Restart services with zero-downtime
5. Run post-deployment health checks
6. Monitor for errors

---

#### Step 6: Post-Deployment

**Immediate verification:**

- [ ] Production services running
- [ ] No error spikes in logs
- [ ] FTSO submissions working
- [ ] API responding correctly
- [ ] Monitoring alerts clear

**Create GitHub Release:**

```bash
gh release create v0.X.0 \
  --title "Release v0.X.0" \
  --notes "See CHANGELOG.md for details"
```

**Announce:**

- Update project board
- Notify delegators (if significant changes)
- Post to Discord/Twitter (if public)

---

## Hotfix Process

### Emergency Production Fixes

When critical bug found in production:

```bash
# 1. Create hotfix branch from khala
git checkout khala
git pull origin khala
git checkout -b recall/hotfix-critical-bug-name

# 2. Fix the bug
# Make minimal changes to fix issue
git add .
git commit -m "Hotfix: Fix critical bug in price aggregation"

# 3. Push hotfix branch
git push -u origin recall/hotfix-critical-bug-name

# 4. Create PR to khala
gh pr create --base khala \
  --title "Hotfix: Critical bug fix" \
  --body "Emergency fix for production issue"

# 5. After approval and merge, backport to gateway and forge
git checkout gateway
git merge recall/hotfix-critical-bug-name
git push origin gateway

git checkout forge
git merge recall/hotfix-critical-bug-name
git push origin forge

# 6. Delete hotfix branch
git branch -d recall/hotfix-critical-bug-name
git push origin --delete recall/hotfix-critical-bug-name
```

**Hotfix criteria:**

- Production is broken or severely degraded
- Cannot wait for normal release cycle
- Fix is well-understood and low-risk

---

## Rollback Procedures

### Immediate Rollback

If deployment causes critical issues:

```bash
# On production server
# 1. Stop current services
sudo systemctl stop project-chrono

# 2. Revert to previous tag
git checkout v0.X-1.0  # Previous version

# 3. Rebuild if needed
cargo build --release
bun run build

# 4. Restart services
sudo systemctl start project-chrono

# 5. Verify health
curl https://nexus.hayven.xyz/health
```

### Git Rollback

If deployment is in git but not yet deployed:

```bash
# Revert merge commit on khala
git checkout khala
git revert -m 1 HEAD  # Revert last merge
git push origin khala
```

---

## Deployment Health Checks

### Pre-Deployment

```bash
# Run full test suite
./scripts/helpers/run-tests.sh --all

# Check dependencies are up to date
cargo update --dry-run
bun update --dry-run

# Verify environment configuration
./scripts/helpers/check-env.sh
```

### Post-Deployment

```bash
# Health endpoint
curl https://nexus.hayven.xyz/health

# Service status
sudo systemctl status project-chrono

# Recent logs
sudo journalctl -u project-chrono -n 100

# Database connectivity
psql -U chrono -c "SELECT version();"

# Redis connectivity
redis-cli ping
```

### Monitoring

**Key metrics to watch:**

- Response times (p50, p95, p99)
- Error rates
- FTSO submission success rate
- Database connection pool usage
- Memory and CPU usage

**Alert on:**

- Error rate > 1%
- p99 latency > 1000ms
- Failed FTSO submissions
- Service restarts

---

## Environment-Specific Configuration

### Development (Local)

- `.env.development`
- PostgreSQL on localhost
- Redis on localhost
- Cloudflare Workers in dev mode
- Mock external APIs

### Staging (Gateway)

- `.env.staging`
- Staging database
- Staging Redis
- Cloudflare Workers preview
- Real APIs (test accounts)

### Production (Khala)

- `.env.production`
- Production database (with replicas)
- Production Redis (with persistence)
- Cloudflare Workers production
- Real APIs (production keys)

**Never commit `.env` files to git!**

---

## Deployment Scripts

### Build for Production

```bash
# Rust services
cd src/oracle/rust
cargo build --release

# TypeScript services
cd src/api/typescript
bun run build

# Frontend
cd apps/dashboard
bun run build
```

### Database Migrations

```bash
# Run pending migrations
./scripts/deployment/run-migrations.sh

# Rollback last migration (if needed)
./scripts/deployment/rollback-migration.sh
```

### Service Management

```bash
# Start all services
./scripts/deployment/start-services.sh

# Stop all services
./scripts/deployment/stop-services.sh

# Restart with zero-downtime
./scripts/deployment/restart-services.sh
```

---

## Disaster Recovery

### Backup Strategy

**Automated backups:**

- Database: Every 6 hours to encrypted S3
- Configuration: Daily to git repository
- Logs: Retained for 30 days

**Manual backup before deployment:**

```bash
./scripts/deployment/backup-now.sh
```

### Recovery Process

**Database recovery:**

```bash
# List available backups
./scripts/deployment/list-backups.sh

# Restore from specific backup
./scripts/deployment/restore-backup.sh 2025-10-07-12-00

# Verify restoration
psql -U chrono -c "SELECT COUNT(*) FROM price_data;"
```

**Service recovery:**

```bash
# Reinstall from scratch
git clone https://github.com/alexsmith84/project-chrono.git
cd project-chrono
git checkout v0.X.0  # Last known good version
./scripts/deployment/full-setup.sh
```

---

## Troubleshooting Deployments

### Deployment Fails

**Symptom**: CI/CD pipeline fails
**Solution**:

1. Check CI logs for error message
2. Verify all tests pass locally
3. Ensure dependencies are locked
4. Re-run pipeline

### Service Won't Start

**Symptom**: Service crashes on startup
**Solution**:

1. Check logs: `journalctl -u project-chrono -n 100`
2. Verify configuration files present
3. Check database connectivity
4. Ensure ports not already in use

### Database Migration Fails

**Symptom**: Migration script errors
**Solution**:

1. Check migration SQL for syntax errors
2. Verify database permissions
3. Rollback failed migration
4. Fix migration and re-run

---

## Future Enhancements

- [ ] Automated deployment pipelines (GitHub Actions)
- [ ] Blue-green deployments
- [ ] Automated rollback on health check failure
- [ ] Deployment notifications (Slack/Discord)
- [ ] Deployment metrics dashboard

---

_"Deploy with confidence. The Khala protects those who prepare. En Taro Adun!"_
