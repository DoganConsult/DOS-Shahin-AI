# Shahin-AI Workspace Module Consolidation

This folder is the consolidated Shahin-AI module spec workspace rooted in `modules/`.

## Folder layout

- `specs/_source/module_complete_direct_seed_pack`
  - Source copy of the primary module seed pack from `platform/ui-system`.
- `specs/_source/module_ui_os_contract-pack`
  - Source copy of the contract-pack comparison set.
- `specs/business`
  - Final business-sidebar modules organized in exact requested group/order.
- `specs/admin-platform`
  - Technical/admin modules that must not appear in business sidebar.

## Enforced navigation policy

- Business sidebar uses grouped navigation only (no flat all-modules list).
- Current active modules in production: `foundation`, `risk`.
- All other business modules remain hidden/disabled until gates pass.
- Admin-only modules: `config-center`, `dynamic-ui`, `workspace-shell`, `mcp`, `notification`, `onboarding`.

## Contract files

- `NAVIGATION_GROUPS.md` defines exact group names, module order, and labels.
- `MODULE_REGISTRATION_MATRIX.md` defines visibility state and activation gates per module.
