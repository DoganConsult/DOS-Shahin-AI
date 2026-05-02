#!/usr/bin/env python3
"""
Shahin-Ai Global Regulatory Intelligence Builder
Extends KSA_GRC_AllSectors_Complete.xlsx → Shahin_GRC_Global_AllCountries.xlsx
18 countries + International bodies | ~550 regulators | ~1,250 frameworks

Note: output filenames retain the historical 'Shahin_GRC_*' prefix to keep
existing downstream consumers stable; the brand label inside the workbook
itself is 'Shahin-Ai'.
"""

import shutil
import os
from openpyxl import load_workbook
from openpyxl.styles import (
    PatternFill, Font, Alignment, Border, Side, GradientFill
)
from openpyxl.utils import get_column_letter

# ─── Paths ───────────────────────────────────────────────────────────────────
SRC = '/root/DOS-AIO/DOS-AIO-Specs/KSA_GRC_AllSectors_Complete.xlsx'
DST = '/root/DOS-AIO/DOS-AIO-Specs/Shahin_GRC_Global_AllCountries.xlsx'

# ─── Colours ─────────────────────────────────────────────────────────────────
C = {
    'T1':        'FFC0392B',   # T1 regulator – red
    'T2':        'FFE67E22',   # T2 – orange
    'T3':        'FFF39C12',   # T3 – yellow
    'T4':        'FF27AE60',   # T4 – green
    'FRAGILE':   'FF7F8C8D',   # fragile state – grey
    'INTL':      'FF2980B9',   # international body – blue
    'SECTION_A': 'FF1A237E',   # Regulators header – dark navy
    'SECTION_B': 'FF283593',   # Frameworks
    'SECTION_C': 'FF1565C0',   # Controls
    'SECTION_D': 'FFB71C1C',   # Risk
    'SECTION_E': 'FF2E7D32',   # Lifecycle
    'SECTION_F': 'FF4A148C',   # Evidence
    'SECTION_G': 'FF37474F',   # Maturity
    'HDR_FG':    'FFFFFFFF',   # header text – white
    'ROW_ALT':   'FFF5F5F5',   # alternating row
    'MANDATORY': 'FFE8F5E9',
    'VOLUNTARY': 'FFFFF9C4',
    'FRAGILE_ROW': 'FFECEFF1',
}

FONT_BODY = Font(name='Calibri', size=10)
FONT_HDR  = Font(name='Calibri', size=10, bold=True, color=C['HDR_FG'])
FONT_SEC  = Font(name='Calibri', size=11, bold=True, color=C['HDR_FG'])
FONT_TITLE= Font(name='Calibri', size=14, bold=True, color='FF1A237E')
ALIGN_C   = Alignment(horizontal='center', vertical='center', wrap_text=True)
ALIGN_L   = Alignment(horizontal='left',   vertical='center', wrap_text=True)

def fill(hex_color):
    return PatternFill('solid', fgColor=hex_color)

def thin_border():
    s = Side(border_style='thin', color='FFB0BEC5')
    return Border(left=s, right=s, top=s, bottom=s)

def write_header_row(ws, row, cols, bg_color, font=None):
    """Write a header row with given background."""
    fnt = font or FONT_HDR
    for c, val in enumerate(cols, 1):
        cell = ws.cell(row=row, column=c, value=val)
        cell.fill = fill(bg_color)
        cell.font = fnt
        cell.alignment = ALIGN_C
        cell.border = thin_border()

def write_section_banner(ws, row, title, bg_color, ncols=10):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=ncols)
    cell = ws.cell(row=row, column=1, value=title)
    cell.fill = fill(bg_color)
    cell.font = FONT_SEC
    cell.alignment = ALIGN_L
    cell.border = thin_border()

def write_data_row(ws, row, values, alt=False):
    bg = C['ROW_ALT'] if alt else 'FFFFFFFF'
    for c, val in enumerate(values, 1):
        cell = ws.cell(row=row, column=c, value=val)
        cell.fill = fill(bg)
        cell.font = FONT_BODY
        cell.alignment = ALIGN_L
        cell.border = thin_border()

def write_data_row_colored(ws, row, values, bg_color):
    for c, val in enumerate(values, 1):
        cell = ws.cell(row=row, column=c, value=val)
        cell.fill = fill(bg_color)
        cell.font = FONT_BODY
        cell.alignment = ALIGN_L
        cell.border = thin_border()

def set_col_widths(ws, widths):
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

def write_country_sheet(wb, country_data):
    """Write a full country sheet with all 7 sections."""
    title = f"{country_data['flag']} {country_data['name_en']}"
    ws = wb.create_sheet(title=title[:31])  # Excel limit
    ws.sheet_view.showGridLines = False
    ws.freeze_panes = 'A3'

    # ── Title row ──
    ws.row_dimensions[1].height = 30
    ws.merge_cells('A1:J1')
    tc = ws['A1']
    tc.value = f"{country_data['flag']}  {country_data['name_en']} ({country_data['iso']})  ·  GRC Regulatory Intelligence"
    tc.font = FONT_TITLE
    tc.fill = fill('FFF8F9FA')
    tc.alignment = ALIGN_L

    current_row = 2

    # ══ SECTION A — Regulators ══════════════════════════════════════════════
    write_section_banner(ws, current_row, '  A │ REGULATORS', C['SECTION_A'], ncols=10)
    current_row += 1
    write_header_row(ws, current_row, [
        'Code', 'Name (EN)', 'Name (AR)', 'Sector Group', 'Tier',
        'Own FW Count', 'Power Index', 'Enforcement', 'Website', 'Notes'
    ], C['SECTION_A'])
    current_row += 1
    for i, reg in enumerate(country_data['regulators']):
        tier = reg.get('tier', 'T3')
        row_bg = C.get(tier, C['T3'])
        values = [
            reg.get('code',''), reg.get('name_en',''), reg.get('name_ar',''),
            reg.get('sector',''), f"🔴 {tier}" if tier=='T1' else f"🟠 {tier}" if tier=='T2' else f"🟡 {tier}" if tier=='T3' else f"🟢 {tier}",
            reg.get('own_fw', 0), reg.get('power_index', '-'),
            reg.get('enforcement', 'MANDATORY'), reg.get('url', ''), reg.get('notes', '')
        ]
        write_data_row_colored(ws, current_row, values,
            C['T1'] if tier=='T1' else
            'FFFDE8E8' if tier=='T2' else
            'FFFFF8DC' if tier=='T3' else
            'FFE8F5E9')
        current_row += 1

    current_row += 1

    # ══ SECTION B — Frameworks ═══════════════════════════════════════════════
    write_section_banner(ws, current_row, '  B │ FRAMEWORKS', C['SECTION_B'], ncols=10)
    current_row += 1
    write_header_row(ws, current_row, [
        'Framework Code', 'Name (EN)', 'Issuing Regulator', 'Version/Year',
        'Mandatory?', 'Control Count', 'Sector Applicability',
        'Audit Frequency', 'Effective Date', 'Canonical DB Code'
    ], C['SECTION_B'])
    current_row += 1
    for i, fw in enumerate(country_data['frameworks']):
        mandatory = fw.get('mandatory', 'Y')
        bg = C['MANDATORY'] if mandatory == 'Y' else C['VOLUNTARY']
        values = [
            fw.get('code',''), fw.get('name_en',''), fw.get('regulator',''),
            fw.get('version',''), mandatory,
            fw.get('control_count', '-'), fw.get('sectors', 'ALL'),
            fw.get('audit_freq', 'ANNUAL'), fw.get('effective_date', '-'),
            fw.get('canonical_code', fw.get('code',''))
        ]
        write_data_row_colored(ws, current_row, values, bg)
        current_row += 1

    current_row += 1

    # ══ SECTION C — Control Domains ══════════════════════════════════════════
    write_section_banner(ws, current_row, '  C │ CONTROL DOMAINS', C['SECTION_C'], ncols=10)
    current_row += 1
    write_header_row(ws, current_row, [
        'Domain Code', 'Domain Name', 'Primary Framework', 'Control Count',
        'Risk Level', 'IoT Relevance', 'Automation Possible?',
        'Audit Method', 'Shahin-Ai Score', 'Notes'
    ], C['SECTION_C'])
    current_row += 1
    for i, dom in enumerate(country_data.get('control_domains', [])):
        write_data_row(ws, current_row, [
            dom.get('code',''), dom.get('name',''), dom.get('framework',''),
            dom.get('count', '-'), dom.get('risk_level','HIGH'),
            dom.get('iot_relevance','MODERATE'), dom.get('auto','Y'),
            dom.get('audit_method','EXTERNAL_AUDIT'),
            dom.get('shahin_score', '-'), dom.get('notes','')
        ], alt=(i % 2 == 0))
        current_row += 1

    current_row += 1

    # ══ SECTION D — Risk Domains ═════════════════════════════════════════════
    write_section_banner(ws, current_row, '  D │ RISK DOMAINS', C['SECTION_D'], ncols=10)
    current_row += 1
    write_header_row(ws, current_row, [
        'Risk Domain', 'Risk Category', 'Risk Score (0-100)', 'Level',
        'Primary Regulator', 'Linked Framework',
        'KRI Count', 'Escalation Threshold', 'Owner Role', 'Notes'
    ], C['SECTION_D'])
    current_row += 1
    for i, risk in enumerate(country_data.get('risk_domains', [])):
        write_data_row(ws, current_row, [
            risk.get('domain',''), risk.get('category',''),
            risk.get('score', '-'), risk.get('level','HIGH'),
            risk.get('regulator',''), risk.get('framework',''),
            risk.get('kri_count','-'), risk.get('threshold','-'),
            risk.get('owner','CISO'), risk.get('notes','')
        ], alt=(i % 2 == 0))
        current_row += 1

    current_row += 1

    # ══ SECTION E — Lifecycle Stages ═════════════════════════════════════════
    write_section_banner(ws, current_row, '  E │ COMPLIANCE LIFECYCLE', C['SECTION_E'], ncols=10)
    current_row += 1
    write_header_row(ws, current_row, [
        'Stage', 'Stage Code', 'Entry Trigger', 'Exit Trigger',
        'Next Stage', 'Approval Required', 'Typical Duration',
        'Responsible Role', 'Automation', 'SLA (Days)'
    ], C['SECTION_E'])
    current_row += 1
    for i, stage in enumerate(country_data.get('lifecycle', [])):
        write_data_row(ws, current_row, [
            stage.get('name',''), stage.get('code',''),
            stage.get('entry_trigger',''), stage.get('exit_trigger',''),
            stage.get('next',''), stage.get('approval','N'),
            stage.get('duration','30 days'), stage.get('owner','Compliance Officer'),
            stage.get('auto','PARTIAL'), stage.get('sla', 30)
        ], alt=(i % 2 == 0))
        current_row += 1

    current_row += 1

    # ══ SECTION F — Evidence Requirements ════════════════════════════════════
    write_section_banner(ws, current_row, '  F │ EVIDENCE REQUIREMENTS', C['SECTION_F'], ncols=10)
    current_row += 1
    write_header_row(ws, current_row, [
        'Evidence Type', 'Framework', 'Responsible Role',
        'Collection Frequency', 'Retention (Years)',
        'Format', 'Submittable to Regulator?',
        'AI Extractable?', 'Risk if Missing', 'Notes'
    ], C['SECTION_F'])
    current_row += 1
    for i, ev in enumerate(country_data.get('evidence', [])):
        write_data_row(ws, current_row, [
            ev.get('type',''), ev.get('framework',''), ev.get('owner','CISO'),
            ev.get('frequency','ANNUAL'), ev.get('retention', 5),
            ev.get('format','PDF/Excel'), ev.get('submittable','Y'),
            ev.get('ai_extract','Y'), ev.get('risk_if_missing','HIGH'),
            ev.get('notes','')
        ], alt=(i % 2 == 0))
        current_row += 1

    current_row += 1

    # ══ SECTION G — Maturity Benchmarks ══════════════════════════════════════
    write_section_banner(ws, current_row, '  G │ GRC MATURITY BENCHMARKS', C['SECTION_G'], ncols=10)
    current_row += 1
    write_header_row(ws, current_row, [
        'Domain', 'Maturity Model', 'Country Avg Score',
        'Best-in-Class', 'Typical Target', 'Gap to Target',
        'Priority', 'Key Barrier', 'Shahin-Ai Recommendation', 'Ref Framework'
    ], C['SECTION_G'])
    current_row += 1
    for i, mat in enumerate(country_data.get('maturity', [])):
        avg = mat.get('avg', 1.5)
        target = mat.get('target', 3.0)
        gap = round(target - avg, 1)
        write_data_row(ws, current_row, [
            mat.get('domain',''), mat.get('model','CMMI 1-5'),
            avg, mat.get('best_in_class', 4.0), target, gap,
            mat.get('priority','HIGH'), mat.get('barrier','Resource Constraints'),
            mat.get('recommendation','Implement structured GRC programme'),
            mat.get('framework','')
        ], alt=(i % 2 == 0))
        current_row += 1

    # ── Column widths ──
    set_col_widths(ws, [18, 38, 28, 24, 12, 12, 22, 18, 20, 28])
    return ws


# ═══════════════════════════════════════════════════════════════════════════════
#  COUNTRY DATA
# ═══════════════════════════════════════════════════════════════════════════════

STANDARD_LIFECYCLE = [
    {'name':'Draft','code':'DRAFT','entry_trigger':'Registration initiated','exit_trigger':'Initial assessment complete','next':'ASSESSED','approval':'N','duration':'14 days','owner':'Compliance Officer','auto':'FULL','sla':14},
    {'name':'Assessed','code':'ASSESSED','entry_trigger':'Draft submitted','exit_trigger':'Gap analysis approved','next':'REGISTERED','approval':'Y','duration':'30 days','owner':'Lead Auditor','auto':'PARTIAL','sla':30},
    {'name':'Registered','code':'REGISTERED','entry_trigger':'Assessment passed','exit_trigger':'Controls implemented','next':'ACTIVE','approval':'Y','duration':'90 days','owner':'CISO','auto':'PARTIAL','sla':90},
    {'name':'Active','code':'ACTIVE','entry_trigger':'Registration confirmed','exit_trigger':'Audit scheduled','next':'AUDITED','approval':'N','duration':'Ongoing','owner':'Compliance Officer','auto':'FULL','sla':365},
    {'name':'Audited','code':'AUDITED','entry_trigger':'Annual audit cycle','exit_trigger':'Audit report issued','next':'RENEWED','approval':'Y','duration':'60 days','owner':'External Auditor','auto':'PARTIAL','sla':60},
    {'name':'Renewed','code':'RENEWED','entry_trigger':'Successful audit','exit_trigger':'Next cycle begins','next':'ACTIVE','approval':'N','duration':'1 day','owner':'Compliance Officer','auto':'FULL','sla':1},
    {'name':'Archived','code':'ARCHIVED','entry_trigger':'Decommission / superseded','exit_trigger':'N/A','next':'N/A','approval':'Y','duration':'N/A','owner':'CCO','auto':'N','sla':0},
]

STANDARD_EVIDENCE = [
    {'type':'Self-Assessment Report','framework':'ALL','owner':'Compliance Officer','frequency':'ANNUAL','retention':5,'format':'PDF','submittable':'Y','ai_extract':'Y','risk_if_missing':'HIGH'},
    {'type':'Gap Analysis Report','framework':'ALL','owner':'Lead Auditor','frequency':'ANNUAL','retention':5,'format':'PDF/Excel','submittable':'N','ai_extract':'Y','risk_if_missing':'HIGH'},
    {'type':'External Audit Report','framework':'ALL','owner':'External Auditor','frequency':'ANNUAL','retention':7,'format':'PDF','submittable':'Y','ai_extract':'Y','risk_if_missing':'CRITICAL'},
    {'type':'Penetration Test Report','framework':'ALL','owner':'CISO','frequency':'ANNUAL','retention':3,'format':'PDF','submittable':'Y','ai_extract':'Y','risk_if_missing':'HIGH'},
    {'type':'Regulator Inspection Record','framework':'ALL','owner':'CCO','frequency':'AS_REQUIRED','retention':10,'format':'PDF','submittable':'Y','ai_extract':'N','risk_if_missing':'CRITICAL'},
    {'type':'Incident Response Log','framework':'ALL','owner':'CISO','frequency':'CONTINUOUS','retention':5,'format':'SIEM/PDF','submittable':'Y','ai_extract':'Y','risk_if_missing':'HIGH'},
    {'type':'Training Completion Records','framework':'ALL','owner':'CISO','frequency':'ANNUAL','retention':3,'format':'CSV/PDF','submittable':'N','ai_extract':'Y','risk_if_missing':'MEDIUM'},
    {'type':'Vendor Risk Assessments','framework':'ALL','owner':'3rd Party Risk Officer','frequency':'ANNUAL','retention':3,'format':'Excel/PDF','submittable':'N','ai_extract':'Y','risk_if_missing':'HIGH'},
    {'type':'Data Protection Impact Assessment','framework':'PRIVACY','owner':'DPO','frequency':'PER_PROJECT','retention':5,'format':'PDF','submittable':'Y','ai_extract':'Y','risk_if_missing':'HIGH'},
    {'type':'Business Continuity Test Report','framework':'ALL','owner':'BCM Manager','frequency':'BIENNIAL','retention':5,'format':'PDF','submittable':'N','ai_extract':'N','risk_if_missing':'MEDIUM'},
]

COUNTRIES = {}

