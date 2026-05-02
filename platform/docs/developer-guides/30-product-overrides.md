# 30 — Product Overrides

Products customize the platform without forking it. Allowed override surfaces and their boundaries:

| Surface       | Where the product overrides                                 | Constraint                                                  |
|---------------|-------------------------------------------------------------|-------------------------------------------------------------|
| Theme         | `product.manifest.json:theme.overrides` and `products/{p}/theme/` | Must extend `@dos/theme/default`; never replace platform tokens. |
| Navigation    | `product.manifest.json:navigationComposition`               | Routes referenced must exist in `registries/route-registry.json`. |
| Routing       | `routeComposition.mountPoint` + `publicCompatPrefixes` + redirects | Public compat prefixes preserve existing production URLs.   |
| Dynamic UI    | `products/{p}/dynamic-ui/enrollment.json`                   | Only enrolls widgets exposed by enabled modules.            |
| Agents        | `products/{p}/agents/enrollment.json` + optional overrides  | Overrides cannot change a module-scoped agent's contract.   |
| Workflows     | `products/{p}/composition/workflows/enrollment.json`        | Same — selection, not redefinition.                         |
| i18n          | `product.manifest.json:i18n` + `products/{p}/i18n/`         | Locale codes must be in the `supportedLocales` set.         |
| Assets/Brand  | `products/{p}/assets/` + `products/{p}/theme/`              | No overlap with `platform/shared/theme`.                    |

## What Products MUST NOT Override

- Platform contracts (only the platform owns `platform/contracts/*`).
- Module contracts (only the module owns `modules/{m}/contracts/*`).
- Auth mode (always `cookie-session`).
- Routing kinds beyond `public`, `product-internal`, `platform-internal`, `api`, `redirect`.
