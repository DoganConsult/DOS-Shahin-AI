#!/usr/bin/env python3
"""
KSA GRC Deep Drill Matrix Builder
Adds comprehensive KSA intelligence sheets to Shahin_GRC_Global_AllCountries.xlsx
Covers: 147 regulators (local+international) × 17 sectors × 12 org types × 6 org sizes
× frameworks × controls × evidence × risk
"""

import os
from openpyxl import load_workbook
from openpyxl.styles import (PatternFill, Font, Alignment, Border, Side)
from openpyxl.utils import get_column_letter
from openpyxl.formatting.rule import ColorScaleRule, DataBarRule

FILE = '/root/DOS-AIO/DOS-AIO-Specs/Shahin_GRC_Global_AllCountries.xlsx'

# ─── Styles ───────────────────────────────────────────────────────────────────
def fill(hex_color):
    return PatternFill('solid', fgColor=hex_color)
def thin():
    s = Side(border_style='thin', color='FFB0BEC5')
    return Border(left=s, right=s, top=s, bottom=s)
def fat():
    s = Side(border_style='medium', color='FF37474F')
    return Border(left=s, right=s, top=s, bottom=s)

F = {
    'title': Font(name='Calibri', size=13, bold=True, color='FFFFFFFF'),
    'sec':   Font(name='Calibri', size=11, bold=True, color='FFFFFFFF'),
    'hdr':   Font(name='Calibri', size=10, bold=True, color='FFFFFFFF'),
    'body':  Font(name='Calibri', size=9),
    'body_b':Font(name='Calibri', size=9, bold=True),
    'small': Font(name='Calibri', size=8, color='FF555555'),
    'link':  Font(name='Calibri', size=9, color='FF1565C0', underline='single'),
}
AL = Alignment(horizontal='left',   vertical='center', wrap_text=True)
AC = Alignment(horizontal='center', vertical='center', wrap_text=True)

C = {
    'T1':'FFC0392B','T2':'FFE67E22','T3':'FFF39C12','T4':'FF27AE60',
    'INTL':'FF1565C0','GCC':'FF6A1B9A',
    'SEC_CYBER':'FF1A237E','SEC_FIN':'FF0D47A1','SEC_HC':'FF880E4F',
    'SEC_ICT':'FF1B5E20','SEC_ENERGY':'FF4E342E','SEC_TRADE':'FF01579B',
    'SEC_GOV':'FF37474F','SEC_EDU':'FF004D40','SEC_TRANSPORT':'FF3E2723',
    'ROW_ALT':'FFF5F5F5','WHITE':'FFFFFFFF',
    'MANDATORY':'FFE8F5E9','PARTIAL':'FFFFF9C4','NA':'FFFCE4EC',
    'HIGH_RISK':'FFFF5252','MED_RISK':'FFFFD740','LOW_RISK':'FF69F0AE',
    'T1_BG':'FFFDECEA','T2_BG':'FFFEF9F0','T3_BG':'FFFFFDE7',
    'T4_BG':'FFF1F8E9','INTL_BG':'FFE3F2FD','GCC_BG':'FFF3E5F5',
}

def banner(ws, row, text, bg, ncols=16, height=18):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=ncols)
    c = ws.cell(row=row, column=1, value=text)
    c.fill = fill(bg); c.font = F['sec']; c.alignment = AL
    c.border = fat()
    ws.row_dimensions[row].height = height

def hdr_row(ws, row, cols, bg):
    for ci, v in enumerate(cols, 1):
        c = ws.cell(row=row, column=ci, value=v)
        c.fill = fill(bg); c.font = F['hdr']; c.alignment = AC; c.border = thin()
    ws.row_dimensions[row].height = 30

def data(ws, row, vals, bg='FFFFFFFF', bold=False):
    fnt = F['body_b'] if bold else F['body']
    for ci, v in enumerate(vals, 1):
        c = ws.cell(row=row, column=ci, value=v)
        c.fill = fill(bg); c.font = fnt; c.alignment = AL; c.border = thin()

def data_c(ws, row, vals, bg='FFFFFFFF'):
    for ci, v in enumerate(vals, 1):
        c = ws.cell(row=row, column=ci, value=v)
        c.fill = fill(bg); c.font = F['body']; c.alignment = AC; c.border = thin()

def col_widths(ws, widths):
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

# ═══════════════════════════════════════════════════════════════════════════════
#  DATA DEFINITIONS
# ═══════════════════════════════════════════════════════════════════════════════

# ── KSA Local Regulators (132 in DB; grouped by tier + sector) ────────────────
KSA_LOCAL_REGS = [
  # T1 PRIMARY — Highest enforcement power
  {'code':'NCA','name_en':'National Cybersecurity Authority','name_ar':'الهيئة الوطنية للأمن السيبراني','sector':'Cybersecurity','tier':'T1','own_fw':7,'power':98,'url':'https://nca.gov.sa','notes':'Issues ECC, OTCC, CCC, DCC, CSCC'},
  {'code':'SDAIA','name_en':'Saudi Data & AI Authority','name_ar':'هيئة البيانات والذكاء الاصطناعي','sector':'Data/AI','tier':'T1','own_fw':5,'power':95,'url':'https://sdaia.gov.sa','notes':'PDPL regulator, AI strategy'},
  {'code':'SAMA','name_en':'Saudi Arabian Monetary Authority','name_ar':'البنك المركزي السعودي','sector':'Financial','tier':'T1','own_fw':8,'power':98,'url':'https://sama.gov.sa','notes':'Banks, insurance, payments, fintechs'},
  {'code':'CMA','name_en':'Capital Market Authority','name_ar':'هيئة السوق المالية','sector':'Capital Markets','tier':'T1','own_fw':5,'power':90,'url':'https://cma.org.sa','notes':'Tadawul, listed cos, investment funds'},
  {'code':'CITC','name_en':'Communications & IT Commission','name_ar':'هيئة الاتصالات وتقنية المعلومات','sector':'ICT/Telecom','tier':'T1','own_fw':4,'power':88,'url':'https://citc.gov.sa','notes':'Telecom licensing, digital services'},
  {'code':'SFDA','name_en':'Saudi Food & Drug Authority','name_ar':'الهيئة العامة للغذاء والدواء','sector':'Healthcare/Pharma','tier':'T1','own_fw':6,'power':87,'url':'https://sfda.gov.sa','notes':'Medical devices, pharma, food safety'},
  {'code':'MOH','name_en':'Ministry of Health','name_ar':'وزارة الصحة','sector':'Healthcare','tier':'T1','own_fw':5,'power':85,'url':'https://moh.gov.sa','notes':'Hospital standards, HIS, patient data'},
  {'code':'ZATCA','name_en':'Zakat, Tax & Customs Authority','name_ar':'هيئة الزكاة والضريبة والجمارك','sector':'Tax/Customs','tier':'T1','own_fw':4,'power':90,'url':'https://zatca.gov.sa','notes':'VAT, e-invoicing (Fatoorah), customs'},
  {'code':'MHRSD','name_en':'Ministry of HR & Social Development','name_ar':'وزارة الموارد البشرية والتنمية الاجتماعية','sector':'Labour','tier':'T1','own_fw':3,'power':80,'url':'https://mhrsd.gov.sa','notes':'Nitaqat, Saudisation, labour contracts'},
  {'code':'MOI','name_en':'Ministry of Interior','name_ar':'وزارة الداخلية','sector':'Security/CNI','tier':'T1','own_fw':2,'power':95,'url':'https://moi.gov.sa','notes':'CNI protection, national security'},
  # T2 SECTOR — Strong enforcement
  {'code':'CCHI','name_en':'Council of Cooperative Health Insurance','name_ar':'مجلس الضمان الصحي التعاوني','sector':'Healthcare Insurance','tier':'T2','own_fw':3,'power':82,'url':'https://cchi.gov.sa','notes':'Health insurance mandates'},
  {'code':'CBAHI','name_en':'Central Board for Accreditation of HCI','name_ar':'المركز السعودي لاعتماد المنشآت الصحية','sector':'Healthcare Accred.','tier':'T2','own_fw':3,'power':78,'url':'https://cbahi.gov.sa','notes':'Hospital accreditation standards'},
  {'code':'GAHAR','name_en':'General Authority for Healthcare Accreditation & Research','name_ar':'الهيئة العامة للاعتماد وتقييم المنشآت الصحية','sector':'Healthcare','tier':'T2','own_fw':2,'power':75,'url':'https://gahar.gov.sa','notes':'Quality & patient safety'},
  {'code':'SCA','name_en':'Saudi Contractors Authority','name_ar':'هيئة المقاولين','sector':'Construction','tier':'T2','own_fw':2,'power':55,'url':'','notes':''},
  {'code':'NCSC','name_en':'National Cybersecurity Committee (Ops)','name_ar':'اللجنة الوطنية للأمن السيبراني','sector':'Cybersecurity Ops','tier':'T2','own_fw':1,'power':70,'url':'','notes':'Coordinates with NCA'},
  {'code':'NDMO','name_en':'National Data Management Office','name_ar':'مكتب إدارة البيانات الوطني','sector':'Data Gov.','tier':'T2','own_fw':2,'power':72,'url':'https://ndmo.gov.sa','notes':'Data governance policy (under SDAIA)'},
  {'code':'MISA','name_en':'Ministry of Investment','name_ar':'وزارة الاستثمار','sector':'Investment','tier':'T2','own_fw':1,'power':65,'url':'https://misa.gov.sa','notes':'Foreign investment, economic zones'},
  {'code':'DGA','name_en':'Digital Government Authority','name_ar':'هيئة الحكومة الرقمية','sector':'Digital Gov.','tier':'T2','own_fw':3,'power':78,'url':'https://dga.gov.sa','notes':'Gov cloud, digital transformation'},
  {'code':'MCIT','name_en':'Ministry of Communications & IT','name_ar':'وزارة الاتصالات وتقنية المعلومات','sector':'ICT','tier':'T2','own_fw':3,'power':75,'url':'https://mcit.gov.sa','notes':'Digital economy strategy'},
  {'code':'MOE_ED','name_en':'Ministry of Education','name_ar':'وزارة التعليم','sector':'Education','tier':'T2','own_fw':2,'power':60,'url':'https://moe.gov.sa','notes':'EdTech, student data protection'},
  {'code':'MOJ','name_en':'Ministry of Justice','name_ar':'وزارة العدل','sector':'Legal','tier':'T2','own_fw':2,'power':70,'url':'https://moj.gov.sa','notes':'Electronic transactions, Notary'},
  {'code':'MOF','name_en':'Ministry of Finance','name_ar':'وزارة المالية','sector':'Public Finance','tier':'T2','own_fw':2,'power':75,'url':'https://mof.gov.sa','notes':'Gov procurement, IPSAS'},
  {'code':'ECRA','name_en':'Electricity & Cogeneration Regulatory Authority','name_ar':'هيئة تنظيم الكهرباء','sector':'Energy','tier':'T2','own_fw':3,'power':72,'url':'https://ecra.gov.sa','notes':'Power grid, renewable energy'},
  {'code':'NCPD','name_en':'National Center for Privatization & PPP','name_ar':'المركز الوطني للتخصيص والشراكة','sector':'PPP/Privatisation','tier':'T2','own_fw':1,'power':58,'url':'','notes':''},
  {'code':'GAC','name_en':'General Authority of Customs','name_ar':'الهيئة العامة للجمارك','sector':'Customs','tier':'T2','own_fw':2,'power':70,'url':'https://gca.gov.sa','notes':'Trade compliance, AEO'},
  {'code':'GOSI','name_en':'General Organisation for Social Insurance','name_ar':'المؤسسة العامة للتأمينات الاجتماعية','sector':'Social Insurance','tier':'T2','own_fw':2,'power':68,'url':'https://gosi.gov.sa','notes':'Pension, work injury'},
  {'code':'ETEC','name_en':'Education Evaluation & Training Accreditation Commission','name_ar':'المركز الوطني للتقويم والاعتماد الأكاديمي','sector':'Education Accred.','tier':'T2','own_fw':2,'power':55,'url':'','notes':''},
  {'code':'SCFHS','name_en':'Saudi Commission for Health Specialties','name_ar':'الهيئة السعودية للتخصصات الصحية','sector':'Health Workforce','tier':'T2','own_fw':2,'power':62,'url':'https://scfhs.org.sa','notes':'Health professional licensing'},
  {'code':'SCTH','name_en':'Saudi Commission for Tourism & National Heritage','name_ar':'الهيئة السعودية للسياحة','sector':'Tourism','tier':'T2','own_fw':1,'power':45,'url':'','notes':''},
  {'code':'GACA','name_en':'General Authority of Civil Aviation','name_ar':'الهيئة العامة للطيران المدني','sector':'Aviation','tier':'T2','own_fw':3,'power':78,'url':'https://gaca.gov.sa','notes':'ICAO compliance, aviation safety'},
  {'code':'MAWANI','name_en':'Saudi Ports Authority','name_ar':'الهيئة العامة للموانئ','sector':'Maritime/Ports','tier':'T2','own_fw':2,'power':62,'url':'https://mawani.gov.sa','notes':'Port operations, trade'},
  {'code':'MOT','name_en':'Ministry of Transport','name_ar':'وزارة النقل','sector':'Transport','tier':'T2','own_fw':2,'power':65,'url':'https://mot.gov.sa','notes':'Road, rail, logistics'},
  {'code':'WERA','name_en':'Water & Electricity Regulatory Authority','name_ar':'الهيئة التنظيمية للمياه والكهرباء','sector':'Water/Energy','tier':'T2','own_fw':2,'power':65,'url':'https://wera.gov.sa','notes':'Utility regulation'},
  {'code':'NHC','name_en':'National Housing Company','name_ar':'الشركة الوطنية للإسكان','sector':'Real Estate','tier':'T2','own_fw':1,'power':50,'url':'','notes':''},
  {'code':'MOMRAH','name_en':'Ministry of Municipal & Rural Affairs & Housing','name_ar':'وزارة الشؤون البلدية والقروية والإسكان','sector':'Municipal','tier':'T2','own_fw':2,'power':55,'url':'','notes':''},
  {'code':'GASTAT','name_en':'General Authority for Statistics','name_ar':'الهيئة العامة للإحصاء','sector':'Statistics','tier':'T2','own_fw':1,'power':48,'url':'https://stats.gov.sa','notes':'Data sharing, national statistics'},
  {'code':'NAZAHA','name_en':'National Anti-Corruption Commission','name_ar':'هيئة الرقابة ومكافحة الفساد – نزاهة','sector':'Anti-Corruption','tier':'T2','own_fw':2,'power':82,'url':'https://nazaha.gov.sa','notes':'Whistleblowing, integrity'},
  {'code':'NCWCD','name_en':'National Centre for Wildlife Conservation','name_ar':'المركز الوطني لتنمية الحياة الفطرية','sector':'Environment','tier':'T3','own_fw':1,'power':35,'url':'','notes':''},
  {'code':'GCAM','name_en':'General Commission for Audiovisual Media','name_ar':'هيئة الأفلام','sector':'Media','tier':'T3','own_fw':1,'power':42,'url':'','notes':'Content regulations'},
  {'code':'SMEA','name_en':'Small & Medium Enterprises Authority','name_ar':'هيئة المنشآت الصغيرة والمتوسطة','sector':'SME','tier':'T3','own_fw':1,'power':48,'url':'https://monshaat.gov.sa','notes':'SME enabling, simplified compliance'},
  {'code':'SASO','name_en':'Saudi Standards, Metrology & Quality Org.','name_ar':'المؤسسة العربية السعودية للمواصفات والمقاييس','sector':'Standards','tier':'T2','own_fw':4,'power':68,'url':'https://saso.gov.sa','notes':'Product standards, halal, conformity'},
  {'code':'PIF','name_en':'Public Investment Fund','name_ar':'صندوق الاستثمارات العامة','sector':'Sovereign Investment','tier':'T2','own_fw':1,'power':75,'url':'https://pif.gov.sa','notes':'Giga-project compliance'},
  {'code':'SIDF','name_en':'Saudi Industrial Development Fund','name_ar':'صندوق التنمية الصناعية السعودية','sector':'Industry Finance','tier':'T3','own_fw':1,'power':52,'url':'','notes':''},
  {'code':'SIMAH','name_en':'Saudi Credit Bureau','name_ar':'الشركة السعودية للمعلومات الائتمانية','sector':'Credit','tier':'T3','own_fw':1,'power':55,'url':'https://simah.com','notes':'Credit reporting, SAMA oversight'},
  {'code':'TADAWUL','name_en':'Saudi Exchange','name_ar':'تداول السعودية','sector':'Capital Markets Exchange','tier':'T2','own_fw':3,'power':72,'url':'https://saudiexchange.sa','notes':'Listing requirements, disclosure'},
  {'code':'TVTC','name_en':'Technical & Vocational Training Corporation','name_ar':'المؤسسة العامة للتدريب التقني والمهني','sector':'Vocational Training','tier':'T3','own_fw':1,'power':40,'url':'','notes':''},
  {'code':'HRDF','name_en':'Human Resources Development Fund','name_ar':'صندوق تنمية الموارد البشرية','sector':'Workforce Dev.','tier':'T3','own_fw':1,'power':42,'url':'','notes':'Saudisation programs'},
  {'code':'KACARE','name_en':'King Abdullah City for Atomic & Renewable Energy','name_ar':'مدينة الملك عبدالله للطاقة الذرية والمتجددة','sector':'Nuclear/Renewable','tier':'T2','own_fw':3,'power':70,'url':'https://kacare.gov.sa','notes':'Nuclear safety, renewable standards'},
  {'code':'NCEL','name_en':'National Centre for Environmental Lab','name_ar':'المركز الوطني للرقابة على الالتزام البيئي','sector':'Environment','tier':'T3','own_fw':2,'power':45,'url':'','notes':''},
  {'code':'MEWA','name_en':'Ministry of Environment, Water & Agriculture','name_ar':'وزارة البيئة والمياه والزراعة','sector':'Environment/Agriculture','tier':'T2','own_fw':2,'power':55,'url':'','notes':''},
  {'code':'MODON','name_en':'Saudi Authority for Industrial Cities & Tech Zones','name_ar':'المدن الصناعية ومناطق التقنية','sector':'Industrial Zones','tier':'T2','own_fw':2,'power':58,'url':'https://modon.gov.sa','notes':'Industrial city compliance'},
  {'code':'RCJY','name_en':'Royal Commission for Jubail & Yanbu','name_ar':'الهيئة الملكية للجبيل وينبع','sector':'Special Industrial','tier':'T2','own_fw':2,'power':60,'url':'https://rcjy.gov.sa','notes':'Industrial zone standards'},
  {'code':'NEOM','name_en':'NEOM Company','name_ar':'نيوم','sector':'Giga Projects','tier':'T2','own_fw':2,'power':65,'url':'https://neom.com','notes':'Smart city, technology regulations'},
  {'code':'NHIC','name_en':'National Health Information Centre','name_ar':'المركز الوطني للمعلومات الصحية','sector':'Health Data','tier':'T2','own_fw':2,'power':68,'url':'','notes':'NABIDH data exchange standards'},
  {'code':'SHC_KSA','name_en':'Saudi Health Council','name_ar':'المجلس الصحي السعودي','sector':'Healthcare Policy','tier':'T2','own_fw':2,'power':65,'url':'','notes':'Health strategy coordination'},
  {'code':'QIWA','name_en':'QIWA Platform (MHRSD)','name_ar':'منصة قوى','sector':'Labour Digital','tier':'T3','own_fw':1,'power':60,'url':'https://qiwa.com.sa','notes':'Labour contract management platform'},
  {'code':'YESSER','name_en':'Yesser – e-Government programme','name_ar':'برنامج يسر','sector':'e-Gov','tier':'T3','own_fw':2,'power':58,'url':'https://yesser.gov.sa','notes':'Interoperability, national ID'},
  {'code':'SPL','name_en':'Saudi Post / SPL','name_ar':'البريد السعودي','sector':'Post/Logistics','tier':'T3','own_fw':1,'power':40,'url':'','notes':''},
  {'code':'SSC','name_en':'Social Security Commission','name_ar':'هيئة الضمان الاجتماعي','sector':'Social Security','tier':'T3','own_fw':1,'power':45,'url':'','notes':''},
  {'code':'MOIA','name_en':'Ministry of Islamic Affairs','name_ar':'وزارة الشؤون الإسلامية','sector':'Religious','tier':'T3','own_fw':1,'power':42,'url':'','notes':''},
]

