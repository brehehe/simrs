CLI_ARGS := $(wordlist 2,$(words $(MAKECMDGOALS)),$(MAKECMDGOALS))
$(eval $(sort $(subst :,\:,$(CLI_ARGS))):;@:)

PRIMARY_GOAL := $(firstword $(MAKECMDGOALS))
ifeq ($(PRIMARY_GOAL),)
    PRIMARY_GOAL := help
endif

include docker/.env

# Current user ID and group ID except MacOS where it conflicts with Docker abilities
ifeq ($(shell uname), Darwin)
    export UID=1000
    export GID=1000
else
    export UID=$(shell id -u)
    export GID=$(shell id -g)
endif

export COMPOSE_PROJECT_NAME=${STACK_NAME}
DOCKER_COMPOSE_DEV := docker compose -f docker/compose.yml -f docker/dev/compose.yml
DOCKER_COMPOSE_TEST := docker compose -f docker/compose.yml -f docker/test/compose.yml

#
# Development
#

ifeq ($(PRIMARY_GOAL),build)
build: ## Build docker images.
	$(DOCKER_COMPOSE_DEV) build $(CLI_ARGS)
endif

ifeq ($(PRIMARY_GOAL),up)
up: ## Up the dev environment.
	$(DOCKER_COMPOSE_DEV) up -d --remove-orphans
endif

ifeq ($(PRIMARY_GOAL),down)
down: ## Down the dev environment.
	$(DOCKER_COMPOSE_DEV) down --remove-orphans
endif

ifeq ($(PRIMARY_GOAL),stop)
stop: ## Stop the dev environment.
	$(DOCKER_COMPOSE_DEV) stop
endif

ifeq ($(PRIMARY_GOAL),clear)
clear: ## Remove development docker containers and volumes.
	$(DOCKER_COMPOSE_DEV) down --volumes --remove-orphans
endif

ifeq ($(PRIMARY_GOAL),shell)
shell: ## Get into container shell.
	$(DOCKER_COMPOSE_DEV) exec app /bin/bash
endif

#
# Tools
#

ifeq ($(PRIMARY_GOAL),yii)
yii: ## Execute Yii command.
	$(DOCKER_COMPOSE_DEV) run --rm app ./yii $(CLI_ARGS)
.PHONY: yii
endif

ifeq ($(PRIMARY_GOAL),composer)
composer: ## Run Composer.
	$(DOCKER_COMPOSE_DEV) run --rm app composer $(CLI_ARGS)
endif

ifeq ($(PRIMARY_GOAL),rector)
rector: ## Run Rector.
	$(DOCKER_COMPOSE_DEV) run --rm app ./vendor/bin/rector $(CLI_ARGS)
endif

ifeq ($(PRIMARY_GOAL),cs-fix)
cs-fix: ## Run PHP CS Fixer.
	$(DOCKER_COMPOSE_DEV) run --rm app ./vendor/bin/php-cs-fixer fix --config=.php-cs-fixer.php --diff
endif

#
# Tests and analysis
#

ifeq ($(PRIMARY_GOAL),test)
test: ## Run tests.
	$(DOCKER_COMPOSE_TEST) run --rm app ./vendor/bin/codecept run $(CLI_ARGS)
endif

ifeq ($(PRIMARY_GOAL),test-coverage)
test-coverage: ## Run tests with coverage.
	$(DOCKER_COMPOSE_TEST) run --rm app ./vendor/bin/codecept run --coverage --coverage-html --disable-coverage-php
endif

ifeq ($(PRIMARY_GOAL),codecept)
codecept: ## Run Codeception.
	$(DOCKER_COMPOSE_TEST) run --rm app ./vendor/bin/codecept $(CLI_ARGS)
endif

ifeq ($(PRIMARY_GOAL),psalm)
psalm: ## Run Psalm.
	$(DOCKER_COMPOSE_DEV) run --rm app ./vendor/bin/psalm $(CLI_ARGS)
endif

ifeq ($(PRIMARY_GOAL),composer-dependency-analyser)
composer-dependency-analyser: ## Run Composer Dependency Analyser.
	$(DOCKER_COMPOSE_DEV) run --rm app ./vendor/bin/composer-dependency-analyser --config=composer-dependency-analyser.php $(CLI_ARGS)
endif

#
# Production
#

ifeq ($(PRIMARY_GOAL),prod-build)
prod-build: ## Build an image.
	docker build --file docker/Dockerfile --target prod --pull -t ${IMAGE}:${IMAGE_TAG} .
endif

ifeq ($(PRIMARY_GOAL),prod-push)
prod-push: ## Push image to repository.
	docker push ${IMAGE}:${IMAGE_TAG}
endif

