# دستور التحويل المعماري وتشغيل الـ Agents
## Shahin / DOS Extraction Constitution
### الإصدار: 1.0
### الحالة: Canonical / Single Source of Truth
### اللغة المرجعية: العربية

---

## 0) الغرض من هذه الوثيقة

هذه الوثيقة هي **الدستور التشغيلي والمعماري الوحيد** الذي يجب أن يقرأه أي Agent أو Subagent قبل لمس الكود.

هدفها أن تجعل عدة Agents يعملون على نفس الكودبِيس الضخم **بدون تنسيق بشري مباشر**، وبدون انحراف في الاتجاه، وبدون تكرار أو تداخل غير ضروري، وأن يصلوا جميعًا إلى **نفس الهدف النهائي** حتى لو لم يعرف بعضهم بعضًا.

هذه الوثيقة ليست شرحًا عامًا، بل هي:
- مواصفة معمارية ملزمة
- قواعد ملكية ونطاقات عمل
- قواعد منع التداخل
- ترتيب التنفيذ
- تعريف الهدف النهائي
- تعريف ما هو مسموح وما هو ممنوع
- تعريف معايير القبول والنجاح
- تعريف كيفية تقسيم العمل بين 4 Agents مستقلين

أي تعليمات أو اجتهادات أو اقتراحات تخالف هذه الوثيقة تعتبر **باطلة**.

---

## 1) الهدف النهائي

الهدف النهائي هو تحويل الكودبِيس من Monolith / Monorepo مترابط بعمق عبر Relative Imports ومسارات داخلية متشابكة إلى بنية صحية قابلة للاستخراج، مبنية على Packages مستقلة وواضحة الملكية، بالشكل التالي:

```text
packages/
├── dos-types/                 # @dos/types
├── dos-contracts/             # @dos/contracts
├── dos-platform-core/         # @dos/platform-core
├── dos-auth/                  # @dos/auth
├── dos-db/                    # @dos/db
├── dos-module-sdk/            # @dos/module-sdk
└── shahin-product/            # @shahin/product
```

والنتيجة المطلوبة ليست فقط أن “الكود يشتغل”، بل أن يصبح النظام:
- قابلًا للاستخراج غدًا
- قابلًا للتشغيل بدون Shahin product
- قابلًا لبناء Modules مستقلة
- قابلًا لإصدار APIs وSDK بعقود واضحة
- محميًا ضد الرجوع إلى التشابك القديم

---

## 2) تعريف المشكلة الحالية

الوضع الحالي يتسم بالآتي:
- كثافة عالية جدًا من الاستيراد عبر مسارات نسبية عميقة
- اعتماديات مركزية Cross-cutting موزعة داخل الشجرة الأصلية
- اختلاط بين Platform Core وProduct Logic وDatabase Utilities وSettings
- Modules تعتمد على بنية الملفات الداخلية بدل Public Packages
- صعوبة استخراج أي Capability كحزمة مستقلة
- احتمالية وجود Circular Dependencies وBootstrap Coupling وConfig Drift

المشكلة الأساسية ليست فقط في عدد الملفات أو عدد الـ LOC، بل في **ملكية الحدود** و**صحة الطبقات** و**نظافة تشغيل النظام بعد الفصل**.

---

## 3) الحالة المستهدفة المعمارية

### 3.1 الطبقات المستهدفة

#### Tier 1 — `@dos/types`
طبقة Pure Types فقط، بلا Runtime Dependencies.

تشمل:
- db row types
- express types
- module manifest types
- error types (type-only)
- shared compliance/risk/workflow types

#### Tier 2 — `@dos/contracts`
طبقة العقود Contracts.

تشمل:
- API contracts
- event contracts
- module contracts
- shared manifest / interaction contracts

#### Tier 3a — `@dos/platform-core`
طبقة DOS reusable runtime.

تشمل:
- events
- lifecycle
- module registry
- observability
- HTTP guards / middleware / rate limiting
- provisioning
- jobs
- resilience

#### Tier 3b — `@dos/auth`
طبقة DAuth المستقلة.

تشمل:
- identity
- sessions
- access resolution
- scopes
- authority
- delegation
- SoD
- auth middleware

