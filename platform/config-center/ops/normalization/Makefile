.PHONY: help catalog drift plans fk-plan fk-emit fk-validate jsonb-plan jsonb-sample counter-plan tracker tracker-dry backfill rollout rollout-dry tenants-list tenants-status tenants-failed lint drift-baseline drift-check audit no-pk-plan redundant-tid-plan slow-migrations grade normalize nf1-plan nf3-plan dknf-plan all clean install-hooks

REPO_ROOT := $(shell git -C $(CURDIR) rev-parse --show-toplevel)
TSX       := npx --prefix $(REPO_ROOT) tsx
SCRIPTS   := $(REPO_ROOT)/ops/normalization/scripts

help:
	@echo "DB normalization pipeline targets:"
	@echo ""
	@echo " ─ analysis (read-only) ─"
	@echo "  make catalog          — scan migrations -> ops/normalization/catalog.yml"
	@echo "  make drift            — snapshot every tenant schema, build drift matrix"
	@echo "  make lint             — migration policy linter (M001..M005)"
	@echo "  make drift-check      — fail if smell counts regress vs baseline"
	@echo "  make drift-baseline   — accept current catalog as the new baseline"
	@echo ""
	@echo " ─ planning (read-only; produces decision matrices) ─"
	@echo "  make fk-plan          — propose FK rebuilds"
	@echo "  make jsonb-plan       — JSONB decomposition decisions"
	@echo "  make jsonb-sample SCHEMA=tenant_acme — JSONB plan + live sampling"
	@echo "  make counter-plan     — denormalized counter cleanup decisions"
	@echo "  make plans            — all three planners"
	@echo ""
	@echo " ─ emission ─"
	@echo "  make fk-emit          — auto-emit HIGH-confidence FK migrations into ops/migrations/tenant/"
	@echo ""
	@echo " ─ rollout (writes) ─"
	@echo "  make tracker          — apply dos.tenant_migrations + backfill all tenants"
	@echo "  make tracker-dry      — preview the tracker rollout without writing"
	@echo "  make rollout MIG=path/to.sql                — dry-run a fan-out"
	@echo "  make rollout MIG=path/to.sql APPLY=1         — actually apply across all tenants"
	@echo "  make fk-validate SCHEMA=tenant_acme [APPLY=1] — VALIDATE the NOT VALID FKs"
	@echo ""
	@echo " ─ tenant ops ─"
	@echo "  make tenants-list     — every tenant_<id> schema with table count"
	@echo "  make tenants-status   — dos.tenant_migrations rollup"
	@echo "  make tenants-failed   — list every failed migration"
	@echo ""
	@echo " ─ 6-grade normalization framework ─"
	@echo "  make grade            — score every table 1NF/2NF/3NF/BCNF/4NF/DKNF"
	@echo "  make nf1-plan         — emit 1NF fix decisions (atomic-value violations)"
	@echo "  make nf3-plan         — emit 3NF fix decisions (transitive id+name pairs)"
	@echo "  make dknf-plan        — emit DKNF fix decisions (CHECK→ENUM scaffolds)"
	@echo "  make normalize        — catalog + grade + all per-form planners"
	@echo ""
	@echo "  make all              — catalog + drift + plans + grade (read-only)"
	@echo "  make clean            — remove generated snapshots/proposals"

catalog:
	cd $(REPO_ROOT) && $(TSX) $(SCRIPTS)/catalog-build.ts

drift:
	cd $(REPO_ROOT) && $(TSX) $(SCRIPTS)/drift-detect.ts --include-public

fk-plan:
	cd $(REPO_ROOT) && $(TSX) $(SCRIPTS)/fk-rebuild-generate.ts

jsonb-plan:
	cd $(REPO_ROOT) && $(TSX) $(SCRIPTS)/jsonb-decompose-plan.ts

jsonb-sample:
	@if [ -z "$(SCHEMA)" ]; then echo "SCHEMA=tenant_<id> required"; exit 2; fi
	cd $(REPO_ROOT) && $(TSX) $(SCRIPTS)/jsonb-decompose-plan.ts --sample $(SCHEMA) --limit 200

counter-plan:
	cd $(REPO_ROOT) && $(TSX) $(SCRIPTS)/counter-cleanup-plan.ts

plans: fk-plan jsonb-plan counter-plan

tracker:
	cd $(REPO_ROOT) && $(TSX) $(SCRIPTS)/apply-tracker.ts

tracker-dry:
	cd $(REPO_ROOT) && $(TSX) $(SCRIPTS)/apply-tracker.ts --dry-run