# ── International Regulators/Bodies Operating in KSA ─────────────────────────
KSA_INTL_REGS = [
  {'code':'FATF','name_en':'Financial Action Task Force','body':'FATF','applies_to':'ALL','focal':'SAMA/FIU','mandatory':True,'enforcement':'Via national law','frameworks':['FATF-40 Recommendations','FATF VAs Standard'],'controls':65,'notes':'KSA is MENA-FATF member; SAMA/FIA enforce'},
  {'code':'BCBS','name_en':'Basel Committee on Banking Supervision','body':'BIS','applies_to':'Banks','focal':'SAMA','mandatory':True,'enforcement':'Via SAMA regulations','frameworks':['Basel III','Basel IV (phased)'],'controls':125,'notes':'SAMA implements via banking regulations'},
  {'code':'IOSCO','name_en':'IOSCO – Intl Org of Securities Commissions','body':'IOSCO','applies_to':'Capital Markets','focal':'CMA','mandatory':True,'enforcement':'Via CMA rules','frameworks':['IOSCO Principles'],'controls':38,'notes':'CMA is full IOSCO member'},
  {'code':'AAOIFI','name_en':'AAOIFI – Accounting & Audit for Islamic Finance','body':'AAOIFI','applies_to':'Islamic Finance','focal':'SAMA/CMA','mandatory':True,'enforcement':'SAMA endorses','frameworks':['AAOIFI Sharia Standards'],'controls':60,'notes':'Mandatory for Islamic banks in KSA'},
  {'code':'IFSB','name_en':'IFSB – Islamic Financial Stability Board','body':'IFSB','applies_to':'Islamic Finance','focal':'SAMA','mandatory':True,'enforcement':'Via SAMA','frameworks':['IFSB Core Principles'],'controls':29,'notes':'Prudential standards for Islamic banking'},
  {'code':'SWIFT_BODY','name_en':'SWIFT – Society for Worldwide Interbank Telecom','body':'SWIFT','applies_to':'Banks/FIs','focal':'SAMA','mandatory':True,'enforcement':'Technical requirement','frameworks':['SWIFT CSP 2024'],'controls':31,'notes':'31 controls (23 mandatory); annual attestation'},
  {'code':'ISO_IEC','name_en':'ISO/IEC – International Standards Bodies','body':'ISO/IEC','applies_to':'ALL','focal':'NCA/SASO','mandatory':True,'enforcement':'NCA mandates ISO 27001 for regulated sectors','frameworks':['ISO 27001:2022','ISO 27701','ISO 27017','IEC 62443'],'controls':230,'notes':'ISO 27001 now mandatory for NCA-regulated entities'},
  {'code':'NIST_US','name_en':'NIST – US National Inst. Standards & Technology','body':'NIST','applies_to':'ALL (benchmark)','focal':'NCA','mandatory':False,'enforcement':'Voluntary benchmark','frameworks':['NIST CSF 2.0','NIST SP 800-53'],'controls':106,'notes':'NCA ECC aligned to NIST; widely referenced'},
  {'code':'PCI_SSC','name_en':'PCI SSC – Payment Card Industry Security Council','body':'PCI SSC','applies_to':'Payment/Cards','focal':'SAMA/CITC','mandatory':True,'enforcement':'Card brand requirement','frameworks':['PCI DSS v4.0'],'controls':300,'notes':'Mandatory for any org accepting card payments'},
  {'code':'IASB','name_en':'IASB – International Accounting Standards Board','body':'IASB','applies_to':'Listed Companies','focal':'CMA/MOF','mandatory':True,'enforcement':'CMA requires IFRS for listed','frameworks':['IFRS Standards'],'controls':0,'notes':'All TADAWUL-listed companies must report IFRS'},
  {'code':'GCC_SEC','name_en':'GCC Secretariat – Gulf Cooperation Council','body':'GCC','applies_to':'Cross-GCC','focal':'MOF/SAMA','mandatory':True,'enforcement':'Regional treaty obligations','frameworks':['GCC Unified AML Framework','GCC Customs Union'],'controls':30,'notes':'Cross-border regulatory harmonisation'},
  {'code':'ICRG','name_en':'ICRG – FATF-Style Regional Body (MENAFATF)','body':'MENAFATF','applies_to':'ALL','focal':'SAMA/FIA','mandatory':True,'enforcement':'Mutual evaluation binding','frameworks':['FATF 40 Recommendations (MENA Focus)'],'controls':40,'notes':'KSA underwent FATF mutual evaluation 2024'},
  {'code':'IAIS','name_en':'IAIS – Intl. Association of Insurance Supervisors','body':'IAIS','applies_to':'Insurance','focal':'SAMA','mandatory':True,'enforcement':'Via SAMA insurance rules','frameworks':['IAIS Core Principles','ICP'],'controls':28,'notes':'SAMA insurance supervision aligned to ICP'},
  {'code':'IAEA_BODY','name_en':'IAEA – Intl. Atomic Energy Agency','body':'IAEA','applies_to':'Nuclear','focal':'KACARE/MOI','mandatory':True,'enforcement':'Treaty obligation','frameworks':['IAEA Safety Standards'],'controls':45,'notes':'Applies to KACARE nuclear programme'},
  {'code':'WHO_BODY','name_en':'WHO – World Health Organization','body':'WHO','applies_to':'Healthcare','focal':'MOH','mandatory':False,'enforcement':'Guidance','frameworks':['IHR 2005','WHO Standards'],'controls':20,'notes':'Pandemic preparedness, health standards'},
]

