-- Phase 1: DB-Driven Marketing Page Content
-- Migration: 20260505_1003_marketing_contact_content.sql
-- Purpose: Add advanced content props for contact page
--
-- This migration adds comprehensive contact content to the /contact route,
-- including contact form, office locations, support information, and contact details.

UPDATE dos.ui_route_template_binding
SET props = COALESCE(props, '{}'::jsonb) || jsonb_build_object(
  'brandCode', 'shahin-ai',
  'eyebrow_en', 'Contact Us',
  'eyebrow_ar', 'اتصل بنا',
  'title_en', 'Get in touch with our team',
  'title_ar', 'تواصل مع فريقنا',
  'sub_en', 'We are here to help you with your governance and compliance needs.',
  'sub_ar', 'نحن هنا لمساعدتك في احتياجاتك للحوكمة والامتثال.',
  'contactForm', jsonb_build_object(
    'enabled', true,
    'title_en', 'Send us a message',
    'title_ar', 'أرسل لنا رسالة',
    'fields', jsonb_build_array(
      jsonb_build_object('name', 'name', 'label_en', 'Full Name', 'label_ar', 'الاسم الكامل', 'type', 'text', 'required', true),
      jsonb_build_object('name', 'email', 'label_en', 'Email Address', 'label_ar', 'عنوان البريد الإلكتروني', 'type', 'email', 'required', true),
      jsonb_build_object('name', 'company', 'label_en', 'Company Name', 'label_ar', 'اسم الشركة', 'type', 'text', 'required', true),
      jsonb_build_object('name', 'message', 'label_en', 'Message', 'label_ar', 'الرسالة', 'type', 'textarea', 'required', true)
    ),
    'submitLabel_en', 'Send Message',
    'submitLabel_ar', 'إرسال الرسالة'
  ),
  'contactInfo', jsonb_build_array(
    jsonb_build_object('icon', 'email', 'label_en', 'Email', 'label_ar', 'البريد الإلكتروني', 'value_en', 'info@shahin-ai.com', 'value_ar', 'info@shahin-ai.com'),
    jsonb_build_object('icon', 'phone', 'label_en', 'Phone', 'label_ar', 'الهاتف', 'value_en', '+966 11 XXX XXXX', 'value_ar', '+966 11 XXX XXXX'),
    jsonb_build_object('icon', 'location', 'label_en', 'Address', 'label_ar', 'العنوان', 'value_en', 'Riyadh, Saudi Arabia', 'value_ar', 'الرياض، المملكة العربية السعودية')
  ),
  'officeLocations', jsonb_build_array(
    jsonb_build_object(
      'name_en', 'Headquarters',
      'name_ar', 'المقر الرئيسي',
      'address_en', 'Riyadh, Saudi Arabia',
      'address_ar', 'الرياض، المملكة العربية السعودية',
      'hours_en', 'Sun-Thu 9:00 AM - 6:00 PM',
      'hours_ar', 'الأحد-الخميس 9:00 ص - 6:00 م'
    )
  ),
  'support', jsonb_build_object(
    'title_en', 'Support Channels',
    'title_ar', 'قنوات الدعم',
    'channels', jsonb_build_array(
      jsonb_build_object('name_en', 'Live Chat', 'name_ar', 'الدردشة الحية', 'available', true),
      jsonb_build_object('name_en', 'Email Support', 'name_ar', 'الدعم عبر البريد الإلكتروني', 'available', true),
      jsonb_build_object('name_en', 'Phone Support', 'name_ar', 'الدعم الهاتفي', 'available', true)
    ),
    'responseTime_en', 'We respond within 24 hours',
    'responseTime_ar', 'نرد خلال 24 ساعة'
  ),
  'socialLinks', jsonb_build_array(
    jsonb_build_object('platform', 'linkedin', 'url', 'https://linkedin.com/company/shahin-ai'),
    jsonb_build_object('platform', 'twitter', 'url', 'https://twitter.com/shahinai'),
    jsonb_build_object('platform', 'website', 'url', 'https://www.shahin-ai.com')
  )
)
WHERE route = '/contact' AND archetype = 'marketing-landing';

-- Add comment
COMMENT ON COLUMN dos.ui_route_template_binding.props IS 'JSONB props bag for marketing page configuration. For contact: {brandCode, eyebrow, title, sub, contactForm, contactInfo, officeLocations, support, socialLinks}';