#### Tier 3c — `@dos/db`
طبقة Data Access مستقلة.

تشمل:
- safeQuery
- tenantSchema
- transaction helpers
- row mappers
- db connection and tenant-aware access

> قاعدة إلزامية: DB Utilities ليست جزءًا أصيلًا من SDK. الـ SDK قد يعيد تصديرها فقط.

#### Tier 4 — `@dos/module-sdk`
Facade layer للمطورين.

تعيد تصدير ما يحتاجه مطور الموديول من:
- auth
- db
- events
- lifecycle
- logger
- errors
- audit
- http
- types
- contracts
- manifest helpers
- testing helpers

> قاعدة إلزامية: الـ SDK يجب أن يبقى Thin Facade، وليس God Package.

#### Tier 5 — `@shahin/product`
طبقة المنتج Shahin فقط.

تشمل:
- Shahin agent tools
- product manifest
- product event subscribers
- product rules bridges
- product middleware
- product registration hooks

---

## 4) القواعد المعمارية غير القابلة للتفاوض

هذه القواعد مطلقة وملزمة:

### R1 — Platform must be neutral
أي شيء داخل:
- `@dos/platform-core`
- `@dos/auth`
- `@dos/db`
- `@dos/types`
- `@dos/contracts`
- `@dos/module-sdk`

يجب ألا يحتوي أي افتراضات Shahin-specific hardcoded.

### R2 — Product depends on platform, never the reverse
`@shahin/product` يجوز له الاعتماد على DOS packages.
لكن DOS packages ممنوع تعتمد على `@shahin/product`.

### R3 — Composition root only
تفعيل المنتج Product Activation يتم فقط من Composition Root.
ممنوع على Platform Runtime أن يستورد Product Files مباشرة.

### R4 — No new deep relative imports
ممنوع إدخال أي Relative Import جديد يعبر حدود الـ Package أو يعيد النمط القديم.

### R5 — SDK is facade, not storage for random utilities
أي شيء Runtime-heavy أو Core Capability يجب أن يعيش في Package مالك واضح.
الـ SDK يعرضه فقط إذا لزم.

### R6 — DB is first-class boundary
كل ما يخص الوصول إلى البيانات والـ tenant-aware data access يجب أن يملك طبقة مستقلة واضحة.

### R7 — Settings/config ownership must be explicit
يجب الفصل بوضوح بين:
- Environment config
- Deployment config
- Tenant/workspace config
- Product config
- Module config

### R8 — Platform must boot without Shahin
يجب أن يكون تشغيل Platform بدون Product registered سلوكًا صحيحًا ومدعومًا.

### R9 — Contracts and types are canonical
أي Contract أو Type public يجب أن يعيش في Packageه الصحيح، وليس منسوخًا محليًا.

### R10 — Every file has an owner package
لا يوجد “Shared” مبهم بلا Owner.
أي ملف يجب أن يعرف إلى أي طبقة ينتمي.

---

## 5) خريطة الملكية الرسمية

### 5.1 مالك كل Package

| Package | المالك المنطقي | الغرض |
|---|---|---|
| `@dos/types` | Foundation | Pure types only |
| `@dos/contracts` | Foundation | API/Event/Manifest contracts |
| `@dos/platform-core` | Platform | DOS runtime |
| `@dos/auth` | Platform Security | Identity/access/authorization |
| `@dos/db` | Data Platform | Tenant-aware DB access |
| `@dos/module-sdk` | Developer Experience | Thin facade for module authors |
| `@shahin/product` | Product | Shahin-specific behavior |

### 5.2 قاعدة الاعتماديات المسموح بها

#### مسموح:
- `@dos/contracts` → `@dos/types`
- `@dos/platform-core` → `@dos/types`, `@dos/contracts`
- `@dos/auth` → `@dos/types`, `@dos/contracts`
- `@dos/db` → `@dos/types`, `@dos/contracts`
- `@dos/module-sdk` → `@dos/types`, `@dos/contracts`, `@dos/platform-core`, `@dos/auth`, `@dos/db`
- `@shahin/product` → كل ما سبق حسب الحاجة
- modules → إما `@dos/*` مباشرة أو `@dos/module-sdk`