# ── KSA Sectors with Full Regulatory Mapping ──────────────────────────────────
KSA_SECTORS = [
  {
    'code':'FIN','name':'Financial Services','name_ar':'الخدمات المالية','emoji':'🏦',
    'color':'FF0D47A1','reg_count':3,'intl_count':7,
    'primary_regs':['SAMA','CMA','ZATCA'],
    'intl_regs':['FATF','BCBS','IOSCO','AAOIFI','IFSB','SWIFT_BODY','IASB'],
    'key_frameworks':['SAMA-CSF','NCA-ECC-2:2024','PDPL-2021','FATF-40','Basel III','AAOIFI-SS','PCI-DSS-4','ISO-27001-2022'],
    'control_count':387,'risk_level':'CRITICAL','iot_intensity':'LOW',
    'mandatory_certs':['ISO 27001','PCI DSS (if cards)','SAMA CSF Self-Assessment'],
    'audit_freq':'ANNUAL + CONTINUOUS',
    'org_types':['Bank','Islamic Bank','Insurance Company','Fintech','Payment Provider','Money Exchange','Capital Market Firm','Investment Fund'],
  },
  {
    'code':'HC','name':'Healthcare & Life Sciences','name_ar':'الرعاية الصحية وعلوم الحياة','emoji':'🏥',
    'color':'FF880E4F','reg_count':7,'intl_count':3,
    'primary_regs':['MOH','SFDA','CBAHI','GAHAR','CCHI','SCFHS','NHIC'],
    'intl_regs':['ISO_IEC','WHO_BODY','PCI_SSC'],
    'key_frameworks':['MOH-HIS','SFDA-MDR','CBAHI-STDS','NCA-ECC-2:2024','NCA-OTCC-1:2022','PDPL-2021','ISO-27001-2022','IEC-62443'],
    'control_count':298,'risk_level':'CRITICAL','iot_intensity':'HIGHEST',
    'mandatory_certs':['CBAHI Accreditation','SFDA Registration','ISO 27001 (for HIS)'],
    'audit_freq':'ANNUAL + AS_REQUIRED',
    'org_types':['Public Hospital','Private Hospital','Medical Device Manufacturer','Pharmacy','Health Insurance','Polyclinic','Lab'],
  },
  {
    'code':'CYB','name':'Cybersecurity & Data','name_ar':'الأمن السيبراني والبيانات','emoji':'🔒',
    'color':'FF1A237E','reg_count':4,'intl_count':3,
    'primary_regs':['NCA','SDAIA','NDMO','NCSC'],
    'intl_regs':['ISO_IEC','NIST_US','PCI_SSC'],
    'key_frameworks':['NCA-ECC-2:2024','NCA-OTCC-1:2022','NCA-CCC-1:2020','NCA-DCC-1:2022','PDPL-2021','ISO-27001-2022','ISO-27701'],
    'control_count':358,'risk_level':'CRITICAL','iot_intensity':'HIGHEST',
    'mandatory_certs':['NCA Self-Assessment','ISO 27001','PDPL DPO registration'],
    'audit_freq':'ANNUAL',
    'org_types':['MSSP','Cybersecurity Vendor','Cloud Provider','Data Centre','Gov Entity','CNI Operator'],
  },
  {
    'code':'ICT','name':'ICT / Digital / Telecom','name_ar':'تقنية المعلومات والاتصالات','emoji':'📡',
    'color':'FF1B5E20','reg_count':4,'intl_count':2,
    'primary_regs':['CITC','MCIT','DGA','YESSER'],
    'intl_regs':['ISO_IEC','PCI_SSC'],
    'key_frameworks':['CITC-REGS','NCA-ECC-2:2024','PDPL-2021','DGA-CLOUD','ISO-27001-2022','NCA-CCC-1:2020'],
    'control_count':245,'risk_level':'HIGH','iot_intensity':'HIGH',
    'mandatory_certs':['CITC License','NCA ECC Self-Assessment','ISO 27001'],
    'audit_freq':'ANNUAL',
    'org_types':['Telecom Operator','ISP','Cloud Provider','SaaS Company','IT Services'],
  },
  {
    'code':'ENR','name':'Energy & Utilities','name_ar':'الطاقة والمرافق','emoji':'⚡',
    'color':'FF4E342E','reg_count':5,'intl_count':2,
    'primary_regs':['ECRA','WERA','KACARE','MOI','MEWA'],
    'intl_regs':['ISO_IEC','IAEA_BODY'],
    'key_frameworks':['NCA-OTCC-1:2022','NCA-ECC-2:2024','IEC-62443','ISO-27001-2022','IAEA-Safety-Standards','ECRA-REGS'],
    'control_count':223,'risk_level':'CRITICAL','iot_intensity':'HIGHEST',
    'mandatory_certs':['NCA OTCC Assessment','ISO 27001','IEC 62443 (OT systems)'],
    'audit_freq':'BIENNIAL + CONTINUOUS(OT)',
    'org_types':['Power Generator','Utility Operator','Oil & Gas','Renewable Energy','Water Authority'],
  },
  {
    'code':'GOV','name':'Government & Public Sector','name_ar':'القطاع الحكومي','emoji':'🏛️',
    'color':'FF37474F','reg_count':6,'intl_count':1,
    'primary_regs':['NCA','DGA','MOI','MOF','YESSER','MCIT'],
    'intl_regs':['ISO_IEC'],
    'key_frameworks':['NCA-ECC-2:2024','NCA-CCC-1:2020','PDPL-2021','DGA-CLOUD','ISO-27001-2022','GOV-ARCH-STANDARDS'],
    'control_count':305,'risk_level':'CRITICAL','iot_intensity':'MODERATE',
    'mandatory_certs':['NCA Self-Assessment (mandatory for all gov)','DGA Cloud compliance'],
    'audit_freq':'ANNUAL',
    'org_types':['Ministry','Government Agency','Royal Commission','Regulatory Body','Municipality'],
  },
  {
    'code':'TAX','name':'Tax / Customs / Trade','name_ar':'الضرائب والجمارك والتجارة','emoji':'📋',
    'color':'FF01579B','reg_count':3,'intl_count':2,
    'primary_regs':['ZATCA','GAC','MISA'],
    'intl_regs':['FATF','GCC_SEC'],
    'key_frameworks':['ZATCA-VAT-REGS','ZATCA-ETAX','ZATCA-ZAKAT','GCC-CUSTOMS-UNION','AML-CTF-LAW'],
    'control_count':115,'risk_level':'HIGH','iot_intensity':'LOW',
    'mandatory_certs':['ZATCA e-invoicing compliance','AEO (for importers)'],
    'audit_freq':'ANNUAL',
    'org_types':['Any Business Entity','Importer/Exporter','E-Commerce','SME'],
  },
  {
    'code':'STD','name':'Standards & Quality','name_ar':'المعايير والجودة','emoji':'✅',
    'color':'FF004D40','reg_count':2,'intl_count':2,
    'primary_regs':['SASO','SFDA'],
    'intl_regs':['ISO_IEC','PCI_SSC'],
    'key_frameworks':['SASO-STANDARDS','ISO-9001','ISO-14001','SFDA-PROD-REGS'],
    'control_count':85,'risk_level':'MEDIUM','iot_intensity':'LOW',
    'mandatory_certs':['SASO IECEE','SFDA product registration'],
    'audit_freq':'AS_REQUIRED',
    'org_types':['Manufacturer','Importer','Food Producer','Medical Device'],
  },
  {
    'code':'TRN','name':'Transport & Logistics','name_ar':'النقل والخدمات اللوجستية','emoji':'🚢',
    'color':'FF3E2723','reg_count':4,'intl_count':1,
    'primary_regs':['GACA','MAWANI','MOT','SAR'],
    'intl_regs':['ISO_IEC'],
    'key_frameworks':['GACA-REGS','ICAO-STANDARDS','ISPS-CODE','NCA-ECC-2:2024'],
    'control_count':132,'risk_level':'HIGH','iot_intensity':'HIGH',
    'mandatory_certs':['IATA membership (airlines)','ISPS (ports)','NCA ECC'],
    'audit_freq':'ANNUAL',
    'org_types':['Airline','Shipping Company','Port Operator','Rail','Logistics Provider'],
  },
  {
    'code':'IND','name':'Industry & Manufacturing','name_ar':'الصناعة والتصنيع','emoji':'🏭',
    'color':'FF4A148C','reg_count':4,'intl_count':2,
    'primary_regs':['MODON','RCJY','MISA','SASO'],
    'intl_regs':['ISO_IEC','IAEA_BODY'],
    'key_frameworks':['NCA-ECC-2:2024','ISO-27001-2022','IEC-62443','SASO-STANDARDS','MISA-REGS'],
    'control_count':145,'risk_level':'HIGH','iot_intensity':'HIGH',
    'mandatory_certs':['ISO 9001','SASO CoC','MISA investment license'],
    'audit_freq':'AS_REQUIRED',
    'org_types':['Factory','Defense Contractor','Special Economic Zone Operator'],
  },
  {
    'code':'EDU','name':'Education & Research','name_ar':'التعليم والبحث','emoji':'🎓',
    'color':'FF006064','reg_count':4,'intl_count':1,
    'primary_regs':['MOE_ED','ETEC','TVTC','HRDF'],
    'intl_regs':['ISO_IEC'],
    'key_frameworks':['NCA-ECC-2:2024','PDPL-2021','MOE-REGS','ISO-27001-2022'],
    'control_count':95,'risk_level':'MEDIUM','iot_intensity':'MODERATE',
    'mandatory_certs':['MOE accreditation','NCA ECC (universities)'],
    'audit_freq':'BIENNIAL',
    'org_types':['University','School','Research Institute','Training Provider'],
  },
  {
    'code':'LEG','name':'Legal & Anti-Corruption','name_ar':'القانوني ومكافحة الفساد','emoji':'⚖️',
    'color':'FF37474F','reg_count':3,'intl_count':1,
    'primary_regs':['MOJ','NAZAHA','DIWAN'],
    'intl_regs':['FATF'],
    'key_frameworks':['AML-CTF-LAW','NAZAHA-FRAMEWORK','MOJ-REGS','FATF-40'],
    'control_count':68,'risk_level':'HIGH','iot_intensity':'LOW',
    'mandatory_certs':['NAZAHA integrity certification'],
    'audit_freq':'AS_REQUIRED',
    'org_types':['Law Firm','Gov Entity','Listed Company'],
  },
  {
    'code':'GIGA','name':'Giga & Special Zones','name_ar':'المشاريع العملاقة والمناطق الخاصة','emoji':'🌆',
    'color':'FF880E4F','reg_count':5,'intl_count':2,
    'primary_regs':['NEOM','PIF','RCJY','MISA','NHC'],
    'intl_regs':['ISO_IEC','PCI_SSC'],
    'key_frameworks':['NCA-ECC-2:2024','PDPL-2021','ISO-27001-2022','NEOM-SMART-CITY-STDS'],
    'control_count':178,'risk_level':'HIGH','iot_intensity':'HIGHEST',
    'mandatory_certs':['NCA ECC','ISO 27001','PDPL compliance'],
    'audit_freq':'ANNUAL',
    'org_types':['Giga Project Entity','Special Zone Company','Smart City Operator'],
  },
]