# ─── 🇦🇪 UAE ─────────────────────────────────────────────────────────────────
COUNTRIES['UAE'] = {
    'iso': 'AE', 'flag': '🇦🇪', 'name_en': 'United Arab Emirates',
    'name_ar': 'الإمارات العربية المتحدة', 'region': 'GCC', 'fragile': False,
    'regulators': [
        {'code':'CSC-UAE','name_en':'UAE Cybersecurity Council','name_ar':'مجلس الأمن السيبراني','sector':'Cybersecurity','tier':'T1','own_fw':3,'power_index':95,'enforcement':'MANDATORY','url':'https://csc.gov.ae'},
        {'code':'TDRA','name_en':'Telecom & Digital Gov. Regulatory Authority','name_ar':'هيئة تنظيم الاتصالات والحكومة الرقمية','sector':'ICT/Digital','tier':'T1','own_fw':5,'power_index':90,'enforcement':'MANDATORY','url':'https://tdra.gov.ae'},
        {'code':'CBUAE','name_en':'Central Bank of UAE','name_ar':'البنك المركزي لدولة الإمارات','sector':'Financial','tier':'T1','own_fw':8,'power_index':98,'enforcement':'MANDATORY','url':'https://centralbank.ae'},
        {'code':'SCA-UAE','name_en':'Securities & Commodities Authority','name_ar':'هيئة الأوراق المالية والسلع','sector':'Capital Markets','tier':'T1','own_fw':5,'power_index':85,'enforcement':'MANDATORY','url':'https://sca.gov.ae'},
        {'code':'DFSA','name_en':'Dubai Financial Services Authority','name_ar':'هيئة دبي للخدمات المالية','sector':'Financial/DIFC','tier':'T2','own_fw':6,'power_index':80,'enforcement':'MANDATORY','url':'https://dfsa.ae'},
        {'code':'DIFC-DP','name_en':'DIFC Authority – Data Protection','name_ar':'سلطة مركز دبي المالي العالمي – حماية البيانات','sector':'Data/Privacy','tier':'T2','own_fw':2,'power_index':75,'enforcement':'MANDATORY','url':'https://difc.ae'},
        {'code':'ADGM-FSRA','name_en':'ADGM Financial Services Regulatory Authority','name_ar':'هيئة أبوظبي العالمية للأسواق – تنظيم الخدمات المالية','sector':'Financial/ADGM','tier':'T2','own_fw':4,'power_index':78,'enforcement':'MANDATORY','url':'https://adgm.com'},
        {'code':'SIA-UAE','name_en':'Signals Intelligence Agency','name_ar':'جهاز أمن الدولة','sector':'Defence/Cyber','tier':'T2','own_fw':1,'power_index':70,'enforcement':'MANDATORY','url':''},
        {'code':'MOHAP-UAE','name_en':'Ministry of Health & Prevention','name_ar':'وزارة الصحة ووقاية المجتمع','sector':'Healthcare','tier':'T2','own_fw':3,'power_index':65,'enforcement':'MANDATORY','url':'https://mohap.gov.ae'},
        {'code':'DHA','name_en':'Dubai Health Authority','name_ar':'هيئة الصحة بدبي','sector':'Healthcare/DXB','tier':'T2','own_fw':3,'power_index':62,'enforcement':'MANDATORY','url':'https://dha.gov.ae'},
        {'code':'DoH-AD','name_en':'Abu Dhabi Department of Health','name_ar':'دائرة الصحة – أبوظبي','sector':'Healthcare/AD','tier':'T2','own_fw':3,'power_index':60,'enforcement':'MANDATORY','url':'https://doh.gov.ae'},
        {'code':'FTA-UAE','name_en':'Federal Tax Authority','name_ar':'الهيئة الاتحادية للضرائب','sector':'Tax','tier':'T3','own_fw':3,'power_index':70,'enforcement':'MANDATORY','url':'https://tax.gov.ae'},
        {'code':'NAMLC','name_en':'Nat. AML/CFT Committee','name_ar':'اللجنة الوطنية لمكافحة غسل الأموال','sector':'AML/CFT','tier':'T2','own_fw':2,'power_index':80,'enforcement':'MANDATORY','url':''},
        {'code':'UAEFIU','name_en':'UAE Financial Intelligence Unit','name_ar':'وحدة المعلومات المالية','sector':'AML/CFT','tier':'T2','own_fw':1,'power_index':75,'enforcement':'MANDATORY','url':'https://amlcft.gov.ae'},
        {'code':'MOHRE-UAE','name_en':'Ministry of Human Resources & Emiratisation','name_ar':'وزارة الموارد البشرية والتوطين','sector':'Labour','tier':'T3','own_fw':2,'power_index':50,'enforcement':'MANDATORY','url':'https://mohre.gov.ae'},
        {'code':'DEWA','name_en':'Dubai Electricity & Water Authority','name_ar':'هيئة كهرباء ومياه دبي','sector':'Energy/CNI','tier':'T3','own_fw':2,'power_index':55,'enforcement':'MANDATORY','url':'https://dewa.gov.ae'},
        {'code':'MBZUAI','name_en':'Mohamed bin Zayed Univ. of AI','name_ar':'جامعة محمد بن زايد للذكاء الاصطناعي','sector':'AI/Research','tier':'T4','own_fw':1,'power_index':30,'enforcement':'VOLUNTARY','url':'https://mbzuai.ac.ae'},
    ],
    'frameworks': [
        {'code':'UAE-PDPL-2021','name_en':'UAE Federal Personal Data Protection Law (Decree 45/2021)','regulator':'CSC-UAE/TDRA','version':'2021','mandatory':'Y','control_count':35,'sectors':'ALL','audit_freq':'ANNUAL','effective_date':'2022-01-01','canonical_code':'UAE-PDPL-2021'},
        {'code':'UAE-PDPL-REG-2024','name_en':'UAE PDPL Executive Regulations 2024','regulator':'CSC-UAE','version':'2024','mandatory':'Y','control_count':50,'sectors':'ALL','audit_freq':'ANNUAL','effective_date':'2024-01-01','canonical_code':'UAE-PDPL-REG-2024'},
        {'code':'UAE-CBUAE-CSF-2023','name_en':'CBUAE Cybersecurity Framework 2023','regulator':'CBUAE','version':'2023','mandatory':'Y','control_count':94,'sectors':'FIN','audit_freq':'ANNUAL','effective_date':'2023-01-01','canonical_code':'UAE-CBUAE-CSF-2023'},
        {'code':'UAE-CBUAE-OPR','name_en':'CBUAE Operational Resilience Framework','regulator':'CBUAE','version':'2023','mandatory':'Y','control_count':45,'sectors':'FIN','audit_freq':'ANNUAL','effective_date':'2023-06-01','canonical_code':'UAE-CBUAE-OPR'},
        {'code':'UAE-CBUAE-AML','name_en':'CBUAE AML/CFT Standards','regulator':'CBUAE/NAMLC','version':'2022','mandatory':'Y','control_count':40,'sectors':'FIN','audit_freq':'ANNUAL','effective_date':'2022-01-01','canonical_code':'UAE-CBUAE-AML'},
        {'code':'UAE-TDRA-NIAS','name_en':'TDRA National Information Assurance Standards','regulator':'TDRA','version':'2022','mandatory':'Y','control_count':120,'sectors':'ICT,GOV','audit_freq':'BIENNIAL','effective_date':'2022-01-01','canonical_code':'UAE-TDRA-NIAS'},
        {'code':'UAE-ISR','name_en':'UAE Information Security Regulation (TDRA)','regulator':'TDRA','version':'2021','mandatory':'Y','control_count':90,'sectors':'ICT','audit_freq':'ANNUAL','effective_date':'2021-01-01','canonical_code':'UAE-ISR'},
        {'code':'UAE-AML-2018','name_en':'UAE AML Law (Federal Decree 20/2018)','regulator':'NAMLC','version':'2018 +AMD','mandatory':'Y','control_count':25,'sectors':'ALL','audit_freq':'CONTINUOUS','effective_date':'2018-01-01','canonical_code':'UAE-AML-2018'},
        {'code':'UAE-ESG-2023','name_en':'UAE ESG Disclosure Regulations (SCA)','regulator':'SCA-UAE','version':'2023','mandatory':'Y','control_count':20,'sectors':'CAP_MKT','audit_freq':'ANNUAL','effective_date':'2023-01-01','canonical_code':'UAE-ESG-2023'},
        {'code':'UAE-CLOUD-GOV','name_en':'UAE Cloud First Policy','regulator':'TDRA','version':'2020','mandatory':'Y','control_count':20,'sectors':'GOV','audit_freq':'BIENNIAL','effective_date':'2020-01-01','canonical_code':'UAE-CLOUD-GOV'},
        {'code':'UAE-AI-STRATEGY-2031','name_en':'UAE AI Strategy 2031','regulator':'MBZUAI','version':'2017 rev.2031','mandatory':'P','control_count':0,'sectors':'ALL','audit_freq':'N/A','effective_date':'2017-10-19','canonical_code':'UAE-AI-STRATEGY-2031'},
        {'code':'UAE-OPEN-FINANCE-2023','name_en':'CBUAE Open Finance Framework 2023','regulator':'CBUAE','version':'2023','mandatory':'Y','control_count':35,'sectors':'FIN','audit_freq':'ANNUAL','effective_date':'2023-01-01','canonical_code':'UAE-OPEN-FINANCE-2023'},
        {'code':'DIFC-DPL-2020','name_en':'DIFC Data Protection Law (Law 5/2020)','regulator':'DIFC-DP','version':'2020','mandatory':'Y','control_count':55,'sectors':'DIFC','audit_freq':'ANNUAL','effective_date':'2020-07-01','canonical_code':'DIFC-DPL-2020'},
        {'code':'DIFC-DPL-AMD-2025','name_en':'DIFC DP Amendment Law 2025','regulator':'DIFC-DP','version':'2025','mandatory':'Y','control_count':15,'sectors':'DIFC','audit_freq':'ANNUAL','effective_date':'2025-01-01','canonical_code':'DIFC-DPL-AMD-2025'},
        {'code':'ADGM-DPR','name_en':'ADGM Data Protection Regulations','regulator':'ADGM-FSRA','version':'2021','mandatory':'Y','control_count':50,'sectors':'ADGM','audit_freq':'ANNUAL','effective_date':'2021-02-01','canonical_code':'ADGM-DPR'},
        {'code':'MOHAP-UAE-PRIV','name_en':'MOHAP Patient Data Privacy Guidelines','regulator':'MOHAP-UAE','version':'2022','mandatory':'Y','control_count':30,'sectors':'HC','audit_freq':'ANNUAL','effective_date':'2022-01-01','canonical_code':'MOHAP-UAE-PRIV'},
        {'code':'DHA-HIS','name_en':'Dubai Health Authority HIS Standards','regulator':'DHA','version':'2021','mandatory':'Y','control_count':25,'sectors':'HC-DXB','audit_freq':'ANNUAL','effective_date':'2021-01-01','canonical_code':'DHA-HIS'},
        {'code':'DoH-AD-PRIV','name_en':'Abu Dhabi DoH Privacy Regulations','regulator':'DoH-AD','version':'2022','mandatory':'Y','control_count':25,'sectors':'HC-AD','audit_freq':'ANNUAL','effective_date':'2022-01-01','canonical_code':'DOH-AD-PRIV'},
        {'code':'UAE-FINTECH-REG','name_en':'CBUAE FinTech Regulatory Framework','regulator':'CBUAE','version':'2023','mandatory':'Y','control_count':30,'sectors':'FIN','audit_freq':'ANNUAL','effective_date':'2023-01-01','canonical_code':'UAE-FINTECH-REG'},
    ],
    'control_domains': [
        {'code':'UAE-CD-01','name':'Cybersecurity Governance','framework':'UAE-CBUAE-CSF-2023','count':20,'risk_level':'HIGHEST','iot_relevance':'HIGH','auto':'Y','audit_method':'EXTERNAL_AUDIT','shahin_score':88},
        {'code':'UAE-CD-02','name':'Data Privacy & Protection','framework':'UAE-PDPL-2021','count':35,'risk_level':'HIGH','iot_relevance':'MODERATE','auto':'Y','audit_method':'SELF_ASSESSMENT','shahin_score':85},
        {'code':'UAE-CD-03','name':'Financial Crime & AML','framework':'UAE-AML-2018','count':40,'risk_level':'HIGHEST','iot_relevance':'LOW','auto':'PARTIAL','audit_method':'REGULATOR_INSPECTION','shahin_score':80},
        {'code':'UAE-CD-04','name':'Operational Resilience','framework':'UAE-CBUAE-OPR','count':45,'risk_level':'HIGH','iot_relevance':'MODERATE','auto':'Y','audit_method':'EXTERNAL_AUDIT','shahin_score':82},
        {'code':'UAE-CD-05','name':'3rd Party & Cloud Risk','framework':'UAE-CLOUD-GOV','count':20,'risk_level':'HIGH','iot_relevance':'MODERATE','auto':'Y','audit_method':'SELF_ASSESSMENT','shahin_score':78},
        {'code':'UAE-CD-06','name':'Healthcare Data Privacy','framework':'DHA-HIS','count':30,'risk_level':'HIGH','iot_relevance':'HIGHEST','auto':'PARTIAL','audit_method':'REGULATOR_INSPECTION','shahin_score':75},
        {'code':'UAE-CD-07','name':'Open Banking & Payments','framework':'UAE-OPEN-FINANCE-2023','count':35,'risk_level':'HIGH','iot_relevance':'LOW','auto':'Y','audit_method':'EXTERNAL_AUDIT','shahin_score':83},
    ],
    'risk_domains': [
        {'domain':'CNI Cyber Risk','category':'Cybersecurity','score':88,'level':'HIGHEST','regulator':'CSC-UAE','framework':'UAE-TDRA-NIAS','kri_count':8,'threshold':'Score < 75 = ESCALATE','owner':'CISO'},
        {'domain':'Financial Crime','category':'AML/CFT','score':85,'level':'HIGH','regulator':'NAMLC','framework':'UAE-AML-2018','kri_count':6,'threshold':'STR filing lag > 24h','owner':'MLRO'},
        {'domain':'Data Privacy Breach','category':'Privacy','score':80,'level':'HIGH','regulator':'DIFC-DP / TDRA','framework':'UAE-PDPL-2021','kri_count':5,'threshold':'Breach not notified in 72h','owner':'DPO'},
        {'domain':'Operational Failure','category':'Operational','score':75,'level':'HIGH','regulator':'CBUAE','framework':'UAE-CBUAE-OPR','kri_count':7,'threshold':'System downtime > 4h','owner':'CRO'},
        {'domain':'Healthcare IoT / Medical Device','category':'Technology','score':70,'level':'HIGH','regulator':'MOHAP-UAE','framework':'MOHAP-UAE-PRIV','kri_count':4,'threshold':'Device not certified','owner':'CTO'},
        {'domain':'ESG / Sustainability Compliance','category':'Governance','score':55,'level':'MODERATE','regulator':'SCA-UAE','framework':'UAE-ESG-2023','kri_count':3,'threshold':'Disclosure missing','owner':'CCO'},
    ],
    'lifecycle': STANDARD_LIFECYCLE,
    'evidence': STANDARD_EVIDENCE,
    'maturity': [
        {'domain':'GRC Governance','model':'CMMI 1-5','avg':2.5,'best_in_class':4.5,'target':3.5,'priority':'HIGH','barrier':'Board awareness','recommendation':'Establish GRC board committee','framework':'UAE-CBUAE-CSF-2023'},
        {'domain':'Cybersecurity Controls','model':'CMMI 1-5','avg':2.8,'best_in_class':4.5,'target':3.5,'priority':'HIGH','barrier':'Talent shortage','recommendation':'Automate control testing','framework':'UAE-TDRA-NIAS'},
        {'domain':'Data Privacy','model':'CMMI 1-5','avg':2.2,'best_in_class':4.0,'target':3.0,'priority':'HIGH','barrier':'Data mapping incomplete','recommendation':'Deploy DPIA automation','framework':'UAE-PDPL-2021'},
        {'domain':'AML/CFT','model':'CMMI 1-5','avg':3.0,'best_in_class':4.5,'target':3.5,'priority':'MEDIUM','barrier':'Transaction monitoring gaps','recommendation':'AI-powered TM system','framework':'UAE-AML-2018'},
        {'domain':'Operational Resilience','model':'CMMI 1-5','avg':2.5,'best_in_class':4.0,'target':3.5,'priority':'HIGH','barrier':'BCP not tested','recommendation':'Annual tabletop exercise','framework':'UAE-CBUAE-OPR'},
        {'domain':'3rd Party Risk','model':'CMMI 1-5','avg':2.0,'best_in_class':4.0,'target':3.0,'priority':'HIGH','barrier':'No vendor inventory','recommendation':'Implement TPRM programme','framework':'UAE-CLOUD-GOV'},
    ],
}