backfill:
	cd $(REPO_ROOT) && $(TSX) $(SCRIPTS)/apply-tracker.ts --backfill-only

fk-emit:
	cd $(REPO_ROOT) && $(TSX) $(SCRIPTS)/fk-rebuild-emit.ts

fk-validate:
	@if [ -z "$(SCHEMA)" ]; then echo "SCHEMA=tenant_<id> required"; exit 2; fi
	cd $(REPO_ROOT) && $(TSX) $(SCRIPTS)/fk-validate.ts --schema $(SCHEMA) $(if $(APPLY),--apply,)

rollout:
	@if [ -z "$(MIG)" ]; then echo "MIG=path/to/migration.sql required"; exit 2; fi
	cd $(REPO_ROOT) && $(TSX) $(SCRIPTS)/rollout.ts --migration $(MIG) $(if $(APPLY),--apply,)

rollout-dry:
	@if [ -z "$(MIG)" ]; then echo "MIG=path/to/migration.sql required"; exit 2; fi
	cd $(REPO_ROOT) && $(TSX) $(SCRIPTS)/rollout.ts --migration $(MIG)

tenants-list:
	cd $(REPO_ROOT) && $(TSX) $(SCRIPTS)/tenants.ts list

tenants-status:
	cd $(REPO_ROOT) && $(TSX) $(SCRIPTS)/tenants.ts status

tenants-failed:
	cd $(REPO_ROOT) && $(TSX) $(SCRIPTS)/tenants.ts list-failed

lint:
	cd $(REPO_ROOT) && $(TSX) $(SCRIPTS)/lint-migrations.ts

drift-check:
	cd $(REPO_ROOT) && $(TSX) $(SCRIPTS)/drift-ci.ts

drift-baseline:
	cd $(REPO_ROOT) && $(TSX) $(SCRIPTS)/drift-ci.ts --update

audit:
	cd $(REPO_ROOT) && $(TSX) $(SCRIPTS)/audit.ts

no-pk-plan:
	cd $(REPO_ROOT) && $(TSX) $(SCRIPTS)/no-pk-plan.ts

redundant-tid-plan:
	cd $(REPO_ROOT) && $(TSX) $(SCRIPTS)/redundant-tenant-id-plan.ts

slow-migrations:
	cd $(REPO_ROOT) && $(TSX) $(SCRIPTS)/slow-migrations.ts

install-hooks:
	@ln -sf ../../ops/normalization/hooks/pre-commit-sql-lint.sh $(REPO_ROOT)/.git/hooks/pre-commit
	@chmod +x $(REPO_ROOT)/.git/hooks/pre-commit
	@echo "installed: $(REPO_ROOT)/.git/hooks/pre-commit"

# ─── 6-grade normalization framework ───
grade:
	cd $(REPO_ROOT) && $(TSX) $(SCRIPTS)/normalize-grade.ts

nf1-plan:
	cd $(REPO_ROOT) && $(TSX) $(SCRIPTS)/nf1-fix-plan.ts

nf3-plan:
	cd $(REPO_ROOT) && $(TSX) $(SCRIPTS)/nf3-fix-plan.ts

dknf-plan:
	cd $(REPO_ROOT) && $(TSX) $(SCRIPTS)/dknf-fix-plan.ts

normalize: catalog grade nf1-plan nf3-plan dknf-plan
	@echo ""
	@echo "═══ normalization pass complete ═══"
	@echo "Scorecard: ops/normalization/normalization-scorecard.md"
	@echo "1NF plan:  ops/normalization/proposals/nf1/decisions.md"
	@echo "3NF plan:  ops/normalization/proposals/nf3/decisions.md"
	@echo "DKNF plan: ops/normalization/proposals/dknf/decisions.md"

# ─── per-module scoping (post-reorg) ───
module-report:
	@if [ -z "$(MODULE)" ]; then echo "MODULE=<name> required"; exit 2; fi
	cd $(REPO_ROOT) && MODULE=$(MODULE) $(TSX) $(SCRIPTS)/module-report.ts

ownership-check:
	cd $(REPO_ROOT) && $(TSX) $(SCRIPTS)/ownership-check.ts

# Emit / refresh per-module ownership manifests (Phase C/D output).
manifests:
	cd $(REPO_ROOT) && $(TSX) $(SCRIPTS)/emit-manifests.ts

all: catalog drift plans audit no-pk-plan redundant-tid-plan grade

clean:
	rm -rf $(REPO_ROOT)/ops/normalization/snapshots $(REPO_ROOT)/ops/normalization/proposals