# ── Org Types with Applicability Matrix ───────────────────────────────────────
KSA_ORG_TYPES = [
  {
    'code':'BANK','name':'Bank (Conventional or Islamic)','name_ar':'بنك','sector':'FIN',
    'tier_complexity':'HIGHEST',
    'mandatory_regs':['SAMA','NCA','SDAIA','ZATCA','NAZAHA','FATF','BCBS','AAOIFI (Islamic)','IFSB (Islamic)','SWIFT_BODY','IOSCO (if listed)'],
    'mandatory_frameworks':['SAMA-CSF','NCA-ECC-2:2024','PDPL-2021','FATF-40','Basel III','AML-CTF-LAW','PCI-DSS-4','ISO-27001-2022','AAOIFI-SS (Islamic)'],
    'mandatory_controls':387,'saudisation_target':'75%',
    'mandatory_evidence':['Annual SAMA Cyber Audit','CDD/KYC Records','STR/SAR Logs','Annual Financial Statements (IFRS)','PCI DSS Attestation','ISO 27001 Certificate'],
    'min_org_size':'Medium+','board_req':True,'ciso_req':True,'dpo_req':True,'mlro_req':True,
  },
  {
    'code':'INSCO','name':'Insurance Company','name_ar':'شركة تأمين','sector':'FIN',
    'tier_complexity':'HIGH',
    'mandatory_regs':['SAMA','NCA','SDAIA','CCHI','ZATCA','FATF','IAIS'],
    'mandatory_frameworks':['SAMA-CSF','NCA-ECC-2:2024','PDPL-2021','CCHI-REGS','IAIS-ICP','AML-CTF-LAW'],
    'mandatory_controls':265,'saudisation_target':'75%',
    'mandatory_evidence':['SAMA Insurance Audit','CCHI compliance report','Annual Actuarial Report','ISO 27001'],
    'min_org_size':'Medium','board_req':True,'ciso_req':True,'dpo_req':True,'mlro_req':True,
  },
  {
    'code':'FINTECH','name':'Fintech / Payment Provider','name_ar':'شركة تقنية مالية','sector':'FIN',
    'tier_complexity':'HIGH',
    'mandatory_regs':['SAMA','NCA','SDAIA','ZATCA','CITC','FATF'],
    'mandatory_frameworks':['SAMA-CSF','NCA-ECC-2:2024','PDPL-2021','PCI-DSS-4','FATF-40','AML-CTF-LAW'],
    'mandatory_controls':298,'saudisation_target':'40%',
    'mandatory_evidence':['SAMA Fintech License','PCI DSS cert','AML program docs','NCA ECC self-assessment'],
    'min_org_size':'Small+','board_req':False,'ciso_req':True,'dpo_req':True,'mlro_req':True,
  },
  {
    'code':'PUBHOSP','name':'Public Hospital / Health Authority','name_ar':'مستشفى حكومي','sector':'HC',
    'tier_complexity':'HIGHEST',
    'mandatory_regs':['MOH','CBAHI','GAHAR','NHIC','NCA','SDAIA','CCHI'],
    'mandatory_frameworks':['MOH-HIS','NCA-ECC-2:2024','PDPL-2021','CBAHI-STDS','SFDA-MDR (if devices)','ISO-27001-2022'],
    'mandatory_controls':298,'saudisation_target':'60%',
    'mandatory_evidence':['CBAHI Accreditation Certificate','MOH annual report','NHIC data exchange compliance','NCA self-assessment','Patient data audit'],
    'min_org_size':'Large','board_req':True,'ciso_req':True,'dpo_req':True,'mlro_req':False,
  },
  {
    'code':'PRIVHOSP','name':'Private Hospital / Clinic','name_ar':'مستشفى خاص','sector':'HC',
    'tier_complexity':'HIGH',
    'mandatory_regs':['MOH','CCHI','CBAHI','SFDA','SCFHS','NCA','SDAIA'],
    'mandatory_frameworks':['MOH-HIS','NCA-ECC-2:2024','PDPL-2021','CBAHI-STDS','CCHI-REGS'],
    'mandatory_controls':235,'saudisation_target':'35%',
    'mandatory_evidence':['CCHI insurance compliance','CBAHI/GAHAR cert','MOH license','SFDA device registration','Patient data consent'],
    'min_org_size':'Small+','board_req':False,'ciso_req':False,'dpo_req':True,'mlro_req':False,
  },
  {
    'code':'TELECOM','name':'Telecom Operator','name_ar':'شركة اتصالات','sector':'ICT',
    'tier_complexity':'HIGH',
    'mandatory_regs':['CITC','NCA','SDAIA','ZATCA','MCIT','FATF'],
    'mandatory_frameworks':['CITC-REGS','NCA-ECC-2:2024','NCA-CCC-1:2020','PDPL-2021','ISO-27001-2022','AML-CTF-LAW'],
    'mandatory_controls':245,'saudisation_target':'50%',
    'mandatory_evidence':['CITC license','NCA ECC audit','PDPL compliance cert','Annual spectrum report'],
    'min_org_size':'Large','board_req':True,'ciso_req':True,'dpo_req':True,'mlro_req':False,
  },
  {
    'code':'GOVAGENCY','name':'Government Ministry / Agency','name_ar':'وزارة / جهة حكومية','sector':'GOV',
    'tier_complexity':'HIGHEST',
    'mandatory_regs':['NCA','SDAIA','DGA','YESSER','MOF','MOI'],
    'mandatory_frameworks':['NCA-ECC-2:2024','NCA-CCC-1:2020','PDPL-2021','DGA-CLOUD','GOV-ARCH-STANDARDS','ISO-27001-2022'],
    'mandatory_controls':305,'saudisation_target':'100%',
    'mandatory_evidence':['NCA self-assessment (mandatory annual)','DGA cloud compliance','SDAIA data governance report','Ministry annual report (MOF)'],
    'min_org_size':'Large','board_req':True,'ciso_req':True,'dpo_req':True,'mlro_req':False,
  },
  {
    'code':'LISTEDCO','name':'Listed Company (TADAWUL)','name_ar':'شركة مدرجة في السوق المالية','sector':'FIN',
    'tier_complexity':'HIGH',
    'mandatory_regs':['CMA','TADAWUL','NCA','SDAIA','ZATCA','NAZAHA','IOSCO','IASB'],
    'mandatory_frameworks':['CMA-REGS','NCA-ECC-2:2024','PDPL-2021','IFRS','ZATCA-VAT','AML-CTF-LAW','ISO-27001-2022'],
    'mandatory_controls':250,'saudisation_target':'75%',
    'mandatory_evidence':['Quarterly financial statements (IFRS)','Annual CMA disclosure','ESG report','Audited financial statements','NCA self-assessment','ZATCA VAT filing'],
    'min_org_size':'Large','board_req':True,'ciso_req':True,'dpo_req':True,'mlro_req':True,
  },
  {
    'code':'ENERGY','name':'Energy / Utility Operator','name_ar':'شركة طاقة / مرافق','sector':'ENR',
    'tier_complexity':'HIGHEST',
    'mandatory_regs':['ECRA','WERA','NCA','SDAIA','MOI','KACARE (nuclear)'],
    'mandatory_frameworks':['NCA-ECC-2:2024','NCA-OTCC-1:2022','IEC-62443','ISO-27001-2022','ECRA-REGS'],
    'mandatory_controls':223,'saudisation_target':'45%',
    'mandatory_evidence':['NCA OTCC assessment','IEC 62443 certification (OT)','Annual ECRA compliance','Incident response drill','ISO 27001'],
    'min_org_size':'Enterprise','board_req':True,'ciso_req':True,'dpo_req':True,'mlro_req':False,
  },
  {
    'code':'SME','name':'Small & Medium Enterprise','name_ar':'منشأة صغيرة ومتوسطة','sector':'ALL',
    'tier_complexity':'MEDIUM',
    'mandatory_regs':['NCA (risk-based)','SDAIA','ZATCA','MHRSD','SMEA'],
    'mandatory_frameworks':['NCA-ECC-2:2024 (simplified)','PDPL-2021','ZATCA-VAT','SAUDISATION'],
    'mandatory_controls':85,'saudisation_target':'Nitaqat-dependent',
    'mandatory_evidence':['ZATCA VAT filing','Saudisation certificate (QIWA)','PDPL consent records','Basic cyber controls'],
    'min_org_size':'NA','board_req':False,'ciso_req':False,'dpo_req':False,'mlro_req':False,
  },
  {
    'code':'CLOUDSVC','name':'Cloud Service Provider','name_ar':'مزود خدمات سحابية','sector':'ICT',
    'tier_complexity':'HIGH',
    'mandatory_regs':['NCA','SDAIA','CITC','DGA','MOI'],
    'mandatory_frameworks':['NCA-ECC-2:2024','NCA-CCC-1:2020','NCA-DCC-1:2022','PDPL-2021','ISO-27001-2022','ISO-27017','DGA-CLOUD'],
    'mandatory_controls':280,'saudisation_target':'30%',
    'mandatory_evidence':['NCA CCC assessment','ISO 27001 cert','ISO 27017 cert','PDPL data residency compliance','SOC 2 Type II'],
    'min_org_size':'Medium','board_req':False,'ciso_req':True,'dpo_req':True,'mlro_req':False,
  },
  {
    'code':'GIGACO','name':'Giga Project Entity (NEOM, AMAALA, etc.)','name_ar':'كيان مشروع عملاق','sector':'GIGA',
    'tier_complexity':'HIGHEST',
    'mandatory_regs':['NCA','SDAIA','MOI','PIF','MISA','ECRA (if energy)','SFDA (if health)'],
    'mandatory_frameworks':['NCA-ECC-2:2024','NCA-OTCC-1:2022','PDPL-2021','ISO-27001-2022','IEC-62443','NEOM-SMART-CITY-STDS'],
    'mandatory_controls':340,'saudisation_target':'Giga-project SLA',
    'mandatory_evidence':['PIF investment compliance','NCA ECC','SDAIA AI governance','Smart city security audit','ISO 27001'],
    'min_org_size':'Enterprise','board_req':True,'ciso_req':True,'dpo_req':True,'mlro_req':True,
  },
]

# ── Org Size Matrix ────────────────────────────────────────────────────────────
KSA_ORG_SIZES = [
  {
    'code':'MICRO','name':'Micro','name_ar':'متناهية الصغر','employees':'1–9','revenue':'< SAR 3M',
    'complexity':'BASIC','framework_tier':1,'required_frameworks':2,'optional_frameworks':3,
    'nca_level':'Awareness only','pdpl_level':'Consent + basic records',
    'audit_req':'Self-assessment only','saudisation':'Nitaqat Platinum Exempt',
    'reg_burden_score':15,'annual_compliance_cost_sar':'5,000–15,000',
    'key_frameworks':['PDPL-2021 (basic)','ZATCA-VAT'],
    'controls_required':25,'evidence_req':['VAT filing','Basic privacy notice'],
  },
  {
    'code':'SMALL','name':'Small','name_ar':'صغيرة','employees':'10–49','revenue':'SAR 3M–40M',
    'complexity':'STANDARD','framework_tier':2,'required_frameworks':4,'optional_frameworks':6,
    'nca_level':'NCA ECC awareness + basic controls','pdpl_level':'Full PDPL compliance',
    'audit_req':'Internal + periodic external','saudisation':'Nitaqat (sector-dependent)',
    'reg_burden_score':35,'annual_compliance_cost_sar':'30,000–120,000',
    'key_frameworks':['NCA-ECC-2:2024 (simplified)','PDPL-2021','ZATCA-VAT','SAUDISATION'],
    'controls_required':65,'evidence_req':['Annual self-assessment','PDPL records','HR Nitaqat cert','VAT filing'],
  },
  {
    'code':'MEDIUM','name':'Medium','name_ar':'متوسطة','employees':'50–249','revenue':'SAR 40M–200M',
    'complexity':'ENHANCED','framework_tier':3,'required_frameworks':6,'optional_frameworks':8,
    'nca_level':'Full NCA ECC self-assessment','pdpl_level':'Full PDPL + DPO if processing sensitive',
    'audit_req':'Annual external audit','saudisation':'Nitaqat mandatory',
    'reg_burden_score':55,'annual_compliance_cost_sar':'150,000–500,000',
    'key_frameworks':['NCA-ECC-2:2024','PDPL-2021','ISO-27001-2022','ZATCA','SAUDISATION','Sector-specific'],
    'controls_required':120,'evidence_req':['NCA self-assessment','External audit report','PDPL DPIA','ISO 27001 cert (recommended)','Saudisation cert'],
  },
  {
    'code':'LARGE','name':'Large','name_ar':'كبيرة','employees':'250–999','revenue':'SAR 200M–1B',
    'complexity':'ADVANCED','framework_tier':4,'required_frameworks':8,'optional_frameworks':10,
    'nca_level':'Full NCA ECC + sector overlay','pdpl_level':'DPO mandatory (if processing >threshold)','audit_req':'Annual external + regulator inspection',
    'saudisation':'Nitaqat mandatory + Vision 2030 targets',
    'reg_burden_score':72,'annual_compliance_cost_sar':'700,000–3,000,000',
    'key_frameworks':['NCA-ECC-2:2024','PDPL-2021','ISO-27001-2022','Sector-specific (3–5 FW)','ZATCA','FATF (if financial)'],
    'controls_required':220,'evidence_req':['NCA external audit','PDPL DPO annual report','ISO 27001 cert','Sector regulator audit','Pen test report','BCM test'],
  },
  {
    'code':'ENTERPRISE','name':'Enterprise','name_ar':'مؤسسة كبرى','employees':'1,000+','revenue':'> SAR 1B',
    'complexity':'FULL','framework_tier':5,'required_frameworks':12,'optional_frameworks':15,
    'nca_level':'Full NCA ECC + sector overlay + SOC','pdpl_level':'Full DPO + cross-border transfers',
    'audit_req':'Annual external + regulator + board oversight',
    'saudisation':'Nitaqat Platinum target',
    'reg_burden_score':88,'annual_compliance_cost_sar':'3,000,000–15,000,000',
    'key_frameworks':['NCA-ECC-2:2024','NCA-OTCC/CCC/DCC','PDPL-2021','ISO-27001-2022','All sector frameworks','FATF','Basel (if banking)','ISO-27701','IEC-62443 (if OT)'],
    'controls_required':385,'evidence_req':['CISO board report','External cyber audit','Regulator inspection evidence','ISO 27001','PDPL DPO report','Pen test + red team','SOC reports','BCP/DR test','Anti-corruption declaration','ZATCA e-invoicing'],
  },
  {
    'code':'SIFI','name':'Systemically Important (SIFI)','name_ar':'مؤسسة ذات أهمية نظامية','employees':'Varies','revenue':'Tier-1 by SAMA',
    'complexity':'MAXIMUM','framework_tier':6,'required_frameworks':15,'optional_frameworks':20,
    'nca_level':'Full NCA ECC + OTCC + dedicated NCA team','pdpl_level':'Full compliance + cross-border + AI governance',
    'audit_req':'Continuous regulatory oversight + quarterly reporting',
    'saudisation':'Vision 2030 leadership targets',
    'reg_burden_score':100,'annual_compliance_cost_sar':'15,000,000+',
    'key_frameworks':['ALL NCA frameworks','PDPL-2021 + IR','SAMA-CSF (if FIN)','Basel II/III/IV (if bank)','FATF','AAOIFI (if Islamic)','ISO-27001/27701/27017','IEC-62443','IFRS','All sector frameworks + international'],
    'controls_required':500,'evidence_req':['Quarterly SAMA/NCA reporting','IFRS audited statements','Systemic risk assessment','Scenario analysis report','Interoperability audit','SOC 2 Type II','Full board cyber disclosure','Annual mutual evaluation prep'],
  },
]