# ─── 🇶🇦 Qatar ────────────────────────────────────────────────────────────────
COUNTRIES['QAT'] = {
    'iso': 'QA', 'flag': '🇶🇦', 'name_en': 'Qatar',
    'name_ar': 'قطر', 'region': 'GCC', 'fragile': False,
    'regulators': [
        {'code':'QCB','name_en':'Qatar Central Bank','name_ar':'مصرف قطر المركزي','sector':'Financial','tier':'T1','own_fw':5,'power_index':95,'enforcement':'MANDATORY','url':'https://qcb.gov.qa'},
        {'code':'NCSA-QA','name_en':'National Cyber Security Agency','name_ar':'الوكالة الوطنية للأمن السيبراني','sector':'Cybersecurity','tier':'T1','own_fw':3,'power_index':90,'enforcement':'MANDATORY','url':'https://ncsa.gov.qa'},
        {'code':'MCIT-QA','name_en':'Ministry of Communications & IT','name_ar':'وزارة الاتصالات وتقنية المعلومات','sector':'ICT/Digital','tier':'T1','own_fw':4,'power_index':82,'enforcement':'MANDATORY','url':'https://mcit.gov.qa'},
        {'code':'QFCRA','name_en':'QFC Regulatory Authority','name_ar':'هيئة تنظيم مركز قطر للمال','sector':'Financial/QFC','tier':'T2','own_fw':6,'power_index':78,'enforcement':'MANDATORY','url':'https://qfcra.com'},
        {'code':'QFMA','name_en':'Qatar Financial Markets Authority','name_ar':'هيئة قطر للأسواق المالية','sector':'Capital Markets','tier':'T2','own_fw':4,'power_index':72,'enforcement':'MANDATORY','url':'https://qfma.gov.qa'},
        {'code':'MoPH-QA','name_en':'Ministry of Public Health','name_ar':'وزارة الصحة العامة','sector':'Healthcare','tier':'T2','own_fw':3,'power_index':65,'enforcement':'MANDATORY','url':'https://moph.gov.qa'},
        {'code':'CRA-QA','name_en':'Communications Regulatory Authority','name_ar':'هيئة تنظيم الاتصالات','sector':'Telecom','tier':'T2','own_fw':3,'power_index':68,'enforcement':'MANDATORY','url':'https://cra.gov.qa'},
        {'code':'QFIU','name_en':'Qatar Financial Intelligence Unit','name_ar':'وحدة الاستخبارات المالية القطرية','sector':'AML/CFT','tier':'T2','own_fw':1,'power_index':75,'enforcement':'MANDATORY','url':''},
        {'code':'QE','name_en':'QatarEnergy','name_ar':'قطر للطاقة','sector':'Energy/CNI','tier':'T2','own_fw':2,'power_index':70,'enforcement':'MANDATORY','url':'https://qatarenergy.qa'},
        {'code':'HMC','name_en':'Hamad Medical Corporation','name_ar':'مؤسسة حمد الطبية','sector':'Healthcare','tier':'T3','own_fw':2,'power_index':55,'enforcement':'MANDATORY','url':'https://hamad.qa'},
    ],
    'frameworks': [
        {'code':'QCB-CSF-2024','name_en':'QCB Cybersecurity Framework 2024','regulator':'QCB','version':'2024','mandatory':'Y','control_count':85,'sectors':'FIN','audit_freq':'ANNUAL','effective_date':'2024-01-01'},
        {'code':'QCB-DHPR-2025','name_en':'QCB Data Handling & Protection Regulation 2025','regulator':'QCB','version':'2025','mandatory':'Y','control_count':60,'sectors':'FIN','audit_freq':'ANNUAL','effective_date':'2025-02-01'},
        {'code':'QCB-TECHRISK','name_en':'QCB Technology Risk Management Guidelines','regulator':'QCB','version':'2018+','mandatory':'Y','control_count':50,'sectors':'FIN','audit_freq':'ANNUAL','effective_date':'2018-01-01'},
        {'code':'QA-PDPPL-2016','name_en':'Personal Data Privacy Protection Law 13/2016','regulator':'MCIT-QA','version':'2016','mandatory':'Y','control_count':35,'sectors':'ALL','audit_freq':'ANNUAL','effective_date':'2016-01-01'},
        {'code':'QA-NCSA-QCF','name_en':'Qatar National Cybersecurity Framework','regulator':'NCSA-QA','version':'2023','mandatory':'Y','control_count':90,'sectors':'ALL','audit_freq':'BIENNIAL','effective_date':'2023-01-01'},
        {'code':'QFC-DPR-2023','name_en':'QFC Data Protection Regulations 2023','regulator':'QFCRA','version':'2023','mandatory':'Y','control_count':55,'sectors':'QFC','audit_freq':'ANNUAL','effective_date':'2023-10-01'},
        {'code':'QFCRA-AML','name_en':'QFCRA AML/CFT Rules','regulator':'QFCRA','version':'2022','mandatory':'Y','control_count':40,'sectors':'QFC','audit_freq':'ANNUAL','effective_date':'2022-01-01'},
        {'code':'QA-DIGITAL-ASSETS-2024','name_en':'Qatar Digital Assets Framework 2024','regulator':'QFCA/QFCRA','version':'2024','mandatory':'Y','control_count':30,'sectors':'FIN','audit_freq':'ANNUAL','effective_date':'2024-09-01'},
        {'code':'QCB-AML','name_en':'QCB AML/CFT Regulations','regulator':'QCB/QFIU','version':'2022','mandatory':'Y','control_count':40,'sectors':'FIN','audit_freq':'CONTINUOUS','effective_date':'2022-01-01'},
        {'code':'QA-ICT-LAW','name_en':'Qatar ICT Law 34/2006 + Amendments','regulator':'MCIT-QA','version':'2006+','mandatory':'Y','control_count':25,'sectors':'ICT','audit_freq':'AS_REQUIRED','effective_date':'2006-01-01'},
        {'code':'QA-EHEALTH','name_en':'Qatar National eHealth Architecture Standards','regulator':'MoPH-QA','version':'2020','mandatory':'Y','control_count':40,'sectors':'HC','audit_freq':'ANNUAL','effective_date':'2020-01-01'},
        {'code':'QE-CYBERSEC','name_en':'QatarEnergy Cybersecurity Standards','regulator':'QE','version':'2022','mandatory':'Y','control_count':60,'sectors':'ENR','audit_freq':'ANNUAL','effective_date':'2022-01-01'},
        {'code':'QA-CLOUD','name_en':'Qatar Government Cloud Framework','regulator':'MCIT-QA','version':'2021','mandatory':'Y','control_count':20,'sectors':'GOV','audit_freq':'BIENNIAL','effective_date':'2021-01-01'},
    ],
    'control_domains': [
        {'code':'QA-CD-01','name':'Financial Cybersecurity','framework':'QCB-CSF-2024','count':85,'risk_level':'HIGHEST','iot_relevance':'HIGH','auto':'Y','audit_method':'EXTERNAL_AUDIT','shahin_score':87},
        {'code':'QA-CD-02','name':'Data Privacy & Handling','framework':'QA-PDPPL-2016','count':55,'risk_level':'HIGH','iot_relevance':'MODERATE','auto':'Y','audit_method':'SELF_ASSESSMENT','shahin_score':78},
        {'code':'QA-CD-03','name':'Energy/OT Security','framework':'QE-CYBERSEC','count':60,'risk_level':'HIGHEST','iot_relevance':'HIGHEST','auto':'PARTIAL','audit_method':'EXTERNAL_AUDIT','shahin_score':82},
        {'code':'QA-CD-04','name':'Digital Assets','framework':'QA-DIGITAL-ASSETS-2024','count':30,'risk_level':'HIGH','iot_relevance':'LOW','auto':'Y','audit_method':'REGULATOR_INSPECTION','shahin_score':75},
        {'code':'QA-CD-05','name':'Healthcare eHealth','framework':'QA-EHEALTH','count':40,'risk_level':'HIGH','iot_relevance':'HIGHEST','auto':'PARTIAL','audit_method':'EXTERNAL_AUDIT','shahin_score':72},
    ],
    'risk_domains': [
        {'domain':'Energy/OT Cyber Risk','category':'Cybersecurity/CNI','score':92,'level':'HIGHEST','regulator':'NCSA-QA','framework':'QE-CYBERSEC','kri_count':7,'threshold':'OT incident uncontained > 1h','owner':'CISO'},
        {'domain':'Financial Crime','category':'AML/CFT','score':82,'level':'HIGH','regulator':'QFIU','framework':'QCB-AML','kri_count':6,'threshold':'STR > 24h','owner':'MLRO'},
        {'domain':'Data Privacy','category':'Privacy','score':75,'level':'HIGH','regulator':'MCIT-QA','framework':'QA-PDPPL-2016','kri_count':5,'threshold':'72h breach notification','owner':'DPO'},
        {'domain':'Digital Asset Risk','category':'Technology','score':70,'level':'HIGH','regulator':'QFCRA','framework':'QA-DIGITAL-ASSETS-2024','kri_count':4,'threshold':'Custody failure','owner':'CRO'},
    ],
    'lifecycle': STANDARD_LIFECYCLE,
    'evidence': STANDARD_EVIDENCE,
    'maturity': [
        {'domain':'GRC Governance','avg':2.8,'best_in_class':4.5,'target':3.5,'priority':'HIGH','barrier':'Framework complexity','recommendation':'Centralise GRC tooling','framework':'QA-NCSA-QCF'},
        {'domain':'Cybersecurity Controls','avg':3.0,'best_in_class':4.5,'target':4.0,'priority':'HIGH','barrier':'OT systems integration','recommendation':'OT/IT convergence programme','framework':'QCB-CSF-2024'},
        {'domain':'Data Privacy','avg':2.0,'best_in_class':4.0,'target':3.0,'priority':'HIGH','barrier':'Consent management','recommendation':'Deploy CIAM platform','framework':'QA-PDPPL-2016'},
        {'domain':'AML/CFT','avg':3.2,'best_in_class':4.5,'target':4.0,'priority':'MEDIUM','barrier':'Cross-border visibility','recommendation':'Network analytics','framework':'QCB-AML'},
    ],
}

# ─── 🇧🇭 Bahrain ──────────────────────────────────────────────────────────────
COUNTRIES['BHR'] = {
    'iso': 'BH', 'flag': '🇧🇭', 'name_en': 'Bahrain',
    'name_ar': 'البحرين', 'region': 'GCC', 'fragile': False,
    'regulators': [
        {'code':'CBB','name_en':'Central Bank of Bahrain','name_ar':'مصرف البحرين المركزي','sector':'Financial','tier':'T1','own_fw':8,'power_index':95,'enforcement':'MANDATORY','url':'https://cbb.gov.bh'},
        {'code':'NCSC-BH','name_en':'National Cybersecurity Centre','name_ar':'المركز الوطني للأمن السيبراني','sector':'Cybersecurity','tier':'T1','own_fw':3,'power_index':88,'enforcement':'MANDATORY','url':'https://ncsc.gov.bh'},
        {'code':'TRA-BH','name_en':'Telecommunications Regulatory Authority','name_ar':'هيئة تنظيم الاتصالات','sector':'ICT/Telecom','tier':'T2','own_fw':3,'power_index':72,'enforcement':'MANDATORY','url':'https://tra.org.bh'},
        {'code':'PDPA-BH','name_en':'Personal Data Protection Authority','name_ar':'هيئة حماية البيانات الشخصية','sector':'Data/Privacy','tier':'T2','own_fw':2,'power_index':75,'enforcement':'MANDATORY','url':''},
        {'code':'MOH-BH','name_en':'Ministry of Health','name_ar':'وزارة الصحة','sector':'Healthcare','tier':'T2','own_fw':2,'power_index':60,'enforcement':'MANDATORY','url':'https://moh.gov.bh'},
        {'code':'BHB','name_en':'Bahrain Bourse','name_ar':'بورصة البحرين','sector':'Capital Markets','tier':'T2','own_fw':3,'power_index':65,'enforcement':'MANDATORY','url':'https://bahrainbourse.com'},
        {'code':'FIU-BH','name_en':'Financial Intelligence Unit','name_ar':'وحدة الاستخبارات المالية','sector':'AML/CFT','tier':'T2','own_fw':1,'power_index':78,'enforcement':'MANDATORY','url':''},
        {'code':'EDB-BH','name_en':'Economic Development Board','name_ar':'مجلس التنمية الاقتصادية','sector':'Investment','tier':'T3','own_fw':0,'power_index':45,'enforcement':'VOLUNTARY','url':'https://bahrainedb.com'},
    ],
    'frameworks': [
        {'code':'CBB-RULEBOOK-V1','name_en':'CBB Rulebook Vol.1 – Conventional Banks','regulator':'CBB','version':'2023','mandatory':'Y','control_count':120,'sectors':'FIN','audit_freq':'ANNUAL','effective_date':'2001-01-01'},
        {'code':'CBB-RULEBOOK-V2','name_en':'CBB Rulebook Vol.2 – Islamic Banks','regulator':'CBB','version':'2023','mandatory':'Y','control_count':115,'sectors':'FIN','audit_freq':'ANNUAL','effective_date':'2001-01-01'},
        {'code':'CBB-CSF','name_en':'CBB Cybersecurity Framework (NIST-aligned)','regulator':'CBB','version':'2022','mandatory':'Y','control_count':92,'sectors':'FIN','audit_freq':'ANNUAL','effective_date':'2022-01-01'},
        {'code':'BH-PDPL-2018','name_en':'Bahrain Personal Data Protection Law (Law 30/2018)','regulator':'PDPA-BH','version':'2018','mandatory':'Y','control_count':45,'sectors':'ALL','audit_freq':'ANNUAL','effective_date':'2019-08-01'},
        {'code':'BH-NCS-2024-2028','name_en':'Bahrain National Cybersecurity Strategy 2024-2028','regulator':'NCSC-BH','version':'2024','mandatory':'Y','control_count':50,'sectors':'ALL','audit_freq':'BIENNIAL','effective_date':'2024-01-01'},
        {'code':'BH-NCSC-CIC','name_en':'NCSC Critical Infrastructure Controls','regulator':'NCSC-BH','version':'2023','mandatory':'Y','control_count':80,'sectors':'CNI','audit_freq':'ANNUAL','effective_date':'2023-01-01'},
        {'code':'CBB-AML','name_en':'CBB AML/CFT Module','regulator':'CBB/FIU-BH','version':'2022','mandatory':'Y','control_count':55,'sectors':'FIN','audit_freq':'CONTINUOUS','effective_date':'2022-01-01'},
        {'code':'CBB-BCCS','name_en':'CBB Business Continuity / Cloud Services Policy','regulator':'CBB','version':'2021','mandatory':'Y','control_count':35,'sectors':'FIN','audit_freq':'BIENNIAL','effective_date':'2021-01-01'},
        {'code':'TRA-BH-DATA','name_en':'TRA Data Privacy Regulations','regulator':'TRA-BH','version':'2021','mandatory':'Y','control_count':30,'sectors':'ICT','audit_freq':'ANNUAL','effective_date':'2021-01-01'},
        {'code':'BH-OPEN-BANKING','name_en':'CBB Open Banking Framework','regulator':'CBB','version':'2023','mandatory':'Y','control_count':40,'sectors':'FIN','audit_freq':'ANNUAL','effective_date':'2023-01-01'},
        {'code':'BH-AML-2001-AMD','name_en':'Bahrain AML Law (Decree 4/2001 + Amendments)','regulator':'FIU-BH','version':'2001+','mandatory':'Y','control_count':25,'sectors':'ALL','audit_freq':'CONTINUOUS','effective_date':'2001-01-01'},
        {'code':'BH-EHEALTH','name_en':'MOH eHealth Standards','regulator':'MOH-BH','version':'2020','mandatory':'Y','control_count':30,'sectors':'HC','audit_freq':'ANNUAL','effective_date':'2020-01-01'},
        {'code':'BH-CLOUD','name_en':'Bahrain Cloud Policy','regulator':'NCSC-BH','version':'2021','mandatory':'Y','control_count':20,'sectors':'GOV','audit_freq':'BIENNIAL','effective_date':'2021-01-01'},
    ],
    'control_domains': [
        {'code':'BH-CD-01','name':'Banking Cybersecurity','framework':'CBB-CSF','count':92,'risk_level':'HIGHEST','iot_relevance':'MODERATE','auto':'Y','audit_method':'EXTERNAL_AUDIT','shahin_score':85},
        {'code':'BH-CD-02','name':'Data Privacy','framework':'BH-PDPL-2018','count':45,'risk_level':'HIGH','iot_relevance':'MODERATE','auto':'Y','audit_method':'SELF_ASSESSMENT','shahin_score':80},
        {'code':'BH-CD-03','name':'AML/CFT','framework':'CBB-AML','count':55,'risk_level':'HIGHEST','iot_relevance':'LOW','auto':'PARTIAL','audit_method':'REGULATOR_INSPECTION','shahin_score':82},
        {'code':'BH-CD-04','name':'Critical Infrastructure','framework':'BH-NCSC-CIC','count':80,'risk_level':'HIGHEST','iot_relevance':'HIGH','auto':'PARTIAL','audit_method':'EXTERNAL_AUDIT','shahin_score':78},
    ],
    'risk_domains': [
        {'domain':'Financial Sector Cyber','category':'Cybersecurity','score':85,'level':'HIGHEST','regulator':'CBB/NCSC-BH','framework':'CBB-CSF','kri_count':7,'threshold':'Score < 75','owner':'CISO'},
        {'domain':'Data Privacy','category':'Privacy','score':75,'level':'HIGH','regulator':'PDPA-BH','framework':'BH-PDPL-2018','kri_count':5,'threshold':'72h breach notification','owner':'DPO'},
        {'domain':'AML/CFT','category':'Financial Crime','score':80,'level':'HIGH','regulator':'FIU-BH','framework':'CBB-AML','kri_count':6,'threshold':'STR failure','owner':'MLRO'},
    ],
    'lifecycle': STANDARD_LIFECYCLE,
    'evidence': STANDARD_EVIDENCE,
    'maturity': [
        {'domain':'GRC Governance','avg':2.8,'best_in_class':4.0,'target':3.5,'priority':'HIGH','barrier':'SME capacity','recommendation':'GRC tooling adoption','framework':'BH-NCS-2024-2028'},
        {'domain':'Cybersecurity Controls','avg':3.0,'best_in_class':4.5,'target':3.5,'priority':'HIGH','barrier':'Legacy systems','recommendation':'Zero-trust architecture','framework':'CBB-CSF'},
        {'domain':'Data Privacy','avg':2.5,'best_in_class':4.0,'target':3.0,'priority':'HIGH','barrier':'Data mapping','recommendation':'Automated DPA','framework':'BH-PDPL-2018'},
    ],
}