#### ممنوع:
- `@dos/types` → أي Runtime Package
- `@dos/contracts` → `@shahin/product`
- `@dos/platform-core` → `@shahin/product`
- `@dos/auth` → `@shahin/product`
- `@dos/db` → `@shahin/product`
- أي module → relative import إلى أعماق platform tree القديمة بعد التحويل

---

## 6) تعريف الـ Single Source of Truth

هذه الوثيقة هي المصدر الأعلى.

داخل الكودبِيس يجب إنشاء المجلد التالي:

```text
/migration/
  CONSTITUTION.md
```

ويجب أن تكون هذه الوثيقة نفسها هي الملف المرجعي هناك.

أي Agent يبدأ من هذه الخطوات فقط:
1. يقرأ `/migration/CONSTITUTION.md`
2. يحدد هويته حسب القسم الخاص بالـ Agent Assignment
3. يلتزم فقط بحدود الملكية المحددة له
4. لا يجتهد خارج الدستور

---

## 7) نموذج التشغيل بدون تنسيق خارجي

### 7.1 المبدأ
الـ Agents لا يحتاجون للتواصل فيما بينهم إذا التزموا بـ:
- حدود ملكية حتمية deterministic
- قواعد تعديل الملفات
- ترتيب داخلي ثابت
- تنسيق واحد للمخرجات

### 7.2 كيف نمنع التداخل
نعتمد على ثلاثة مستويات منع تداخل:

#### المستوى 1 — Ownership by scope
كل Agent له نطاق ملفات واضح وممنوع تجاوزه.

#### المستوى 2 — Control plane isolation
الملفات المركزية المشتركة لا يلمسها إلا Agent واحد محدد.

#### المستوى 3 — Deterministic module partition
الموديولات يتم تقسيمها بحساب حتمي ثابت حتى لا يعمل Agentان على نفس Module.

---

## 8) تقسيم العمل الرسمي على 4 Agents

> هذا التقسيم إلزامي.
> أي Agent لا يختار بحرية ما يحب، بل يعمل فقط في مساره المحدد.

### Agent A — Control Plane / Foundation Agent

#### الدور
يبني أرضية التحويل ويملك الملفات المركزية المشتركة.

#### يملك فقط:
- `packages/dos-types/**`
- `packages/dos-contracts/**`
- `packages/dos-module-sdk/**` (skeleton + facade only)
- root workspace config files
- tsconfig path aliases
- package manager workspace manifests
- dep graph / boundary rules
- codemod scripts
- migration docs and guard rails
- shared `_shared` types/contracts only if type/contract-related

#### مسموح له تعديل:
- `tsconfig*.json`
- `package.json` في الجذر وما يخص workspace
- `pnpm-workspace.yaml` أو ما يعادله
- `packages/dos-types/**`
- `packages/dos-contracts/**`
- `packages/dos-module-sdk/**`
- `scripts/codemods/**`
- `migration/**`
- tooling / CI files الخاصة بمنع forbidden edges

#### ممنوع عليه:
- تعديل business logic داخل modules
- تعديل product logic
- نقل platform runtime business logic الثقيلة
- تعديل ملفات `products/**` إلا لو كانت docs فقط

#### مسؤوليته الأساسية:
- إنشاء الواجهات package skeletons
- تثبيت aliases الرسمية
- وضع guard rails لمنع regression
- توحيد exports العامة للـ types/contracts/sdk

---

### Agent B — Core Runtime Agent

#### الدور
يستخرج ويثبت الطبقات التشغيلية العامة.

#### يملك فقط:
- `packages/dos-platform-core/**`
- `packages/dos-auth/**`
- `packages/dos-db/**`
- source runtime files التي سيتم نقلها من platform/auth/db القديمة
- provisioning/bootstrap/config ownership cleanup داخل حدود platform runtime فقط

#### مسموح له تعديل:
- platform runtime source files
- auth source files
- db access files
- internal exports الخاصة بهذه الحزم
- runtime-specific tests الخاصة بهذه الحزم

#### ممنوع عليه:
- تعديل modules business logic
- تعديل Shahin product logic إلا لو لإزالة dependency من platform
- تعديل root workspace configs إلا إذا النص سمح بذلك صراحة وكان متعلقًا فقط بربط package runtime