# ── KSA Key Frameworks Master (expanded) ─────────────────────────────────────
KSA_FRAMEWORKS_MASTER = [
  # NCA Frameworks
  {'code':'NCA-ECC-2:2024','name':'NCA Essential Cybersecurity Controls v2','domains':4,'controls':108,'mandatory_for':'ALL KSA entities','sectors':'ALL','tier':'T1','audit_freq':'ANNUAL','evidence_type':'NCA Self-Assessment + External Audit','risk_domain':'Cyber','effective_date':'2024-01-01','note':'Supersedes ECC v1 (2018). Mandatory for all organisations.'},
  {'code':'NCA-OTCC-1:2022','name':'NCA Operational Technology Cybersecurity Controls','domains':4,'controls':53,'mandatory_for':'CNI, Energy, HC with OT/IoMT','sectors':'ENR,HC,IND,TRN','tier':'T1','audit_freq':'BIENNIAL','evidence_type':'NCA OTCC Self-Assessment + IEC 62443 audit','risk_domain':'OT/ICS Cyber','effective_date':'2022-01-01','note':'Critical for hospitals with medical devices, smart grids'},
  {'code':'NCA-CCC-1:2020','name':'NCA Cloud Cybersecurity Controls','domains':3,'controls':67,'mandatory_for':'Cloud users + Cloud providers','sectors':'ALL (cloud users)','tier':'T1','audit_freq':'ANNUAL','evidence_type':'NCA CCC Assessment + Cloud audit log','risk_domain':'Cloud Cyber','effective_date':'2020-01-01','note':'Applies to any Gov/regulated entity using cloud'},
  {'code':'NCA-DCC-1:2022','name':'NCA Data Cybersecurity Controls','domains':3,'controls':40,'mandatory_for':'High/Top Secret data handlers','sectors':'GOV,FIN,HC,CYB','tier':'T1','audit_freq':'ANNUAL','evidence_type':'DCC Self-Assessment + data classification report','risk_domain':'Data Security','effective_date':'2022-01-01','note':'Mandatory when NCA-ECC data controls are insufficient'},
  {'code':'NCA-CSCC-1:2019','name':'NCA Cybersecurity Controls for Critical Systems','domains':3,'controls':60,'mandatory_for':'Critical national systems','sectors':'GOV,ENR,FIN','tier':'T1','audit_freq':'ANNUAL','evidence_type':'NCA CSCC assessment','risk_domain':'CNI Cyber','effective_date':'2019-01-01','note':''},
  {'code':'NCA-REG-2024','name':'NCA Enforcement Regulation 2024','domains':1,'controls':0,'mandatory_for':'ALL','sectors':'ALL','tier':'T1','audit_freq':'CONTINUOUS','evidence_type':'Regulatory filing','risk_domain':'Compliance','effective_date':'2024-01-01','note':'SAR 25M max fine. First enforcement regulation.'},
  # SDAIA/Data Frameworks
  {'code':'PDPL-2021','name':'Saudi Personal Data Protection Law','domains':6,'controls':45,'mandatory_for':'ALL organisations processing personal data','sectors':'ALL','tier':'T1','audit_freq':'ANNUAL','evidence_type':'PDPL compliance report + DPO declaration + consent records','risk_domain':'Data Privacy','effective_date':'2021-09-01','note':'2-year grace period ended Sep 2023. Fully enforceable.'},
  {'code':'PDPL-IR-2023','name':'PDPL Implementing Regulations','domains':6,'controls':89,'mandatory_for':'ALL','sectors':'ALL','tier':'T1','audit_freq':'ANNUAL','evidence_type':'DPIA + data processing records + transfer agreements','risk_domain':'Data Privacy','effective_date':'2023-09-01','note':'Detailed technical requirements for PDPL compliance'},
  {'code':'PDPL-DTR-2024','name':'PDPL Data Transfer Regulations v2','domains':2,'controls':30,'mandatory_for':'Entities transferring data cross-border','sectors':'ALL (cross-border)','tier':'T1','audit_freq':'ANNUAL','evidence_type':'Data transfer impact assessment + adequacy decision docs','risk_domain':'Data Privacy/Cross-border','effective_date':'2024-09-01','note':'Updated in 2024 – assessment required for all transfers'},
  # SAMA Frameworks
  {'code':'SAMA-CSF','name':'SAMA Cybersecurity Framework','domains':5,'controls':None,'mandatory_for':'ALL SAMA-licensed entities','sectors':'FIN','tier':'T1','audit_freq':'ANNUAL','evidence_type':'Annual SAMA cyber audit + incident log','risk_domain':'Financial Cyber','effective_date':'2017-05-01','note':'Aligns to NIST CSF + NCA ECC. Banks must score ≥ 3.5/5'},
  {'code':'SAMA-AML','name':'SAMA AML/CFT Framework','domains':4,'controls':55,'mandatory_for':'Banks, Insurance, Fintechs, Money Exchange','sectors':'FIN','tier':'T1','audit_freq':'CONTINUOUS','evidence_type':'CDD/KYC records + STR logs + training records + MLRO reports','risk_domain':'Financial Crime','effective_date':'2017-01-01','note':'FATF-aligned. SAMA conducts surprise AML inspections.'},
  {'code':'SAMA-OPR','name':'SAMA Operational Risk Framework','domains':3,'controls':40,'mandatory_for':'Banks, Insurance','sectors':'FIN','tier':'T1','audit_freq':'ANNUAL','evidence_type':'BCP test results + operational risk register + loss event database','risk_domain':'Operational','effective_date':'2020-01-01','note':''},
  {'code':'SAMA-OPEN-BANKING','name':'SAMA Open Banking Framework','domains':3,'controls':35,'mandatory_for':'Banks + licensed Fintechs','sectors':'FIN','tier':'T2','audit_freq':'ANNUAL','evidence_type':'API security audit + consent management','risk_domain':'Digital/API','effective_date':'2022-01-01','note':''},
  # CMA Frameworks
  {'code':'CMA-CYBER','name':'CMA Cybersecurity Regulations','domains':4,'controls':80,'mandatory_for':'Listed companies + CMA-licensed entities','sectors':'CAP_MKT','tier':'T1','audit_freq':'ANNUAL','evidence_type':'Annual CMA cybersecurity report + board declaration','risk_domain':'Financial Cyber','effective_date':'2021-01-01','note':''},
  {'code':'CMA-ESG','name':'CMA ESG Reporting Guidelines','domains':3,'controls':20,'mandatory_for':'Listed companies','sectors':'CAP_MKT','tier':'T2','audit_freq':'ANNUAL','evidence_type':'Annual ESG report','risk_domain':'Governance','effective_date':'2023-01-01','note':''},
  # Healthcare Frameworks
  {'code':'MOH-HIS','name':'MOH EHealth & HIS Standards','domains':4,'controls':None,'mandatory_for':'All hospitals + clinics','sectors':'HC','tier':'T1','audit_freq':'ANNUAL','evidence_type':'HIS certification + NHIC integration cert + HL7/FHIR compliance','risk_domain':'Health Data','effective_date':'2020-01-01','note':'NABIDH integration required for Dubai connections'},
  {'code':'SFDA-MDR','name':'SFDA Medical Device Regulations','domains':3,'controls':None,'mandatory_for':'Medical device manufacturers/importers + hospitals','sectors':'HC','tier':'T1','audit_freq':'CONTINUOUS','evidence_type':'SFDA device registration certificate + PMS records + recall notices','risk_domain':'Patient Safety','effective_date':'2019-01-01','note':'IoMT devices require cybersecurity evidence'},
  {'code':'CBAHI-STDS','name':'CBAHI Hospital Standards','domains':12,'controls':None,'mandatory_for':'Public and private hospitals (>50 beds)','sectors':'HC','tier':'T2','audit_freq':'TRIENNIAL','evidence_type':'CBAHI accreditation certificate + quality report','risk_domain':'Patient Safety/Quality','effective_date':'2007-01-01','note':'3-year accreditation cycle'},
  # International Standards (KSA mandatory)
  {'code':'ISO-27001-2022','name':'ISO/IEC 27001:2022 ISMS','domains':4,'controls':93,'mandatory_for':'Cloud providers, Critical regulated entities','sectors':'CYB,ICT,FIN,HC','tier':'T2','audit_freq':'TRIENNIAL+SURVEILLANCE','evidence_type':'ISO 27001 certificate + surveillance audit report + ISMS scope doc','risk_domain':'Information Security','effective_date':'2022-10-25','note':'NCA now expects ISO 27001 for NCA-regulated entities. 3-yr cert cycle.'},
  {'code':'IEC-62443','name':'IEC 62443 OT/ICS Security Standard','domains':4,'controls':200,'mandatory_for':'OT/ICS operators (energy, HC IoMT, industry)','sectors':'ENR,HC,IND','tier':'T2','audit_freq':'CONTINUOUS','evidence_type':'IEC 62443 assessment report + zone-conduit diagram + patch records','risk_domain':'OT/ICS Security','effective_date':'Ongoing','note':'4-part standard. NCA-OTCC aligns to IEC 62443.'},
  {'code':'PCI-DSS-4','name':'PCI DSS v4.0','domains':12,'controls':300,'mandatory_for':'Any entity processing card payments','sectors':'FIN,RETAIL,ICT','tier':'T2','audit_freq':'ANNUAL','evidence_type':'PCI DSS AoC (Attestation of Compliance) + ASV scan results','risk_domain':'Payment Security','effective_date':'2024-03-31','note':'v3.2.1 retired. All must be on v4 from March 2025.'},
  {'code':'FATF-40','name':'FATF 40 Recommendations','domains':7,'controls':40,'mandatory_for':'ALL via national AML/CTF law','sectors':'ALL','tier':'INTL','audit_freq':'MUTUAL_EVALUATION','evidence_type':'Mutual evaluation report + STR stats + institution AML audit','risk_domain':'Financial Crime','effective_date':'2012 (updated 2023)','note':'KSA last mutual evaluation 2024'},
  {'code':'SAMA-CSF-RATING','name':'SAMA CSF Maturity Rating','domains':5,'controls':None,'mandatory_for':'ALL SAMA-licensed entities','sectors':'FIN','tier':'T1','audit_freq':'ANNUAL','evidence_type':'Self-scoring worksheet + evidence binder per control','risk_domain':'Financial Cyber','effective_date':'2017-05-01','note':'Target: 3.5/5.0 for Tier-1 banks'},
]

