-- Phase P1 — Auth-page dynamic routing (fully DB-driven login/register/mfa).
--
-- 1. Add 'auth-page' archetype to chk_archetype.
-- 2. Insert 5 auth page bindings in dos.ui_route_template_binding so the
--    DynamicTemplatePageComponent can resolve /login, /register, etc.
--    via GET /api/ui-os/template-binding?route=/login (public, unauthenticated).
-- 3. Auth pages have no props — the DosAuthShellComponent handles
--    Keycloak OIDC redirect internally via the existing auth contract.

BEGIN;

-- 1. Extend the archetype roster with 'auth-page'.
ALTER TABLE dos.ui_route_template_binding
  DROP CONSTRAINT IF EXISTS chk_archetype;
ALTER TABLE dos.ui_route_template_binding
  ADD CONSTRAINT chk_archetype CHECK (archetype IN (
    'command-home','decision-dashboard','command-dashboard',
    'posture-overview','trend-intelligence','intelligent-register',
    'risk-landscape','record-story','guided-create','action-queue',
    'workflow-control','workflow-timeline','follow-up-center',
    'evidence-reports','export-center','audit-trail',
    'audit-trail-ledger','audit-trail-evidence',
    'calendar-timeline','compliance-calendar','remediation-roadmap',
    'org-chart','ownership-map','delegation-center',
    'ai-advisor','agent-flow','agent-registry',
    'user-agent-workbench','module-settings','activation-journey',
    'incident-response','case-finalization','marketing-landing',
    'auth-page'
  ));

-- 2. Insert template bindings for the 5 auth pages.
INSERT INTO dos.ui_route_template_binding
  (route, archetype, template_export, title_en, title_ar, subtitle_en, subtitle_ar)
VALUES
  ('/login',           'auth-page', 'auth.login.page',           'Sign In',          'تسجيل الدخول',    'Access your workspace',       'الوصول إلى مساحة العمل'),
  ('/register',        'auth-page', 'auth.register.page',        'Create Account',   'إنشاء حساب',      'Start your free trial',       'ابدأ تجربتك المجانية'),
  ('/forgot-password', 'auth-page', 'auth.forgot-password.page', 'Reset Password',   'إعادة تعيين كلمة المرور', 'We will send you a reset link', 'سنرسل لك رابط إعادة التعيين'),
  ('/mfa',             'auth-page', 'auth.mfa.page',             'Verify Identity',  'التحقق من الهوية', 'Enter your verification code', 'أدخل رمز التحقق'),
  ('/reset-password',  'auth-page', 'auth.reset-password.page',  'New Password',     'كلمة مرور جديدة', 'Choose a new password',        'اختر كلمة مرور جديدة')
ON CONFLICT (route) DO UPDATE SET
  archetype       = EXCLUDED.archetype,
  template_export = EXCLUDED.template_export,
  title_en        = EXCLUDED.title_en,
  title_ar        = EXCLUDED.title_ar,
  subtitle_en     = EXCLUDED.subtitle_en,
  subtitle_ar     = EXCLUDED.subtitle_ar;

COMMIT;