# ─── 🇰🇼 Kuwait ───────────────────────────────────────────────────────────────
COUNTRIES['KWT'] = {
    'iso': 'KW', 'flag': '🇰🇼', 'name_en': 'Kuwait',
    'name_ar': 'الكويت', 'region': 'GCC', 'fragile': False,
    'regulators': [
        {'code':'CBK','name_en':'Central Bank of Kuwait','name_ar':'بنك الكويت المركزي','sector':'Financial','tier':'T1','own_fw':5,'power_index':95,'enforcement':'MANDATORY','url':'https://cbk.gov.kw'},
        {'code':'NCSC-KW','name_en':'National Cybersecurity Centre','name_ar':'مركز الأمن السيبراني الوطني','sector':'Cybersecurity','tier':'T1','own_fw':3,'power_index':88,'enforcement':'MANDATORY','url':''},
        {'code':'CITRA','name_en':'Comm. & IT Regulatory Authority','name_ar':'هيئة تنظيم الاتصالات وتقنية المعلومات','sector':'ICT/Digital','tier':'T1','own_fw':4,'power_index':82,'enforcement':'MANDATORY','url':'https://citra.gov.kw'},
        {'code':'CMA-KW','name_en':'Capital Markets Authority','name_ar':'هيئة أسواق المال','sector':'Capital Markets','tier':'T2','own_fw':4,'power_index':70,'enforcement':'MANDATORY','url':'https://cma.gov.kw'},
        {'code':'MOH-KW','name_en':'Ministry of Health','name_ar':'وزارة الصحة','sector':'Healthcare','tier':'T2','own_fw':2,'power_index':58,'enforcement':'MANDATORY','url':'https://moh.gov.kw'},
        {'code':'FIU-KW','name_en':'Kuwait Financial Intelligence Unit','name_ar':'وحدة الاستخبارات المالية الكويتية','sector':'AML/CFT','tier':'T2','own_fw':1,'power_index':78,'enforcement':'MANDATORY','url':''},
        {'code':'CAIT','name_en':'Central Agency for Information Technology','name_ar':'الجهاز المركزي لتقنية المعلومات','sector':'Digital Gov','tier':'T3','own_fw':2,'power_index':50,'enforcement':'MANDATORY','url':'https://cait.gov.kw'},
    ],
    'frameworks': [
        {'code':'CBK-CSF','name_en':'CBK Cybersecurity Framework','regulator':'CBK','version':'2023','mandatory':'Y','control_count':88,'sectors':'FIN','audit_freq':'ANNUAL','effective_date':'2023-01-01'},
        {'code':'KW-CITRA-DPPR-2024','name_en':'CITRA Data Privacy Protection Regulation No.26/2024','regulator':'CITRA','version':'2024','mandatory':'Y','control_count':45,'sectors':'ICT,SVC','audit_freq':'ANNUAL','effective_date':'2024-02-01'},
        {'code':'KW-NCSC-DCF-2025','name_en':'NCSC National Data Classification Framework 2025','regulator':'NCSC-KW','version':'2025','mandatory':'Y','control_count':30,'sectors':'GOV,CNI','audit_freq':'ANNUAL','effective_date':'2025-01-01'},
        {'code':'CBK-AML','name_en':'CBK AML/CFT Instructions','regulator':'CBK/FIU-KW','version':'2022','mandatory':'Y','control_count':45,'sectors':'FIN','audit_freq':'CONTINUOUS','effective_date':'2022-01-01'},
        {'code':'CBK-RISK','name_en':'CBK Risk Management Framework','regulator':'CBK','version':'2021','mandatory':'Y','control_count':55,'sectors':'FIN','audit_freq':'ANNUAL','effective_date':'2021-01-01'},
        {'code':'CBK-OPR','name_en':'CBK Operational Resilience Guidelines','regulator':'CBK','version':'2022','mandatory':'Y','control_count':35,'sectors':'FIN','audit_freq':'ANNUAL','effective_date':'2022-01-01'},
        {'code':'KW-CYBERCRIME-2015','name_en':'Kuwait Cybercrime Law No.63/2015','regulator':'NCSC-KW','version':'2015','mandatory':'Y','control_count':20,'sectors':'ALL','audit_freq':'AS_REQUIRED','effective_date':'2015-01-01'},
        {'code':'KW-AML-2013','name_en':'Kuwait AML Law No.106/2013','regulator':'FIU-KW','version':'2013+','mandatory':'Y','control_count':30,'sectors':'ALL','audit_freq':'CONTINUOUS','effective_date':'2013-01-01'},
        {'code':'CMA-KW-REGS','name_en':'CMA Capital Market Law + Regulations','regulator':'CMA-KW','version':'2010+','mandatory':'Y','control_count':40,'sectors':'CAP_MKT','audit_freq':'ANNUAL','effective_date':'2010-01-01'},
        {'code':'KW-CLOUD','name_en':'Kuwait Government Cloud Policy','regulator':'CAIT','version':'2022','mandatory':'Y','control_count':15,'sectors':'GOV','audit_freq':'BIENNIAL','effective_date':'2022-01-01'},
    ],
    'control_domains': [
        {'code':'KW-CD-01','name':'Banking Cybersecurity','framework':'CBK-CSF','count':88,'risk_level':'HIGHEST','iot_relevance':'MODERATE','auto':'Y','audit_method':'EXTERNAL_AUDIT','shahin_score':83},
        {'code':'KW-CD-02','name':'Data Privacy (Telecom)','framework':'KW-CITRA-DPPR-2024','count':45,'risk_level':'HIGH','iot_relevance':'MODERATE','auto':'Y','audit_method':'SELF_ASSESSMENT','shahin_score':78},
        {'code':'KW-CD-03','name':'Data Classification (National)','framework':'KW-NCSC-DCF-2025','count':30,'risk_level':'HIGH','iot_relevance':'LOW','auto':'PARTIAL','audit_method':'REGULATOR_INSPECTION','shahin_score':80},
        {'code':'KW-CD-04','name':'AML/CFT','framework':'CBK-AML','count':45,'risk_level':'HIGHEST','iot_relevance':'LOW','auto':'PARTIAL','audit_method':'REGULATOR_INSPECTION','shahin_score':80},
    ],
    'risk_domains': [
        {'domain':'Financial Sector Cyber','category':'Cybersecurity','score':85,'level':'HIGHEST','regulator':'CBK','framework':'CBK-CSF','kri_count':6,'threshold':'Score < 70','owner':'CISO'},
        {'domain':'Data Privacy','category':'Privacy','score':72,'level':'HIGH','regulator':'CITRA','framework':'KW-CITRA-DPPR-2024','kri_count':5,'threshold':'24h breach notification','owner':'DPO'},
        {'domain':'AML/CFT','category':'Financial Crime','score':80,'level':'HIGH','regulator':'FIU-KW','framework':'CBK-AML','kri_count':5,'threshold':'STR lag','owner':'MLRO'},
    ],
    'lifecycle': STANDARD_LIFECYCLE,
    'evidence': STANDARD_EVIDENCE,
    'maturity': [
        {'domain':'GRC Governance','avg':2.5,'best_in_class':4.0,'target':3.0,'priority':'HIGH','barrier':'Framework adoption','recommendation':'Adopt NCSC framework','framework':'KW-NCSC-DCF-2025'},
        {'domain':'Cybersecurity Controls','avg':2.8,'best_in_class':4.5,'target':3.5,'priority':'HIGH','barrier':'Legacy infrastructure','recommendation':'SOC upgrade programme','framework':'CBK-CSF'},
        {'domain':'Data Privacy','avg':2.0,'best_in_class':4.0,'target':3.0,'priority':'HIGH','barrier':'Regulation newness','recommendation':'CITRA compliance programme','framework':'KW-CITRA-DPPR-2024'},
    ],
}

# ─── 🇴🇲 Oman ─────────────────────────────────────────────────────────────────
COUNTRIES['OMN'] = {
    'iso': 'OM', 'flag': '🇴🇲', 'name_en': 'Oman',
    'name_ar': 'عُمان', 'region': 'GCC', 'fragile': False,
    'regulators': [
        {'code':'CBO','name_en':'Central Bank of Oman','name_ar':'البنك المركزي العُماني','sector':'Financial','tier':'T1','own_fw':5,'power_index':93,'enforcement':'MANDATORY','url':'https://cbo.gov.om'},
        {'code':'MTCIT','name_en':'Ministry of Transport, Comm. & IT','name_ar':'وزارة النقل والاتصالات وتقنية المعلومات','sector':'ICT/Digital/PDPL','tier':'T1','own_fw':4,'power_index':85,'enforcement':'MANDATORY','url':'https://mtcit.gov.om'},
        {'code':'OCERT','name_en':'Oman CERT','name_ar':'مركز عُمان للاستجابة للطوارئ الحاسوبية','sector':'Cybersecurity/IR','tier':'T2','own_fw':2,'power_index':78,'enforcement':'MANDATORY','url':'https://ocert.gov.om'},
        {'code':'CMA-OM','name_en':'Capital Market Authority','name_ar':'هيئة أسواق المال','sector':'Capital Markets','tier':'T2','own_fw':4,'power_index':68,'enforcement':'MANDATORY','url':'https://cma.gov.om'},
        {'code':'TRA-OM','name_en':'Telecommunications Regulatory Authority','name_ar':'هيئة تنظيم الاتصالات','sector':'Telecom','tier':'T2','own_fw':3,'power_index':70,'enforcement':'MANDATORY','url':'https://tra.gov.om'},
        {'code':'ODPA','name_en':'Oman Data Protection Authority','name_ar':'هيئة حماية البيانات العُمانية','sector':'Data/Privacy','tier':'T2','own_fw':2,'power_index':72,'enforcement':'MANDATORY','url':''},
        {'code':'MOH-OM','name_en':'Ministry of Health','name_ar':'وزارة الصحة','sector':'Healthcare','tier':'T2','own_fw':2,'power_index':58,'enforcement':'MANDATORY','url':'https://moh.gov.om'},
        {'code':'FIU-OM','name_en':'Financial Intelligence Unit','name_ar':'وحدة الاستخبارات المالية','sector':'AML/CFT','tier':'T2','own_fw':1,'power_index':78,'enforcement':'MANDATORY','url':''},
    ],
    'frameworks': [
        {'code':'CBO-CYBERSEC-2023','name_en':'CBO Cyber Security & Resilience Framework 2023','regulator':'CBO','version':'2023','mandatory':'Y','control_count':80,'sectors':'FIN','audit_freq':'ANNUAL','effective_date':'2023-09-01'},
        {'code':'OM-PDPL-2022','name_en':'Oman Personal Data Protection Law (RD 6/2022)','regulator':'ODPA','version':'2022','mandatory':'Y','control_count':40,'sectors':'ALL','audit_freq':'ANNUAL','effective_date':'2022-02-09'},
        {'code':'OM-PDPL-MDDEC-2024','name_en':'PDPL Implementing Regulations (MinDec 34/2024)','regulator':'MTCIT','version':'2024','mandatory':'Y','control_count':55,'sectors':'ALL','audit_freq':'ANNUAL','effective_date':'2024-02-05'},
        {'code':'CBO-AML','name_en':'CBO AML/CFT Framework','regulator':'CBO/FIU-OM','version':'2022','mandatory':'Y','control_count':35,'sectors':'FIN','audit_freq':'CONTINUOUS','effective_date':'2022-01-01'},
        {'code':'OM-CYBERCRIME-2011','name_en':'Oman Cybercrime Law (RD 12/2011)','regulator':'MTCIT','version':'2011','mandatory':'Y','control_count':25,'sectors':'ALL','audit_freq':'AS_REQUIRED','effective_date':'2011-01-01'},
        {'code':'TRA-OM-CYBERSEC','name_en':'TRA Cybersecurity Guidelines for ISPs','regulator':'TRA-OM','version':'2022','mandatory':'Y','control_count':30,'sectors':'ICT','audit_freq':'ANNUAL','effective_date':'2022-01-01'},
        {'code':'OM-NCSP','name_en':'Oman National Cybersecurity Strategy Framework','regulator':'MTCIT/OCERT','version':'2023','mandatory':'Y','control_count':90,'sectors':'GOV','audit_freq':'BIENNIAL','effective_date':'2023-01-01'},
        {'code':'CMA-OM-DISC','name_en':'CMA Capital Market Disclosure Rules','regulator':'CMA-OM','version':'2021','mandatory':'Y','control_count':20,'sectors':'CAP_MKT','audit_freq':'ANNUAL','effective_date':'2021-01-01'},
        {'code':'OM-AML','name_en':'Oman AML Law (RD 30/2016)','regulator':'FIU-OM','version':'2016+','mandatory':'Y','control_count':30,'sectors':'ALL','audit_freq':'CONTINUOUS','effective_date':'2016-01-01'},
        {'code':'OM-CLOUD','name_en':'Oman Government Cloud Framework','regulator':'MTCIT','version':'2022','mandatory':'Y','control_count':15,'sectors':'GOV','audit_freq':'BIENNIAL','effective_date':'2022-01-01'},
    ],
    'control_domains': [
        {'code':'OM-CD-01','name':'Financial Cybersecurity','framework':'CBO-CYBERSEC-2023','count':80,'risk_level':'HIGHEST','iot_relevance':'MODERATE','auto':'Y','audit_method':'EXTERNAL_AUDIT','shahin_score':82},
        {'code':'OM-CD-02','name':'Data Privacy','framework':'OM-PDPL-2022','count':55,'risk_level':'HIGH','iot_relevance':'MODERATE','auto':'Y','audit_method':'SELF_ASSESSMENT','shahin_score':78},
        {'code':'OM-CD-03','name':'AML/CFT','framework':'CBO-AML','count':35,'risk_level':'HIGHEST','iot_relevance':'LOW','auto':'PARTIAL','audit_method':'REGULATOR_INSPECTION','shahin_score':80},
    ],
    'risk_domains': [
        {'domain':'Financial Cyber Risk','category':'Cybersecurity','score':82,'level':'HIGHEST','regulator':'CBO','framework':'CBO-CYBERSEC-2023','kri_count':6,'threshold':'Score < 70','owner':'CISO'},
        {'domain':'Data Privacy','category':'Privacy','score':75,'level':'HIGH','regulator':'ODPA/MTCIT','framework':'OM-PDPL-2022','kri_count':5,'threshold':'72h notification','owner':'DPO'},
    ],
    'lifecycle': STANDARD_LIFECYCLE,
    'evidence': STANDARD_EVIDENCE,
    'maturity': [
        {'domain':'GRC Governance','avg':2.5,'best_in_class':4.0,'target':3.0,'priority':'HIGH','barrier':'Capacity','recommendation':'GRC programme','framework':'OM-NCSP'},
        {'domain':'Cybersecurity Controls','avg':2.8,'best_in_class':4.5,'target':3.5,'priority':'HIGH','barrier':'Skills gap','recommendation':'Managed SOC','framework':'CBO-CYBERSEC-2023'},
        {'domain':'Data Privacy','avg':1.8,'best_in_class':4.0,'target':3.0,'priority':'HIGH','barrier':'New regulation','recommendation':'PDPL compliance programme','framework':'OM-PDPL-2022'},
    ],
}

# ─── 🇯🇴 Jordan ───────────────────────────────────────────────────────────────
COUNTRIES['JOR'] = {
    'iso': 'JO', 'flag': '🇯🇴', 'name_en': 'Jordan',
    'name_ar': 'الأردن', 'region': 'MENA', 'fragile': False,
    'regulators': [
        {'code':'NCSC-JO','name_en':'National Cybersecurity Center','name_ar':'المركز الوطني للأمن السيبراني','sector':'Cybersecurity','tier':'T1','own_fw':3,'power_index':88,'enforcement':'MANDATORY','url':'https://ncsc.gov.jo'},
        {'code':'CBJ','name_en':'Central Bank of Jordan','name_ar':'البنك المركزي الأردني','sector':'Financial','tier':'T1','own_fw':5,'power_index':92,'enforcement':'MANDATORY','url':'https://cbj.gov.jo'},
        {'code':'TRC-JO','name_en':'Telecommunications Regulatory Commission','name_ar':'هيئة تنظيم قطاع الاتصالات','sector':'ICT/Telecom','tier':'T2','own_fw':3,'power_index':70,'enforcement':'MANDATORY','url':'https://trc.gov.jo'},
        {'code':'JSC','name_en':'Jordan Securities Commission','name_ar':'هيئة الأوراق المالية','sector':'Capital Markets','tier':'T2','own_fw':3,'power_index':65,'enforcement':'MANDATORY','url':'https://jsc.gov.jo'},
        {'code':'MODEE','name_en':'Ministry of Digital Economy & Entrepreneurship','name_ar':'وزارة الاقتصاد الرقمي والريادة','sector':'ICT/Digital Gov','tier':'T2','own_fw':2,'power_index':60,'enforcement':'MANDATORY','url':'https://modee.gov.jo'},
        {'code':'MOH-JO','name_en':'Ministry of Health','name_ar':'وزارة الصحة','sector':'Healthcare','tier':'T2','own_fw':2,'power_index':55,'enforcement':'MANDATORY','url':'https://moh.gov.jo'},
        {'code':'FIU-JO','name_en':'Jordan AML/CFT Unit (AMLU)','name_ar':'وحدة مكافحة غسل الأموال وتمويل الإرهاب','sector':'AML/CFT','tier':'T2','own_fw':1,'power_index':78,'enforcement':'MANDATORY','url':''},
    ],
    'frameworks': [
        {'code':'JO-PDPL-2023','name_en':'Jordan Personal Data Protection Law No.24/2023','regulator':'MODEE','version':'2023','mandatory':'Y','control_count':40,'sectors':'ALL','audit_freq':'ANNUAL','effective_date':'2024-03-17'},
        {'code':'JO-NCSC-2024-2028','name_en':'Jordan National Cybersecurity Strategy 2024-2028','regulator':'NCSC-JO','version':'2024','mandatory':'Y','control_count':50,'sectors':'ALL','audit_freq':'BIENNIAL','effective_date':'2024-01-01'},
        {'code':'JO-NCS-FRAMEWORK','name_en':'Jordan National Cybersecurity Framework','regulator':'NCSC-JO','version':'2023','mandatory':'Y','control_count':85,'sectors':'GOV,CNI','audit_freq':'ANNUAL','effective_date':'2023-01-01'},
        {'code':'CBJ-CSF','name_en':'CBJ Cybersecurity Framework for Financial Sector','regulator':'CBJ','version':'2022','mandatory':'Y','control_count':78,'sectors':'FIN','audit_freq':'ANNUAL','effective_date':'2022-01-01'},
        {'code':'CBJ-FINCERT-REG','name_en':'CBJ FinCERT Regulations','regulator':'CBJ','version':'2021','mandatory':'Y','control_count':30,'sectors':'FIN','audit_freq':'CONTINUOUS','effective_date':'2021-01-01'},
        {'code':'CBJ-AML','name_en':'CBJ AML/CFT Instructions','regulator':'CBJ/FIU-JO','version':'2021','mandatory':'Y','control_count':40,'sectors':'FIN','audit_freq':'CONTINUOUS','effective_date':'2021-01-01'},
        {'code':'JO-CYBERCRIME-2019','name_en':'Jordan Cybercrime Law No.16/2019','regulator':'NCSC-JO','version':'2019','mandatory':'Y','control_count':20,'sectors':'ALL','audit_freq':'AS_REQUIRED','effective_date':'2019-01-01'},
        {'code':'JO-ECOM-LAW','name_en':'Jordan Electronic Transactions Law','regulator':'MODEE','version':'2015','mandatory':'Y','control_count':15,'sectors':'CAP_MKT,FIN','audit_freq':'AS_REQUIRED','effective_date':'2015-01-01'},
    ],
    'control_domains': [
        {'code':'JO-CD-01','name':'Financial Cybersecurity','framework':'CBJ-CSF','count':78,'risk_level':'HIGH','iot_relevance':'MODERATE','auto':'Y','audit_method':'EXTERNAL_AUDIT','shahin_score':78},
        {'code':'JO-CD-02','name':'National Cybersecurity','framework':'JO-NCS-FRAMEWORK','count':85,'risk_level':'HIGH','iot_relevance':'MODERATE','auto':'PARTIAL','audit_method':'SELF_ASSESSMENT','shahin_score':75},
        {'code':'JO-CD-03','name':'Data Privacy','framework':'JO-PDPL-2023','count':40,'risk_level':'HIGH','iot_relevance':'MODERATE','auto':'Y','audit_method':'SELF_ASSESSMENT','shahin_score':72},
        {'code':'JO-CD-04','name':'AML/CFT','framework':'CBJ-AML','count':40,'risk_level':'HIGH','iot_relevance':'LOW','auto':'PARTIAL','audit_method':'REGULATOR_INSPECTION','shahin_score':76},
    ],
    'risk_domains': [
        {'domain':'Cyber Risk','category':'Cybersecurity','score':75,'level':'HIGH','regulator':'NCSC-JO','framework':'JO-NCS-FRAMEWORK','kri_count':6,'threshold':'Score < 65','owner':'CISO'},
        {'domain':'Data Privacy','category':'Privacy','score':65,'level':'HIGH','regulator':'MODEE','framework':'JO-PDPL-2023','kri_count':4,'threshold':'72h notification','owner':'DPO'},
    ],
    'lifecycle': STANDARD_LIFECYCLE,
    'evidence': STANDARD_EVIDENCE,
    'maturity': [
        {'domain':'GRC Governance','avg':2.2,'best_in_class':4.0,'target':3.0,'priority':'HIGH','barrier':'Capacity','recommendation':'Framework adoption','framework':'JO-NCS-FRAMEWORK'},
        {'domain':'Cybersecurity Controls','avg':2.5,'best_in_class':4.0,'target':3.0,'priority':'HIGH','barrier':'Budget','recommendation':'Risk-based prioritisation','framework':'CBJ-CSF'},
        {'domain':'Data Privacy','avg':1.5,'best_in_class':4.0,'target':2.5,'priority':'HIGH','barrier':'New law','recommendation':'PDPL gap analysis','framework':'JO-PDPL-2023'},
    ],
}

