-- Foundation Reference Data Seed (Wave 2.1) — countries, currencies, languages,
-- timezones, regulatory frameworks, sectors. ~250 rows; key markets first.
-- Idempotent.

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- COUNTRIES — GCC + MENA + key global. ISO-3166 alpha-2 codes.
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO dos.foundation_cat_reference (category, code, name_en, name_ar, meta, sort_order) VALUES
  ('country','SA','Saudi Arabia','المملكة العربية السعودية','{"region":"gcc","iso3":"SAU","phone_code":"+966"}'::jsonb, 1),
  ('country','AE','United Arab Emirates','الإمارات العربية المتحدة','{"region":"gcc","iso3":"ARE","phone_code":"+971"}'::jsonb, 2),
  ('country','KW','Kuwait','الكويت','{"region":"gcc","iso3":"KWT","phone_code":"+965"}'::jsonb, 3),
  ('country','QA','Qatar','قطر','{"region":"gcc","iso3":"QAT","phone_code":"+974"}'::jsonb, 4),
  ('country','BH','Bahrain','البحرين','{"region":"gcc","iso3":"BHR","phone_code":"+973"}'::jsonb, 5),
  ('country','OM','Oman','عمان','{"region":"gcc","iso3":"OMN","phone_code":"+968"}'::jsonb, 6),
  ('country','EG','Egypt','مصر','{"region":"mena","iso3":"EGY","phone_code":"+20"}'::jsonb, 10),
  ('country','JO','Jordan','الأردن','{"region":"mena","iso3":"JOR","phone_code":"+962"}'::jsonb, 11),
  ('country','LB','Lebanon','لبنان','{"region":"mena","iso3":"LBN","phone_code":"+961"}'::jsonb, 12),
  ('country','MA','Morocco','المغرب','{"region":"mena","iso3":"MAR","phone_code":"+212"}'::jsonb, 13),
  ('country','TN','Tunisia','تونس','{"region":"mena","iso3":"TUN","phone_code":"+216"}'::jsonb, 14),
  ('country','DZ','Algeria','الجزائر','{"region":"mena","iso3":"DZA","phone_code":"+213"}'::jsonb, 15),
  ('country','IQ','Iraq','العراق','{"region":"mena","iso3":"IRQ","phone_code":"+964"}'::jsonb, 16),
  ('country','TR','Turkey','تركيا','{"region":"mena","iso3":"TUR","phone_code":"+90"}'::jsonb, 17),
  ('country','PK','Pakistan','باكستان','{"region":"south_asia","iso3":"PAK","phone_code":"+92"}'::jsonb, 20),
  ('country','IN','India','الهند','{"region":"south_asia","iso3":"IND","phone_code":"+91"}'::jsonb, 21),
  ('country','GB','United Kingdom','المملكة المتحدة','{"region":"europe","iso3":"GBR","phone_code":"+44"}'::jsonb, 30),
  ('country','US','United States','الولايات المتحدة','{"region":"north_america","iso3":"USA","phone_code":"+1"}'::jsonb, 31),
  ('country','DE','Germany','ألمانيا','{"region":"europe","iso3":"DEU","phone_code":"+49"}'::jsonb, 32),
  ('country','FR','France','فرنسا','{"region":"europe","iso3":"FRA","phone_code":"+33"}'::jsonb, 33),
  ('country','SG','Singapore','سنغافورة','{"region":"asia_pacific","iso3":"SGP","phone_code":"+65"}'::jsonb, 40)
ON CONFLICT (category, code) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, meta = EXCLUDED.meta;