#### مسؤوليته الأساسية:
- استخراج `@dos/platform-core`
- استخراج `@dos/auth`
- استخراج `@dos/db`
- ضمان أن platform runtime لا يعرف Shahin مباشرة
- جعل bootstrap قابلًا للتشغيل بدون product

---

### Agent C — Module Migration Agent (Bucket A–M)

#### الدور
يهاجر الموديولات الواقعة في bucket الحرفي A–M إلى البنية الجديدة.

#### قاعدة التحديد
اسم الموديول normalized lowercase.
إذا كان أول حرف من اسم الموديول بين `a` و `m` فهو ملك Agent C.

#### أمثلة
- `audit` → C
- `compliance` → C
- `evidence` → C
- `governance` → C
- `incident` → C إذا كان ضمن A–M بعد normalization لا؛ incident = i → C

#### يملك فقط:
- `modules/<name>/**` للموديولات الواقعة في A–M
- tests الخاصة بهذه الموديولات
- imports الداخلية الخاصة بها

#### مسموح له:
- استبدال imports القديمة بـ package imports
- إصلاح local compile breaks داخل موديوله
- إضافة/تحديث local barrels داخل موديوله
- تعديل tests الخاصة بموديوله فقط

#### ممنوع عليه:
- تعديل modules خارج bucketه
- تعديل root config files
- تعديل platform core package internals
- تعديل Shahin product package إلا إذا كان الموديول ملكه وكان التعديل داخل نطاقه فقط

---

### Agent D — Module Migration + Product Agent (Bucket N–Z + `products/**`)

#### الدور
يهاجر الموديولات الواقعة في bucket الحرفي N–Z، ويملك كذلك product extraction scope.

#### قاعدة التحديد
اسم الموديول normalized lowercase.
إذا كان أول حرف من اسم الموديول بين `n` و `z` فهو ملك Agent D.

#### يملك فقط:
- `modules/<name>/**` للموديولات N–Z
- `products/**`
- `packages/shahin-product/**`
- product registration hooks
- tests الخاصة بالمنتج أو الموديولات ضمن bucketه

#### مسموح له:
- formalize `@shahin/product`
- نقل product-owned files
- استبدال imports القديمة داخل bucketه
- ربط product عبر registration boundaries

#### ممنوع عليه:
- تعديل platform core internals إلا عند إزالة coupling مباشرة وبالحد الأدنى
- تعديل modules خارج bucketه
- تعديل root control-plane files

---

## 9) قاعدة تقسيم الموديولات الحتمية

### 9.1 normalization
اسم الموديول يحسب هكذا:
- lowercase
- remove leading underscores
- use first alphabetic character

### 9.2 bucket ownership
- `a` إلى `m` → Agent C
- `n` إلى `z` → Agent D
- `_shared` → Agent A فقط إذا كان Type/Contract/Manifest-oriented
- أي shared runtime util product-specific لا يذهب لـ Agent A بل يعاد تصنيفه حسب المالك الحقيقي

### 9.3 قاعدة النزاع
إذا وجد ملف خارج مجلد module لكن يخص module بعينه:
- إذا كان product-owned → D
- إذا كان contract/type only → A
- إذا كان runtime platform capability → B
- إذا كان غير واضح الملكية → لا يُعدل مباشرة، ويكتب له Reclassification Note داخل `/migration/reclassifications/`

---

## 10) تعريف ما يجوز تعديله وما لا يجوز

### 10.1 المسموح
- نقل الملفات إلى Packages الجديدة
- إعادة توجيه imports إلى aliases/packages الجديدة
- إضافة barrels واضحة
- فصل العقود والأنواع
- فصل platform عن product
- إصلاح compile/test breaks الناتجة مباشرة عن التحويل
- إضافة أو تحديث tests structural/boundary
- إضافة CI guards لمنع forbidden edges

### 10.2 الممنوع
- redesign غير مطلوب
- feature expansion
- تغيير business behavior إلا إذا كان ضروريًا لإزالة coupling أو لإصلاح كسر مباشر
- إعادة تسمية domain concepts بلا داعٍ
- إدخال patterns جديدة غير منصوص عليها هنا
- mixing بين platform وproduct “مؤقتًا” بدون owner واضح
- broad cleanup unrelated to extraction
- touch-everything refactors