# ─── 🇪🇬 Egypt ────────────────────────────────────────────────────────────────
COUNTRIES['EGY'] = {
    'iso': 'EG', 'flag': '🇪🇬', 'name_en': 'Egypt',
    'name_ar': 'مصر', 'region': 'MENA', 'fragile': False,
    'regulators': [
        {'code':'ESCC','name_en':'Egyptian Supreme Cybersecurity Council','name_ar':'المجلس الأعلى للأمن السيبراني','sector':'Cybersecurity','tier':'T1','own_fw':3,'power_index':90,'enforcement':'MANDATORY','url':''},
        {'code':'CBE','name_en':'Central Bank of Egypt','name_ar':'البنك المركزي المصري','sector':'Financial','tier':'T1','own_fw':6,'power_index':95,'enforcement':'MANDATORY','url':'https://cbe.org.eg'},
        {'code':'NTRA','name_en':'National Telecom Regulatory Authority','name_ar':'الجهاز القومي لتنظيم الاتصالات','sector':'ICT/Telecom/Cyber','tier':'T1','own_fw':4,'power_index':82,'enforcement':'MANDATORY','url':'https://tra.gov.eg'},
        {'code':'FRA-EG','name_en':'Financial Regulatory Authority','name_ar':'الهيئة العامة للرقابة المالية','sector':'Capital Markets','tier':'T2','own_fw':4,'power_index':72,'enforcement':'MANDATORY','url':'https://fra.gov.eg'},
        {'code':'NCSC-EG','name_en':'National Cybersecurity Center','name_ar':'المركز الوطني للأمن السيبراني','sector':'Cybersecurity','tier':'T2','own_fw':2,'power_index':80,'enforcement':'MANDATORY','url':''},
        {'code':'EGX','name_en':'Egyptian Exchange','name_ar':'البورصة المصرية','sector':'Capital Markets','tier':'T3','own_fw':2,'power_index':55,'enforcement':'MANDATORY','url':'https://egx.com.eg'},
        {'code':'MOH-EG','name_en':'Ministry of Health & Population','name_ar':'وزارة الصحة والسكان','sector':'Healthcare','tier':'T2','own_fw':2,'power_index':58,'enforcement':'MANDATORY','url':'https://mohp.gov.eg'},
        {'code':'MCIT-EG','name_en':'Ministry of Communications & IT','name_ar':'وزارة الاتصالات وتكنولوجيا المعلومات','sector':'ICT/Digital','tier':'T2','own_fw':3,'power_index':65,'enforcement':'MANDATORY','url':'https://mcit.gov.eg'},
    ],
    'frameworks': [
        {'code':'EG-PDPL-151-2020','name_en':'Egypt Personal Data Protection Law No.151/2020','regulator':'MCIT-EG','version':'2020','mandatory':'Y','control_count':45,'sectors':'ALL','audit_freq':'ANNUAL','effective_date':'2020-07-14'},
        {'code':'EG-PDPL-EXEC-REGS','name_en':'Egypt PDPL Executive Regulations','regulator':'MCIT-EG','version':'2022','mandatory':'Y','control_count':55,'sectors':'ALL','audit_freq':'ANNUAL','effective_date':'2022-09-01'},
        {'code':'CBE-CSF','name_en':'CBE Financial Cybersecurity Framework','regulator':'CBE','version':'2023','mandatory':'Y','control_count':90,'sectors':'FIN','audit_freq':'ANNUAL','effective_date':'2023-01-01'},
        {'code':'EG-CYBERCRIME-175-2018','name_en':'Egypt Cybercrime Law No.175/2018','regulator':'NTRA/ESCC','version':'2018','mandatory':'Y','control_count':25,'sectors':'ALL','audit_freq':'AS_REQUIRED','effective_date':'2018-08-14'},
        {'code':'NTRA-CYBERSEC-CERT','name_en':'NTRA Cybersecurity Market Certification Framework','regulator':'NTRA','version':'2024','mandatory':'Y','control_count':40,'sectors':'ICT','audit_freq':'BIENNIAL','effective_date':'2024-01-01'},
        {'code':'EG-CLOUD','name_en':'Egypt Government Cloud Framework','regulator':'MCIT-EG','version':'2022','mandatory':'Y','control_count':20,'sectors':'GOV','audit_freq':'BIENNIAL','effective_date':'2022-01-01'},
        {'code':'CBE-AML','name_en':'CBE AML/CFT Regulations','regulator':'CBE','version':'2021','mandatory':'Y','control_count':40,'sectors':'FIN','audit_freq':'CONTINUOUS','effective_date':'2021-01-01'},
        {'code':'FRA-DISCLOSURE-REGS','name_en':'FRA Disclosure and Transparency Regulations','regulator':'FRA-EG','version':'2022','mandatory':'Y','control_count':25,'sectors':'CAP_MKT','audit_freq':'ANNUAL','effective_date':'2022-01-01'},
    ],
    'control_domains': [
        {'code':'EG-CD-01','name':'Financial Cybersecurity','framework':'CBE-CSF','count':90,'risk_level':'HIGHEST','iot_relevance':'MODERATE','auto':'Y','audit_method':'EXTERNAL_AUDIT','shahin_score':82},
        {'code':'EG-CD-02','name':'Data Privacy','framework':'EG-PDPL-151-2020','count':55,'risk_level':'HIGH','iot_relevance':'MODERATE','auto':'Y','audit_method':'SELF_ASSESSMENT','shahin_score':75},
        {'code':'EG-CD-03','name':'Telecom Security','framework':'NTRA-CYBERSEC-CERT','count':40,'risk_level':'HIGH','iot_relevance':'HIGH','auto':'PARTIAL','audit_method':'REGULATOR_INSPECTION','shahin_score':78},
        {'code':'EG-CD-04','name':'AML/CFT','framework':'CBE-AML','count':40,'risk_level':'HIGHEST','iot_relevance':'LOW','auto':'PARTIAL','audit_method':'REGULATOR_INSPECTION','shahin_score':80},
    ],
    'risk_domains': [
        {'domain':'Financial Fraud / Cyber','category':'Cybersecurity','score':85,'level':'HIGHEST','regulator':'CBE/ESCC','framework':'CBE-CSF','kri_count':7,'threshold':'Score < 70','owner':'CISO'},
        {'domain':'Data Privacy','category':'Privacy','score':70,'level':'HIGH','regulator':'MCIT-EG','framework':'EG-PDPL-151-2020','kri_count':5,'threshold':'72h notification','owner':'DPO'},
        {'domain':'AML/CFT','category':'Financial Crime','score':80,'level':'HIGH','regulator':'CBE','framework':'CBE-AML','kri_count':6,'threshold':'STR lag','owner':'MLRO'},
    ],
    'lifecycle': STANDARD_LIFECYCLE,
    'evidence': STANDARD_EVIDENCE,
    'maturity': [
        {'domain':'GRC Governance','avg':2.0,'best_in_class':4.0,'target':3.0,'priority':'HIGH','barrier':'Institutional coordination','recommendation':'National GRC framework','framework':'EG-PDPL-151-2020'},
        {'domain':'Cybersecurity Controls','avg':2.5,'best_in_class':4.0,'target':3.0,'priority':'HIGH','barrier':'Large attack surface','recommendation':'Sector-by-sector hardening','framework':'CBE-CSF'},
        {'domain':'Data Privacy','avg':1.8,'best_in_class':4.0,'target':2.5,'priority':'HIGH','barrier':'Exec regs newness','recommendation':'PDPL compliance programme','framework':'EG-PDPL-EXEC-REGS'},
    ],
}

# ─── 🇹🇷 Turkey ──────────────────────────────────────────────────────────────
COUNTRIES['TUR'] = {
    'iso': 'TR', 'flag': '🇹🇷', 'name_en': 'Turkey (Türkiye)',
    'name_ar': 'تركيا', 'region': 'MENA', 'fragile': False,
    'regulators': [
        {'code':'KVKK','name_en':'Personal Data Protection Authority','name_ar':'هيئة حماية البيانات الشخصية','sector':'Data/Privacy','tier':'T1','own_fw':2,'power_index':90,'enforcement':'MANDATORY','url':'https://kvkk.gov.tr'},
        {'code':'BDDK','name_en':'Banking Regulation & Supervision Agency','name_ar':'هيئة تنظيم والإشراف على المصارف','sector':'Financial','tier':'T1','own_fw':5,'power_index':93,'enforcement':'MANDATORY','url':'https://bddk.org.tr'},
        {'code':'BTK','name_en':'Information & Comm. Technologies Authority','name_ar':'هيئة تقنية المعلومات والاتصالات','sector':'ICT/Telecom','tier':'T1','own_fw':4,'power_index':85,'enforcement':'MANDATORY','url':'https://btk.gov.tr'},
        {'code':'SPK','name_en':'Capital Markets Board (CMB)','name_ar':'مجلس أسواق رأس المال','sector':'Capital Markets','tier':'T2','own_fw':4,'power_index':78,'enforcement':'MANDATORY','url':'https://spk.gov.tr'},
        {'code':'TCMB','name_en':'Central Bank of Turkey','name_ar':'البنك المركزي التركي','sector':'Financial','tier':'T2','own_fw':3,'power_index':88,'enforcement':'MANDATORY','url':'https://tcmb.gov.tr'},
        {'code':'EPDK','name_en':'Energy Market Regulatory Authority','name_ar':'هيئة تنظيم سوق الطاقة','sector':'Energy','tier':'T3','own_fw':2,'power_index':60,'enforcement':'MANDATORY','url':'https://epdk.gov.tr'},
        {'code':'MOH-TR','name_en':'Ministry of Health','name_ar':'وزارة الصحة','sector':'Healthcare','tier':'T2','own_fw':3,'power_index':65,'enforcement':'MANDATORY','url':'https://saglik.gov.tr'},
    ],
    'frameworks': [
        {'code':'TR-KVKK-6698','name_en':'Turkey Personal Data Protection Law (KVKK Law 6698)','regulator':'KVKK','version':'2016','mandatory':'Y','control_count':55,'sectors':'ALL','audit_freq':'ANNUAL','effective_date':'2016-04-07'},
        {'code':'TR-KVKK-2024-AMD','name_en':'KVKK 2024 Amendments (GDPR alignment)','regulator':'KVKK','version':'2024','mandatory':'Y','control_count':20,'sectors':'ALL','audit_freq':'ANNUAL','effective_date':'2024-09-01'},
        {'code':'TR-BDDK-CYBERSEC','name_en':'BDDK Cybersecurity Circular','regulator':'BDDK','version':'2022','mandatory':'Y','control_count':88,'sectors':'FIN','audit_freq':'ANNUAL','effective_date':'2022-01-01'},
        {'code':'TR-BTK-CYBERSEC','name_en':'BTK Cybersecurity Regulations','regulator':'BTK','version':'2023','mandatory':'Y','control_count':60,'sectors':'ICT','audit_freq':'ANNUAL','effective_date':'2023-01-01'},
        {'code':'TR-CYBERSEC-STRATEGY-2023-2025','name_en':'Turkey National Cybersecurity Strategy 2023-2025','regulator':'BTK','version':'2023','mandatory':'Y','control_count':45,'sectors':'ALL','audit_freq':'BIENNIAL','effective_date':'2023-01-01'},
        {'code':'TR-BANKING-LAW','name_en':'Turkey Banking Law No.5411','regulator':'BDDK','version':'2005+','mandatory':'Y','control_count':50,'sectors':'FIN','audit_freq':'ANNUAL','effective_date':'2005-11-01'},
        {'code':'TR-ECOM-LAW','name_en':'Turkey Electronic Commerce Law No.6563','regulator':'BTK','version':'2014+','mandatory':'Y','control_count':20,'sectors':'ALL','audit_freq':'AS_REQUIRED','effective_date':'2014-11-23'},
        {'code':'TR-HEALTH-DATA','name_en':'Turkey Health Data Regulation','regulator':'MOH-TR','version':'2021','mandatory':'Y','control_count':35,'sectors':'HC','audit_freq':'ANNUAL','effective_date':'2021-01-01'},
        {'code':'TR-CLOUD-GUIDE','name_en':'Turkey Cloud Computing Security Guidelines','regulator':'BTK','version':'2022','mandatory':'P','control_count':25,'sectors':'GOV,ICT','audit_freq':'BIENNIAL','effective_date':'2022-01-01'},
    ],
    'control_domains': [
        {'code':'TR-CD-01','name':'Data Privacy (KVKK)','framework':'TR-KVKK-6698','count':55,'risk_level':'HIGHEST','iot_relevance':'MODERATE','auto':'Y','audit_method':'EXTERNAL_AUDIT','shahin_score':85},
        {'code':'TR-CD-02','name':'Banking Cybersecurity','framework':'TR-BDDK-CYBERSEC','count':88,'risk_level':'HIGHEST','iot_relevance':'MODERATE','auto':'Y','audit_method':'EXTERNAL_AUDIT','shahin_score':87},
        {'code':'TR-CD-03','name':'Telecom Security','framework':'TR-BTK-CYBERSEC','count':60,'risk_level':'HIGH','iot_relevance':'HIGH','auto':'PARTIAL','audit_method':'REGULATOR_INSPECTION','shahin_score':80},
        {'code':'TR-CD-04','name':'Healthcare Data','framework':'TR-HEALTH-DATA','count':35,'risk_level':'HIGH','iot_relevance':'HIGH','auto':'PARTIAL','audit_method':'EXTERNAL_AUDIT','shahin_score':76},
    ],
    'risk_domains': [
        {'domain':'Data Privacy (KVKK)','category':'Privacy','score':85,'level':'HIGHEST','regulator':'KVKK','framework':'TR-KVKK-6698','kri_count':7,'threshold':'72h notification','owner':'DPO'},
        {'domain':'Banking Cyber Risk','category':'Cybersecurity','score':88,'level':'HIGHEST','regulator':'BDDK','framework':'TR-BDDK-CYBERSEC','kri_count':8,'threshold':'Score < 80','owner':'CISO'},
        {'domain':'Telecom Compliance','category':'Regulatory','score':72,'level':'HIGH','regulator':'BTK','framework':'TR-BTK-CYBERSEC','kri_count':5,'threshold':'Cert lapse','owner':'CTO'},
    ],
    'lifecycle': STANDARD_LIFECYCLE,
    'evidence': STANDARD_EVIDENCE,
    'maturity': [
        {'domain':'GRC Governance','avg':3.0,'best_in_class':4.5,'target':4.0,'priority':'HIGH','barrier':'Regulatory fragmentation','recommendation':'Unified GRC platform','framework':'TR-CYBERSEC-STRATEGY-2023-2025'},
        {'domain':'Data Privacy','avg':3.2,'best_in_class':4.5,'target':4.0,'priority':'HIGH','barrier':'GDPR gap','recommendation':'GDPR-readiness gap closure','framework':'TR-KVKK-2024-AMD'},
        {'domain':'Banking Cybersecurity','avg':3.5,'best_in_class':4.5,'target':4.0,'priority':'MEDIUM','barrier':'Legacy core banking','recommendation':'Core modernisation','framework':'TR-BDDK-CYBERSEC'},
    ],
}