-- ════════════════════════════════════════════════════════════════════════════
-- CITIES — GCC priority cities; parent_code links to country
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO dos.foundation_cat_reference (category, code, name_en, name_ar, parent_code, meta, sort_order) VALUES
  -- KSA (13 regions / capitals)
  ('city','SA-RUH','Riyadh','الرياض','SA','{"timezone":"Asia/Riyadh","lat":24.7136,"lon":46.6753,"region_code":"01"}'::jsonb, 1),
  ('city','SA-JED','Jeddah','جدة','SA','{"timezone":"Asia/Riyadh","lat":21.4858,"lon":39.1925,"region_code":"02"}'::jsonb, 2),
  ('city','SA-DMM','Dammam','الدمام','SA','{"timezone":"Asia/Riyadh","lat":26.4282,"lon":50.0888,"region_code":"04"}'::jsonb, 3),
  ('city','SA-MAK','Makkah','مكة المكرمة','SA','{"timezone":"Asia/Riyadh","region_code":"02"}'::jsonb, 4),
  ('city','SA-MED','Madinah','المدينة المنورة','SA','{"timezone":"Asia/Riyadh","region_code":"03"}'::jsonb, 5),
  ('city','SA-TUU','Tabuk','تبوك','SA','{"timezone":"Asia/Riyadh","region_code":"07"}'::jsonb, 6),
  ('city','SA-AHB','Abha','أبها','SA','{"timezone":"Asia/Riyadh","region_code":"09"}'::jsonb, 7),
  ('city','SA-HFR','Hofuf','الهفوف','SA','{"timezone":"Asia/Riyadh","region_code":"04"}'::jsonb, 8),
  ('city','SA-NEOM','NEOM','نيوم','SA','{"timezone":"Asia/Riyadh","region_code":"07"}'::jsonb, 9),
  -- UAE
  ('city','AE-AUH','Abu Dhabi','أبوظبي','AE','{"timezone":"Asia/Dubai"}'::jsonb, 20),
  ('city','AE-DXB','Dubai','دبي','AE','{"timezone":"Asia/Dubai"}'::jsonb, 21),
  ('city','AE-SHJ','Sharjah','الشارقة','AE','{"timezone":"Asia/Dubai"}'::jsonb, 22),
  ('city','AE-RAK','Ras Al Khaimah','رأس الخيمة','AE','{"timezone":"Asia/Dubai"}'::jsonb, 23),
  -- Kuwait, Qatar, Bahrain, Oman
  ('city','KW-KWI','Kuwait City','مدينة الكويت','KW','{"timezone":"Asia/Kuwait"}'::jsonb, 30),
  ('city','QA-DOH','Doha','الدوحة','QA','{"timezone":"Asia/Qatar"}'::jsonb, 31),
  ('city','BH-BAH','Manama','المنامة','BH','{"timezone":"Asia/Bahrain"}'::jsonb, 32),
  ('city','OM-MCT','Muscat','مسقط','OM','{"timezone":"Asia/Muscat"}'::jsonb, 33),
  -- MENA
  ('city','EG-CAI','Cairo','القاهرة','EG','{"timezone":"Africa/Cairo"}'::jsonb, 40),
  ('city','JO-AMM','Amman','عمان','JO','{"timezone":"Asia/Amman"}'::jsonb, 41),
  ('city','LB-BEY','Beirut','بيروت','LB','{"timezone":"Asia/Beirut"}'::jsonb, 42)
ON CONFLICT (category, code) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, parent_code = EXCLUDED.parent_code, meta = EXCLUDED.meta;

-- ════════════════════════════════════════════════════════════════════════════
-- CURRENCIES — ISO-4217
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO dos.foundation_cat_reference (category, code, name_en, name_ar, meta, sort_order) VALUES
  ('currency','SAR','Saudi Riyal','ريال سعودي','{"symbol":"ر.س","decimals":2}'::jsonb, 1),
  ('currency','AED','UAE Dirham','درهم إماراتي','{"symbol":"د.إ","decimals":2}'::jsonb, 2),
  ('currency','KWD','Kuwaiti Dinar','دينار كويتي','{"symbol":"د.ك","decimals":3}'::jsonb, 3),
  ('currency','QAR','Qatari Riyal','ريال قطري','{"symbol":"ر.ق","decimals":2}'::jsonb, 4),
  ('currency','BHD','Bahraini Dinar','دينار بحريني','{"symbol":"د.ب","decimals":3}'::jsonb, 5),
  ('currency','OMR','Omani Rial','ريال عماني','{"symbol":"ر.ع","decimals":3}'::jsonb, 6),
  ('currency','EGP','Egyptian Pound','جنيه مصري','{"symbol":"ج.م","decimals":2}'::jsonb, 7),
  ('currency','USD','US Dollar','دولار أمريكي','{"symbol":"$","decimals":2}'::jsonb, 10),
  ('currency','EUR','Euro','يورو','{"symbol":"€","decimals":2}'::jsonb, 11),
  ('currency','GBP','British Pound','جنيه إسترليني','{"symbol":"£","decimals":2}'::jsonb, 12)