---

## 11) الترتيب الرسمي للتنفيذ

هذا هو الترتيب المعماري الإلزامي، حتى لو كانت بعض الأعمال تتم بالتوازي.

### Phase 0 — Boundary Freeze
يجب تثبيت القواعد التالية أولًا:
- لا platform package يعتمد على product
- لا relative imports جديدة تعبر الحدود
- dep-graph CI guard حاضر
- ownership واضح لكل package

### Phase 1 — Foundation
- `@dos/types`
- `@dos/contracts`
- aliases
- codemod foundations
- public exports الأولية

### Phase 2 — Runtime Ownership Cleanup
- `@dos/db`
- config/tenant/workspace separation
- bootstrap cleanup
- product registration boundaries

### Phase 3 — Core Runtime Extraction
- `@dos/platform-core`
- `@dos/auth`
- runtime exports

### Phase 4 — Incremental Module Migration
- modules A–M → Agent C
- modules N–Z → Agent D
- local fixes only within ownership

### Phase 5 — SDK Stabilization
- `@dos/module-sdk` يصبح thin facade حقيقي
- re-export فقط لما هو معتمد ومستقر

### Phase 6 — Product Extraction Finalization
- `@shahin/product`
- platform boot without product
- product self-registration

### Phase 7 — Validation
- package builds
- repo-wide tests
- boundary checks
- empty-product boot test
- isolated module build test

---

## 12) معايير التصميم لكل Package

### 12.1 معايير `@dos/types`
- ممنوع runtime logic
- لا imports من platform/auth/db/product
- type-only exports
- naming stable and domain-relevant

### 12.2 معايير `@dos/contracts`
- contracts versionable
- imports فقط من `@dos/types`
- no runtime state
- public API/event surfaces واضحة

### 12.3 معايير `@dos/platform-core`
- neutral reusable runtime
- no Shahin assumptions
- no product catalogs hardcoded
- lifecycle/event/module registry/observability/HTTP/provisioning only

### 12.4 معايير `@dos/auth`
- identity/authz/scopes/authority/delegation/SoD only
- reusable across products
- no module-specific policy hardcoded unless generic

### 12.5 معايير `@dos/db`
- all data access abstractions هنا
- tenant-aware behavior explicit
- no product-owned queries hardcoded here
- no SDK-only convenience leakage

### 12.6 معايير `@dos/module-sdk`
- facade رفيع
- no hidden business logic
- no duplication of implementation
- mostly re-exports + light helpers + testing utilities

### 12.7 معايير `@shahin/product`
- كل Shahin-specific behavior هنا
- product registration hooks واضحة
- no platform pollution
- no reuse claims unless actually generic

---

## 13) معايير Naming وImport Hygiene

### 13.1 naming
- package names canonical exactly as defined هنا
- exports أسماء واضحة وغير مرتبطة بمسارات قديمة
- لا names مثل `SharedUtil` بدون سياق
- لا names product-specific داخل platform runtime

### 13.2 imports
- ممنوع `../../../platform/...` بعد التحويل داخل scopes المهاجرة
- ممنوع relative imports العابرة للحدود package-wise
- يفضل import من public barrel للحزمة
- imports يجب أن تعكس الملكية الجديدة لا الملكية القديمة

### 13.3 barrels
- allowed when they define public surface consciously
- forbidden when they hide circular dependencies أو يعيدون تصدير كل شيء بلا قصد

---

## 14) قواعد Config / Settings / Bootstrap

هذه من أهم المناطق وأكثرها خطورة.

### 14.1 يجب الفصل بين:

#### Environment Config
أسرار، hostnames، provider keys، storage roots، base URLs.

#### Deployment Config
- cloud vs on-prem
- shared DB vs separate DB
- queue/cache mode
- offline/air-gapped flags

#### Tenant / Workspace Config
- enabled modules
- feature toggles
- AI providers/models allowed
- onboarding mode
- tenant-specific overrides

#### Product Config
- Shahin enabled or not
- Shahin defaults
- product onboarding presets
- product catalogs

