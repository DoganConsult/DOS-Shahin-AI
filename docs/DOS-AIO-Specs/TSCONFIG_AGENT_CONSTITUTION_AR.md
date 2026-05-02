# دستور TypeScript / TSConfig للتحويل المعماري

هذا الملف **ملزم** لكل Agent وSubagent يعمل داخل الريبو.

هدفه منع الفوضى أثناء تحويل monolith / monorepo متشابك إلى بنية packages صحية، مع الحفاظ على اتجاه واحد موحد حتى لو عمل عدة agents بالتوازي وبدون تنسيق مباشر.

---

## 1) الغرض من هذا الملف

هذا الملف لا يشرح TypeScript بشكل عام.

هذا الملف يحدد فقط:
- ما هو **الـ tsconfig canonical** للمشروع أثناء التحويل
- ما الذي يحق للـ agents تغييره وما الذي لا يحق لهم تغييره
- كيف يتم ضبط TypeScript على مستوى الـ root والـ package والموديول
- كيف نمنع أي agent من تخريب الشغل الذي يعمله agent آخر
- كيف نسمح بالتحويل التدريجي بدون انفجار type errors عبر ملايين الأسطر

---

## 2) القاعدة الحاكمة

### القاعدة الأساسية

**لا يجوز لأي Agent أن يعالج مشاكل المعمارية عن طريق حيل TypeScript.**

ممنوع استخدام `paths`, `baseUrl`, أو `include` أو `exclude` أو أي option أخرى كوسيلة لإخفاء:
- circular dependencies
- ownership drift
- package boundary violations
- product/platform coupling
- broken imports

TypeScript هنا أداة ضبط وتنفيذ، وليس ستارة لإخفاء العيوب.

---

## 3) الهيكل القياسي الإلزامي

يجب أن يوجد هذا التسلسل في الريبو:

```text
/tsconfig.base.json                 ← الأساس الوحيد المشترك
/tsconfig.json                      ← ملف root orchestration فقط
/packages/*/tsconfig.json           ← dev/editor config لكل package
/packages/*/tsconfig.build.json     ← build config لكل package
/apps/*/tsconfig.json               ← app config
/apps/*/tsconfig.build.json         ← app build config إن لزم
```

### القرار الإلزامي
- `tsconfig.base.json` هو **المصدر المشترك الوحيد** للـ compiler defaults.
- `tsconfig.json` في الـ root ليس مكانًا لوضع business logic.
- لا يجوز تكرار compilerOptions الكبيرة في 20 مكانًا.
- كل package يمدد من `../../tsconfig.base.json` أو المسار المكافئ.

---

## 4) ما هو الهدف من TSConfig أثناء التحويل

الهدف ليس الوصول الفوري إلى `strict: true` على كامل المشروع.

الهدف المرحلي هو:
1. توحيد الإعداد
2. تثبيت resolution behavior
3. تمكين package extraction
4. تمكين incremental builds
5. منع relative import chaos
6. السماح برفع الصرامة تدريجيًا package-by-package

### لذلك القرار الرسمي
- **الجذر root يبقى permissive نسبيًا أثناء التحويل**
- **الصرامة ترتفع تدريجيًا داخل packages الجديدة أو المنظفة فقط**
- لا يجوز لأي Agent أن يرفع `strict` على مستوى الريبو بالكامل كخطوة مفاجئة

---

## 5) الملف الأساسي canonical

هذا هو النموذج المرجعي الذي يجب أن يبنى عليه العمل.

### Root shared base

- target حديث
- module حديث
- resolution حديث
- declarations للمكتبات
- skipLibCheck مفعّل مؤقتًا أثناء التحويل
- strict ليس global hard requirement في أول موجة

### القواعد:
- `strict: false` مسموح مؤقتًا على مستوى base إذا كان الريبو ضخمًا ومختلطًا
- `skipLibCheck: true` مسموح ومطلوب أثناء موجة التحويل
- `declaration` و `declarationMap` للمكتبات المشتركة
- `composite` لا يوضع في الـ base إن كان سيكسر بعض التطبيقات القديمة؛ يوضع غالبًا في package build configs

---

## 6) السياسة الرسمية للصرامة

### ممنوع
- جعل `strict: true` على كامل الريبو دفعة واحدة
- تشغيل `noUncheckedIndexedAccess` أو `exactOptionalPropertyTypes` على كامل المشروع أثناء أول موجة
- إجبار agents الآخرين على إصلاح type noise خارج نطاقهم

### مطلوب
- أي package جديدة تُستخرج يفضّل أن تبدأ أكثر نظافة من legacy
- يمكن تفعيل صرامة أعلى على package محددة إذا كانت معزولة
- أي tightening يجب أن يكون **محليًا** وليس global

### التدرج الرسمي
1. root base = permissive stable
2. extracted package build config = stronger
3. extracted package internal code = highest feasible strictness
4. legacy zones = لا تُكسر إلا إذا كانت داخل نطاق المهمة

