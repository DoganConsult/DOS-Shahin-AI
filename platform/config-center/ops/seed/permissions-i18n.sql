-- Arabic localisation for platform_dauth.permissions (label_ar/description_ar).
-- Pattern-driven: derives Arabic from resource_type/action_type so all 590
-- permission rows get a deterministic, reviewable translation.
-- Idempotent: only fills NULL/empty cells; preserves curated translations.

WITH action_map(action_key, ar) AS (
  VALUES
    ('read','قراءة'),('list','قائمة'),('view','عرض'),
    ('write','كتابة'),('create','إنشاء'),('update','تحديث'),('edit','تعديل'),
    ('delete','حذف'),('remove','إزالة'),
    ('manage','إدارة'),('admin','مسؤول'),
    ('approve','موافقة'),('reject','رفض'),('submit','إرسال'),
    ('publish','نشر'),('archive','أرشفة'),('export','تصدير'),('import','استيراد'),
    ('assign','تعيين'),('unassign','إلغاء التعيين'),
    ('execute','تنفيذ'),('run','تشغيل'),('cancel','إلغاء'),
    ('close','إغلاق'),('open','فتح'),('reopen','إعادة فتح'),
    ('bulk','عمليات مجمعة'),('search','بحث'),('configure','تهيئة'),
    ('audit','تدقيق'),('review','مراجعة'),('escalate','تصعيد'),
    ('lock','قفل'),('unlock','فتح القفل'),('reset','إعادة تعيين')
), resource_map(res_key, ar) AS (
  VALUES
    ('access','الوصول'),('access_review','مراجعة الوصول'),
    ('action','الإجراء'),('action.item','عنصر الإجراء'),
    ('user','المستخدم'),('users','المستخدمون'),('role','الدور'),('roles','الأدوار'),
    ('permission','الصلاحية'),('permissions','الصلاحيات'),
    ('tenant','المستأجر'),('tenants','المستأجرون'),
    ('organization','المنظمة'),('department','الإدارة'),('team','الفريق'),
    ('committee','اللجنة'),('position','المنصب'),('location','الموقع'),
    ('policy','السياسة'),('policies','السياسات'),('control','الضابط'),
    ('compliance','الامتثال'),('framework','الإطار'),('obligation','الالتزام'),
    ('risk','المخاطرة'),('treatment','المعالجة'),('issue','المشكلة'),
    ('audit','التدقيق'),('finding','النتيجة'),('evidence','الدليل'),
    ('workflow','سير العمل'),('task','المهمة'),('approval','الموافقة'),
    ('vendor','المورد'),('asset','الأصل'),('contract','العقد'),
    ('incident','الحادث'),('alert','التنبيه'),('detection','الكشف'),
    ('config','الإعداد'),('settings','الإعدادات'),('module','الوحدة'),
    ('product','المنتج'),('service','الخدمة'),('report','التقرير'),
    ('dashboard','لوحة المعلومات'),('notification','الإشعار'),
    ('integration','التكامل'),('api','واجهة برمجة'),('key','المفتاح'),
    ('session','الجلسة'),('mfa','المصادقة الثنائية'),('sso','الدخول الموحد'),
    ('directory','الدليل'),('group','المجموعة'),('delegation','التفويض'),
    ('invitation','الدعوة'),('profile','الملف'),('lifecycle','دورة الحياة')
)
UPDATE platform_dauth.permissions p
SET
  label_ar = COALESCE(NULLIF(p.label_ar,''),
    (SELECT r.ar FROM resource_map r WHERE r.res_key = LOWER(p.resource_type) LIMIT 1) ||
    ' — ' ||
    COALESCE((SELECT a.ar FROM action_map a WHERE a.action_key = LOWER(p.action_type) LIMIT 1), p.action_type)),
  description_ar = COALESCE(NULLIF(p.description_ar,''), 'صلاحية ' || p.permission_code),
  description_en = COALESCE(NULLIF(p.description_en,''), p.description, 'Permission: ' || p.permission_code)
WHERE (p.label_ar IS NULL OR p.label_ar = '');

-- For any leftover rows (resource/action not in the map) fall back to the code itself.
UPDATE platform_dauth.permissions
SET label_ar = COALESCE(NULLIF(label_ar,''), permission_code)
WHERE label_ar IS NULL OR label_ar = '';