### 14.2 قواعد إلزامية
- platform config must not hardcode Shahin defaults unless through registration hook
- workspace settings ليست catch-all لأي شيء غير مصنف
- tenant bootstrap يجب أن يعمل بدون product-specific assumptions
- me/bootstrap resolution يجب أن يميز بين platform capabilities وproduct activation

---

## 15) قواعد Product Registration

### 15.1 canonical rule
Platform code may call product registration interfaces.
Product code may register assets.
لكن Platform code must never import product seed files directly except at composition root.

### 15.2 المقبول
- composition root imports `@shahin/product/register`
- platform asks registrars for assets/hooks/config

### 15.3 غير المقبول
- `platform-core` يستورد Shahin agent catalogs أو prompts أو workflows مباشرة
- bootstrap service يعرف A01/A02/... أو product data hardcoded

---

## 16) قواعد التعامل مع Shared Code الغامض

إذا وجد Agent ملفًا أو مجلدًا “Shared” أو util غامض الملكية، فعليه أن يصنفه حسب القاعدة التالية:

### إذا كان:
- pure type → A / `@dos/types`
- contract/interface → A / `@dos/contracts`
- platform reusable runtime → B / `@dos/platform-core`
- auth capability → B / `@dos/auth`
- db access / tenant db → B / `@dos/db`
- Shahin-specific logic → D / `@shahin/product`
- module-local behavior → owner module agent (C أو D)

إذا تعذر الحسم، لا يتم التعديل مباشرة، بل يكتب Note في:

```text
/migration/reclassifications/<path-safe-name>.md
```

بصيغة:
- file path
- current role
- suspected owner
- why ambiguous
- safest temporary handling

---

## 17) قواعد الـ Codemod

### 17.1 codemod allowed for:
- relative imports → package imports
- type import normalization
- path alias rewrite
- public barrel migration

### 17.2 codemod forbidden for:
- rewriting semantics
- mass renaming domain concepts بلا mapping واضح
- changing runtime logic opportunistically

### 17.3 codemod safety
أي codemod يجب أن يكون:
- deterministic
- replayable
- narrow-scoped
- documented under `/scripts/codemods/`

---

## 18) قواعد الاختبارات والقبول

### 18.1 لا تعتبر المهمة منتهية إذا:
- الكود compile فقط
- imports تحسنت شكليًا فقط
- package موجود لكن ما زالت runtime assumptions مكسورة

### 18.2 المهمة تعتبر مقبولة فقط إذا تحققت معايير القبول التالية

#### لكل Package:
- owner واضح
- exports واضحة
- dependencies مسموح بها فقط
- لا forbidden edges
- build pass

#### للمنصة:
- platform boots without product
- product registration works through boundary
- no direct product import in platform runtime

#### للموديولات:
- module builds using new package imports
- no deep relative imports القديمة داخل الموديولات المهاجرة
- tests للموديول تمر أو تُحدَّث بسبب التحويل فقط

#### للمستودع:
- dep graph rule pass
- package builds pass
- selected integration tests pass
- empty-product boot test pass
- isolated module build test pass

---

## 19) ملفّات CI / Guards المطلوبة

يجب إضافة أو تفعيل آليات تمنع الانهيار الرجوعي:
- dependency graph checker
- forbidden edge rules
- no-cross-package-relative-import rule
- package build matrix
- smoke boot without product
- smoke boot with product

أي Agent لا يزيل Guard موجود إلا إذا كان الخلل في الـ Guard نفسه ومثبت ذلك.

---

## 20) تنسيق المخرجات الإلزامي لكل Agent

كل Agent يجب أن يخلّف أثرًا موحدًا داخل:

```text
/migration/reports/
```

بصيغة اسم:

```text
AGENT-<A|B|C|D>-REPORT-<timestamp>.md
```

والصيغة الداخلية إلزامية:

### Header
- Agent ID
- Owned scope
- Start state
- End state

### Changed
- files created
- files moved
- files updated

### Boundary Decisions
- what was reclassified
- what remained deferred

### Validation
- build results
- test results
- known failures caused by out-of-scope ownership

### Blockers
- exact file/path
- why out of scope
- which owner should handle it

> ملاحظة: هذا ليس “تنسيقًا خارجيًا”، بل أثر repo-local standard.

---

## 21) تعريف الـ Blocker Protocol

إذا احتاج Agent تعديلًا خارج نطاقه:

