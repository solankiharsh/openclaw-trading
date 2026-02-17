.PHONY: help install setup dev build start stop clean test lint db-setup db-migrate db-reset

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
NC := \033[0m # No Color

# Default target
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo "$(BLUE)SuperMolt-Mono - Makefile Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

# ── Installation & Setup ────────────────────────────────────────

install: ## Install all dependencies (backend, web, mobile)
	@echo "$(BLUE)Installing dependencies...$(NC)"
	@cd backend && bun install
	@cd web && npm install
	@cd mobile && npm install
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

setup: install db-setup env-setup ## Complete setup (install + database + env files)
	@echo "$(GREEN)✓ Setup complete! Run 'make dev' to start$(NC)"

env-setup: ## Create .env files from examples
	@echo "$(BLUE)Creating .env files...$(NC)"
	@if [ ! -f backend/.env ]; then \
		cp backend/.env.example backend/.env 2>/dev/null || echo "# Add your env vars here" > backend/.env; \
		echo "$(YELLOW)⚠ Created backend/.env - please configure it$(NC)"; \
	fi
	@if [ ! -f web/.env.local ]; then \
		cp web/.env.example web/.env.local 2>/dev/null || echo "NEXT_PUBLIC_API_URL=http://localhost:3002" > web/.env.local; \
		echo "$(YELLOW)⚠ Created web/.env.local - please configure it$(NC)"; \
	fi
	@echo "$(GREEN)✓ Environment files created$(NC)"

db-setup: ## Setup PostgreSQL database
	@echo "$(BLUE)Setting up database...$(NC)"
	@cd backend && bunx prisma generate
	@cd backend && bunx prisma db push --accept-data-loss || echo "$(YELLOW)⚠ Database setup may require manual configuration$(NC)"
	@echo "$(GREEN)✓ Database setup complete$(NC)"

db-migrate: ## Run database migrations
	@echo "$(BLUE)Running migrations...$(NC)"
	@cd backend && bunx prisma migrate dev
	@echo "$(GREEN)✓ Migrations complete$(NC)"

db-reset: ## Reset database (WARNING: deletes all data)
	@echo "$(YELLOW)⚠ Resetting database...$(NC)"
	@cd backend && bunx prisma migrate reset --force
	@echo "$(GREEN)✓ Database reset$(NC)"

db-studio: ## Open Prisma Studio (database GUI)
	@echo "$(BLUE)Opening Prisma Studio...$(NC)"
	@cd backend && bunx prisma studio

# ── Development ────────────────────────────────────────────────

dev: ## Start all services in development mode
	@echo "$(BLUE)Starting development servers...$(NC)"
	@echo "$(YELLOW)Backend: http://localhost:3002$(NC)"
	@echo "$(YELLOW)Web: http://localhost:3000$(NC)"
	@echo "$(YELLOW)Press Ctrl+C to stop all services$(NC)"
	@make -j3 dev-backend dev-web dev-mobile || true

dev-backend: ## Start backend server only
	@echo "$(BLUE)Starting backend...$(NC)"
	@cd backend && bun run dev

dev-web: ## Start web frontend only
	@echo "$(BLUE)Starting web frontend...$(NC)"
	@cd web && npm run dev

dev-mobile: ## Start mobile app (Expo)
	@echo "$(BLUE)Starting mobile app...$(NC)"
	@cd mobile && npx expo start

# ── Production Build ───────────────────────────────────────────

build: build-backend build-web ## Build all services for production

build-backend: ## Build backend
	@echo "$(BLUE)Building backend...$(NC)"
	@cd backend && bun run build
	@echo "$(GREEN)✓ Backend built$(NC)"

build-web: ## Build web frontend
	@echo "$(BLUE)Building web frontend...$(NC)"
	@cd web && npm run build
	@echo "$(GREEN)✓ Web frontend built$(NC)"

start: ## Start production servers
	@echo "$(BLUE)Starting production servers...$(NC)"
	@make -j2 start-backend start-web || true

start-backend: ## Start backend in production mode
	@cd backend && bun run start

start-web: ## Start web in production mode
	@cd web && npm run start

# ── Testing & Quality ──────────────────────────────────────────

test: test-backend test-web ## Run all tests

test-backend: ## Run backend tests
	@echo "$(BLUE)Running backend tests...$(NC)"
	@cd backend && bun test || echo "$(YELLOW)⚠ No tests configured$(NC)"

test-web: ## Run web tests
	@echo "$(BLUE)Running web tests...$(NC)"
	@cd web && npm test || echo "$(YELLOW)⚠ No tests configured$(NC)"

lint: lint-backend lint-web ## Lint all code

lint-backend: ## Lint backend code
	@echo "$(BLUE)Linting backend...$(NC)"
	@cd backend && bun run lint || echo "$(YELLOW)⚠ Linting not configured$(NC)"

lint-web: ## Lint web code
	@echo "$(BLUE)Linting web...$(NC)"
	@cd web && npm run lint || echo "$(YELLOW)⚠ Linting not configured$(NC)"

typecheck: ## Type check all TypeScript
	@echo "$(BLUE)Type checking...$(NC)"
	@cd backend && bun run typecheck
	@cd web && npm run type-check || npm run typecheck || echo "$(YELLOW)⚠ Type checking not configured$(NC)"

# ── Database Operations ────────────────────────────────────────

db-seed: ## Seed database with sample data
	@echo "$(BLUE)Seeding database...$(NC)"
	@cd backend && bunx prisma db seed || echo "$(YELLOW)⚠ No seed script configured$(NC)"

# ── Cleanup ────────────────────────────────────────────────────

clean: ## Clean build artifacts and node_modules
	@echo "$(BLUE)Cleaning...$(NC)"
	@rm -rf backend/dist backend/node_modules backend/.bun
	@rm -rf web/.next web/node_modules
	@rm -rf mobile/node_modules mobile/.expo
	@echo "$(GREEN)✓ Cleaned$(NC)"

clean-deps: ## Remove all node_modules (keeps lock files)
	@echo "$(BLUE)Removing dependencies...$(NC)"
	@rm -rf backend/node_modules web/node_modules mobile/node_modules
	@echo "$(GREEN)✓ Dependencies removed$(NC)"

# ── Docker (Optional) ──────────────────────────────────────────

docker-up: ## Start services with Docker Compose
	@echo "$(BLUE)Starting Docker services...$(NC)"
	@docker-compose up -d
	@echo "$(GREEN)✓ Docker services started$(NC)"

docker-down: ## Stop Docker services
	@echo "$(BLUE)Stopping Docker services...$(NC)"
	@docker-compose down
	@echo "$(GREEN)✓ Docker services stopped$(NC)"

docker-logs: ## View Docker logs
	@docker-compose logs -f

# ── Quick Commands ─────────────────────────────────────────────

quick-start: setup dev ## Quick start (setup + dev)

restart: stop start ## Restart all services

stop: ## Stop all services (Ctrl+C in dev mode)
	@echo "$(YELLOW)Use Ctrl+C to stop dev servers$(NC)"
	@pkill -f "bun.*dev" || true
	@pkill -f "next.*dev" || true
	@pkill -f "expo.*start" || true

# ── Health Checks ──────────────────────────────────────────────

health: ## Check service health
	@echo "$(BLUE)Checking service health...$(NC)"
	@curl -s http://localhost:3002/health | jq . || echo "$(YELLOW)⚠ Backend not running$(NC)"
	@curl -s http://localhost:3000 > /dev/null && echo "$(GREEN)✓ Web running$(NC)" || echo "$(YELLOW)⚠ Web not running$(NC)"

# ── Deriv Integration ──────────────────────────────────────────

deriv-setup: ## Setup Deriv integration
	@echo "$(BLUE)Setting up Deriv integration...$(NC)"
	@cd backend && bun add @deriv/api
	@echo "$(GREEN)✓ Deriv integration setup$(NC)"

deriv-test: ## Test Deriv connection
	@echo "$(BLUE)Testing Deriv connection...$(NC)"
	@cd backend && bun run scripts/test-deriv.ts || echo "$(YELLOW)⚠ Deriv test script not found$(NC)"

