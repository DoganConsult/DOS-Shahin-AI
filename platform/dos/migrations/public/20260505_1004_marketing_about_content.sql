-- Phase 1: DB-Driven Marketing Page Content
-- Migration: 20260505_1004_marketing_about_content.sql
-- Purpose: Add advanced content props for about page
--
-- This migration adds comprehensive about content to the /about route,
-- including company story, mission, values, team, and achievements.

UPDATE dos.ui_route_template_binding
SET props = COALESCE(props, '{}'::jsonb) || jsonb_build_object(
  'brandCode', 'shahin-ai',
  'eyebrow_en', 'About Us',
  'eyebrow_ar', 'من نحن',
  'title_en', 'Governance that sees the path… and protects it',
  'title_ar', 'حوكمة ترى الطريق… وتحميه',
  'sub_en', 'Dogan Consult brings decades of expertise to transform GRC in the Kingdom.',
  'sub_ar', 'تجلب Dogan Consult عقوداً من الخبرة لتحويل الحوكمة في المملكة.',
  'story', jsonb_build_object(
    'title_en', 'Our Story',
    'title_ar', 'قصتنا',
    'body_en', 'Founded by industry veterans, Dogan Consult was born from a simple observation: GRC in the Middle East was fragmented, manual, and inefficient. We set out to change that.',
    'body_ar', 'تأسست Dogan Consult على يد خبراء في الصناعة، وولدت من ملاحظة بسيطة: الحوكمة في الشرق الأوسط كانت مجزأة ويدوية وغير فعالة. قررنا تغيير ذلك.'
  ),
  'mission', jsonb_build_object(
    'title_en', 'Our Mission',
    'title_ar', 'مهمتنا',
    'body_en', 'To empower organizations with AI-driven governance that ensures compliance while enabling growth.',
    'body_ar', 'تمكين المؤسسات بالحوكمة المدعومة بالذكاء الاصطناعي التي تضمن الامتثال مع تمكين النمو.'
  ),
  'values', jsonb_build_array(
    jsonb_build_object('title_en', 'Innovation', 'title_ar', 'الابتكار', 'body_en', 'We push boundaries with AI and automation.', 'body_ar', 'ندفع الحدود بالذكاء الاصطناعي والأتمتة.'),
    jsonb_build_object('title_en', 'Trust', 'title_ar', 'الثقة', 'body_en', 'Transparency and integrity in everything we do.', 'body_ar', 'الشفافية والنزاهة في كل ما نقوم به.'),
    jsonb_build_object('title_en', 'Excellence', 'title_ar', 'التميز', 'body_en', 'Delivering world-class solutions for our clients.', 'body_ar', 'تقديم حلول عالمية المستوى لعملائنا.')
  ),
  'team', jsonb_build_object(
    'title_en', 'Leadership Team',
    'title_ar', 'فريق القيادة',
    'members', jsonb_build_array(
      jsonb_build_object('name_en', 'Ahmet Dogan', 'name_ar', 'أحمد دوغان', 'role_en', 'Founder & CEO', 'role_ar', 'المؤسس والرئيس التنفيذي'),
      jsonb_build_object('name_en', 'Leadership Team', 'name_ar', 'فريق القيادة', 'role_en', 'Industry Experts', 'role_ar', 'خبراء في الصناعة')
    )
  ),
  'achievements', jsonb_build_array(
    jsonb_build_object('label_en', '500+ Clients', 'label_ar', 'أكثر من 500 عميل', 'description_en', 'Organizations trust Shahin-AI', 'description_ar', 'المؤسسات تثق في Shahin-AI'),
    jsonb_build_object('label_en', '6,000+ Controls', 'label_ar', 'أكثر من 6000 عنصر تحكم', 'description_en', 'Mapped across frameworks', 'description_ar', 'مخططة عبر الأطر'),
    jsonb_build_object('label_en', 'KSA Focused', 'label_ar', 'تركز على المملكة', 'description_en', 'Built for Saudi regulations', 'description_ar', 'مبني للوائح السعودية')
  ),
  'ctaLabel_en', 'Join Our Team',
  'ctaLabel_ar', 'انضم إلى فريقنا',
  'ctaHref', '/contact'
)
WHERE route = '/about' AND archetype = 'marketing-landing';

-- Add comment
COMMENT ON COLUMN dos.ui_route_template_binding.props IS 'JSONB props bag for marketing page configuration. For about: {brandCode, eyebrow, title, sub, story, mission, values, team, achievements, ctaLabel, ctaHref}';