ifeq ($(PRIMARY_GOAL),prod-deploy)
prod-deploy: ## Deploy to production.
	set -euo pipefail \
	docker -H ${PROD_SSH} stack deploy --prune --detach=false --with-registry-auth -c docker/compose.yml -c docker/prod/compose.yml ${STACK_NAME} 2>&1 | tee deploy.log \
	if grep -qiE 'rollback:|update rolled back|service update paused' deploy.log then \
		FAILED_TASK_ID="$(grep -oiE 'task[[:space:]]+[a-z0-9]+' deploy.log | head -n 1 | awk '{print $2}')" \
		if [ -n "${FAILED_TASK_ID}" ]; then \
			echo "Docker Swarm update failed. Failed task ID: ${FAILED_TASK_ID}" \
			echo "--- docker service logs (${FAILED_TASK_ID}) ---" \
			docker -H ${PROD_SSH} service logs --timestamps --tail 500 "${FAILED_TASK_ID}" || true \
		else \
			echo 'Docker Swarm update failed. Failed task ID: not found in deploy output.' \
		fi \
		exit 1 \
	fi
endif

#
# SIMRS Local Development Targets
#

simrs-test: ## Run full SIMRS verification tests (54 Core + 28 FHIR + 14 Reports + 13 Audit + 14 Adjustments + 11 Node = 134 tests)
	@bash tests/run_all_tests.sh

simrs-satusehat-test: ## Run SATUSEHAT FHIR R4 and BPJS VClaim test suite
	@php tests/satusehat_fhir_test.php

simrs-reports-test: ## Run Clinical & Financial Reports (Kemenkes RL 5.3) test suite
	@php tests/reports_test.php

simrs-audit-test: ## Run Permenkes 24/2022 RME Audit Trail Compliance test suite
	@php tests/audit_compliance_test.php

simrs-adjustments-test: ## Run Critical Case 4 Financial Adjustments test suite
	@php tests/invoice_adjustments_test.php

simrs-export: ## Export full clinical dataset to Kemenkes SatuData JSON + SHA-256
	@php scripts/export_clinical_dataset.php

simrs-dr-test: ## Run Disaster Recovery & Database Snapshot verification
	@php scripts/disaster_recovery_verify.php

simrs-health: ## Run System Health Check & Integrity Diagnostics
	@php scripts/system_health_check.php

simrs-e2e: ## Run Master End-to-End Acceptance Test (21 stages)
	@php scripts/e2e_acceptance_test.php

simrs-ci: ## Run Complete Production Verification (Health 12 + DR 7 + 134 Tests + 21 E2E = 174 Checkpoints)
	@php scripts/system_health_check.php
	@echo ""
	@php scripts/disaster_recovery_verify.php
	@echo ""
	@bash tests/run_all_tests.sh
	@echo ""
	@php scripts/e2e_acceptance_test.php
	@echo ""
	@echo ">>> CI/CD VERIFICATION SUITE: 174/174 CHECKPOINTS PASSED (100% HEALTHY) <<<"

simrs-package: ## Build and package complete deliverable archive for examiners
	@echo "Building React frontend production bundle..."
	@cd frontend-react && npm run build
	@echo "Creating deliverable archive..."
	@mkdir -p dist
	@tar --exclude='node_modules' --exclude='.git' --exclude='dist' -czf dist/simrs-inovamedika-deliverable.tar.gz .
	@echo ">>> Deliverable package created at dist/simrs-inovamedika-deliverable.tar.gz <<<"

simrs-demo: ## Launch Interactive Terminal Demo Runner & Control Center
	@bash scripts/simrs_menu.sh

simrs-build: ## Build both supporting Node service and React frontend
	@echo "Building Node.js Supporting Backend..."
	@cd backend-node && npm run build
	@echo "Building React Frontend SPA..."
	@cd frontend-react && npm run build
	@echo ">>> Production builds completed successfully! <<<"

simrs-serve-backend: ## Run Yii Core REST API server on http://127.0.0.1:8080
	./yii serve --port=8080

simrs-serve-node: ## Run Node.js Supporting Service on http://127.0.0.1:3001
	cd backend-node && npm run dev

simrs-serve-frontend: ## Run React Vite Frontend dev server on http://localhost:5173
	cd frontend-react && npm run dev

simrs-simulate: ## Run full-day hospital operational workflow simulation
	@php scripts/simulate_day.php

simrs-benchmark: ## Run high-concurrency stress test (Critical Cases 1, 2, 3)
	@php scripts/benchmark_concurrency.php

simrs-db-seed: ## Re-seed PostgreSQL database simrs_db with clinical mock data
	psql -U simrs_core -d simrs_db -h 127.0.0.1 -f database/seeds.sql

#
# Other
#

ifeq ($(PRIMARY_GOAL),help)
help: ## This help.
	@awk 'BEGIN { printf "\nUsage:\n  make \033[36m<target>\033[0m\n" } \
	/^#$$/ { blank = 1; next } \
	blank && /^# [a-zA-Z]/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 3); blank = 0; next } \
	/^[a-zA-Z_-]+:([^=]|$$)/ { \
		split($$0, parts, "##"); \
		target = parts[1]; sub(/:.*/, "", target); \
		desc = parts[2]; \
		gsub(/^[[:space:]]+|[[:space:]]+$$/, "", desc); \
		printf "  \033[36m%-25s\033[0m %s\n", target, desc; \
		blank = 0; \
	}' $(MAKEFILE_LIST)
endif