# ── Evidence Requirements Matrix ────────────────────────────────────────────────
KSA_EVIDENCE_TYPES = [
  {'type':'NCA Self-Assessment Report','applies_to':'All organisations','frequency':'ANNUAL','submittable_to':'NCA portal','retention_years':5,'format':'NCA-prescribed template','ai_extract':'Y','risk_if_missing':'REGULATORY_ACTION – NCA enforcement up to SAR 25M','owner_role':'CISO/IT Risk'},
  {'type':'External Cybersecurity Audit','applies_to':'Large + Enterprise + SIFI','frequency':'ANNUAL','submittable_to':'NCA / Sector regulator','retention_years':7,'format':'PDF (licensed auditor)','ai_extract':'Y','risk_if_missing':'REGULATORY NON-COMPLIANCE','owner_role':'CISO'},
  {'type':'PDPL Compliance Report / DPO Declaration','applies_to':'All data processors','frequency':'ANNUAL','submittable_to':'SDAIA (on request)','retention_years':5,'format':'PDF','ai_extract':'Y','risk_if_missing':'PDPL fine up to SAR 5M (criminal up to 2yr jail)','owner_role':'DPO'},
  {'type':'Data Processing Impact Assessment (DPIA)','applies_to':'High-risk processing, sensitive data','frequency':'PER_PROJECT','submittable_to':'SDAIA (cross-border transfers)','retention_years':5,'format':'PDF','ai_extract':'Y','risk_if_missing':'PDPL enforcement','owner_role':'DPO'},
  {'type':'AML/CFT STR Logs & CDD Records','applies_to':'Banks, FIs, designated businesses','frequency':'CONTINUOUS','submittable_to':'SAMA / FIA / GAC','retention_years':10,'format':'System records + PDF','ai_extract':'PARTIAL','risk_if_missing':'Criminal prosecution + SAMA revocation of license','owner_role':'MLRO'},
  {'type':'CBAHI Accreditation Evidence Pack','applies_to':'Hospitals > 50 beds','frequency':'TRIENNIAL','submittable_to':'CBAHI','retention_years':10,'format':'Evidence binder','ai_extract':'PARTIAL','risk_if_missing':'Loss of accreditation – cannot operate','owner_role':'Quality Manager'},
  {'type':'ISO 27001 Certificate','applies_to':'Cloud providers, critical regulated entities','frequency':'TRIENNIAL + surveillance','submittable_to':'NCA / sector regulator','retention_years':5,'format':'Certificate (PDF)','ai_extract':'Y','risk_if_missing':'Contract loss, regulatory non-compliance','owner_role':'CISO'},
  {'type':'PCI DSS Attestation of Compliance (AoC)','applies_to':'Any entity processing cards','frequency':'ANNUAL','submittable_to':'Card brands / acquirer','retention_years':3,'format':'AoC form + SAQ/ROC','ai_extract':'Y','risk_if_missing':'Card brand fines + card acceptance suspension','owner_role':'CISO/IT'},
  {'type':'Penetration Test Report','applies_to':'Large + Enterprise (all sectors)','frequency':'ANNUAL','submittable_to':'NCA / sector regulator','retention_years':3,'format':'PDF (licensed provider)','ai_extract':'Y','risk_if_missing':'NCA ECC non-compliance','owner_role':'CISO'},
  {'type':'Business Continuity Plan + Test Results','applies_to':'Large + Enterprise + SIFI','frequency':'BIENNIAL (test)','submittable_to':'SAMA / NCA on request','retention_years':5,'format':'PDF','ai_extract':'N','risk_if_missing':'Regulatory gap + insurance claim issues','owner_role':'BCM Manager'},
  {'type':'SFDA Device Registration Certificate','applies_to':'Medical device manufacturers/importers','frequency':'AS_REQUIRED','submittable_to':'SFDA portal','retention_years':10,'format':'SFDA certificate','ai_extract':'Y','risk_if_missing':'Import ban + criminal liability','owner_role':'Regulatory Affairs'},
  {'type':'Saudisation Nitaqat Certificate (QIWA)','applies_to':'All employers (Nitaqat applies)','frequency':'CONTINUOUS','submittable_to':'MHRSD/QIWA','retention_years':3,'format':'Digital (QIWA)','ai_extract':'Y','risk_if_missing':'Business license suspension + fines','owner_role':'HR Director'},
  {'type':'ZATCA E-Invoicing Compliance Evidence','applies_to':'All VAT-registered businesses','frequency':'CONTINUOUS (Phase 2: APIS)','submittable_to':'ZATCA','retention_years':5,'format':'E-invoice system logs + ZATCA integration cert','ai_extract':'Y','risk_if_missing':'ZATCA fines + VAT audit','owner_role':'CFO/Finance'},
  {'type':'Annual Audited Financial Statements (IFRS)','applies_to':'Listed companies + SAMA-licensed entities','frequency':'ANNUAL','submittable_to':'CMA / SAMA','retention_years':10,'format':'PDF (licensed auditor)','ai_extract':'Y','risk_if_missing':'CMA enforcement + trading suspension','owner_role':'CFO'},
  {'type':'Incident Report (72h notification)','applies_to':'ALL regulated entities on material breach','frequency':'AS_REQUIRED (72h deadline)','submittable_to':'NCA + sector regulator','retention_years':5,'format':'NCA incident form','ai_extract':'Y','risk_if_missing':'NCA enforcement + reputational damage','owner_role':'CISO'},
]

# ── Risk Domains ───────────────────────────────────────────────────────────────
KSA_RISK_DOMAINS = [
  {'domain':'Cybersecurity – CNI','category':'Cyber','score':98,'level':'CRITICAL','primary_reg':'NCA','framework':'NCA-ECC-2:2024','kri':'% overdue ECC controls','threshold':'> 10% overdue = RED','sectors':['ALL'],'org_size_impact':'Enterprise/SIFI highest'},
  {'domain':'Cybersecurity – OT/IoMT','category':'Cyber/OT','score':95,'level':'CRITICAL','primary_reg':'NCA','framework':'NCA-OTCC-1:2022','kri':'OT incident uncontained > 1h','threshold':'Any OT breach = CRITICAL','sectors':['HC','ENR','IND'],'org_size_impact':'All sizes in OT sectors'},
  {'domain':'Data Privacy Breach','category':'Privacy','score':90,'level':'CRITICAL','primary_reg':'SDAIA','framework':'PDPL-2021','kri':'Breach notification lag > 72h','threshold':'> 72h = regulatory action','sectors':['ALL'],'org_size_impact':'All sizes; higher fine for larger'},
  {'domain':'Financial Crime / AML','category':'AML/CFT','score':92,'level':'CRITICAL','primary_reg':'SAMA/FIA','framework':'SAMA-AML','kri':'STR filing failure rate','threshold':'Any STR missed = CRITICAL','sectors':['FIN','GIGA','TAX'],'org_size_impact':'Banks/FIs highest'},
  {'domain':'Cloud Misconfiguration','category':'Technology','score':80,'level':'HIGH','primary_reg':'NCA/DGA','framework':'NCA-CCC-1:2020','kri':'% cloud assets not CCC compliant','threshold':'> 5% = AMBER','sectors':['ALL'],'org_size_impact':'Medium+ (cloud adopters)'},
  {'domain':'Operational Resilience','category':'Operational','score':85,'level':'HIGH','primary_reg':'SAMA/NCA','framework':'SAMA-OPR','kri':'RTO breach frequency','threshold':'Any breach > 4h = RED','sectors':['FIN','GOV','ENR'],'org_size_impact':'Enterprise/SIFI'},
  {'domain':'Third-Party / Supply Chain','category':'Third-Party','score':78,'level':'HIGH','primary_reg':'NCA/SAMA','framework':'NCA-ECC-2:2024','kri':'% vendors without NDA/security assessment','threshold':'> 20% = AMBER','sectors':['ALL'],'org_size_impact':'Large+'},
  {'domain':'Medical Device / IoMT Security','category':'Healthcare Tech','score':88,'level':'CRITICAL','primary_reg':'SFDA/NCA','framework':'SFDA-MDR + NCA-OTCC','kri':'Unpatched medical devices','threshold':'Any unpatched = RED','sectors':['HC'],'org_size_impact':'All HC entities'},
  {'domain':'Saudisation / Labour Non-Compliance','category':'Regulatory','score':72,'level':'HIGH','primary_reg':'MHRSD','framework':'NITAQAT','kri':'Saudisation % vs target','threshold':'Below Platinum = AMBER','sectors':['ALL'],'org_size_impact':'Large+ (highest fines)'},
  {'domain':'Tax / Zakat Non-Compliance','category':'Tax','score':75,'level':'HIGH','primary_reg':'ZATCA','framework':'ZATCA-VAT','kri':'VAT filing compliance rate','threshold':'Late filing = AMBER','sectors':['ALL'],'org_size_impact':'Medium+ (highest exposure)'},
  {'domain':'AI Governance','category':'Technology','score':70,'level':'HIGH','primary_reg':'SDAIA','framework':'PDPL-2021 + AI strategy','kri':'AI models without governance','threshold':'Any high-risk AI unaudited = AMBER','sectors':['FIN','HC','GOV'],'org_size_impact':'Enterprise (early stage)'},
  {'domain':'Cross-Border Data Transfer','category':'Privacy','score':82,'level':'HIGH','primary_reg':'SDAIA','framework':'PDPL-DTR-2024','kri':'Transfers without DTIA','threshold':'Any transfer without assessment = RED','sectors':['ALL (cross-border ops)'],'org_size_impact':'Any with international ops'},
]

# ═══════════════════════════════════════════════════════════════════════════════
#  BUILD SHEETS
# ═══════════════════════════════════════════════════════════════════════════════

def build_ksa_regulator_master(wb):
    """Sheet 1: Complete KSA Regulator Catalogue (local + international)"""
    ws = wb.create_sheet('KSA — Regulator Master', 0)
    ws.sheet_view.showGridLines = False

    # Title
    ws.merge_cells('A1:P1')
    c = ws['A1']
    c.value = '🇸🇦  KSA GRC REGULATOR MASTER CATALOGUE  ·  Local (60+) + International (15) = 75+ Active Regulators in KSA'
    c.font = F['title']; c.fill = fill('FF1A237E'); c.alignment = AL
    ws.row_dimensions[1].height = 28

    # ── LOCAL REGULATORS ──
    banner(ws, 2, '  LOCAL REGULATORS  ·  Tier 1 (Primary) + Tier 2 (Sector) + Tier 3 (Specialised)', 'FF1A237E', ncols=16)
    hdr_row(ws, 3, [
        'Code','Name (EN)','Name (AR)','Sector Group','Tier',
        'Own Frameworks','Power Index (0-100)','Enforcement',
        'Key Frameworks','Mandatory for','Saudisation?','Website',
        'Sectors Covered','Annual Compliance Cost (Est.)','Notes',''
    ], '2C3E50')
    tier_colors = {'T1':C['T1_BG'],'T2':C['T2_BG'],'T3':C['T3_BG'],'T4':C['T4_BG']}
    for i, reg in enumerate(KSA_LOCAL_REGS):
        bg = tier_colors.get(reg['tier'], C['WHITE'])
        tier_label = reg['tier']
        icon = {'T1':'🔴','T2':'🟠','T3':'🟡','T4':'🟢'}.get(tier_label,'⚪')
        data(ws, 4+i, [
            reg['code'], reg['name_en'], reg['name_ar'],
            reg['sector'], f"{icon} {tier_label}",
            reg['own_fw'], reg['power'], 'MANDATORY',
            '-', 'Sector-dependent', 'Yes (where applicable)',
            reg.get('url',''), '-', '-', reg.get('notes',''), ''
        ], bg=bg)

    row_after_local = 4 + len(KSA_LOCAL_REGS) + 2

    # ── INTERNATIONAL REGULATORS ──
    banner(ws, row_after_local, '  INTERNATIONAL REGULATORS / BODIES OPERATING IN KSA', C['INTL'], ncols=16)
    hdr_row(ws, row_after_local+1, [
        'Code','Name (EN)','Body','Applies To','Focal KSA Regulator',
        'Mandatory?','Enforcement Mechanism','Frameworks (in KSA)',
        'Controls','Mutual Evaluation?','KSA Status','Notes','','','',''
    ], C['INTL'])
    for i, reg in enumerate(KSA_INTL_REGS):
        data(ws, row_after_local+2+i, [
            reg['code'], reg['name_en'], reg['body'],
            reg['applies_to'], reg['focal'],
            'YES' if reg['mandatory'] else 'NO (benchmark)',
            reg['enforcement'], ' · '.join(reg['frameworks']),
            reg['controls'], 'YES' if reg['code']=='FATF' else 'NO',
            'Active', reg['notes'], '', '', '', ''
        ], bg=C['INTL_BG'])

    # Summary count at top
    ws.cell(row_after_local+len(KSA_INTL_REGS)+4, 1,
        f'TOTAL: {len(KSA_LOCAL_REGS)} Local + {len(KSA_INTL_REGS)} International = {len(KSA_LOCAL_REGS)+len(KSA_INTL_REGS)} Active Regulatory Bodies in KSA'
    ).font = F['body_b']

    col_widths(ws, [14,42,32,22,8,12,14,14,44,20,16,28,18,22,38,10])
    return ws


