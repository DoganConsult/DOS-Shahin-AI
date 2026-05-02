# 04 — Dynamic UI & Agent Contracts

## 1. Ownership Model

| Concern                  | Owner    | Where                                                          |
|--------------------------|----------|----------------------------------------------------------------|
| Dynamic UI resolver      | Platform | `platform/` + `services/dynamic-ui-service`                    |
| Surface/widget contracts | Module   | `modules/{m}/contracts/dynamic-ui/`                            |
| Surface enrollment       | Product  | `products/{p}/dynamic-ui/enrollment.json`                      |
| Agent capability         | Module/Platform | `modules/{m}/contracts/agents/` or `platform/`           |
| Agent enrollment         | Product  | `products/{p}/agents/enrollment.json`                          |
| Workflow definitions     | Module/Platform | `modules/{m}/contracts/workflow/` or `platform/`         |
| Workflow enrollment      | Product  | `products/{p}/composition/workflows/enrollment.json`           |

The platform Dynamic UI resolver MUST be product-agnostic and module-agnostic. It only iterates contracts and the active product enrollment.

## 2. Schemas (validated)

- `platform/contracts/dynamic-ui/enrollment.schema.json`
- `platform/contracts/agents/enrollment.schema.json`
- (Workflow enrollment schema lives alongside, to be added in the next iteration.)

## 3. Enrollment Object Shape

### Dynamic UI
```json
{
  "schemaVersion": 1,
  "productCode": "shahin-ai",
  "surfaces": [
    {
      "surfaceId": "workspace-home",
      "slots": [
        { "slotId": "primary", "widgets": [
          { "moduleCode": "foundation", "widgetId": "overview-summary" }
        ]}
      ]
    }
  ]
}
```

### Agents
```json
{
  "schemaVersion": 1,
  "productCode": "shahin-ai",
  "agents": [
    { "agentId": "onboarding-agent", "scope": "product" },
    { "agentId": "evidence-agent",   "scope": "module", "moduleCode": "evidence" }
  ]
}
```

## 4. Boundary Rules

1. No Foundation-specific logic inside the Dynamic UI resolver.
2. No Shahin-AI-specific logic inside the Dynamic UI resolver.
3. Modules expose contracts only; they MUST NOT depend on a specific enrollment.
4. Products enroll only modules listed in their manifest's `enabledModules[]`.

## 5. Extending

To add a new widget: declare it in the module's `contracts/dynamic-ui/`, then enroll it on a slot of a surface in the product's `dynamic-ui/enrollment.json`. To add a new agent: declare its capabilities under the module (or platform, if cross-cutting), then enroll it in the product's `agents/enrollment.json`.