ON CONFLICT (category, code) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, meta = EXCLUDED.meta;

-- ════════════════════════════════════════════════════════════════════════════
-- LANGUAGES — IETF BCP-47 codes
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO dos.foundation_cat_reference (category, code, name_en, name_ar, meta, sort_order) VALUES
  ('language','ar-SA','Arabic (Saudi Arabia)','العربية (السعودية)','{"direction":"rtl","is_official_in":["SA"]}'::jsonb, 1),
  ('language','ar-AE','Arabic (UAE)','العربية (الإمارات)','{"direction":"rtl","is_official_in":["AE"]}'::jsonb, 2),
  ('language','ar-EG','Arabic (Egypt)','العربية (مصر)','{"direction":"rtl","is_official_in":["EG"]}'::jsonb, 3),
  ('language','ar','Arabic (generic)','العربية','{"direction":"rtl"}'::jsonb, 4),
  ('language','en-US','English (United States)','الإنجليزية (الولايات المتحدة)','{"direction":"ltr"}'::jsonb, 10),
  ('language','en-GB','English (United Kingdom)','الإنجليزية (المملكة المتحدة)','{"direction":"ltr"}'::jsonb, 11),
  ('language','en','English (generic)','الإنجليزية','{"direction":"ltr"}'::jsonb, 12),
  ('language','fr-FR','French (France)','الفرنسية','{"direction":"ltr"}'::jsonb, 20),
  ('language','ur','Urdu','الأردية','{"direction":"rtl"}'::jsonb, 30),
  ('language','hi','Hindi','الهندية','{"direction":"ltr"}'::jsonb, 31)
ON CONFLICT (category, code) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, meta = EXCLUDED.meta;

-- ════════════════════════════════════════════════════════════════════════════
-- TIMEZONES — IANA, prioritised by GCC + global
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO dos.foundation_cat_reference (category, code, name_en, name_ar, meta, sort_order) VALUES
  ('timezone','Asia/Riyadh',  'Riyadh (UTC+3)','الرياض','{"utc_offset":"+03:00","dst":false}'::jsonb, 1),
  ('timezone','Asia/Dubai',   'Dubai (UTC+4)', 'دبي','{"utc_offset":"+04:00","dst":false}'::jsonb, 2),
  ('timezone','Asia/Kuwait',  'Kuwait (UTC+3)','الكويت','{"utc_offset":"+03:00","dst":false}'::jsonb, 3),
  ('timezone','Asia/Qatar',   'Qatar (UTC+3)', 'قطر','{"utc_offset":"+03:00","dst":false}'::jsonb, 4),
  ('timezone','Asia/Bahrain', 'Bahrain (UTC+3)','البحرين','{"utc_offset":"+03:00","dst":false}'::jsonb, 5),
  ('timezone','Asia/Muscat',  'Muscat (UTC+4)','مسقط','{"utc_offset":"+04:00","dst":false}'::jsonb, 6),
  ('timezone','Africa/Cairo', 'Cairo (UTC+2)', 'القاهرة','{"utc_offset":"+02:00","dst":true}'::jsonb, 7),
  ('timezone','Asia/Amman',   'Amman (UTC+3)', 'عمان','{"utc_offset":"+03:00","dst":true}'::jsonb, 8),
  ('timezone','Europe/London','London (UTC+0/+1)','لندن','{"utc_offset":"+00:00","dst":true}'::jsonb, 10),
  ('timezone','America/New_York','New York (UTC-5/-4)','نيويورك','{"utc_offset":"-05:00","dst":true}'::jsonb, 11),
  ('timezone','UTC',          'UTC',           'التوقيت العالمي','{"utc_offset":"+00:00","dst":false}'::jsonb, 99)
ON CONFLICT (category, code) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, meta = EXCLUDED.meta;