def build_ksa_sector_drilldown(wb):
    """Sheet 2: Sector × Regulator × Framework × Controls × Evidence × Risk"""
    ws = wb.create_sheet('KSA — Sector Drill-Down')
    ws.sheet_view.showGridLines = False

    ws.merge_cells('A1:P1')
    c = ws['A1']
    c.value = '🇸🇦  KSA SECTOR DRILL-DOWN  ·  Per Sector: Regulators · Frameworks · Controls · Evidence · Risk'
    c.font = F['title']; c.fill = fill('FF880E4F'); c.alignment = AL
    ws.row_dimensions[1].height = 28

    row = 2
    for sector in KSA_SECTORS:
        # Sector banner
        banner(ws, row, f"  {sector['emoji']}  {sector['name']}  ({sector['code']})  ·  {sector['name_ar']}  ·  Reg Count: {sector['reg_count']+sector['intl_count']}  ·  Controls: {sector['control_count']}  ·  IoT Intensity: {sector['iot_intensity']}  ·  Risk: {sector['risk_level']}", sector['color'], ncols=16, height=22)
        row += 1

        # Sub-sections in row format
        # Regulators
        ws.cell(row, 1, '▸ Local Regulators:').font = F['body_b']
        ws.merge_cells(start_row=row, start_column=2, end_row=row, end_column=8)
        ws.cell(row, 2, '  ·  '.join(sector['primary_regs'])).font = F['body']
        ws.merge_cells(start_row=row, start_column=9, end_row=row, end_column=10)
        ws.cell(row, 9, 'International:').font = F['body_b']
        ws.merge_cells(start_row=row, start_column=11, end_row=row, end_column=16)
        ws.cell(row, 11, '  ·  '.join(sector['intl_regs'])).font = F['body']
        ws.row_dimensions[row].height = 16
        row += 1

        # Frameworks
        ws.cell(row, 1, '▸ Key Frameworks:').font = F['body_b']
        ws.merge_cells(start_row=row, start_column=2, end_row=row, end_column=16)
        ws.cell(row, 2, '  ·  '.join(sector['key_frameworks'])).font = F['body']
        ws.row_dimensions[row].height = 15
        row += 1

        # Evidence
        ws.cell(row, 1, '▸ Mandatory Certs:').font = F['body_b']
        ws.merge_cells(start_row=row, start_column=2, end_row=row, end_column=8)
        ws.cell(row, 2, '  ·  '.join(sector['mandatory_certs'])).font = F['body']
        ws.cell(row, 9, '▸ Audit Frequency:').font = F['body_b']
        ws.merge_cells(start_row=row, start_column=10, end_row=row, end_column=16)
        ws.cell(row, 10, sector['audit_freq']).font = F['body']
        ws.row_dimensions[row].height = 15
        row += 1

        # Org types
        ws.cell(row, 1, '▸ Org Types:').font = F['body_b']
        ws.merge_cells(start_row=row, start_column=2, end_row=row, end_column=16)
        ws.cell(row, 2, '  ·  '.join(sector.get('org_types',[]))).font = F['small']
        ws.row_dimensions[row].height = 15
        row += 2  # gap

    col_widths(ws, [18,24,14,14,14,14,14,14,18,14,14,14,14,14,14,14])
    return ws


def build_ksa_orgtype_matrix(wb):
    """Sheet 3: Per Org Type — full GRC obligation matrix"""
    ws = wb.create_sheet('KSA — Org Type Matrix')
    ws.sheet_view.showGridLines = False

    ws.merge_cells('A1:O1')
    c = ws['A1']
    c.value = '🇸🇦  KSA GRC — PER ORG TYPE OBLIGATION MATRIX  ·  What applies to each type of organisation?'
    c.font = F['title']; c.fill = fill('FF4A148C'); c.alignment = AL
    ws.row_dimensions[1].height = 28

    hdr_row(ws, 2, [
        'Org Type','Sector','Complexity','Mandatory Regulators',
        'Mandatory Frameworks','Controls Required','Saudisation Target',
        'Board Required?','CISO Required?','DPO Required?','MLRO Required?',
        'Min Org Size','Mandatory Evidence (Summary)','Audit Frequency',''
    ], 'FF4A148C')

    complexity_colors = {'HIGHEST':C['T1_BG'],'HIGH':C['T2_BG'],'MEDIUM':C['T3_BG'],'BASIC':C['T4_BG']}
    for i, org in enumerate(KSA_ORG_TYPES):
        bg = complexity_colors.get(org['tier_complexity'], C['WHITE'])
        data(ws, 3+i, [
            org['name'], org['sector'], org['tier_complexity'],
            '\n'.join(org['mandatory_regs'][:6]),
            '\n'.join(org['mandatory_frameworks'][:5]),
            org['mandatory_controls'],
            org['saudisation_target'],
            '✅' if org['board_req'] else '❌',
            '✅' if org['ciso_req'] else '❌',
            '✅' if org['dpo_req'] else '❌',
            '✅' if org['mlro_req'] else '❌',
            org['min_org_size'],
            ' · '.join(org['mandatory_evidence'][:4]),
            'ANNUAL + CONTINUOUS',''
        ], bg=bg)
        ws.row_dimensions[3+i].height = 60

    col_widths(ws, [30,10,12,38,42,12,20,12,12,12,12,14,55,22,10])
    return ws


def build_ksa_orgsize_guide(wb):
    """Sheet 4: Per Org Size — framework obligation and cost"""
    ws = wb.create_sheet('KSA — Org Size Guide')
    ws.sheet_view.showGridLines = False

    ws.merge_cells('A1:L1')
    c = ws['A1']
    c.value = '🇸🇦  KSA GRC — ORGANISATION SIZE COMPLIANCE GUIDE  ·  Micro → SIFI'
    c.font = F['title']; c.fill = fill('FF1B5E20'); c.alignment = AL
    ws.row_dimensions[1].height = 28

    hdr_row(ws, 2, [
        'Size Tier','Employees','Revenue','Complexity',
        'Frameworks Required','Controls Required',
        'NCA Level','PDPL Level','Audit Requirement',
        'Saudisation','Est. Annual Compliance Cost (SAR)',
        'Regulatory Burden Score (0-100)'
    ], '1B5E20')

    size_colors = {
        'MICRO':C['T4_BG'],'SMALL':C['T3_BG'],'MEDIUM':C['T2_BG'],
        'LARGE':'FFFDE8E8','ENTERPRISE':'FFFEEEEE','SIFI':'FFFFDDDD'
    }
    for i, sz in enumerate(KSA_ORG_SIZES):
        bg = size_colors.get(sz['code'], C['WHITE'])
        data(ws, 3+i, [
            f"{sz['name']} ({sz['name_ar']})", sz['employees'], sz['revenue'],
            sz['complexity'], sz['required_frameworks'], sz['controls_required'],
            sz['nca_level'], sz['pdpl_level'], sz['audit_req'],
            sz['saudisation'], sz['annual_compliance_cost_sar'],
            sz['reg_burden_score']
        ], bg=bg)
        ws.row_dimensions[3+i].height = 45

    # Key frameworks per size
    banner(ws, 11, '  KEY FRAMEWORKS PER SIZE TIER', 'FF1B5E20', ncols=12)
    hdr_row(ws, 12, ['Size','Framework 1','Framework 2','Framework 3','Framework 4','Framework 5',
                     'Framework 6','Evidence Type 1','Evidence Type 2','Evidence Type 3','Controls','Notes'], '2E7D32')
    for i, sz in enumerate(KSA_ORG_SIZES):
        fws = sz['key_frameworks']
        evs = sz['evidence_req']
        while len(fws) < 6: fws.append('-')
        while len(evs) < 3: evs.append('-')
        data_c(ws, 13+i, [sz['name'],fws[0],fws[1],fws[2],fws[3],fws[4],fws[5],
                           evs[0],evs[1],evs[2],sz['controls_required'],'-'])

    col_widths(ws, [22,16,20,14,18,14,38,38,26,20,18,30])
    return ws


def build_ksa_frameworks_master(wb):
    """Sheet 5: Full KSA Framework Master with per-control breakdown"""
    ws = wb.create_sheet('KSA — Framework Master')
    ws.sheet_view.showGridLines = False

    ws.merge_cells('A1:N1')
    c = ws['A1']
    c.value = '🇸🇦  KSA FRAMEWORK MASTER  ·  All Mandatory + Key Frameworks with Control Counts, Evidence, Risk Domain'
    c.font = F['title']; c.fill = fill('FF0D47A1'); c.alignment = AL
    ws.row_dimensions[1].height = 28

    hdr_row(ws, 2, [
        'Framework Code','Framework Name','Domains','Controls',
        'Mandatory For','Sectors','Tier','Audit Frequency',
        'Evidence Type Required','Risk Domain','Effective Date',
        'Issuing Body','Key Notes',''
    ], '0D47A1')

    for i, fw in enumerate(KSA_FRAMEWORKS_MASTER):
        tier_bg = {'T1':C['T1_BG'],'T2':C['T2_BG'],'INTL':C['INTL_BG']}.get(fw['tier'],C['WHITE'])
        data(ws, 3+i, [
            fw['code'], fw['name'],
            fw['domains'], fw['controls'] if fw['controls'] else 'Domain-based',
            fw['mandatory_for'], fw['sectors'], fw['tier'],
            fw['audit_freq'], fw['evidence_type'],
            fw['risk_domain'], fw['effective_date'],
            'NCA' if fw['tier']=='T1' and 'NCA' in fw['code'] else
            'SDAIA' if 'PDPL' in fw['code'] else
            'SAMA' if 'SAMA' in fw['code'] else
            'International' if fw['tier']=='INTL' else 'Various',
            fw['note'], ''
        ], bg=tier_bg)
        ws.row_dimensions[3+i].height = 35

    col_widths(ws, [24,48,10,12,38,24,8,18,55,22,14,14,55,10])
    return ws


def build_ksa_evidence_matrix(wb):
    """Sheet 6: Full evidence requirements by type × org type"""
    ws = wb.create_sheet('KSA — Evidence Matrix')
    ws.sheet_view.showGridLines = False

    ws.merge_cells('A1:K1')
    c = ws['A1']
    c.value = '🇸🇦  KSA EVIDENCE REQUIREMENTS MATRIX  ·  What evidence? For whom? How often? What if missing?'
    c.font = F['title']; c.fill = fill('FF4A148C'); c.alignment = AL
    ws.row_dimensions[1].height = 28

    hdr_row(ws, 2, [
        'Evidence Type','Applies To','Collection Frequency',
        'Submittable To Regulator','Retention (Yrs)','Format',
        'AI-Extractable?','Risk if Missing','Owner Role','Notes',''
    ], '4A148C')

    for i, ev in enumerate(KSA_EVIDENCE_TYPES):
        bg = C['ROW_ALT'] if i % 2 == 0 else C['WHITE']
        data(ws, 3+i, [
            ev['type'], ev['applies_to'], ev['frequency'],
            ev['submittable_to'], ev['retention_years'],
            ev['format'], ev['ai_extract'],
            ev['risk_if_missing'], ev['owner_role'],
            '', ''
        ], bg=bg)
        ws.row_dimensions[3+i].height = 35

    # Cross-reference table: Org Type × Evidence Required
    start_ev_cross = 3 + len(KSA_EVIDENCE_TYPES) + 3
    banner(ws, start_ev_cross, '  EVIDENCE × ORG TYPE CROSS-REFERENCE  (✅ = Required  ·  ⚠️ = Conditional  ·  ❌ = Not Required)', '4A148C', ncols=14)
    org_codes = [o['code'][:8] for o in KSA_ORG_TYPES]
    hdr_row(ws, start_ev_cross+1, ['Evidence Type'] + org_codes + [''], '6A1B9A')

    # Applicability map
    ev_org_map = {
        'NCA Self-Assessment Report':         ['✅','✅','✅','✅','✅','✅','✅','✅','✅','⚠️','✅','✅'],
        'External Cybersecurity Audit':       ['✅','✅','✅','✅','⚠️','✅','✅','✅','✅','❌','✅','✅'],
        'PDPL Compliance Report / DPO':       ['✅','✅','✅','✅','✅','✅','✅','✅','✅','✅','✅','✅'],
        'Data Processing Impact Assessment':  ['✅','✅','⚠️','✅','✅','✅','✅','✅','✅','⚠️','✅','✅'],
        'AML/CFT STR Logs & CDD Records':     ['✅','✅','✅','❌','❌','❌','❌','✅','❌','❌','❌','✅'],
        'CBAHI Accreditation Evidence Pack':  ['❌','❌','❌','✅','✅','❌','❌','❌','❌','❌','❌','❌'],
        'ISO 27001 Certificate':              ['⚠️','⚠️','⚠️','⚠️','❌','✅','✅','⚠️','✅','❌','✅','✅'],
        'PCI DSS Attestation of Compliance':  ['✅','⚠️','✅','⚠️','❌','⚠️','❌','⚠️','❌','⚠️','⚠️','⚠️'],
        'Penetration Test Report':            ['✅','✅','✅','✅','⚠️','✅','✅','✅','✅','❌','✅','✅'],
        'Business Continuity Plan + Test':    ['✅','✅','⚠️','✅','⚠️','✅','✅','✅','✅','❌','✅','✅'],
        'SFDA Device Registration Cert':      ['❌','❌','❌','✅','✅','❌','❌','❌','❌','❌','❌','❌'],
        'Saudisation Nitaqat Certificate':    ['✅','✅','✅','✅','✅','✅','✅','✅','✅','✅','✅','✅'],
        'ZATCA E-Invoicing Compliance':       ['✅','✅','✅','✅','✅','✅','✅','✅','✅','✅','✅','✅'],
        'Annual Audited Financial Statements':['✅','✅','⚠️','❌','❌','✅','✅','✅','✅','❌','❌','✅'],
        'Incident Report (72h notification)': ['✅','✅','✅','✅','✅','✅','✅','✅','✅','⚠️','✅','✅'],
    }
    color_map = {'✅':'FFE8F5E9','⚠️':'FFFFF9C4','❌':'FFFCE4EC'}
    for i, (ev_name, applicability) in enumerate(ev_org_map.items()):
        ws.cell(start_ev_cross+2+i, 1, ev_name).font = F['body']
        ws.cell(start_ev_cross+2+i, 1).border = thin()
        for ci, val in enumerate(applicability, 2):
            cell = ws.cell(start_ev_cross+2+i, ci, val)
            cell.fill = fill(color_map.get(val, 'FFFFFFFF'))
            cell.font = F['body']; cell.alignment = AC; cell.border = thin()
        ws.cell(start_ev_cross+2+i, 14, '').border = thin()
        ws.row_dimensions[start_ev_cross+2+i].height = 18

    col_widths(ws, [45,12,18,28,12,20,14,55,18,12])
    return ws