### يجب أن يفعل الآتي فقط:
1. لا يغير الملف خارج ملكيته
2. يكتب blocker note داخل:
   ```text
   /migration/blockers/
   ```
3. بصيغة:
   - path
   - needed change
   - why blocked
   - owning agent
   - impact severity

### ممنوع:
- “إصلاح سريع” خارج الملكية
- temporary hacks في shared files
- broad edits لأن “الوقت ضيق”

---

## 22) قواعد الـ Subagents

إذا كان Agent لديه Subagent system، فكل Subagent يخضع لنفس الدستور.

### قاعدة إلزامية
Subagents لا تملك حرية توسيع النطاق.
كل Subagent يرث:
- نفس owner scope
- نفس prohibited actions
- نفس acceptance criteria

### ممنوع على الـ Agent الرئيسي:
- توزيع Subagents على scopes خارج ملكيته
- تحويل Subagent إلى “fix-anything mode”

---

## 23) تعريف النجاح الحقيقي

النجاح الحقيقي ليس:
- عدد الملفات المعدلة
- عدد الأسطر المنقولة
- اختفاء imports القديمة فقط

النجاح الحقيقي هو:
- حدود صحيحة
- ملكية واضحة
- Packages نظيفة
- Product extractable
- Platform neutral
- SDK thin
- DB مستقل
- Modules قابلة للهجرة والبناء
- repo protected against regression

---

## 24) تعريف الفشل

يعتبر التحويل فاشلًا إذا حدث أي مما يلي:
- تم إنشاء Packages جديدة لكن ownership ظلّ مشوشًا
- أصبح `@dos/module-sdk` dumping ground
- تم نقل Shahin assumptions إلى Platform packages تحت أسماء عامة
- تم الحفاظ على التشغيل عبر hacks بدل boundaries صحيحة
- تم توسيع النطاق إلى redesign غير مضبوط
- عمل Agents على نفس الملفات المركزية بلا owner واحد
- تم تعديل business behavior بلا داعٍ

---

## 25) القواعد الخاصة بالوقت والسرعة

### حقيقة إلزامية
هذه الوثيقة يمكنها **تعظيم فرصة النجاح** وتقليل التداخل، لكنها **لا تضمن** تحويل 1–2 مليون LOC و60 module إلى بنية صحية كاملة خلال 4 ساعات في جميع الحالات.

الـ 4 ساعات هدف هجومي مناسب فقط إذا كان:
- معظم العمل ميكانيكيًا
- الاختبارات مستقرة نسبيًا
- هناك boundaries يمكن فرضها بسرعة
- الـ Agents قادرون على تنفيذ codemods وmoves وvalidation بكفاءة عالية

### لذلك
يجب التعامل مع نافذة 4 ساعات كـ:
- **Wave 1 structural conversion target**
وليس كضمان مطلق لإنهاء كل تعقيدات runtime hidden coupling.

لكن هذه الوثيقة مصممة لكي تجعل التقدم خلال هذه النافذة:
- متوازيًا
- منضبطًا
- قليل التداخل
- قابلًا للإكمال في موجات متتالية بدون إعادة شغل أو تضارب

---

## 26) خطة العمل العملية المقترحة داخل نفس الدستور

### Wave 1
- Agent A: يثبت control plane + types/contracts + aliases + guards
- Agent B: يستخرج platform-core/auth/db boundaries
- Agent C: يهاجر modules A–M
- Agent D: يهاجر modules N–Z + يبدأ product extraction

### Wave 2
- تثبيت SDK facade النهائي
- استكمال product registration cleanup
- empty-product boot validation
- isolated module builds

### Wave 3
- edge cases
- dead code pruning
- stricter CI and dep graph locks

---

## 27) Ready Prompts لكل Agent

> يمكن نسخ هذه الأقسام كما هي لكل Agent.

### 27.1 Prompt — Agent A