# ─── 🇨🇾 Cyprus ───────────────────────────────────────────────────────────────
COUNTRIES['CYP'] = {
    'iso': 'CY', 'flag': '🇨🇾', 'name_en': 'Cyprus (EU Member)',
    'name_ar': 'قبرص', 'region': 'EU/Mediterranean', 'fragile': False,
    'regulators': [
        {'code':'CPDP-CY','name_en':'Commissioner for Personal Data Protection','name_ar':'مفوض حماية البيانات الشخصية','sector':'Data/Privacy','tier':'T1','own_fw':2,'power_index':90,'enforcement':'MANDATORY','url':'https://dataprotection.gov.cy'},
        {'code':'DSA-CY','name_en':'Digital Security Authority','name_ar':'سلطة الأمن الرقمي','sector':'Cybersecurity/NIS2','tier':'T1','own_fw':3,'power_index':88,'enforcement':'MANDATORY','url':'https://dsa.cy'},
        {'code':'CySEC','name_en':'Cyprus Securities & Exchange Commission','name_ar':'هيئة الأوراق المالية والبورصة القبرصية','sector':'Financial','tier':'T1','own_fw':5,'power_index':85,'enforcement':'MANDATORY','url':'https://cysec.gov.cy'},
        {'code':'CBC','name_en':'Central Bank of Cyprus','name_ar':'البنك المركزي القبرصي','sector':'Financial/Banking','tier':'T2','own_fw':3,'power_index':78,'enforcement':'MANDATORY','url':'https://centralbank.cy'},
        {'code':'OCECPR','name_en':'Office of Electronic Communications & Post Regulation','name_ar':'مكتب تنظيم الاتصالات الإلكترونية والبريد','sector':'Telecom','tier':'T2','own_fw':2,'power_index':65,'enforcement':'MANDATORY','url':'https://ocecpr.gov.cy'},
        {'code':'MOH-CY','name_en':'Ministry of Health','name_ar':'وزارة الصحة','sector':'Healthcare','tier':'T3','own_fw':1,'power_index':50,'enforcement':'MANDATORY','url':'https://moh.gov.cy'},
    ],
    'frameworks': [
        {'code':'EU-GDPR-2016-679','name_en':'EU General Data Protection Regulation (GDPR)','regulator':'CPDP-CY','version':'2016 +2025 updates','mandatory':'Y','control_count':71,'sectors':'ALL','audit_freq':'ANNUAL','effective_date':'2018-05-25'},
        {'code':'CY-DPA-125-2018','name_en':'Cyprus Data Protection Law 125(I)/2018','regulator':'CPDP-CY','version':'2018','mandatory':'Y','control_count':40,'sectors':'ALL','audit_freq':'ANNUAL','effective_date':'2018-07-31'},
        {'code':'EU-NIS2-2022-2555','name_en':'EU NIS2 Directive 2022/2555','regulator':'DSA-CY','version':'2022','mandatory':'Y','control_count':85,'sectors':'CRITICAL','audit_freq':'BIENNIAL','effective_date':'2024-10-17'},
        {'code':'CY-NIS2-TRANSPOSITION-2025','name_en':'Cyprus NIS2 Transposition Law 2025','regulator':'DSA-CY','version':'2025','mandatory':'Y','control_count':85,'sectors':'CRITICAL','audit_freq':'BIENNIAL','effective_date':'2025-01-01'},
        {'code':'EU-DORA-2022-2554','name_en':'EU Digital Operational Resilience Act (DORA)','regulator':'CySEC/CBC','version':'2022','mandatory':'Y','control_count':100,'sectors':'FIN','audit_freq':'ANNUAL','effective_date':'2025-01-17'},
        {'code':'EU-AI-ACT-2024','name_en':'EU AI Act 2024','regulator':'DSA-CY','version':'2024','mandatory':'Y','control_count':50,'sectors':'ALL','audit_freq':'ANNUAL','effective_date':'2024-08-01'},
        {'code':'CySEC-CYBERSEC-GUIDELINES','name_en':'CySEC Cybersecurity Guidelines','regulator':'CySEC','version':'2023','mandatory':'Y','control_count':45,'sectors':'FIN','audit_freq':'ANNUAL','effective_date':'2023-01-01'},
        {'code':'CBC-CYBERSEC','name_en':'CBC Cybersecurity Requirements','regulator':'CBC','version':'2023','mandatory':'Y','control_count':60,'sectors':'FIN','audit_freq':'ANNUAL','effective_date':'2023-01-01'},
        {'code':'EU-AML6D','name_en':'EU 6th Anti-Money Laundering Directive','regulator':'CBC','version':'2020','mandatory':'Y','control_count':30,'sectors':'FIN','audit_freq':'CONTINUOUS','effective_date':'2020-12-03'},
    ],
    'control_domains': [
        {'code':'CY-CD-01','name':'GDPR / Data Privacy','framework':'EU-GDPR-2016-679','count':71,'risk_level':'HIGHEST','iot_relevance':'MODERATE','auto':'Y','audit_method':'EXTERNAL_AUDIT','shahin_score':90},
        {'code':'CY-CD-02','name':'NIS2 / Critical Infrastructure','framework':'EU-NIS2-2022-2555','count':85,'risk_level':'HIGHEST','iot_relevance':'HIGH','auto':'Y','audit_method':'REGULATOR_INSPECTION','shahin_score':88},
        {'code':'CY-CD-03','name':'DORA / Financial Resilience','framework':'EU-DORA-2022-2554','count':100,'risk_level':'HIGHEST','iot_relevance':'MODERATE','auto':'Y','audit_method':'EXTERNAL_AUDIT','shahin_score':88},
        {'code':'CY-CD-04','name':'AI Act Compliance','framework':'EU-AI-ACT-2024','count':50,'risk_level':'HIGH','iot_relevance':'HIGH','auto':'PARTIAL','audit_method':'SELF_ASSESSMENT','shahin_score':82},
        {'code':'CY-CD-05','name':'AML/CFT','framework':'EU-AML6D','count':30,'risk_level':'HIGH','iot_relevance':'LOW','auto':'PARTIAL','audit_method':'REGULATOR_INSPECTION','shahin_score':85},
    ],
    'risk_domains': [
        {'domain':'GDPR Breach Risk','category':'Privacy','score':88,'level':'HIGHEST','regulator':'CPDP-CY','framework':'EU-GDPR-2016-679','kri_count':8,'threshold':'72h notification mandatory','owner':'DPO'},
        {'domain':'DORA / Financial Resilience','category':'Operational','score':85,'level':'HIGHEST','regulator':'CySEC/CBC','framework':'EU-DORA-2022-2554','kri_count':7,'threshold':'RTO breach','owner':'CRO'},
        {'domain':'NIS2 / Critical Infrastructure','category':'Cybersecurity','score':82,'level':'HIGHEST','regulator':'DSA-CY','framework':'EU-NIS2-2022-2555','kri_count':6,'threshold':'Incident not reported 24h','owner':'CISO'},
    ],
    'lifecycle': STANDARD_LIFECYCLE,
    'evidence': STANDARD_EVIDENCE,
    'maturity': [
        {'domain':'GRC Governance','avg':3.5,'best_in_class':4.5,'target':4.0,'priority':'HIGH','barrier':'EU complexity','recommendation':'EU GRC tooling','framework':'EU-GDPR-2016-679'},
        {'domain':'GDPR Compliance','avg':3.2,'best_in_class':4.5,'target':4.0,'priority':'HIGH','barrier':'DPIAs','recommendation':'Automated DPIA system','framework':'EU-GDPR-2016-679'},
        {'domain':'DORA','avg':2.5,'best_in_class':4.0,'target':3.5,'priority':'HIGH','barrier':'New (Jan 2025)','recommendation':'ICT risk framework build','framework':'EU-DORA-2022-2554'},
        {'domain':'AI Act','avg':1.5,'best_in_class':4.0,'target':2.5,'priority':'HIGH','barrier':'Very new','recommendation':'AI inventory and risk classification','framework':'EU-AI-ACT-2024'},
    ],
}

# ─── 🇬🇧 United Kingdom ───────────────────────────────────────────────────────
COUNTRIES['GBR'] = {
    'iso': 'GB', 'flag': '🇬🇧', 'name_en': 'United Kingdom',
    'name_ar': 'المملكة المتحدة', 'region': 'Global', 'fragile': False,
    'regulators': [
        {'code':'FCA','name_en':'Financial Conduct Authority','name_ar':'هيئة السلوك المالي','sector':'Financial','tier':'T1','own_fw':12,'power_index':98,'enforcement':'MANDATORY','url':'https://fca.org.uk'},
        {'code':'PRA','name_en':'Prudential Regulation Authority','name_ar':'هيئة التنظيم الاحترازي','sector':'Financial/Banks','tier':'T1','own_fw':8,'power_index':97,'enforcement':'MANDATORY','url':'https://bankofengland.co.uk/pra'},
        {'code':'ICO','name_en':'Information Commissioner\'s Office','name_ar':'مكتب مفوض المعلومات','sector':'Data/Privacy','tier':'T1','own_fw':5,'power_index':95,'enforcement':'MANDATORY','url':'https://ico.org.uk'},
        {'code':'NCSC-UK','name_en':'National Cyber Security Centre','name_ar':'المركز الوطني للأمن السيبراني','sector':'Cybersecurity','tier':'T1','own_fw':6,'power_index':96,'enforcement':'MANDATORY','url':'https://ncsc.gov.uk'},
        {'code':'BoE','name_en':'Bank of England','name_ar':'بنك إنجلترا','sector':'Financial Stability','tier':'T1','own_fw':4,'power_index':99,'enforcement':'MANDATORY','url':'https://bankofengland.co.uk'},
        {'code':'CMA-UK','name_en':'Competition & Markets Authority','name_ar':'هيئة المنافسة والأسواق','sector':'Commerce','tier':'T2','own_fw':3,'power_index':80,'enforcement':'MANDATORY','url':'https://gov.uk/cma'},
        {'code':'MHRA','name_en':'Medicines & Healthcare Regulatory Agency','name_ar':'وكالة تنظيم الأدوية والرعاية الصحية','sector':'Healthcare','tier':'T2','own_fw':5,'power_index':82,'enforcement':'MANDATORY','url':'https://gov.uk/mhra'},
        {'code':'CQC','name_en':'Care Quality Commission','name_ar':'لجنة جودة الرعاية','sector':'Healthcare','tier':'T2','own_fw':4,'power_index':78,'enforcement':'MANDATORY','url':'https://cqc.org.uk'},
        {'code':'Ofcom','name_en':'Office of Communications','name_ar':'هيئة تنظيم الاتصالات','sector':'Telecom/Media','tier':'T2','own_fw':4,'power_index':80,'enforcement':'MANDATORY','url':'https://ofcom.org.uk'},
        {'code':'PSR','name_en':'Payment Systems Regulator','name_ar':'هيئة تنظيم أنظمة الدفع','sector':'Payments','tier':'T2','own_fw':3,'power_index':78,'enforcement':'MANDATORY','url':'https://psr.org.uk'},
    ],
    'frameworks': [
        {'code':'UK-GDPR-2018','name_en':'UK GDPR (Data Protection Act 2018)','regulator':'ICO','version':'2018 post-Brexit','mandatory':'Y','control_count':71,'sectors':'ALL','audit_freq':'ANNUAL','effective_date':'2021-01-01'},
        {'code':'UK-NCSC-CAF','name_en':'NCSC Cyber Assessment Framework (CAF)','regulator':'NCSC-UK','version':'3.2','mandatory':'Y','control_count':22,'sectors':'CNI,GOV','audit_freq':'ANNUAL','effective_date':'2023-01-01'},
        {'code':'UK-CYBER-ESSENTIALS','name_en':'Cyber Essentials','regulator':'NCSC-UK','version':'2024','mandatory':'P','control_count':56,'sectors':'ALL','audit_freq':'ANNUAL','effective_date':'2014-06-01'},
        {'code':'UK-CYBER-ESSENTIALS-PLUS','name_en':'Cyber Essentials Plus','regulator':'NCSC-UK','version':'2024','mandatory':'P','control_count':56,'sectors':'ALL','audit_freq':'ANNUAL','effective_date':'2014-06-01'},
        {'code':'FCA-SYSC','name_en':'FCA Senior Management Arrangements (SYSC)','regulator':'FCA','version':'2024','mandatory':'Y','control_count':80,'sectors':'FIN','audit_freq':'CONTINUOUS','effective_date':'2001-12-01'},
        {'code':'FCA-CONSUMER-DUTY','name_en':'FCA Consumer Duty','regulator':'FCA','version':'2023','mandatory':'Y','control_count':30,'sectors':'FIN','audit_freq':'ANNUAL','effective_date':'2023-07-31'},
        {'code':'FCA-SMCR','name_en':'FCA Senior Managers & Certification Regime (SMCR)','regulator':'FCA/PRA','version':'2019','mandatory':'Y','control_count':25,'sectors':'FIN','audit_freq':'ANNUAL','effective_date':'2019-12-09'},
        {'code':'PRA-OPRES','name_en':'PRA Operational Resilience Policy','regulator':'PRA','version':'2021','mandatory':'Y','control_count':30,'sectors':'FIN','audit_freq':'ANNUAL','effective_date':'2022-03-31'},
        {'code':'BOE-CBEST','name_en':'Bank of England CBEST Threat-Led Pen Testing','regulator':'BoE','version':'2022','mandatory':'Y','control_count':15,'sectors':'SYS_IMPORTANT','audit_freq':'BIENNIAL','effective_date':'2014-06-01'},
        {'code':'UK-CTP-REGIME','name_en':'UK Critical Third Parties Regime (FSMA 2023)','regulator':'FCA/PRA/BoE','version':'2023','mandatory':'Y','control_count':20,'sectors':'FIN','audit_freq':'ANNUAL','effective_date':'2023-01-01'},
        {'code':'UK-NIS-REGS','name_en':'UK Network & Information Systems Regulations 2018','regulator':'NCSC-UK','version':'2018','mandatory':'Y','control_count':40,'sectors':'CNI','audit_freq':'ANNUAL','effective_date':'2018-05-10'},
        {'code':'MHRA-MDR','name_en':'UK Medical Device Regulations','regulator':'MHRA','version':'2002+2023','mandatory':'Y','control_count':45,'sectors':'HC','audit_freq':'ANNUAL','effective_date':'2021-07-01'},
        {'code':'UK-AML-POCA','name_en':'UK AML – Proceeds of Crime Act + MLRs','regulator':'FCA','version':'2017+','mandatory':'Y','control_count':35,'sectors':'FIN','audit_freq':'CONTINUOUS','effective_date':'2017-06-26'},
        {'code':'UK-DORA-SCOPE','name_en':'EU DORA (UK firms with EU operations)','regulator':'FCA','version':'2022','mandatory':'P','control_count':100,'sectors':'FIN-EU','audit_freq':'ANNUAL','effective_date':'2025-01-17'},
        {'code':'UK-ONLINE-SAFETY','name_en':'Online Safety Act 2023','regulator':'Ofcom','version':'2023','mandatory':'Y','control_count':40,'sectors':'DIGITAL','audit_freq':'ANNUAL','effective_date':'2023-10-26'},
    ],
    'control_domains': [
        {'code':'GB-CD-01','name':'UK GDPR / Data Privacy','framework':'UK-GDPR-2018','count':71,'risk_level':'HIGHEST','iot_relevance':'MODERATE','auto':'Y','audit_method':'EXTERNAL_AUDIT','shahin_score':95},
        {'code':'GB-CD-02','name':'Financial Conduct & Consumer Duty','framework':'FCA-CONSUMER-DUTY','count':80,'risk_level':'HIGHEST','iot_relevance':'LOW','auto':'Y','audit_method':'REGULATOR_INSPECTION','shahin_score':93},
        {'code':'GB-CD-03','name':'Operational Resilience','framework':'PRA-OPRES','count':30,'risk_level':'HIGHEST','iot_relevance':'MODERATE','auto':'PARTIAL','audit_method':'EXTERNAL_AUDIT','shahin_score':90},
        {'code':'GB-CD-04','name':'Cybersecurity (CAF / Essentials)','framework':'UK-NCSC-CAF','count':56,'risk_level':'HIGH','iot_relevance':'HIGH','auto':'Y','audit_method':'CERTIFICATION','shahin_score':92},
        {'code':'GB-CD-05','name':'AML/CFT','framework':'UK-AML-POCA','count':35,'risk_level':'HIGHEST','iot_relevance':'LOW','auto':'PARTIAL','audit_method':'REGULATOR_INSPECTION','shahin_score':90},
        {'code':'GB-CD-06','name':'Healthcare / Medical Device','framework':'MHRA-MDR','count':45,'risk_level':'HIGH','iot_relevance':'HIGH','auto':'PARTIAL','audit_method':'CERTIFICATION','shahin_score':85},
    ],
    'risk_domains': [
        {'domain':'UK GDPR Breach','category':'Privacy','score':92,'level':'HIGHEST','regulator':'ICO','framework':'UK-GDPR-2018','kri_count':8,'threshold':'72h mandatory notification','owner':'DPO'},
        {'domain':'Financial Conduct Risk','category':'Regulatory','score':90,'level':'HIGHEST','regulator':'FCA','framework':'FCA-SYSC','kri_count':9,'threshold':'Consumer harm incident','owner':'CCO'},
        {'domain':'Operational Resilience','category':'Operational','score':88,'level':'HIGHEST','regulator':'PRA/FCA','framework':'PRA-OPRES','kri_count':7,'threshold':'Impact tolerance breach','owner':'CRO'},
        {'domain':'Cybersecurity / CNI','category':'Cybersecurity','score':85,'level':'HIGHEST','regulator':'NCSC-UK','framework':'UK-NCSC-CAF','kri_count':6,'threshold':'CAF objective failed','owner':'CISO'},
        {'domain':'AML/Financial Crime','category':'Financial Crime','score':88,'level':'HIGHEST','regulator':'FCA/NCA','framework':'UK-AML-POCA','kri_count':7,'threshold':'STR failure','owner':'MLRO'},
    ],
    'lifecycle': STANDARD_LIFECYCLE,
    'evidence': STANDARD_EVIDENCE,
    'maturity': [
        {'domain':'GRC Governance','avg':4.0,'best_in_class':5.0,'target':4.5,'priority':'MEDIUM','barrier':'Regulatory fragmentation','recommendation':'GRC integration across FCA+PRA+ICO','framework':'FCA-SYSC'},
        {'domain':'Data Privacy (UK GDPR)','avg':3.8,'best_in_class':5.0,'target':4.5,'priority':'HIGH','barrier':'Third-party data flows','recommendation':'DP programme governance','framework':'UK-GDPR-2018'},
        {'domain':'Operational Resilience','avg':3.5,'best_in_class':5.0,'target':4.0,'priority':'HIGH','barrier':'Testing gaps','recommendation':'Severe but plausible scenario testing','framework':'PRA-OPRES'},
        {'domain':'AML/CFT','avg':4.0,'best_in_class':5.0,'target':4.5,'priority':'MEDIUM','barrier':'Crypto/DeFi risks','recommendation':'AI-powered transaction monitoring','framework':'UK-AML-POCA'},
    ],
}