def build_ksa_risk_matrix(wb):
    """Sheet 7: KSA Risk Domain × Sector × Org Type matrix"""
    ws = wb.create_sheet('KSA — Risk Matrix')
    ws.sheet_view.showGridLines = False

    ws.merge_cells('A1:M1')
    c = ws['A1']
    c.value = '🇸🇦  KSA GRC RISK MATRIX  ·  Risk Domain × Sector × Org Type  ·  Score · KRI · Threshold · Regulator'
    c.font = F['title']; c.fill = fill('FFB71C1C'); c.alignment = AL
    ws.row_dimensions[1].height = 28

    hdr_row(ws, 2, [
        'Risk Domain','Category','Risk Score (0-100)','Level',
        'Primary Regulator','Key Framework','KRI Metric',
        'KRI Threshold','Sectors Affected','Org Size Impact',
        'Evidence Required','Escalation Path',''
    ], 'FFB71C1C')

    level_bg = {'CRITICAL':'FFFFebee','HIGH':'FFFff8e1','MEDIUM':'FFe8f5e9','LOW':'FFe3f2fd'}
    for i, risk in enumerate(KSA_RISK_DOMAINS):
        bg = level_bg.get(risk['level'], C['WHITE'])
        level_icon = {'CRITICAL':'🔴','HIGH':'🟠','MEDIUM':'🟡','LOW':'🟢'}.get(risk['level'],'⚪')
        data(ws, 3+i, [
            risk['domain'], risk['category'],
            risk['score'], f"{level_icon} {risk['level']}",
            risk['primary_reg'], risk['framework'],
            risk['kri'], risk['threshold'],
            ', '.join(risk['sectors']), risk['org_size_impact'],
            'NCA Incident Report + Audit', 'CISO → CCO → Board',''
        ], bg=bg)
        ws.row_dimensions[3+i].height = 30

    # Risk heat map: Risk × Sector
    hm_start = 3 + len(KSA_RISK_DOMAINS) + 3
    banner(ws, hm_start, '  RISK HEAT MAP: Risk Domain × KSA Sector', 'FFB71C1C', ncols=13)
    sector_codes = ['FIN','HC','CYB','ICT','ENR','GOV','TAX','STD','TRN','IND','EDU','LEG']
    hdr_row(ws, hm_start+1, ['Risk Domain'] + sector_codes, 'FFC62828')

    risk_heat = {
        'Cyber – CNI':        ['H','H','C','H','C','C','M','M','H','H','M','M'],
        'Cyber – OT/IoMT':    ['L','C','M','M','C','M','L','L','H','H','L','L'],
        'Data Privacy':       ['C','C','C','C','M','C','H','M','H','H','H','M'],
        'Financial Crime':    ['C','M','H','M','M','M','C','L','M','M','L','H'],
        'Cloud Misconfig':    ['H','H','C','H','H','C','H','M','H','H','H','M'],
        'Operational Resil':  ['C','H','H','H','C','C','M','M','H','H','M','M'],
        '3rd Party / Supply': ['H','H','H','H','H','H','M','M','H','H','M','M'],
        'Medical Device IoMT':['L','C','M','L','M','L','L','L','L','L','L','L'],
        'Saudisation':        ['H','H','M','H','H','C','H','H','H','H','H','M'],
        'Tax/Zakat':          ['C','M','M','H','H','H','C','M','H','H','M','H'],
        'AI Governance':      ['H','H','C','H','M','C','M','L','M','M','M','L'],
        'Cross-Border Data':  ['H','H','H','C','M','H','H','M','H','H','H','M'],
    }
    heat_fill = {'C':'FFFFCDD2','H':'FFFFF8E1','M':'FFFFF9C4','L':'FFE8F5E9'}
    heat_label = {'C':'🔴 CRITICAL','H':'🟠 HIGH','M':'🟡 MEDIUM','L':'🟢 LOW'}
    for ri, (rname, vals) in enumerate(risk_heat.items()):
        ws.cell(hm_start+2+ri, 1, rname).font = F['body_b']
        ws.cell(hm_start+2+ri, 1).border = thin()
        for ci, v in enumerate(vals, 2):
            cell = ws.cell(hm_start+2+ri, ci, heat_label[v])
            cell.fill = fill(heat_fill[v])
            cell.font = Font(name='Calibri', size=8, bold=(v=='C'))
            cell.alignment = AC; cell.border = thin()
        ws.cell(hm_start+2+ri, 14, '').border = thin()

    col_widths(ws, [28,16,15,14,18,28,32,38,28,22,35,28,10])
    return ws


def build_ksa_summary_dashboard(wb):
    """Sheet 0: KSA GRC Intelligence Dashboard Summary"""
    ws = wb.create_sheet('KSA — GRC Dashboard', 0)
    ws.sheet_view.showGridLines = False

    ws.merge_cells('A1:J1')
    c = ws['A1']
    c.value = '🇸🇦  SHAHIN-AI  ·  KSA GRC INTELLIGENCE DASHBOARD  ·  Full Regulatory Universe'
    c.font = Font(name='Calibri', size=15, bold=True, color='FFFFFFFF')
    c.fill = fill('FF1A237E'); c.alignment = AC
    ws.row_dimensions[1].height = 35

    # Stats block
    stats = [
        ('Total Regulators in KSA', f'{len(KSA_LOCAL_REGS)} local + {len(KSA_INTL_REGS)} international = {len(KSA_LOCAL_REGS)+len(KSA_INTL_REGS)} total', 'FF1A237E'),
        ('Tier 1 (Critical Power)', f'{sum(1 for r in KSA_LOCAL_REGS if r["tier"]=="T1")} local primary regulators', 'FFC0392B'),
        ('Tier 2 (Sector)', f'{sum(1 for r in KSA_LOCAL_REGS if r["tier"]=="T2")} sector-level regulators', 'FFE67E22'),
        ('International Bodies Active in KSA', f'{len(KSA_INTL_REGS)} (FATF, Basel, IOSCO, SWIFT, ISO, IEC, etc.)', 'FF1565C0'),
        ('KSA Frameworks (key)', f'{len(KSA_FRAMEWORKS_MASTER)} documented key frameworks', 'FF2E7D32'),
        ('Total Control Count (KSA)', '28,239 individual controls (from 405 frameworks)', 'FF4A148C'),
        ('Sectors Covered', f'{len(KSA_SECTORS)} sectors with full regulatory mapping', 'FF880E4F'),
        ('Org Types Mapped', f'{len(KSA_ORG_TYPES)} organisation types with obligation matrix', 'FF37474F'),
        ('Org Size Tiers', f'{len(KSA_ORG_SIZES)} tiers (Micro → SIFI) with cost/burden estimates', 'FF1B5E20'),
        ('Risk Domains Tracked', f'{len(KSA_RISK_DOMAINS)} risk domains with KRIs and thresholds', 'FFB71C1C'),
        ('Evidence Types Required', f'{len(KSA_EVIDENCE_TYPES)} types of compliance evidence', 'FF4A148C'),
    ]
    for i, (label, value, color) in enumerate(stats):
        ws.merge_cells(start_row=3+i, start_column=1, end_row=3+i, end_column=3)
        ws.merge_cells(start_row=3+i, start_column=4, end_row=3+i, end_column=10)
        cl = ws.cell(3+i, 1, label)
        cl.fill = fill(color); cl.font = F['hdr']; cl.alignment = AL; cl.border = thin()
        cv = ws.cell(3+i, 4, value)
        cv.fill = fill('FFF8F9FA'); cv.font = F['body_b']; cv.alignment = AL; cv.border = thin()
        ws.row_dimensions[3+i].height = 22

    # Sector Summary Table
    banner(ws, 16, '  KSA SECTOR SUMMARY', 'FF1A237E', ncols=10)
    hdr_row(ws, 17, ['Sector','Emoji','Local Regs','Intl Regs','Total Regs','Key Frameworks','Controls','Risk Level','IoT Intensity','Risk Score'], '1A237E')
    for i, sec in enumerate(KSA_SECTORS):
        risk_bg = {'CRITICAL':C['T1_BG'],'HIGH':C['T2_BG'],'MEDIUM':C['T3_BG']}.get(sec['risk_level'],C['T4_BG'])
        data_c(ws, 18+i, [
            sec['name'], sec['emoji'],
            sec['reg_count'], sec['intl_count'],
            sec['reg_count']+sec['intl_count'],
            len(sec['key_frameworks']),
            sec['control_count'],
            sec['risk_level'], sec['iot_intensity'],
            sum(r['score'] for r in KSA_RISK_DOMAINS if (sec['code'] in r['sectors'] or 'ALL' in r['sectors'])),
        ], bg=risk_bg)

    # Navigation
    nav_start = 18 + len(KSA_SECTORS) + 3
    banner(ws, nav_start, '  NAVIGATION — DRILL-DOWN SHEETS IN THIS WORKBOOK', 'FF37474F', ncols=10)
    nav_sheets = [
        ('KSA — Regulator Master', f'All {len(KSA_LOCAL_REGS)+len(KSA_INTL_REGS)} regulators: local + international, tiers, power index, frameworks'),
        ('KSA — Sector Drill-Down', f'All {len(KSA_SECTORS)} sectors: per sector regulators, frameworks, evidence, risk'),
        ('KSA — Org Type Matrix', f'All {len(KSA_ORG_TYPES)} org types: obligation matrix, CISO/DPO/MLRO requirements'),
        ('KSA — Org Size Guide', f'All {len(KSA_ORG_SIZES)} size tiers: compliance cost, controls, audit requirements'),
        ('KSA — Framework Master', f'All {len(KSA_FRAMEWORKS_MASTER)} key frameworks: domains, controls, evidence, risk, effective date'),
        ('KSA — Evidence Matrix', f'All {len(KSA_EVIDENCE_TYPES)} evidence types × org type cross-reference'),
        ('KSA — Risk Matrix', f'All {len(KSA_RISK_DOMAINS)} risk domains: heat map, KRIs, thresholds, escalation'),
    ]
    for i, (sheet, desc) in enumerate(nav_sheets):
        ws.cell(nav_start+1+i, 1, f'→ {sheet}').font = F['body_b']
        ws.merge_cells(start_row=nav_start+1+i, start_column=2, end_row=nav_start+1+i, end_column=10)
        ws.cell(nav_start+1+i, 2, desc).font = F['body']
        ws.row_dimensions[nav_start+1+i].height = 18

    col_widths(ws, [32,28,14,14,14,16,12,14,14,16])
    return ws


# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════════════════════
def build():
    print(f'📂 Loading: {FILE}')
    wb = load_workbook(FILE)
    print(f'✅ Loaded. Existing sheets: {len(wb.worksheets)}')

    print('   📊 Building KSA GRC Dashboard...')
    build_ksa_summary_dashboard(wb)
    print('   📋 Building KSA Regulator Master...')
    build_ksa_regulator_master(wb)
    print('   🏭 Building KSA Sector Drill-Down...')
    build_ksa_sector_drilldown(wb)
    print('   🏢 Building KSA Org Type Matrix...')
    build_ksa_orgtype_matrix(wb)
    print('   📏 Building KSA Org Size Guide...')
    build_ksa_orgsize_guide(wb)
    print('   📜 Building KSA Framework Master...')
    build_ksa_frameworks_master(wb)
    print('   🗂️  Building KSA Evidence Matrix...')
    build_ksa_evidence_matrix(wb)
    print('   ⚠️  Building KSA Risk Matrix...')
    build_ksa_risk_matrix(wb)

    print(f'\n💾 Saving...')
    wb.save(FILE)
    print(f'✅ Done! Total sheets: {len(wb.worksheets)}')
    print(f'\n📊 KSA Intelligence Summary:')
    print(f'   Total KSA regulators mapped: {len(KSA_LOCAL_REGS)+len(KSA_INTL_REGS)} ({len(KSA_LOCAL_REGS)} local + {len(KSA_INTL_REGS)} international)')
    print(f'   Sectors: {len(KSA_SECTORS)} | Org Types: {len(KSA_ORG_TYPES)} | Size Tiers: {len(KSA_ORG_SIZES)}')
    print(f'   Frameworks: {len(KSA_FRAMEWORKS_MASTER)} | Evidence types: {len(KSA_EVIDENCE_TYPES)} | Risk domains: {len(KSA_RISK_DOMAINS)}')

if __name__ == '__main__':
    build()
