BEGIN;
INSERT INTO dos.ui_module (profile_code,code,name,card_position,is_business_card,icon,color_token,description,enabled,version) VALUES
  ('grc','governance','Governance & Authority',1,TRUE,'scale','token-color-governance','Governance & Authority',TRUE,'1.0.0'),
  ('grc','qiyas','Qiyas / Maturity & Strategy',2,TRUE,'chart-trend','token-color-qiyas','Qiyas / Maturity & Strategy',TRUE,'1.0.0'),
  ('grc','regulatory','Regulatory Intelligence',3,TRUE,'regulation','token-color-regulatory','Regulatory Intelligence',TRUE,'1.0.0'),
  ('grc','compliance','Compliance Management',4,TRUE,'check-shield','token-color-compliance','Compliance Management',TRUE,'1.0.0'),
  ('grc','risk','Risk Management',5,TRUE,'alert-triangle','token-color-risk','Risk Management',TRUE,'1.0.0'),
  ('grc','controls','Controls Management',6,TRUE,'filter','token-color-controls','Controls Management',TRUE,'1.0.0'),
  ('grc','policy','Policy Management',7,TRUE,'file-document','token-color-policy','Policy Management',TRUE,'1.0.0'),
  ('grc','asset','Asset & Business Context',8,TRUE,'cube','token-color-asset','Asset & Business Context',TRUE,'1.0.0'),
  ('grc','vendor','Third-Party / Vendor Risk',9,TRUE,'building-shield','token-color-vendor','Third-Party / Vendor Risk',TRUE,'1.0.0'),
  ('grc','incident','Incident Management',10,TRUE,'bug','token-color-incident','Incident Management',TRUE,'1.0.0'),
  ('grc','exceptions','Exceptions & Waivers',11,TRUE,'warning-octagon','token-color-exceptions','Exceptions & Waivers',TRUE,'1.0.0'),
  ('grc','issues','Issues, Actions & Remediation',12,TRUE,'clipboard-list','token-color-issues','Issues, Actions & Remediation',TRUE,'1.0.0'),
  ('grc','evidence','Evidence Management',13,TRUE,'paperclip','token-color-evidence','Evidence Management',TRUE,'1.0.0'),
  ('grc','audit','Audit & Assurance',14,TRUE,'clipboard-check','token-color-audit','Audit & Assurance',TRUE,'1.0.0'),
  ('grc','bcp','BCP & Operational Resilience',15,TRUE,'shield-lock','token-color-bcp','BCP & Operational Resilience',TRUE,'1.0.0'),
  ('grc','training','Training & Awareness',16,TRUE,'graduation-cap','token-color-training','Training & Awareness',TRUE,'1.0.0'),
  ('grc','reporting','Reporting, Analytics & Executive Cockpit',17,TRUE,'chart-bar','token-color-reporting','Reporting, Analytics & Executive Cockpit',TRUE,'1.0.0'),
  ('grc','ai_governance','AI Governance / AGRC Engine',18,TRUE,'brain','token-color-ai','AI Governance / AGRC Engine',TRUE,'1.0.0');
COMMIT;
