# 03 — Module Enrollment

Modules are extractable, self-contained, plug-and-play units. Products do **not** import a module's internals — they enroll the module through contracts.

## 1. Module Layout

```
modules/{module-code}/
├── module.manifest.json
├── contracts/
│   ├── dynamic-ui/      # Widget surface contracts
│   ├── agents/          # Agent capability contracts
│   └── workflow/        # Workflow contracts
├── src/                 # Implementation (private)
└── tests/
```

`module.manifest.json` is validated by `platform/contracts/module/module.manifest.schema.json`. Required keys: `schemaVersion`, `moduleCode`, `displayName`, `version`, `extractable: true`, `selfContained: true`, `contracts`, `platformDependencies`.

## 2. Enrollment Surfaces

A product enrolls a module on three independent surfaces:

| Surface     | Product file                                            | Module file                                             |
|-------------|---------------------------------------------------------|---------------------------------------------------------|
| Dynamic UI  | `products/{p}/dynamic-ui/enrollment.json`               | `modules/{m}/contracts/dynamic-ui/`                     |
| Agents      | `products/{p}/agents/enrollment.json`                   | `modules/{m}/contracts/agents/`                         |
| Workflow    | `products/{p}/composition/workflows/enrollment.json`    | `modules/{m}/contracts/workflow/`                       |

Enrollment is the **only** way for a product to consume a module.

## 3. Rules

1. The module's `moduleCode` MUST equal its folder name (Gate I check 7).
2. A module MUST NOT import from any product (Gate I check 12).
3. The platform's Dynamic UI resolver MUST NOT contain Foundation- or Shahin-specific logic (it iterates contracts; product enrollment selects which surfaces/widgets are mounted).
4. To extract a module to another product, copy the `modules/{m}/` directory and add a corresponding entry in the new product's `enabledModules[]` plus enrollment files.

## 4. Versioning

`enabledModules[].version` in the product manifest pins the module SemVer. The module manifest's `version` is the source of truth. Mismatches must be caught by `validate:manifests` in Gate J.