-- ════════════════════════════════════════════════════════════════════════════
-- REGULATORY FRAMEWORKS — top frameworks Shahin maps to
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO dos.foundation_cat_reference (category, code, name_en, name_ar, meta, sort_order) VALUES
  ('framework','PDPL',     'Personal Data Protection Law (KSA)','نظام حماية البيانات الشخصية','{"regulator":"SDAIA","jurisdiction":"SA","domain":"privacy"}'::jsonb, 10),
  ('framework','NCA-ECC',  'Essential Cybersecurity Controls','الضوابط الأساسية للأمن السيبراني','{"regulator":"NCA","jurisdiction":"SA","domain":"cybersecurity"}'::jsonb, 20),
  ('framework','NCA-CCC',  'Critical Systems Cybersecurity Controls','ضوابط الأمن السيبراني للأنظمة الحساسة','{"regulator":"NCA","jurisdiction":"SA","domain":"cybersecurity"}'::jsonb, 21),
  ('framework','SAMA-CSF', 'SAMA Cybersecurity Framework','إطار الأمن السيبراني للقطاع المالي','{"regulator":"SAMA","jurisdiction":"SA","domain":"cybersecurity"}'::jsonb, 30),
  ('framework','SAMA-IT',  'SAMA IT Governance Framework','إطار حوكمة تقنية المعلومات (ساما)','{"regulator":"SAMA","jurisdiction":"SA","domain":"it_governance"}'::jsonb, 31),
  ('framework','SAMA-BCM', 'SAMA Business Continuity Mgmt Framework','إطار إدارة استمرارية الأعمال (ساما)','{"regulator":"SAMA","jurisdiction":"SA","domain":"bcm"}'::jsonb, 32),
  ('framework','NDMO',     'National Data Management Office Standards','معايير المكتب الوطني لإدارة البيانات','{"regulator":"NDMO","jurisdiction":"SA","domain":"data_governance"}'::jsonb, 40),
  ('framework','CITC-RACR','Cloud Computing Regulatory Framework','الإطار التنظيمي للحوسبة السحابية','{"regulator":"CITC","jurisdiction":"SA","domain":"telecom_cloud"}'::jsonb, 50),
  ('framework','ISO27001', 'ISO/IEC 27001:2022','المواصفة 27001','{"regulator":"ISO","jurisdiction":"global","domain":"isms"}'::jsonb, 60),
  ('framework','ISO27701', 'ISO/IEC 27701 Privacy Mgmt','المواصفة 27701','{"regulator":"ISO","jurisdiction":"global","domain":"privacy"}'::jsonb, 61),
  ('framework','ISO22301', 'ISO 22301 Business Continuity','المواصفة 22301','{"regulator":"ISO","jurisdiction":"global","domain":"bcm"}'::jsonb, 62),
  ('framework','ISO9001',  'ISO 9001 Quality Mgmt','المواصفة 9001','{"regulator":"ISO","jurisdiction":"global","domain":"quality"}'::jsonb, 63),
  ('framework','ISO37001', 'ISO 37001 Anti-Bribery','المواصفة 37001','{"regulator":"ISO","jurisdiction":"global","domain":"anti_bribery"}'::jsonb, 64),
  ('framework','NIST-CSF', 'NIST Cybersecurity Framework 2.0','إطار NIST للأمن السيبراني','{"regulator":"NIST","jurisdiction":"global","domain":"cybersecurity"}'::jsonb, 70),
  ('framework','COBIT',    'COBIT 2019 IT Governance','حوكمة COBIT','{"regulator":"ISACA","jurisdiction":"global","domain":"it_governance"}'::jsonb, 71),
  ('framework','GDPR',     'EU General Data Protection Regulation','اللائحة الأوروبية لحماية البيانات','{"regulator":"EU","jurisdiction":"eu","domain":"privacy"}'::jsonb, 80),
  ('framework','SOX',      'Sarbanes-Oxley Act','قانون ساربينز-أوكسلي','{"regulator":"SEC","jurisdiction":"us","domain":"financial_controls"}'::jsonb, 81),
  ('framework','PCI-DSS',  'PCI DSS 4.0','معيار PCI DSS','{"regulator":"PCI-SSC","jurisdiction":"global","domain":"payment_card"}'::jsonb, 82),
  ('framework','ZATCA',    'ZATCA E-Invoicing','الفوترة الإلكترونية (هيئة الزكاة)','{"regulator":"ZATCA","jurisdiction":"SA","domain":"tax"}'::jsonb, 90),
  ('framework','IFRS17',   'IFRS 17 Insurance Contracts','المعيار الدولي للتقارير المالية 17','{"regulator":"IASB","jurisdiction":"global","domain":"insurance_accounting"}'::jsonb, 91),
  ('framework','BASEL3',   'Basel III Accord','اتفاقية بازل 3','{"regulator":"BCBS","jurisdiction":"global","domain":"banking_capital"}'::jsonb, 92),
  ('framework','MoH-CBAHI','CBAHI Healthcare Standards','معايير CBAHI','{"regulator":"MoH","jurisdiction":"SA","domain":"healthcare"}'::jsonb, 93),
  ('framework','JCI',      'Joint Commission International','اعتماد JCI','{"regulator":"JCI","jurisdiction":"global","domain":"healthcare"}'::jsonb, 94)