# ─── 🇺🇸 United States ────────────────────────────────────────────────────────
COUNTRIES['USA'] = {
    'iso': 'US', 'flag': '🇺🇸', 'name_en': 'United States of America',
    'name_ar': 'الولايات المتحدة الأمريكية', 'region': 'Global', 'fragile': False,
    'regulators': [
        {'code':'FED','name_en':'Federal Reserve System','name_ar':'الاحتياطي الفيدرالي','sector':'Financial','tier':'T1','own_fw':6,'power_index':100,'enforcement':'MANDATORY','url':'https://federalreserve.gov'},
        {'code':'OCC','name_en':'Office of the Comptroller of Currency','name_ar':'مكتب مراقب العملة','sector':'Banking','tier':'T1','own_fw':8,'power_index':95,'enforcement':'MANDATORY','url':'https://occ.gov'},
        {'code':'SEC-US','name_en':'Securities & Exchange Commission','name_ar':'هيئة الأوراق المالية والبورصات','sector':'Capital Markets','tier':'T1','own_fw':10,'power_index':97,'enforcement':'MANDATORY','url':'https://sec.gov'},
        {'code':'CISA','name_en':'Cybersecurity & Infrastructure Security Agency','name_ar':'وكالة الأمن السيبراني وأمن البنية التحتية','sector':'Cybersecurity/CNI','tier':'T1','own_fw':8,'power_index':95,'enforcement':'MANDATORY','url':'https://cisa.gov'},
        {'code':'NIST-US','name_en':'National Institute of Standards & Technology','name_ar':'المعهد الوطني للمعايير والتكنولوجيا','sector':'Standards/Cyber','tier':'T1','own_fw':15,'power_index':93,'enforcement':'VOLUNTARY (de facto mandatory)','url':'https://nist.gov'},
        {'code':'FDA-US','name_en':'Food & Drug Administration','name_ar':'إدارة الغذاء والدواء','sector':'Healthcare/Devices','tier':'T2','own_fw':8,'power_index':88,'enforcement':'MANDATORY','url':'https://fda.gov'},
        {'code':'HHS-OCR','name_en':'HHS Office for Civil Rights (HIPAA)','name_ar':'مكتب الحقوق المدنية (هيبا)','sector':'Healthcare/Privacy','tier':'T2','own_fw':3,'power_index':90,'enforcement':'MANDATORY','url':'https://hhs.gov/ocr'},
        {'code':'FTC','name_en':'Federal Trade Commission','name_ar':'لجنة التجارة الفيدرالية','sector':'Consumer/Privacy','tier':'T2','own_fw':4,'power_index':85,'enforcement':'MANDATORY','url':'https://ftc.gov'},
        {'code':'FinCEN','name_en':'Financial Crimes Enforcement Network','name_ar':'شبكة إنفاذ الجرائم المالية','sector':'AML/CFT','tier':'T2','own_fw':5,'power_index':90,'enforcement':'MANDATORY','url':'https://fincen.gov'},
        {'code':'NYDFS','name_en':'New York Dept. of Financial Services','name_ar':'إدارة الخدمات المالية بنيويورك','sector':'Financial (NY State)','tier':'T2','own_fw':3,'power_index':88,'enforcement':'MANDATORY','url':'https://dfs.ny.gov'},
        {'code':'CPPA','name_en':'CA Privacy Protection Agency (CCPA/CPRA)','name_ar':'وكالة حماية الخصوصية في كاليفورنيا','sector':'Data/Privacy (CA)','tier':'T2','own_fw':2,'power_index':82,'enforcement':'MANDATORY','url':'https://cppa.ca.gov'},
        {'code':'FDIC','name_en':'Federal Deposit Insurance Corporation','name_ar':'مؤسسة التأمين الفيدرالية على الودائع','sector':'Banking','tier':'T2','own_fw':4,'power_index':88,'enforcement':'MANDATORY','url':'https://fdic.gov'},
    ],
    'frameworks': [
        {'code':'NIST-CSF-2-0','name_en':'NIST Cybersecurity Framework v2.0','regulator':'NIST-US','version':'2.0 (2024)','mandatory':'P','control_count':106,'sectors':'ALL','audit_freq':'ANNUAL','effective_date':'2024-02-26'},
        {'code':'NIST-SP-800-53-R5','name_en':'NIST SP 800-53 Rev.5 – Security Controls','regulator':'NIST-US','version':'Rev.5 2020','mandatory':'Y','control_count':1100,'sectors':'GOV,FED','audit_freq':'ANNUAL','effective_date':'2020-09-23'},
        {'code':'HIPAA-HITECH','name_en':'HIPAA / HITECH Act','regulator':'HHS-OCR','version':'1996 +HITECH 2009','mandatory':'Y','control_count':54,'sectors':'HC','audit_freq':'ANNUAL','effective_date':'1996-08-21'},
        {'code':'NY-DFS-23-NYCRR-500','name_en':'NY DFS Cybersecurity Regulation (23 NYCRR 500)','regulator':'NYDFS','version':'2023 2nd Amendment','mandatory':'Y','control_count':22,'sectors':'FIN-NY','audit_freq':'ANNUAL','effective_date':'2017-09-04'},
        {'code':'CCPA-CPRA-2023','name_en':'California Consumer Privacy Act / CPRA','regulator':'CPPA','version':'CPRA 2020 effective 2023','mandatory':'Y','control_count':35,'sectors':'ALL-CA','audit_freq':'ANNUAL','effective_date':'2023-01-01'},
        {'code':'SEC-CYBERSEC-RULES-2023','name_en':'SEC Cybersecurity Disclosure Rules 2023','regulator':'SEC-US','version':'2023','mandatory':'Y','control_count':15,'sectors':'PUBLIC_CO','audit_freq':'CONTINUOUS','effective_date':'2023-12-18'},
        {'code':'US-GLBA-SAFEGUARDS','name_en':'GLBA Safeguards Rule (FTC)','regulator':'FTC','version':'2023 amendment','mandatory':'Y','control_count':30,'sectors':'FIN','audit_freq':'ANNUAL','effective_date':'2023-06-09'},
        {'code':'FED-OCC-FDIC-INCIDENT-36H','name_en':'Banking Agencies 36-Hour Incident Notification','regulator':'FED/OCC/FDIC','version':'2022','mandatory':'Y','control_count':5,'sectors':'FIN','audit_freq':'CONTINUOUS','effective_date':'2022-04-01'},
        {'code':'CIRCIA-2022','name_en':'Cyber Incident Reporting for Critical Infrastructure Act','regulator':'CISA','version':'2022','mandatory':'Y','control_count':8,'sectors':'CNI','audit_freq':'CONTINUOUS','effective_date':'2022-03-15'},
        {'code':'FEDRAMP','name_en':'FedRAMP (Federal Risk & Authorization Mgmt Program)','regulator':'CISA/GSA','version':'Rev.5 2023','mandatory':'Y','control_count':325,'sectors':'CLOUD-GOV','audit_freq':'ANNUAL','effective_date':'2011-12-08'},
        {'code':'US-FDA-CYBERSEC-MD','name_en':'FDA Cybersecurity for Medical Devices (2023 Guidance)','regulator':'FDA-US','version':'2023','mandatory':'Y','control_count':40,'sectors':'HC','audit_freq':'AS_REQUIRED','effective_date':'2023-03-29'},
        {'code':'US-AML-BSA','name_en':'Bank Secrecy Act / AML','regulator':'FinCEN','version':'1970+','mandatory':'Y','control_count':45,'sectors':'FIN','audit_freq':'CONTINUOUS','effective_date':'1970-10-26'},
        {'code':'CISA-CPG','name_en':'CISA Cybersecurity Performance Goals','regulator':'CISA','version':'2023','mandatory':'P','control_count':50,'sectors':'CNI','audit_freq':'ANNUAL','effective_date':'2023-03-01'},
    ],
    'control_domains': [
        {'code':'US-CD-01','name':'NIST CSF / Federal Cybersecurity','framework':'NIST-CSF-2-0','count':106,'risk_level':'HIGHEST','iot_relevance':'HIGH','auto':'Y','audit_method':'EXTERNAL_AUDIT','shahin_score':95},
        {'code':'US-CD-02','name':'Healthcare Privacy (HIPAA)','framework':'HIPAA-HITECH','count':54,'risk_level':'HIGHEST','iot_relevance':'HIGHEST','auto':'Y','audit_method':'EXTERNAL_AUDIT','shahin_score':93},
        {'code':'US-CD-03','name':'NY DFS Cybersecurity','framework':'NY-DFS-23-NYCRR-500','count':22,'risk_level':'HIGHEST','iot_relevance':'MODERATE','auto':'Y','audit_method':'REGULATOR_INSPECTION','shahin_score':92},
        {'code':'US-CD-04','name':'Federal Compliance (NIST 800-53)','framework':'NIST-SP-800-53-R5','count':1100,'risk_level':'HIGHEST','iot_relevance':'HIGH','auto':'Y','audit_method':'EXTERNAL_AUDIT','shahin_score':95},
        {'code':'US-CD-05','name':'Privacy (CCPA/CPRA)','framework':'CCPA-CPRA-2023','count':35,'risk_level':'HIGH','iot_relevance':'MODERATE','auto':'Y','audit_method':'SELF_ASSESSMENT','shahin_score':88},
        {'code':'US-CD-06','name':'AML/BSA','framework':'US-AML-BSA','count':45,'risk_level':'HIGHEST','iot_relevance':'LOW','auto':'PARTIAL','audit_method':'REGULATOR_INSPECTION','shahin_score':92},
        {'code':'US-CD-07','name':'Cloud/FedRAMP','framework':'FEDRAMP','count':325,'risk_level':'HIGH','iot_relevance':'MODERATE','auto':'Y','audit_method':'CERTIFICATION','shahin_score':92},
        {'code':'US-CD-08','name':'Medical Device Cybersecurity','framework':'US-FDA-CYBERSEC-MD','count':40,'risk_level':'HIGHEST','iot_relevance':'HIGHEST','auto':'PARTIAL','audit_method':'CERTIFICATION','shahin_score':88},
    ],
    'risk_domains': [
        {'domain':'Federal Cyber / CNI','category':'Cybersecurity','score':95,'level':'HIGHEST','regulator':'CISA','framework':'NIST-CSF-2-0','kri_count':10,'threshold':'Ransomware / 72h CIRCIA','owner':'CISO'},
        {'domain':'Healthcare Breach (HIPAA)','category':'Privacy','score':92,'level':'HIGHEST','regulator':'HHS-OCR','framework':'HIPAA-HITECH','kri_count':8,'threshold':'PHI breach notification 60 days','owner':'DPO/Privacy Officer'},
        {'domain':'Financial Fraud / SEC Disclosure','category':'Regulatory','score':90,'level':'HIGHEST','regulator':'SEC-US','framework':'SEC-CYBERSEC-RULES-2023','kri_count':7,'threshold':'Material incident 4-day 8-K','owner':'CISO/CLO'},
        {'domain':'AML/Financial Crime','category':'Financial Crime','score':92,'level':'HIGHEST','regulator':'FinCEN','framework':'US-AML-BSA','kri_count':8,'threshold':'SAR filing failure','owner':'MLRO'},
        {'domain':'Data Privacy (State)','category':'Privacy','score':80,'level':'HIGH','regulator':'CPPA/State AGs','framework':'CCPA-CPRA-2023','kri_count':6,'threshold':'Consumer data request failure','owner':'DPO'},
    ],
    'lifecycle': STANDARD_LIFECYCLE,
    'evidence': STANDARD_EVIDENCE,
    'maturity': [
        {'domain':'GRC Governance','avg':4.0,'best_in_class':5.0,'target':4.5,'priority':'HIGH','barrier':'Regulatory complexity (10+ regulators)','recommendation':'Unified GRC with regulator mapping','framework':'NIST-CSF-2-0'},
        {'domain':'Cybersecurity Controls','avg':4.2,'best_in_class':5.0,'target':4.5,'priority':'HIGH','barrier':'Supply chain risk','recommendation':'Zero-trust + SBOM programme','framework':'NIST-SP-800-53-R5'},
        {'domain':'Healthcare Privacy','avg':3.5,'best_in_class':5.0,'target':4.0,'priority':'HIGH','barrier':'IoMT device proliferation','recommendation':'Medical device cyber programme','framework':'US-FDA-CYBERSEC-MD'},
        {'domain':'AML/CFT','avg':4.0,'best_in_class':5.0,'target':4.5,'priority':'HIGH','barrier':'Crypto / DeFi','recommendation':'AI-powered TM + SAR automation','framework':'US-AML-BSA'},
        {'domain':'Data Privacy (Multi-State)','avg':3.2,'best_in_class':5.0,'target':4.0,'priority':'HIGH','barrier':'50-state patchwork','recommendation':'Privacy-by-design programme','framework':'CCPA-CPRA-2023'},
    ],
}

# ─── Fragile States (grouped sheet) ──────────────────────────────────────────
FRAGILE_STATES = [
    {
        'iso':'SY','flag':'🇸🇾','name_en':'Syria','name_ar':'سوريا',
        'status':'POST_CONFLICT','regulators':[
            {'code':'CBS-SY','name_en':'Central Bank of Syria','sector':'Financial','tier':'T3','notes':'Limited capacity – post-conflict'},
            {'code':'SYTRA','name_en':'Syrian Telecom Regulatory Authority','sector':'ICT/Telecom','tier':'T3','notes':'Partial operations'},
            {'code':'MCT-SY','name_en':'Ministry of Communications & Technology','sector':'ICT','tier':'T3','notes':'Reconstruction phase'},
        ],
        'frameworks':[
            {'code':'SY-CYBERCRIME-LAW','name_en':'Syria Cybercrime Law','mandatory':'Y','notes':'Basic provisions only'},
            {'code':'SY-TELECOM-LAW','name_en':'Syria Telecom Law','mandatory':'Y','notes':'Pre-conflict framework'},
            {'code':'SY-AML-LAW','name_en':'Syria AML Law','mandatory':'Y','notes':'FATF baseline reference'},
            {'code':'ISO-27001-2022','name_en':'ISO 27001:2022 (international benchmark)','mandatory':'P','notes':'Voluntarily adopted by major orgs'},
        ],
        'key_risk':'Sanctions · Conflict risk · Limited enforcement capacity',
        'intl_baseline':'FATF · ISO 27001 · SWIFT CSP (where applicable)',
    },
    {
        'iso':'IQ','flag':'🇮🇶','name_en':'Iraq','name_ar':'العراق',
        'status':'FRAGILE_IMPROVING',
        'regulators':[
            {'code':'CBI','name_en':'Central Bank of Iraq','sector':'Financial','tier':'T2','notes':'Active – cybersecurity guidance issued'},
            {'code':'CMC-IQ','name_en':'Communications & Media Commission','sector':'ICT/Telecom','tier':'T2','notes':'Active regulator'},
            {'code':'ISC-IQ','name_en':'Iraq Securities Commission','sector':'Capital Markets','tier':'T3','notes':'Developing capacity'},
            {'code':'NITA-IQ','name_en':'National Info Technology Authority','sector':'Digital Gov','tier':'T3','notes':'E-government mandate'},
        ],
        'frameworks':[
            {'code':'IQ-CBI-CYBERSEC-INSTRUCT','name_en':'CBI Cybersecurity Instructions','mandatory':'Y','notes':'ISO 27001 alignment recommended'},
            {'code':'IQ-CMC-TELECOM-REG','name_en':'CMC Telecoms Regulations','mandatory':'Y','notes':''},
            {'code':'IQ-CYBERCRIME-LAW','name_en':'Iraq Cybercrime Law','mandatory':'Y','notes':'No unified national cyber law; criminal code provisions'},
            {'code':'IQ-AML-LAW','name_en':'Iraq AML Law No.39/2015','mandatory':'Y','notes':'FATF aligned'},
            {'code':'ISO-27001-2022','name_en':'ISO 27001:2022 (CBI baseline reference)','mandatory':'P','notes':'Recommended by CBI'},
        ],
        'key_risk':'No unified data protection law · Fragmented regulation · Geopolitical risk',
        'intl_baseline':'FATF · ISO 27001 · PCI DSS',
    },
    {
        'iso':'LB','flag':'🇱🇧','name_en':'Lebanon','name_ar':'لبنان',
        'status':'ECONOMIC_CRISIS',
        'regulators':[
            {'code':'BDL','name_en':'Banque du Liban (Central Bank)','sector':'Financial','tier':'T2','notes':'Functional despite crisis'},
            {'code':'CMA-LB','name_en':'Capital Markets Authority','sector':'Capital Markets','tier':'T3','notes':'Limited capacity'},
            {'code':'TRA-LB','name_en':'Telecom Regulatory Authority','sector':'ICT/Telecom','tier':'T3','notes':'Partial capacity'},
        ],
        'frameworks':[
            {'code':'LB-ECOM-DATAPROT-2018','name_en':'Lebanon E-Commerce & Data Protection Law 81/2018','mandatory':'Y','notes':'Not GDPR equivalent; MoET oversight'},
            {'code':'BDL-547-DATASEC','name_en':'BDL Circular 547 – Data Security','mandatory':'Y','notes':'Banks only'},
            {'code':'BDL-AML-CIRCULARS','name_en':'BDL AML/CFT Circulars','mandatory':'Y','notes':'FATF aligned'},
            {'code':'LB-CYBERCRIME-LAW','name_en':'Lebanon Cybercrime Law','mandatory':'Y','notes':''},
            {'code':'LB-TELECOM-LAW','name_en':'Lebanon Telecom Law','mandatory':'Y','notes':''},
        ],
        'key_risk':'Financial crisis · No independent data protection authority · Governance capacity',
        'intl_baseline':'FATF · ISO 27001',
    },
    {
        'iso':'PS','flag':'🇵🇸','name_en':'Palestine','name_ar':'فلسطين',
        'status':'OCCUPIED_TERRITORY',
        'regulators':[
            {'code':'PMA','name_en':'Palestine Monetary Authority','sector':'Financial','tier':'T2','notes':'Active GRC regulator'},
            {'code':'PCMA','name_en':'Palestine Capital Market Authority','sector':'Capital Markets','tier':'T3','notes':'Limited capacity'},
            {'code':'MTIT-PS','name_en':'Ministry of Telecom & IT','sector':'ICT','tier':'T3','notes':''},
        ],
        'frameworks':[
            {'code':'PS-PMA-CYBERSEC-GUIDE','name_en':'PMA Cybersecurity Guidelines','mandatory':'Y','notes':'ISO 27001 aligned'},
            {'code':'PS-CYBERCRIME-LAW','name_en':'Palestinian Cybercrime Law','mandatory':'Y','notes':''},
            {'code':'PS-ECOM-LAW','name_en':'Palestinian Electronic Commerce Law','mandatory':'Y','notes':''},
            {'code':'PS-AML-LAW','name_en':'Palestinian AML Law','mandatory':'Y','notes':'FATF baseline'},
        ],
        'key_risk':'Limited territorial control · Restricted access · PMA primary enforcer',
        'intl_baseline':'FATF · ISO 27001',
    },
    {
        'iso':'SD','flag':'🇸🇩','name_en':'Sudan','name_ar':'السودان',
        'status':'HIGH_RISK',
        'regulators':[
            {'code':'CBOS','name_en':'Central Bank of Sudan','sector':'Financial','tier':'T3','notes':'Operational in limited capacity'},
            {'code':'NTC-SD','name_en':'National Telecom Corporation','sector':'ICT/Telecom','tier':'T3','notes':''},
        ],
        'frameworks':[
            {'code':'SD-CYBERCRIME-LAW','name_en':'Sudan Cybercrime Law','mandatory':'Y','notes':''},
            {'code':'CBOS-AML-REGS','name_en':'CBOS AML Regulations','mandatory':'Y','notes':'FATF baseline'},
            {'code':'SD-TELECOM-LAW','name_en':'Sudan Telecom Law','mandatory':'Y','notes':''},
        ],
        'key_risk':'Active conflict · Financial sanctions · Minimal enforcement · FATF watchlist',
        'intl_baseline':'FATF · ISO 27001',
    },
    {
        'iso':'LY','flag':'🇱🇾','name_en':'Libya','name_ar':'ليبيا',
        'status':'FRAGILE_DUAL_GOVERNMENT',
        'regulators':[
            {'code':'CBL','name_en':'Central Bank of Libya','sector':'Financial','tier':'T3','notes':'Dual-government context'},
            {'code':'GACIT','name_en':'General Authority Comm. & IT','sector':'ICT/Telecom','tier':'T3','notes':'Limited capacity'},
        ],
        'frameworks':[
            {'code':'LY-CYBERCRIME-LAW','name_en':'Libya Cybercrime Law','mandatory':'Y','notes':''},
            {'code':'CBL-AML-REGS','name_en':'CBL AML Regulations','mandatory':'Y','notes':'FATF baseline'},
            {'code':'LY-TELECOM-LAW','name_en':'Libya Telecom Law','mandatory':'Y','notes':''},
        ],
        'key_risk':'Dual-government · UN arms embargo · Minimal digital governance · FATF monitoring',
        'intl_baseline':'FATF · ISO 27001',
    },
]