```text
You are Agent A.
Read /migration/CONSTITUTION.md and obey it as the only source of truth.

Your ownership:
- packages/dos-types/**
- packages/dos-contracts/**
- packages/dos-module-sdk/** (facade only)
- root workspace config files
- tsconfig path aliases
- workspace/package manifests
- codemod scripts
- migration docs
- dependency/boundary guard rails

You must not modify business logic in modules, product logic, or heavy runtime extraction scopes.

Mission:
1. Create and stabilize foundation packages.
2. Establish canonical path aliases.
3. Add guard rails against forbidden edges and deep relative imports.
4. Keep SDK thin; do not turn it into a dumping ground.
5. Emit a report under /migration/reports/.
```

### 27.2 Prompt — Agent B

```text
You are Agent B.
Read /migration/CONSTITUTION.md and obey it as the only source of truth.

Your ownership:
- packages/dos-platform-core/**
- packages/dos-auth/**
- packages/dos-db/**
- source runtime files being extracted from platform/auth/db areas
- bootstrap/config/runtime ownership cleanup only within platform scope

You must not modify modules outside direct extraction need and must not introduce Shahin assumptions into reusable packages.

Mission:
1. Extract @dos/platform-core.
2. Extract @dos/auth.
3. Extract @dos/db.
4. Remove direct product coupling from runtime.
5. Make platform boot without product assumptions.
6. Emit a report under /migration/reports/.
```

### 27.3 Prompt — Agent C

```text
You are Agent C.
Read /migration/CONSTITUTION.md and obey it as the only source of truth.

Your ownership:
- modules whose normalized first alphabetic character is between a and m
- their local tests
- their local import migration only

You must not touch root control-plane files, platform package internals, or modules outside your bucket.

Mission:
1. Replace deep relative imports with canonical package imports.
2. Fix local compile breaks only inside owned modules.
3. Keep changes narrow and structural.
4. Do not redesign behavior.
5. Emit a report under /migration/reports/.
```

### 27.4 Prompt — Agent D

```text
You are Agent D.
Read /migration/CONSTITUTION.md and obey it as the only source of truth.

Your ownership:
- modules whose normalized first alphabetic character is between n and z
- products/**
- packages/shahin-product/**
- product registration hooks

You must not alter platform runtime beyond minimum decoupling needs and must not edit modules outside your bucket.

Mission:
1. Migrate owned modules to canonical package imports.
2. Formalize @shahin/product.
3. Move Shahin-specific behavior behind product registration boundaries.
4. Keep platform neutral.
5. Emit a report under /migration/reports/.
```

---

## 28) قائمة التحقق النهائية قبل اعتماد أي نتيجة

### Architectural
- [ ] هل صارت الملكية واضحة؟
- [ ] هل platform أصبح neutral؟
- [ ] هل Shahin بقي product وليس root identity؟
- [ ] هل DB صار له boundary واضحة؟
- [ ] هل SDK بقي thin؟

### Structural
- [ ] هل relative imports القديمة اختفت من scopes المهاجرة؟
- [ ] هل packages الجديدة لها public exports واعية؟
- [ ] هل forbidden edges ممنوعة فعلاً؟

### Runtime
- [ ] هل platform يعمل بدون product؟
- [ ] هل product يُسجَّل عبر boundary صحيحة؟
- [ ] هل bootstrap/config لم يعدا product-coupled؟

### Delivery
- [ ] هل كل Agent ترك report واضحًا؟
- [ ] هل blockers موثقة بدل hacks؟
- [ ] هل لا يوجد تداخل ملكية؟

---

## 29) القرار التنفيذي النهائي

من هذه اللحظة:
- هذا الدستور هو المرجع الأعلى
- أي Agent أو Subagent يعمل خارجه يعتبر منحرفًا
- أي Package جديدة أو نقل ملفات أو تعديل imports أو bootstrap أو config أو product wiring يجب أن يلتزم به حرفيًا

الهدف ليس “إنهاء refactor سريع”، بل:
**بناء شكل جديد صحيح وصحي وقابل للاستمرار والتوازي والاستخراج دون فوضى.**

---

## 30) اسم الملف المقترح داخل الريبو

ضع هذه الوثيقة بهذا الاسم:

```text
/migration/CONSTITUTION.md
```

وإذا أردت نسخة أعلى مستوى للقراءة البشرية فقط:

```text
/ARCHITECTURE_CONSTITUTION.md
```

لكن المرجع الإلزامي للـ Agents يجب أن يبقى:

```text
/migration/CONSTITUTION.md
```