ON CONFLICT (category, code) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, meta = EXCLUDED.meta;

-- ════════════════════════════════════════════════════════════════════════════
-- SECTORS — high-level industry buckets
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO dos.foundation_cat_reference (category, code, name_en, name_ar, meta, sort_order) VALUES
  ('sector','banking',          'Banking',                 'البنوك',                  '{"primary_regulators":["SAMA","NCA","CMA","ZATCA"]}'::jsonb, 1),
  ('sector','insurance',        'Insurance & Reinsurance', 'التأمين',                 '{"primary_regulators":["SAMA","CMA"]}'::jsonb, 2),
  ('sector','capital_markets',  'Capital Markets',         'أسواق المال',             '{"primary_regulators":["CMA","SAMA"]}'::jsonb, 3),
  ('sector','fintech',          'Fintech',                 'التقنيات المالية',        '{"primary_regulators":["SAMA","CMA","CITC"]}'::jsonb, 4),
  ('sector','healthcare',       'Healthcare',              'الرعاية الصحية',          '{"primary_regulators":["MoH-CBAHI","PDPL"]}'::jsonb, 10),
  ('sector','pharma',           'Pharmaceuticals',         'الأدوية',                 '{"primary_regulators":["SFDA"]}'::jsonb, 11),
  ('sector','education',        'Education',               'التعليم',                 '{"primary_regulators":["MoE","ETEC"]}'::jsonb, 20),
  ('sector','government',       'Government / Public sector','الحكومي والقطاع العام','{"primary_regulators":["NCA","NDMO","Yesser"]}'::jsonb, 30),
  ('sector','telco',            'Telecommunications',      'الاتصالات',               '{"primary_regulators":["CITC","NCA","PDPL"]}'::jsonb, 40),
  ('sector','retail',           'Retail',                  'تجزئة',                   '{"primary_regulators":["ZATCA","PDPL"]}'::jsonb, 50),
  ('sector','manufacturing',    'Manufacturing',           'التصنيع',                 '{"primary_regulators":["SASO","HSE"]}'::jsonb, 60),
  ('sector','energy',           'Energy / Oil & Gas',      'الطاقة',                  '{"primary_regulators":["MoEnergy","Aramco-supplier"]}'::jsonb, 70),
  ('sector','utilities',        'Utilities',               'المرافق',                 '{"primary_regulators":["WERA","ECRA"]}'::jsonb, 71),
  ('sector','transport_logistics','Transport & Logistics', 'النقل واللوجستيات',       '{"primary_regulators":["MoT","Saudi Ports"]}'::jsonb, 80),
  ('sector','hospitality',      'Hospitality & Tourism',   'الضيافة والسياحة',        '{"primary_regulators":["MoT","STA"]}'::jsonb, 90),
  ('sector','technology',       'Technology / SaaS',       'التقنية',                 '{"primary_regulators":["CITC","NCA","PDPL"]}'::jsonb, 100),
  ('sector','professional_services','Professional services','الخدمات المهنية',        '{}'::jsonb, 110),
  ('sector','nonprofit',        'Non-profit / Charity',    'غير ربحي',                '{"primary_regulators":["MOL","NCNHRO"]}'::jsonb, 120),
  ('sector','holdings',         'Holdings / Conglomerate', 'شركات قابضة',             '{}'::jsonb, 130),
  ('sector','real_estate',      'Real Estate',             'عقارات',                  '{"primary_regulators":["REGA"]}'::jsonb, 140),
  ('sector','startup',          'Startup / SMB',           'شركة ناشئة',              '{}'::jsonb, 200)
ON CONFLICT (category, code) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, meta = EXCLUDED.meta;

-- ════════════════════════════════════════════════════════════════════════════
-- TENANT DEFAULTS — region × sector → bootstrap defaults
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO dos.foundation_cat_tenant_defaults
  (region_code, sector_code, default_locale, timezone, currency, fiscal_year_end_month, calendar_systems, date_format, regulators, meta)