---

## 7) policy الخاصة بالـ paths aliases

`paths` مسموحة فقط لخدمة **العمارة المستهدفة** وليس للهروب من المشاكل.

### مسموح
```json
{
  "paths": {
    "@dos/types": ["packages/dos-types/src/index.ts"],
    "@dos/contracts": ["packages/dos-contracts/src/index.ts"],
    "@dos/platform-core": ["packages/dos-platform-core/src/index.ts"],
    "@dos/auth": ["packages/dos-auth/src/index.ts"],
    "@dos/db": ["packages/dos-db/src/index.ts"],
    "@dos/module-sdk": ["packages/dos-module-sdk/src/index.ts"],
    "@shahin/product": ["packages/shahin-product/src/index.ts"]
  }
}
```

### ممنوع
- alias مؤقتة باسم داخلي غامض مثل `@shared2`, `@tmp-core`, `@legacy-fix`
- alias تشير مباشرة إلى ملفات product داخل platform
- alias تستخدم لإبقاء imports القديمة متخفية بدل إصلاحها
- alias عريضة جدًا تؤدي إلى dependency ambiguity

### القرار
كل alias يجب أن تمثل **package owner حقيقي**.

---

## 8) السياسة الرسمية لـ baseUrl

### القرار
- يفضّل **عدم استخدام `baseUrl` كحل عام سحري**
- إن استُخدم، فيجب أن يكون استخدامه محدودًا وواضحًا
- المرجعية الأساسية يجب أن تكون **package imports واضحة**

### السبب
`baseUrl` كثيرًا ما يخلق استيرادات تبدو نظيفة لكن تخفي boundary violations.

---

## 9) package references policy

عند دخول المشروع مرحلة builds المعزولة، يستخدم project references بشكل واضح.

### القاعدة
- كل package قابلة للبناء بشكل مستقل يجب أن تملك `tsconfig.build.json`
- packages المشتركة القابلة للاستهلاك يجب أن تستخدم `composite: true`
- app configs يمكن أن تبقى أخف حسب الحاجة

### ممنوع
- reference loops
- product referencing platform referencing product
- references لا تطابق dependency graph الحقيقي

---

## 10) الفصل بين dev config و build config

### قاعدة إلزامية
كل package مهم يملك ملفين:

#### `tsconfig.json`
لـ IDE / editor / local dev

#### `tsconfig.build.json`
للبناء الفعلي

### السبب
حتى لا يعبث Agent بإعدادات editor support ويكسر build pipeline، أو العكس.

---

## 11) include / exclude policy

### ممنوع
- `include: ["**/*"]` على مستوى واسع بدون حاجة
- سحب test files أو scripts أو generated code داخل builds بدون قرار واضح
- استخدام `exclude` لإخفاء مشاكل ownership أو broken imports

### مطلوب
- include محدد وواضح
- build config تبني فقط `src/**/*`
- test configs منفصلة إن لزم

---

## 12) JavaScript coexistence policy

إذا كان الريبو مختلط JS/TS:

### مسموح مؤقتًا
- `allowJs: true` في بعض مناطق legacy فقط إذا كان هذا جزءًا من خطة migration
- `checkJs: false` عالميًا في البداية إذا كان الضجيج عاليًا

### ممنوع
- نشر allowJs بلا حدود داخل packages الجديدة المستخرجة
- إنشاء package جديدة تعتمد على JavaScript غير مضبوط ثم تسميها extracted clean package

### القرار
- legacy compatibility نعم
- new extracted packages يجب أن تكون TypeScript-first قدر الإمكان

---

## 13) declaration files policy

### للمكتبات المشتركة
- `declaration: true`
- `declarationMap: true` مفضل

### للتطبيقات
- غير مطلوب دائمًا

### ممنوع
- تعطيل declarations في package library فقط لإخفاء مشاكل public API

---

## 14) interop policy

### القاعدة
استخدم إعدادات interop الحديثة اللازمة للاستقرار، لكن لا تغيرها عشوائيًا أثناء المهام.

### ممنوع
- Agent يغير `module`, `moduleResolution`, `esModuleInterop`, `verbatimModuleSyntax`, `isolatedModules` على مستوى root بدون مهمة صريحة

هذه الإعدادات تؤثر في كامل المشروع، وأي تغيير عشوائي فيها يسبب cascade failures.

---

## 15) ما الذي يحق للـ Agent تغييره

### Agent مخول أن يغير فقط:
- package-local tsconfig
- build config لباكيج ضمن نطاق مهمته
- paths aliases إذا كان يضيف package رسمية جديدة ومعتمدة في الدستور المعماري
- references اللازمة لربط package owner واضح

### Agent غير مخول أن يغير:
- root tsconfig strategy بالكامل
- module system بالكامل
- strictness policy global
- alias naming policy
- baseUrl policy
- include/exclude global policy

