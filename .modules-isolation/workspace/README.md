# DOS-AIO Modules — Standalone Preview Workspace

This is a self-contained mirror of the live `modules/` tree, plus shim packages
that replace the 4 external `@dos/*` dependencies the live tree pulls from
`platform/`. Built by Stage 3 of the modules-isolation refactor.

- `modules/`      — copy of `<repo>/modules` minus build artifacts.
- `vendor-shims/` — `@dos/dauth-shared`, `@dos/ui-system`, `@dos/ai-gateway`, `@dos/auth`.
- `package.json`  — root scripts.
- `pnpm-workspace.yaml` — workspace declarations.
- `.dependency-cruiser.cjs` — boundary rules.

## Use

```
cd .modules-isolation/workspace
pnpm install
pnpm build
pnpm verify:imports
```

If anything fails it fails HERE; the live `<repo>/modules/` and
`<repo>/platform/` trees are untouched.

## Important caveats

1. The shims are **type-only / no-op runtime**. Module CODE that depends on real
   auth/ui-system/ai-gateway behavior won't work end-to-end here — the goal of this
   workspace is to verify the *boundary*, not to replace the platform.
2. Reverse dependencies (platform → modules) are out of scope here; see
   `audit/STAGE2_PLAN.md`.
3. The `modules/modules/` and `modules/packages/modules/` nested trees are
   preserved as-is. See `audit/AUDIT_REPORT.md` §5 for cleanup.