# ─── International Bodies ─────────────────────────────────────────────────────
INTL_BODIES = [
    {'code':'FATF-REC-2023','name_en':'FATF 40 Recommendations (2023)','body':'FATF','type':'HARD_LAW','applies':'All 18','controls':40,'notes':'AML/CFT – mandatory adoption via national law across all countries'},
    {'code':'FATF-VAs','name_en':'FATF Virtual Asset Standards (R.15)','body':'FATF','type':'HARD_LAW','applies':'All 18','controls':25,'notes':'Travel Rule + VASP licensing'},
    {'code':'BCBS-BASEL3','name_en':'Basel III Capital Requirements (BCBS)','body':'BIS/BCBS','type':'INTL_STANDARD','applies':'All 18 – Banks','controls':75,'notes':'Capital adequacy, LCR, NSFR'},
    {'code':'BCBS-BASEL4','name_en':'Basel IV (FRTB + CR Output Floor)','body':'BIS/BCBS','type':'INTL_STANDARD','applies':'All 18 – Banks','controls':50,'notes':'Full implementation 2025-2028'},
    {'code':'IOSCO-PRINCIPLES','name_en':'IOSCO Principles for Securities Regulation','body':'IOSCO','type':'INTL_STANDARD','applies':'All 18 – Capital Markets','controls':38,'notes':'Investor protection, market integrity'},
    {'code':'AAOIFI-SS','name_en':'AAOIFI Sharia Standards (Islamic Finance)','body':'AAOIFI','type':'INTL_STANDARD','applies':'GCC + MENA (Islamic finance)','controls':60,'notes':'60 standards covering murabaha, sukuk, takaful etc.'},
    {'code':'IFSB-17','name_en':'IFSB Core Principles for Islamic Banking','body':'IFSB','type':'INTL_STANDARD','applies':'GCC + MENA','controls':29,'notes':'Bank supervision in Islamic finance context'},
    {'code':'SWIFT-CSP-2024','name_en':'SWIFT Customer Security Programme 2024','body':'SWIFT','type':'MANDATORY_TECHNICAL','applies':'All SWIFT members','controls':31,'notes':'31 controls; 23 mandatory. Annual self-attestation required'},
    {'code':'ISO-27001-2022','name_en':'ISO/IEC 27001:2022 – ISMS','body':'ISO/IEC','type':'INTL_STANDARD','applies':'All 18','controls':93,'notes':'Annex A: 93 controls in 4 themes. Widely mandated by regulators across all countries'},
    {'code':'ISO-27701','name_en':'ISO/IEC 27701 – Privacy Information Management','body':'ISO/IEC','type':'INTL_STANDARD','applies':'All 18','controls':49,'notes':'Extension to ISO 27001 for privacy (GDPR/PDPL alignment)'},
    {'code':'ISO-27017','name_en':'ISO/IEC 27017 – Cloud Security Controls','body':'ISO/IEC','type':'INTL_STANDARD','applies':'All 18','controls':37,'notes':'Cloud-specific guidance; 37 additional controls'},
    {'code':'ISO-27018','name_en':'ISO/IEC 27018 – PII in Public Cloud','body':'ISO/IEC','type':'INTL_STANDARD','applies':'All 18','controls':25,'notes':'Personally identifiable information in cloud'},
    {'code':'IEC-62443','name_en':'IEC 62443 OT/ICS Security Series','body':'IEC','type':'INTL_STANDARD','applies':'All 18 (CNI/OT)','controls':200,'notes':'4-part series for OT/ICS/SCADA security – critical for HC IoT, energy, utilities'},
    {'code':'NIST-CSF-2-0','name_en':'NIST Cybersecurity Framework v2.0','body':'NIST','type':'VOLUNTARY_BENCHMARK','applies':'All 18 (de facto mandatory in GCC+US)','controls':106,'notes':'6 functions: Govern/Identify/Protect/Detect/Respond/Recover'},
    {'code':'NIST-SP-800-53-R5','name_en':'NIST SP 800-53 Rev.5','body':'NIST','type':'MANDATORY_US_GOV','applies':'USA federal; benchmark elsewhere','controls':1100,'notes':'Comprehensive control catalog used globally as reference'},
    {'code':'PCI-DSS-4','name_en':'PCI DSS v4.0','body':'PCI SSC','type':'MANDATORY_TECHNICAL','applies':'All 18 (card payment)','controls':300,'notes':'300+ requirements for cardholder data protection. Mandatory for card brands'},
    {'code':'IFRS-ALL','name_en':'IFRS Standards (IASB)','body':'IASB','type':'INTL_STANDARD','applies':'All 18 (listed cos.)','controls':0,'notes':'Financial reporting standards; required for listed companies in GCC'},
    {'code':'GCC-AML-UNIFIED','name_en':'GCC Unified AML/CFT Framework','body':'GCC Secretariat','type':'REGIONAL','applies':'GCC 6 only','controls':30,'notes':'Harmonisation layer on top of national FATF implementations'},
    {'code':'EU-GDPR','name_en':'EU GDPR 2016/679','body':'EU','type':'HARD_LAW','applies':'Cyprus + cross-border EU ops','controls':71,'notes':'Applies extraterritorially to any org processing EU citizen data'},
    {'code':'EU-NIS2','name_en':'EU NIS2 Directive 2022/2555','body':'EU','type':'HARD_LAW','applies':'Cyprus + EU-connected entities','controls':85,'notes':'Oct 2024 deadline; enhanced critical entity requirements'},
    {'code':'EU-DORA','name_en':'EU DORA 2022/2554','body':'EU','type':'HARD_LAW','applies':'Cyprus + UK/US EU-operating firms','controls':100,'notes':'Jan 2025 in force; ICT risk, 3rd-party oversight, incident reporting'},
    {'code':'EU-AI-ACT-2024','name_en':'EU AI Act 2024','body':'EU','type':'HARD_LAW','applies':'Cyprus + all orgs using AI in EU','controls':50,'notes':'Risk-tiered AI regulation; Aug 2024 entry into force; phased timeline'},
]


# ═══════════════════════════════════════════════════════════════════════════════
#  BUILD THE WORKBOOK
# ═══════════════════════════════════════════════════════════════════════════════

def build():
    print(f"📂 Loading source: {SRC}")
    shutil.copy2(SRC, DST)
    wb = load_workbook(DST)
    print(f"✅ Copied. Existing sheets: {len(wb.worksheets)}")

    # ── Add country sheets ──
    country_order = ['UAE','QAT','BHR','KWT','OMN','JOR','EGY','TUR','CYP','GBR','USA']
    for key in country_order:
        data = COUNTRIES[key]
        print(f"   📋 Building sheet: {data['flag']} {data['name_en']}")
        write_country_sheet(wb, data)

    # ── Fragile States sheet ────────────────────────────────────────────────
    print("   ⚠️  Building Fragile States sheet")
    ws_frag = wb.create_sheet(title='⚠️ Fragile States')
    ws_frag.sheet_view.showGridLines = False
    ws_frag.merge_cells('A1:K1')
    c = ws_frag['A1']
    c.value = '⚠️  FRAGILE & CONFLICT-AFFECTED STATES — Regulatory Intelligence (Limited Coverage)'
    c.font = Font(name='Calibri', size=13, bold=True, color='FFFFFFFF')
    c.fill = fill('FF7F8C8D')
    c.alignment = ALIGN_L

    row = 2
    # Summary header for fragile states
    write_header_row(ws_frag, row, [
        'Flag','ISO','Country','Status','Primary Regulator',
        'Regulator Count','Framework Count',
        'Key Risks','International Baseline','Coverage Depth'
    ], '7F8C8D')
    row += 1
    for fs in FRAGILE_STATES:
        write_data_row_colored(ws_frag, row, [
            fs['flag'], fs['iso'], fs['name_en'], fs['status'],
            fs['regulators'][0]['code'],
            len(fs['regulators']), len(fs['frameworks']),
            fs['key_risk'], fs['intl_baseline'], 'MINIMAL'
        ], C['FRAGILE_ROW'])
        row += 1

    row += 2
    # Detail per fragile state
    for fs in FRAGILE_STATES:
        write_section_banner(ws_frag, row, f"  {fs['flag']} {fs['name_en']} ({fs['iso']})  ·  Status: {fs['status']}", 'FF6C757D', ncols=11)
        row += 1
        write_header_row(ws_frag, row, ['Code','Name','Sector','Tier','Notes','','','','','',''], '7F8C8D')
        row += 1
        for i, reg in enumerate(fs['regulators']):
            write_data_row(ws_frag, row, [
                reg['code'], reg['name_en'], reg['sector'], reg['tier'],
                reg.get('notes',''), '', '', '', '', '', ''
            ], alt=(i%2==0))
            row += 1
        row += 1
        write_header_row(ws_frag, row, ['Framework Code','Name','Mandatory','Notes','','','','','','',''], '7F8C8D')
        row += 1
        for i, fw in enumerate(fs['frameworks']):
            write_data_row(ws_frag, row, [
                fw['code'], fw['name_en'], fw['mandatory'],
                fw.get('notes',''), '', '', '', '', '', '', ''
            ], alt=(i%2==0))
            row += 1
        row += 1

    set_col_widths(ws_frag, [8,6,22,22,22,12,14,45,35,14,10])

    # ── International Bodies sheet ──────────────────────────────────────────
    print("   🌐 Building International Bodies sheet")
    ws_intl = wb.create_sheet(title='🌐 International Bodies')
    ws_intl.sheet_view.showGridLines = False
    ws_intl.merge_cells('A1:K1')
    c = ws_intl['A1']
    c.value = '🌐  INTERNATIONAL REGULATORY BODIES & FRAMEWORKS — GCC + Global Applicability'
    c.font = Font(name='Calibri', size=13, bold=True, color='FFFFFFFF')
    c.fill = fill(C['INTL'])
    c.alignment = ALIGN_L
    write_header_row(ws_intl, 2, [
        'Framework Code','Name (EN)','Issuing Body','Type',
        'Applies To','Control Count','Mandatory?',
        'Cross-border?','Shahin-Ai Ready?','Notes',''
    ], C['INTL'])
    for i, body in enumerate(INTL_BODIES):
        mandatory = 'Y' if body['type'] in ('HARD_LAW','MANDATORY_TECHNICAL','MANDATORY_US_GOV') else 'P' if body['type']=='VOLUNTARY_BENCHMARK' else 'Y'
        bg = C['MANDATORY'] if mandatory=='Y' else C['VOLUNTARY']
        write_data_row_colored(ws_intl, i+3, [
            body['code'], body['name_en'], body['body'],
            body['type'], body['applies'], body['controls'],
            mandatory, 'Y', 'Y', body['notes'], ''
        ], bg)
    set_col_widths(ws_intl, [24,52,16,24,40,14,12,14,16,60,10])

    # ── Global Framework × Country Matrix ──────────────────────────────────
    print("   📊 Building Global Coverage Matrix sheet")
    ws_mat = wb.create_sheet(title='Global Coverage Matrix')
    ws_mat.sheet_view.showGridLines = False
    country_cols = [
        ('🇸🇦','SA'), ('🇦🇪','AE'), ('🇶🇦','QA'), ('🇧🇭','BH'), ('🇰🇼','KW'), ('🇴🇲','OM'),
        ('🇯🇴','JO'), ('🇪🇬','EG'), ('🇹🇷','TR'), ('🇨🇾','CY'),
        ('🇸🇾','SY'), ('🇮🇶','IQ'), ('🇱🇧','LB'), ('🇵🇸','PS'), ('🇸🇩','SD'), ('🇱🇾','LY'),
        ('🇬🇧','GB'), ('🇺🇸','US'),
    ]
    # Header
    ws_mat.cell(1,1,'Framework / Country').font = FONT_HDR
    ws_mat.cell(1,1).fill = fill('FF1A237E')
    ws_mat.cell(1,1).alignment = ALIGN_C
    ws_mat.cell(1,2,'Domain').font = FONT_HDR
    ws_mat.cell(1,2).fill = fill('FF1A237E')
    ws_mat.cell(1,2).alignment = ALIGN_C
    for ci, (flag, iso) in enumerate(country_cols):
        cell = ws_mat.cell(1, ci+3, f"{flag}\n{iso}")
        cell.fill = fill('FF1A237E')
        cell.font = FONT_HDR
        cell.alignment = ALIGN_C
        cell.border = thin_border()

    # Key frameworks x countries applicability
    coverage_matrix = [
        # (framework code, domain, SA,AE,QA,BH,KW,OM,JO,EG,TR,CY,SY,IQ,LB,PS,SD,LY,GB,US)
        ('FATF-REC-2023','AML/CFT','Y','Y','Y','Y','Y','Y','Y','Y','Y','Y','P','P','P','P','P','P','Y','Y'),
        ('ISO-27001-2022','ISMS','Y','Y','Y','Y','Y','Y','Y','Y','Y','Y','P','P','P','P','P','P','Y','Y'),
        ('PCI-DSS-4','Payments','Y','Y','Y','Y','Y','Y','Y','Y','Y','Y','P','P','P','P','P','P','Y','Y'),
        ('BCBS-BASEL3','Banking','Y','Y','Y','Y','Y','Y','Y','Y','Y','Y','N','P','P','P','N','N','Y','Y'),
        ('IOSCO-PRINCIPLES','Capital Markets','Y','Y','Y','Y','Y','Y','Y','Y','Y','Y','N','P','P','P','N','N','Y','Y'),
        ('SWIFT-CSP-2024','Financial Messaging','Y','Y','Y','Y','Y','Y','Y','Y','Y','Y','P','P','P','P','P','P','Y','Y'),
        ('IEC-62443','OT/ICS Security','Y','Y','Y','Y','Y','Y','P','P','P','P','N','P','N','N','N','N','Y','Y'),
        ('NIST-CSF-2-0','Cybersecurity','Y','Y','Y','Y','Y','Y','Y','Y','Y','Y','P','P','P','P','P','P','Y','Y'),
        ('AAOIFI-SS','Islamic Finance','Y','Y','Y','Y','Y','Y','Y','Y','P','N','P','P','P','P','P','P','P','N'),
        ('ISO-27701','Privacy ISMS','Y','Y','Y','Y','Y','Y','Y','Y','Y','Y','P','P','P','P','P','P','Y','Y'),
        ('EU-GDPR','Data Privacy (EU)','N','N','N','N','N','N','N','N','N','Y','N','N','N','N','N','N','N','N'),
        ('EU-NIS2','Cyber (EU)','N','N','N','N','N','N','N','N','N','Y','N','N','N','N','N','N','N','N'),
        ('EU-DORA','Fin. Resilience (EU)','N','N','N','N','N','N','N','N','N','Y','N','N','N','N','N','N','P','N'),
        ('EU-AI-ACT-2024','AI Governance','N','N','N','N','N','N','N','N','N','Y','N','N','N','N','N','N','P','N'),
        ('GCC-AML-UNIFIED','GCC AML','Y','Y','Y','Y','Y','Y','N','N','N','N','N','N','N','N','N','N','N','N'),
        ('NCA-ECC-2:2024','Cybersecurity (KSA)','Y','N','N','N','N','N','N','N','N','N','N','N','N','N','N','N','N','N'),
        ('NIST-SP-800-53-R5','US Gov. Controls','N','N','N','N','N','N','N','N','N','N','N','N','N','N','N','N','N','Y'),
        ('HIPAA-HITECH','Healthcare Privacy','N','N','N','N','N','N','N','N','N','N','N','N','N','N','N','N','N','Y'),
        ('NY-DFS-23-NYCRR-500','Financial Cyber(NY)','N','N','N','N','N','N','N','N','N','N','N','N','N','N','N','N','N','Y'),
    ]
    colour_map = {'Y': 'FFE8F5E9', 'P': 'FFFFF9C4', 'N': 'FFFCE4EC'}
    for ri, row_data in enumerate(coverage_matrix):
        fw_code, domain = row_data[0], row_data[1]
        applicability = row_data[2:]
        ws_mat.cell(ri+2, 1, fw_code).font = FONT_BODY
        ws_mat.cell(ri+2, 1).border = thin_border()
        ws_mat.cell(ri+2, 2, domain).font = FONT_BODY
        ws_mat.cell(ri+2, 2).border = thin_border()
        for ci, val in enumerate(applicability):
            cell = ws_mat.cell(ri+2, ci+3, val)
            cell.fill = fill(colour_map.get(val,'FFFFFFFF'))
            cell.font = FONT_BODY
            cell.alignment = ALIGN_C
            cell.border = thin_border()
    ws_mat.column_dimensions['A'].width = 26
    ws_mat.column_dimensions['B'].width = 22
    for i in range(len(country_cols)):
        ws_mat.column_dimensions[get_column_letter(i+3)].width = 7
    ws_mat.row_dimensions[1].height = 40

    # ── Legend note ──
    legend_row = len(coverage_matrix) + 4
    ws_mat.cell(legend_row, 1, 'LEGEND:  Y = Mandatory/Directly Applicable   ·   P = Partially/Voluntary Benchmark   ·   N = Not Applicable').font = Font(name='Calibri', size=9, italic=True, color='FF555555')

    print(f"\n💾 Saving to: {DST}")
    wb.save(DST)
    print(f"✅ Done! Total sheets: {len(wb.worksheets)}")

    # Summary
    total_regs = sum(len(c['regulators']) for c in COUNTRIES.values())
    total_fws  = sum(len(c['frameworks'])  for c in COUNTRIES.values())
    fragile_regs = sum(len(f['regulators']) for f in FRAGILE_STATES)
    fragile_fws  = sum(len(f['frameworks'])  for f in FRAGILE_STATES)
    print(f"\n📊 Content Summary:")
    print(f"   Countries (full sheets): {len(COUNTRIES)}")
    print(f"   Fragile states: {len(FRAGILE_STATES)}")
    print(f"   International bodies/frameworks: {len(INTL_BODIES)}")
    print(f"   Total regulators (excl. KSA + fragile): {total_regs + fragile_regs}")
    print(f"   Total frameworks (excl. KSA): {total_fws + fragile_fws + len(INTL_BODIES)}")
    print(f"   Excel sheets: {len(wb.worksheets)}")


if __name__ == '__main__':
    build()