إلا إذا كانت مهمته صراحة: **TypeScript Configuration Boundary Pass**.

---

## 16) سياسة منع التداخل بين 4 Agents

لكي يعمل 4 agents بدون تنسيق خارجي، فإن ملكية ملفات tsconfig تكون كالتالي:

### Agent A — Foundation & Contracts
يملك فقط:
- `packages/dos-types/**`
- `packages/dos-contracts/**`
- aliases الخاصة بهاتين الحزمتين

### Agent B — Platform Runtime
يملك فقط:
- `packages/dos-platform-core/**`
- `packages/dos-auth/**`
- `packages/dos-db/**`
- aliases الخاصة بهذه الحزم

### Agent C — SDK & Module Migration
يملك فقط:
- `packages/dos-module-sdk/**`
- package-local tsconfig للموديولات التي ينقل imports الخاصة بها
- لا يغير root base strategy

### Agent D — Product Extraction
يملك فقط:
- `packages/shahin-product/**`
- aliases الخاصة بالمنتج
- product package references

### منطقة مقفلة
الملفات التالية لا يغيرها إلا Agent مخصص صراحة لذلك:
- `/tsconfig.base.json`
- `/tsconfig.json`
- أي solution tsconfig على مستوى root

إذا لم يوجد Agent مخصص لهذه الملفات، فهي تعتبر **read-only**.

---

## 17) بروتوكول التعارض

إذا احتاج Agent تعديلًا في root tsconfig لكنه ليس المالك:

1. لا يغير الملف
2. يكتب طلبًا في `migration/blocked/`
3. يذكر:
   - السبب
   - package المتأثرة
   - الحد الأدنى من التغيير المطلوب
   - لماذا لا يمكن حله محليًا

### ممنوع
- عمل root edit سريع “فقط لكي يمر build”
- إضافة alias مؤقتة غير دستورية
- تعطيل type checking globally لحل مشكلة محلية

---

## 18) package build standard

كل package library جديدة يجب أن تميل إلى هذا النمط:

- `rootDir = src`
- `outDir = dist`
- `composite = true`
- `declaration = true`
- `declarationMap = true`
- `tsBuildInfoFile` محلي
- `include = ["src/**/*"]`

### ممنوع
- البناء من جذر package بالكامل وسحب ملفات لا تخص public package
- خلط scripts/tests/generated files داخل output الأساسي

---

## 19) قواعد public API

TypeScript config يجب أن يدعم public surface واضح.

### القرار
- public imports يجب أن تمر عبر `src/index.ts` أو subpath exports محددة
- ممنوع استهلاك `src/internal/...` عبر aliases
- ممنوع أن تشير paths إلى ملفات private فقط لأن build الحالي يعتمد عليها

---

## 20) معيار النجاح

نجاح TSConfig transformation لا يعني فقط أن `tsc` مرّ.

النجاح يعني:
- aliases تعكس ownership حقيقي
- package build مستقلة قدر الإمكان
- لا يوجد root hacks لحل مشاكل محلية
- لا يوجد product/platform ambiguity في paths
- لا توجد global strictness explosions
- package الجديدة تصدر declarations صحيحة
- project structure يدعم extraction الحقيقي

---

## 21) anti-patterns المحظورة تمامًا

### محظور 1
إضافة `exclude` تخفي ملفات مكسورة بدل إصلاحها

### محظور 2
إضافة alias تشير إلى legacy deep path فقط لأن النقل لم يكتمل

### محظور 3
تغيير root module resolution لأن package واحدة متضررة

### محظور 4
إيقاف `declaration` في library package لتجاوز public type failures

### محظور 5
فرض `strict: true` global لإجبار بقية agents على تنظيف legacy noise

### محظور 6
فتح `allowJs` بلا حدود داخل packages نظيفة

### محظور 7
استخدام `paths` كبديل عن dependency graph الصحيح

---

## 22) الشكل المرجعي العملي

الملف المرفق `tsconfig.base.canonical.json` هو المرجع المقترح كبداية آمنة للتحويل.

يُستخدم كمرجع architectural base، ثم تُشتق منه configs محلية حسب الملكية.

---

## 23) القرار النهائي الملزم

### القرار 1
TypeScript configuration يجب أن يخدم العمارة الجديدة، لا أن يلتف عليها.

### القرار 2
الـ root config منطقة حساسة ومقفلة.

### القرار 3
الصرامة تدريجية، وليست ضربة واحدة على مستوى الريبو.

### القرار 4
كل alias يجب أن تمثل package حقيقية بمالك واضح.

### القرار 5
كل extracted package يجب أن تكون قابلة للبناء والفهم من خلال tsconfig واضح ومحدود.

### القرار 6
أي agent يخالف هذه القواعد يعتبر قد أدخل **architectural drift** حتى لو مرّ build محليًا.