VALUES
  ('SA-RUH', NULL,           'ar-SA', 'Asia/Riyadh', 'SAR', 12, ARRAY['gregorian','hijri'], 'YYYY-MM-DD', ARRAY['PDPL','NCA-ECC','ZATCA'], '{}'::jsonb),
  ('SA-RUH', 'banking',      'ar-SA', 'Asia/Riyadh', 'SAR', 12, ARRAY['gregorian','hijri'], 'YYYY-MM-DD', ARRAY['SAMA-CSF','SAMA-IT','SAMA-BCM','PDPL','NCA-ECC','BASEL3','ZATCA'], '{}'::jsonb),
  ('SA-RUH', 'healthcare',   'ar-SA', 'Asia/Riyadh', 'SAR', 12, ARRAY['gregorian','hijri'], 'YYYY-MM-DD', ARRAY['MoH-CBAHI','PDPL','NCA-ECC','ISO27001'], '{}'::jsonb),
  ('SA-RUH', 'government',   'ar-SA', 'Asia/Riyadh', 'SAR', 12, ARRAY['gregorian','hijri'], 'YYYY-MM-DD', ARRAY['NCA-ECC','NCA-CCC','NDMO','PDPL'], '{}'::jsonb),
  ('SA-RUH', 'telco',        'ar-SA', 'Asia/Riyadh', 'SAR', 12, ARRAY['gregorian','hijri'], 'YYYY-MM-DD', ARRAY['CITC-RACR','NCA-ECC','PDPL'], '{}'::jsonb),
  ('SA-RUH', 'energy',       'ar-SA', 'Asia/Riyadh', 'SAR', 12, ARRAY['gregorian','hijri'], 'YYYY-MM-DD', ARRAY['NCA-ECC','ISO27001','ISO22301'], '{}'::jsonb),
  ('SA-RUH', 'retail',       'ar-SA', 'Asia/Riyadh', 'SAR', 12, ARRAY['gregorian','hijri'], 'YYYY-MM-DD', ARRAY['ZATCA','PDPL','PCI-DSS'], '{}'::jsonb),
  ('AE-DXB', NULL,           'ar-AE', 'Asia/Dubai',  'AED', 12, ARRAY['gregorian'],          'YYYY-MM-DD', ARRAY['UAE-PDPL','TDRA','ISO27001'], '{}'::jsonb),
  ('AE-DXB', 'banking',      'ar-AE', 'Asia/Dubai',  'AED', 12, ARRAY['gregorian'],          'YYYY-MM-DD', ARRAY['CBUAE','SCA','UAE-PDPL'], '{}'::jsonb),
  ('KW-KWI', NULL,           'ar-KW', 'Asia/Kuwait', 'KWD', 12, ARRAY['gregorian'],          'YYYY-MM-DD', ARRAY['CBK','CMA-Kuwait'], '{}'::jsonb),
  ('QA-DOH', NULL,           'ar-QA', 'Asia/Qatar',  'QAR', 12, ARRAY['gregorian'],          'YYYY-MM-DD', ARRAY['QCB','QFC'], '{}'::jsonb),
  ('BH-BAH', NULL,           'ar-BH', 'Asia/Bahrain','BHD', 12, ARRAY['gregorian'],          'YYYY-MM-DD', ARRAY['CBB','PDPL-BH'], '{}'::jsonb),
  ('OM-MCT', NULL,           'ar-OM', 'Asia/Muscat', 'OMR', 12, ARRAY['gregorian','hijri'], 'YYYY-MM-DD', ARRAY['CMA-Oman','OPDPL'], '{}'::jsonb),
  ('EG-CAI', NULL,           'ar-EG', 'Africa/Cairo','EGP', 6,  ARRAY['gregorian'],          'YYYY-MM-DD', ARRAY['EG-PDPL','CBE','FRA'], '{}'::jsonb)
ON CONFLICT (region_code, sector_code) DO UPDATE SET
  default_locale = EXCLUDED.default_locale, timezone = EXCLUDED.timezone,
  currency = EXCLUDED.currency, fiscal_year_end_month = EXCLUDED.fiscal_year_end_month,
  calendar_systems = EXCLUDED.calendar_systems, date_format = EXCLUDED.date_format,
  regulators = EXCLUDED.regulators, meta = EXCLUDED.meta;

COMMIT;
