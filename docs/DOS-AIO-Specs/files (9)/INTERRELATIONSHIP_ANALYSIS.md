# 🔗 GRC Interrelationship & Interdependency Analysis
## Comprehensive Multi-Dimensional Mapping for Saudi Arabia
### Frameworks × Sectors × Org Types × Sizes × Ownership × Business Models × Controls × Evidence × Risk

---

## 📊 EXECUTIVE SUMMARY

This document provides a comprehensive analysis of how **nine governance dimensions** interrelate in the Saudi Arabian regulatory landscape. The dimensions don't operate in isolation — they form a complex interdependency graph where a change in any one dimension cascades through all the others.

### The Nine Governance Dimensions

```
                    ┌─────────────────────────┐
                    │    REGULATORY           │
                    │    FRAMEWORKS (42)      │
                    └──────────┬──────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
   ┌────▼──────┐         ┌─────▼────┐          ┌─────▼──────┐
   │  SECTOR   │         │   ORG     │          │  BUSINESS  │
   │  (25)     │         │  TYPE     │          │   MODEL    │
   └────┬──────┘         │  (17)     │          │   (12)     │
        │                └─────┬────┘          └─────┬──────┘
        │                      │                     │
        │                      │                     │
   ┌────▼────────────────────▼──────────────────────▼─────┐
   │                                                       │
   │              ORGANIZATION INSTANCE                    │
   │                                                       │
   │  + SIZE (Monsha'at: Micro/Small/Medium/Large/Ent)     │
   │  + OWNERSHIP (Saudi/Foreign/Listed/PIF/Govt)          │
   │                                                       │
   └────┬───────────────────┬───────────────────┬─────────┘
        │                   │                   │
   ┌────▼──────┐      ┌────▼─────┐        ┌────▼──────┐
   │ CONTROLS  │      │ EVIDENCE  │        │   RISK    │
   │           │◄────►│           │◄──────►│           │
   └────┬──────┘      └───────────┘        └───────────┘
        │
   ┌────▼─────────────┐
   │   LIFECYCLE       │ ← Each evidence has a lifecycle
   │   (12 stages)     │
   └───────────────────┘
```

---

## 🧩 PART 1: HOW THE DIMENSIONS INFLUENCE EACH OTHER

### 1.1 The Causal Chain

A real organization's compliance obligations are determined by a **layered causal chain**:

```
  SECTOR ──► determines PRIMARY REGULATOR ──► sets MANDATORY frameworks
     │
     ├──► OWNERSHIP ──► adds disclosure/governance frameworks (CMA if listed, DGA if govt)
     │
     ├──► BUSINESS MODEL ──► adds protocol-specific frameworks (PCI-DSS if cards, ISO27017 if cloud)
     │
     ├──► SIZE ──► determines THRESHOLDS (light/full-scope, audit cycle, license tier)
     │
     └──► ORG TYPE ──► determines AUDIT FREQUENCY and SCRUTINY LEVEL

           │
           ▼
  Total Applicable Frameworks
           │
           ▼
  Required Controls (sum of all framework controls, deduplicated)
           │
           ▼
  Evidence Requirements (per control × frequency × retention)
           │
           ▼
  Risk Assessment (inherent → controls → residual per control)
           │
           ▼
  Lifecycle Management (collection → review → retention → disposal)
```

### 1.2 Real-World Cascade Example: A Saudi Mid-Size FinTech

Consider a hypothetical: **"NeoPay" — a Saudi LLC with 80 employees, payment services, B2C mobile app, majority Saudi-owned, processing 2M transactions/year**

| Dimension | Value | What It Triggers |
|-----------|-------|------------------|
| **Sector** | FinTech / Payment | NCA-ECC, SAMA-CSF, SAMA-PSR, PDPL |
| **Size** | Medium (50-249 employees) | Full Saudization quotas (Silver tier); medium-tier ZATCA filing |
| **Org Type** | LLC | Companies Law M/132 standard requirements |
| **Business Model** | B2C Payment | + PCI-DSS Level 2 (1M-6M tx); + MoCI Consumer Protection |
| **Ownership** | Majority Saudi-Owned | Standard scrutiny; no foreign parent group policies |
| **Result** | **11 mandatory + 5 conditional + 4 voluntary frameworks** | Approximately **400+ controls** to implement |

The same business operating as:
- **Foreign-owned subsidiary** → adds parent-group ISO 27001, possibly GDPR compliance
- **Listed on Tadawul** → adds CMA-CG, CMA-IC, CMA-DISCLOSURE = **+85 controls**
- **PIF-owned** → adds DGA-DCC governance = **+70 controls** + quarterly audits

---

## 📐 PART 2: SECTOR × FRAMEWORK MATRIX

### 2.1 The Master Matrix (Mandatory Frameworks Only)

| Sector | Cyber | Privacy | Financial | Tax | Sector-Specific | Labor | Companies |
|--------|-------|---------|-----------|-----|-----------------|-------|-----------|
| **Banking** | NCA-ECC, NCNICC | PDPL | SAMA-CSF, SAMA-AML, SAMA-ITGF, SAMA-BCM | ZATCA-EINV, VAT | — | MHRSD-LABOR, Saudization | M/132 |
| **Insurance** | NCA-ECC, NCNICC | PDPL | SAMA-CSF, SAMA-AML, SAMA-ITGF | ZATCA-EINV, VAT | — | MHRSD-LABOR, Saudization | M/132 |
| **Capital Markets** | NCA-ECC, NCNICC | PDPL | — | ZATCA-EINV, VAT | CMA-CG, CMA-IC, CMA-DISCLOSURE | MHRSD-LABOR, Saudization | M/132 |
| **FinTech** | NCA-ECC, NCA-CCC, NCNICC | PDPL | SAMA-CSF, SAMA-PSR | ZATCA-EINV | MoCI-ECOM, MoCI-Consumer | MHRSD-LABOR | M/132 |
| **Payment Svc** | NCA-ECC, NCNICC | PDPL | SAMA-CSF, SAMA-PSR, SAMA-AML, **PCI-DSS** | ZATCA-EINV | MoCI-Consumer | MHRSD-LABOR | M/132 |
| **Healthcare** | NCA-ECC, NCNICC | PDPL | — | ZATCA-EINV | MOH-HIS, MOH-Patient Safety, CBAHI | MHRSD-LABOR, Saudization | M/132 |
| **Pharma** | NCA-ECC, NCNICC | PDPL | — | ZATCA-EINV, VAT | SFDA-Pharma (GMP) | MHRSD-LABOR, Saudization | M/132 |
| **Govt** | NCA-ECC, NCA-CSCC | PDPL | — | — | DGA-DCC, NDMO-DM | MHRSD-LABOR | — |
| **Telecom** | NCA-ECC, NCA-CSCC, NCNICC | PDPL | — | ZATCA-EINV, VAT | CST-CRF | MHRSD-LABOR, Saudization | M/132 |
| **Cloud/IT** | NCA-ECC, NCA-CCC, NCNICC | PDPL | — | ZATCA-EINV | CST-CLOUD | MHRSD-LABOR | M/132 |
| **Energy** | NCA-ECC, NCA-CSCC, **NCA-OTCC**, NCNICC | PDPL | — | ZATCA-EINV, VAT | — | MHRSD-LABOR, Saudization | M/132 |
| **Retail** | NCA-ECC | PDPL | — | ZATCA-EINV, VAT | MoCI-Consumer | MHRSD-LABOR, Saudization | M/132 |
| **E-Commerce** | NCA-ECC | PDPL | — | ZATCA-EINV, VAT | MoCI-ECOM, MoCI-Consumer | MHRSD-LABOR, Saudization | M/132 |
| **Manufacturing** | NCA-ECC | PDPL | — | ZATCA-EINV, VAT | — | MHRSD-LABOR, Saudization | M/132 |
| **Tourism** | NCA-ECC | PDPL | — | ZATCA-EINV, VAT | MoCI-Consumer | MHRSD-LABOR, Saudization | M/132 |
| **Education** | NCA-ECC | PDPL | — | — | — | MHRSD-LABOR, Saudization | M/132 |

### 2.2 Key Patterns

**Universal Frameworks (apply to virtually every entity):**
- 🔒 **NCA-ECC** + **NCNICC** (effective Jan 2026) — All sectors
- 🔐 **PDPL** — Anyone processing personal data
- 📋 **MOCI-COMPANIES (M/132)** — Every commercial entity
- 👷 **MHRSD-LABOR** — Every employer
- 💰 **ZATCA-EINV/VAT** — Every VAT-registered business

**Sector-Exclusive Frameworks:**
- **SAMA-CSF/AML/PSR** — Only SAMA-licensed
- **CMA-CG/IC** — Only Tadawul-listed
- **MOH/SFDA/CBAHI** — Only healthcare/pharma
- **NCA-OTCC** — Only ICS/OT operators (energy, manufacturing, utilities)
- **NCA-CSCC** — Only critical systems operators
- **CST-CRF/CLOUD** — Only telecom/cloud providers

---

## 🏢 PART 3: ORGANIZATION SIZE × FRAMEWORK THRESHOLDS

### 3.1 KSA SME Definition (Monsha'at)

| Size | Employees | Annual Revenue (SAR) | % of KSA Businesses |
|------|-----------|---------------------|---------------------|
| **Micro** | 1-5 | ≤ 3,000,000 | ~67% |
| **Small** | 6-49 | ≤ 40,000,000 | ~28% |
| **Medium** | 50-249 | ≤ 200,000,000 | ~4% |
| **Large** | 250-999 | > 200,000,000 | ~0.8% |
| **Enterprise** | 1,000+ | varies (typically > SAR 1B) | ~0.2% |

### 3.2 How Size Affects Framework Application

| Framework | Micro (1-5) | Small (6-49) | Medium (50-249) | Large (250+) | Enterprise (1000+) |
|-----------|-------------|--------------|------------------|--------------|--------------------|
| **PDPL** | ✅ Same scope | ✅ Same scope | ✅ Same scope | ✅ + DPO likely required | ✅ + DPO mandatory |
| **NCA-ECC** | Light scope | Standard | Full | Full + maturity 4 | Full + maturity 4-5 |
| **NCNICC** | ✅ Mandatory | ✅ Mandatory | ✅ Mandatory | ✅ Mandatory | ✅ Mandatory |
| **ZATCA-VAT** | ⚠️ Threshold: SAR 375K rev | ✅ Mandatory | ✅ Mandatory | ✅ Mandatory | ✅ Mandatory |
| **ZATCA-EINV** | ✅ All VAT-registered | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Saudization (Nitaqat)** | Bronze, exemptions for <5 | Bronze tier | Silver tier | Gold tier | Platinum tier |
| **CMA-CG** | ❌ N/A unless listed | ❌ N/A unless listed | ❌ N/A unless listed | ✅ If listed | ✅ If listed |
| **PCI-DSS** | SAQ A (Level 4) | SAQ A/B (Level 3-4) | SAQ + ASV (Level 2-3) | Full ROC + QSA (Level 1) | Full ROC + QSA (Level 1) |
| **SAMA-CSF** | If SAMA-licensed: full | Full | Full | Full + maturity 4 | Full + maturity 4-5 |
| **ISO 27001** | Voluntary, narrow ISMS scope | Voluntary | Often required by clients | Often required | Often required |

### 3.3 The Saudization Tiered Impact (Critical for Operations)

Nitaqat is **size-dependent and sector-dependent** — the most operationally significant size-based regulation:

```
Micro (<5 employees)
  └─ Exempt from most quotas; report only
  
Small (6-49 employees)  
  └─ Bronze tier minimums; 10-15% Saudization typical
  
Medium (50-249 employees)
  └─ Silver tier; 15-30% Saudization typical
  └─ + Specific role nationalization (HR managers, Cybersecurity managers per NCA ECC 1-2-3)
  
Large (250+ employees)
  └─ Gold tier; 30-40% Saudization
  └─ + Specific functions 100% Saudi-only
  
Enterprise (1000+ employees)
  └─ Platinum tier (highest)
  └─ Sector-specific quotas (e.g., banking branches 95%+ Saudi)
```

---

## 🏛️ PART 4: ORGANIZATION TYPE × SCRUTINY LEVEL

### 4.1 Type-Based Regulatory Differences

| Org Type | Primary Frameworks | Audit Frequency | Disclosure Burden |
|----------|---------------------|-----------------|---------------------|
| **Government Ministry** | NCA-ECC, DGA-DCC, NDMO-DM | Continuous + Annual NCA | High (gov transparency) |
| **Government Authority** | NCA-ECC, DGA-DCC, NDMO-DM | Continuous + Annual NCA | High |
| **State-Owned Enterprise** | NCA-ECC, sector frameworks | Quarterly | High |
| **PIF-Owned Entity** | NCA-ECC, sector + DGA-DCC | Annual + Spot | High |
| **Listed JSC (Tadawul)** | Full sector + CMA-CG, CMA-IC, CMA-DISCLOSURE | Quarterly + Annual | **Highest** (continuous disclosure) |
| **Closed JSC** | Sector frameworks + Companies Law | Annual | Moderate |
| **LLC** | Sector frameworks + Companies Law | Annual | Standard |
| **Simplified JSC** | Sector frameworks + lighter Companies Law | Annual | Standard |
| **Sole Proprietorship** | Sector frameworks (light) | Annual or risk-based | Light |
| **Foreign Branch** | Sector + parent group policies | Annual | Standard + parent reqs |
| **RHQ (Regional HQ)** | Special tax/regulatory regime | Annual | Special RHQ reporting |
| **Joint Venture** | Sector + JV agreement-driven | Annual | Per JV terms |
| **Non-Profit** | Lighter; charity regulations | Annual | Donor reporting |
| **CNI Operator** | NCA-CSCC + sector + NCNICC | **Continuous + Quarterly NCA** | High |

### 4.2 Critical Observation: CNI Status Overrides Everything

A Critical National Infrastructure (CNI) designation by NCA changes the picture dramatically:

```
Standard Telecom Operator  →  20 frameworks, 350 controls
SAME Operator Designated CNI  →  +NCA-CSCC, +OTCC, +continuous monitoring
                                =  ~28 frameworks, 600+ controls
```

CNI sectors per Royal Decree: Energy, Water, Telecom, Banking, Healthcare (critical), Government services, Transport (critical), Food security.

---

## 💼 PART 5: BUSINESS MODEL × ADDITIONAL FRAMEWORKS

The business model layer adds frameworks **on top of** sector requirements:

| Business Model | Additional Frameworks | Why |
|----------------|----------------------|-----|
| **B2C** | + MoCI Consumer Protection, + PCI-DSS (if cards) | Consumer protection law applies; payment data protection |
| **B2B** | (no additions, contract-driven) | Sophisticated counterparties, NDAs govern |
| **B2G** | + DGA-DCC, + NDMO-DM | Government data handling rules |
| **B2B2C / Marketplace** | + MoCI-ECOM, + MoCI-Consumer, + PCI-DSS, + PDPL emphasis on platform liability | Platform must protect both seller and buyer |
| **C2C Platform** | + MoCI-ECOM, + MoCI-Consumer, + PDPL | Same as marketplace + KYC for sellers |
| **SaaS** | + NCA-CCC, + CST-CLOUD, + ISO 27017, + ISO 27018, + SOC 2 | Multi-tenant, data residency, processor obligations |
| **FinTech** | + SAMA-CSF, + SAMA-PSR, + PCI-DSS | Financial services regulation |
| **Manufacturing** | + NCA-OTCC | OT/ICS systems |
| **Franchise** | + MoCI Consumer (franchisor liability) | Special franchise disclosure |

### 5.1 Real Example: How Business Model Cascades

**An LLC selling clothing**:
- Pure B2B wholesale → 8 frameworks
- Add B2C retail → +MoCI-Consumer (~10 frameworks)
- Add e-commerce → +MoCI-ECOM, more PDPL emphasis (~12 frameworks)
- Add international payments → +PCI-DSS (~13 frameworks)
- Add cross-border → +PDPL Art-29 transfer requirements + SCCs

---

## 👑 PART 6: OWNERSHIP STRUCTURE × OBLIGATIONS

### 6.1 Ownership Adds Layers

| Ownership | Frameworks Added | Scrutiny | Audit Frequency |
|-----------|------------------|----------|------------------|
| **100% Saudi (Standard)** | Base frameworks only | Standard | Annual |
| **Family-Owned** | Base + governance considerations | Standard | Annual |
| **PIF-Owned** | + DGA-DCC, + governance frameworks | High | Annual + Spot |
| **Government-Owned** | + DGA-DCC, + NDMO-DM, + transparency | Highest | Quarterly |
| **Listed on Tadawul** | + CMA-CG, + CMA-IC, + CMA-DISCLOSURE | High | Quarterly |
| **Foreign Subsidiary** | Parent compliance (often + ISO 27001, + GDPR if EU parent, + SOX if US parent) | Moderate | Annual |
| **Joint Venture** | JV agreement determines | Standard | Per JV terms |
| **MISA-licensed Foreign** | + MISA reporting | Moderate | Annual + MISA |

### 6.2 The Foreign-Owned Multiplier Effect

A foreign-owned KSA subsidiary often faces **double compliance**:

```
KSA Frameworks (sector-required):  ~12 frameworks
+ Parent Group Policies typically include:
  - ISO 27001 (group ISMS)
  - GDPR (if EU parent or EU customers)
  - SOX (if US-listed parent)
  - HIPAA (if US healthcare parent)
  - Group Code of Conduct
  - Group Anti-Bribery (UKBA, FCPA)
  
Total often: 18-25 frameworks
```

---

## 🎯 PART 7: INTERSECTION POINT — WHO NEEDS WHAT?

### 7.1 Persona-Based Compliance Mapping

**Persona 1: A Micro Healthcare Clinic**
- Sole Proprietorship, 3 doctors, ~SAR 2M revenue
- B2C medical services, Saudi-owned
- **Frameworks:** NCA-ECC (light scope), PDPL, MOH-HIS, MOH-Patient Safety, MoCI-Companies, MHRSD-Labor, ZATCA-EINV (if VAT)
- **Mandatory:** ~10 frameworks
- **Key Evidence:** Privacy Notice, EMR, Clinical Audit, Saudization report, VAT returns

**Persona 2: A Mid-Size FinTech**
- LLC, 80 employees, payment app, B2C, Saudi-owned
- **Frameworks:** NCA-ECC, NCA-CCC, NCNICC, PDPL, SAMA-CSF, SAMA-PSR, PCI-DSS, MoCI-ECOM, MoCI-Consumer, ZATCA-EINV, MOCI-Companies, MHRSD-Labor, Saudization
- **Mandatory:** ~13 frameworks
- **Key Evidence:** SAMA license, payment gateway certification, PCI AOC, customer MFA records, 4-hour incident reports

**Persona 3: A Tadawul-Listed Saudi Bank**
- JSC Listed, 5,000+ employees, full banking services, B2B + B2C
- **Frameworks:** NCA-ECC, NCNICC, NCA-CSCC (if CNI), PDPL, SAMA-CSF, SAMA-AML, SAMA-PSR, SAMA-ITGF, SAMA-BCM, CMA-CG, CMA-IC, CMA-DISCLOSURE, PCI-DSS, SWIFT-CSP, ZATCA-EINV, ZATCA-VAT, MOCI-Companies, MHRSD-Labor, Platinum Saudization
- **Mandatory:** ~19+ frameworks
- **Key Evidence:** Annual Pillar 3 disclosures, ICAAP, AML quarterly reports, board cyber attestation, 4-hour SAMA notification log

**Persona 4: A Government Ministry**
- Government entity, 2,000 employees, public service
- **Frameworks:** NCA-ECC, NCA-CSCC, NCA-OTCC (if applicable), NCNICC, PDPL, DGA-DCC, NDMO-DM, MHRSD-Labor
- **Mandatory:** ~8-10 frameworks  
- **Key Evidence:** Annual NCA self-assessment, NDMO data catalog, government data classification, transparency reports

**Persona 5: A Foreign-Owned SaaS Provider in KSA**
- Wholly-owned KSA subsidiary of EU parent, 25 employees
- B2B SaaS, customer data hosted partially in EU
- **KSA Frameworks:** NCA-ECC, NCA-CCC, NCNICC, PDPL, CST-CLOUD, MoCI-Companies, MHRSD-Labor, ZATCA-EINV
- **+ Parent group policies:** GDPR (EU), ISO 27001 (group), SOC 2 Type II (customer demand), ISO 27017/27018
- **Total:** ~14 frameworks
- **Key Evidence:** Cross-border SCCs (KSA→EU), data residency cert, customer DPAs, PDPL+GDPR alignment matrix

---

## 📋 PART 8: EVIDENCE REQUIREMENTS BY INTERSECTION

### 8.1 Evidence Categories Cross-Cut All Frameworks

For any organization, evidence needs cluster into eight categories:

| Category | Examples | Frameworks Cross-Referenced |
|----------|----------|------------------------------|
| **Governance** | Board charters, committee charters, RACI | NCA-ECC, SAMA-CSF, CMA-CG, ISO 27001 |
| **Policy** | Cybersecurity, Privacy, BCM, AUP policies | All cybersecurity + privacy frameworks |
| **Technical Configuration** | Firewall configs, MFA, encryption settings | NCA-ECC, SAMA-CSF, PCI-DSS, ISO 27001 |
| **Operational Records** | Logs, access reviews, change records | All cybersecurity frameworks |
| **Training & Awareness** | Training records, attestations, quiz results | NCA-ECC, SAMA-CSF, PDPL, ISO 27001 |
| **Risk Management** | Risk register, DPIAs, risk assessments | All frameworks |
| **Incident Records** | Incident reports, regulator notifications | NCA-ECC, SAMA-CSF, PDPL |
| **Third-Party** | Contracts, SLAs, due diligence reports | NCA-ECC §4-1, SAMA-CSF §3.4, PDPL Art-31 |

### 8.2 Common Evidence Reuse Across Frameworks

A single piece of evidence often satisfies multiple frameworks:

| Evidence Document | Satisfies |
|-------------------|-----------|
| **MFA Configuration screenshot** | NCA-ECC 2-2-3, SAMA-CSF 3.3.13, PCI-DSS 8.4, ISO 27001 A.5.17, NIST CSF PR.AA-03 |
| **Risk Register** | NCA-ECC 1-5-2, SAMA-CSF 3.2.1, PDPL Art-19, ISO 27001 6.1, ISO 31000 |
| **Privacy Notice** | PDPL Art-4, GDPR Art-13/14, ISO 27018, MoCI-Consumer |
| **Vendor DDQ + Contract** | NCA-ECC 4-1, SAMA-CSF 3.4, PDPL Art-31, ISO 27001 A.5.19, SOC 2 CC9.2 |
| **Pen Test Report** | NCA-ECC 2-11, SAMA-CSF 3.3.17, PCI-DSS 11.4, ISO 27001 A.8.8 |
| **Incident Response Plan** | NCA-ECC 2-13, SAMA-CSF 3.3.15 (4-hr), PDPL Art-20 (72-hr), ISO 27001 A.5.24 |
| **BCP/DRP Plan** | NCA-ECC 3-1, SAMA-BCM, ISO 22301 |

This evidence reuse is the **cornerstone of efficient multi-framework compliance**.

---

## ⚖️ PART 9: RISK PROFILE BY ORGANIZATION CHARACTERISTICS

### 9.1 Risk Score Multipliers

Inherent risk for the *same control* varies by org characteristics:

```
Base Risk Score (e.g., MFA control absence): 16 (High)

× Sector multiplier:
  - Banking:        × 1.5  →  Risk: 24 (Critical)
  - Retail:         × 1.0  →  Risk: 16 (High)
  - Education:      × 0.8  →  Risk: 13 (High)

× Size multiplier:
  - Enterprise:     × 1.3  →  More users, more attack surface
  - Micro:          × 0.7  →  Limited blast radius

× Business model:
  - B2C w/ payment: × 1.4
  - B2B internal:   × 1.0

× Ownership:
  - Listed:         × 1.2  →  Disclosure obligations amplify risk
  - PIF/Govt:       × 1.5  →  National security implications
  - Private:        × 1.0
```

### 9.2 Risk Treatment Strategies by Profile

| Profile | Typical Risk Appetite | Preferred Treatment |
|---------|----------------------|---------------------|
| **Government** | Very Low | Mitigate (almost all risks) |
| **Listed Enterprise** | Low | Mitigate + Transfer (insurance) |
| **PIF-Owned** | Low | Mitigate + Strategic |
| **Foreign-Owned** | Low-Moderate | Mitigate per group policy |
| **Mid-Size Private** | Moderate | Mitigate + Accept lower-tier |
| **Family-Owned SME** | Moderate-High | Accept + Mitigate critical only |
| **Micro Business** | High | Accept most + Mitigate critical |

---

## 🔄 PART 10: SYSTEM LIFECYCLE INTEGRATION

### 10.1 Lifecycle Maps to Compliance Stages

| System Lifecycle Phase | Frameworks Activated | Required Evidence |
|------------------------|----------------------|-------------------|
| **Plan** | NCA-ECC 1-6 (Project mgmt cyber) | Project charter w/ security requirements |
| **Design** | NCA-ECC architecture, SAMA-CSF 3.3.4, ISO 27001 A.8.27 | Architecture review, threat modeling |
| **Build** | NCA-ECC 2-15 (secure SDLC), SAMA-CSF 3.3.6 | Code review reports, SAST/DAST |
| **Test** | NCA-ECC 2-11, PCI-DSS 11.3 | Pen test, vulnerability scans |
| **Deploy** | NCA-ECC 2-3 (hardening), SAMA-CSF 3.3.7 (CAB) | Hardening checklist, CAB approval |
| **Operate** | NCA-ECC 2-12 (monitoring), SAMA-CSF 3.3.14 | SIEM logs, daily/weekly/monthly reports |
| **Maintain** | NCA-ECC 2-3-3 (patching), 2-10-2 (vuln remediation) | Patch reports, scan reports |
| **Retire** | NCA-ECC 2-7-3 (data disposal), SAMA-CSF 3.3.10 | Destruction certificates, audit logs |

### 10.2 Evidence Lifecycle Integration

Every piece of evidence in the GRC platform flows through:

```
DEFINE → PLAN → COLLECT → VALIDATE → APPROVE → STORE → USE → REVIEW → REFRESH → RETAIN → ARCHIVE → DISPOSE
```

Different frameworks have different **retention periods** for the same evidence type:
- Logs: NCA-ECC requires 12 months minimum; SAMA requires 24 months; PCI-DSS requires 12 months online + 12 archived
- Audit Reports: ISO 27001 expects 3 years; SAMA requires 7 years; CMA requires 10 years
- Destruction Certificates: PDPL requires 7 years; SAMA banking 7+ years

**Practical implication:** Use the **maximum** retention across all applicable frameworks.

---

## 🗝️ PART 11: THE COMPOSITE DECISION MATRIX

### 11.1 Decision Tree for Determining Applicability

```
START: New organization or new business activity
   │
   ├─► Q1: What is your sector?  ──► Look up SECTOR_FRAMEWORKS table
   │
   ├─► Q2: What is your org type?  
   │      • Government? → +DGA-DCC, +NDMO-DM
   │      • Listed JSC? → +CMA-CG, +CMA-IC, +CMA-DISCLOSURE
   │      • PIF-owned? → +DGA-DCC, enhanced governance
   │      • Foreign? → +Parent group policies typical
   │      • CNI? → +NCA-CSCC, +continuous monitoring
   │
   ├─► Q3: What is your size (Monsha'at definition)?
   │      • Determine Nitaqat tier (Bronze/Silver/Gold/Platinum)
   │      • Determine PCI-DSS merchant level (1-4)
   │      • Determine reporting frequency
   │
   ├─► Q4: What is your business model?
   │      • B2C? → +MoCI-Consumer, +PDPL emphasis
   │      • Cards? → +PCI-DSS
   │      • SaaS/Cloud? → +NCA-CCC, +CST-CLOUD, +ISO 27017
   │      • Marketplace? → +MoCI-ECOM, +platform liability
   │
   ├─► Q5: What is your ownership structure?
   │      • Tadawul-listed? → +CMA frameworks
   │      • Foreign parent? → +Group policies
   │      • Government? → +Public sector requirements
   │
   ├─► Q6: What data do you process?
   │      • Personal data? → PDPL (always if KSA residents)
   │      • Sensitive? → +DPIA required
   │      • Cross-border? → +Art-29 + SCCs/BCRs
   │      • Government? → +NDMO classification
   │
   └─► RESULT: Total mandatory frameworks (typically 8-25)
        Plus conditional based on activities
        Plus voluntary for competitive advantage
```

### 11.2 Framework Count by Persona Complexity

Realistic distribution:

| Profile | Mandatory Frameworks | Conditional | Voluntary |
|---------|---------------------|-------------|-----------|
| **Micro retail (1 store)** | 5-7 | 1-2 | 0-1 |
| **Small B2B services (LLC)** | 7-9 | 1-3 | 1-2 |
| **Mid-size healthcare clinic** | 10-12 | 1-2 | 2-3 |
| **Large private hospital** | 12-15 | 2-3 | 3-5 |
| **Mid-size FinTech** | 11-13 | 3-5 | 3-4 |
| **Large bank (listed)** | 17-20 | 3-5 | 4-6 |
| **Telecom giant (CNI)** | 18-22 | 2-4 | 4-6 |
| **Government ministry** | 8-10 | 2-3 | 1-2 |
| **PIF-owned holding** | 12-15 | 3-5 | 4-6 |

---

## 📊 PART 12: GENERATED FILES

The analysis produces these structured data files:

| File | Records | Purpose |
|------|---------|---------|
| `dim_sectors.csv` | 25 | Master list of KSA economic sectors with regulators |
| `dim_org_types.csv` | 17 | Saudi legal entity types per Companies Law |
| `dim_org_sizes.csv` | 5 | Monsha'at size definitions |
| `dim_ownership.csv` | 9 | Ownership structure variants |
| `dim_business_models.csv` | 12 | Business models with risk implications |
| `dim_frameworks.csv` | 42 | All KSA + international frameworks |
| `matrix1_sector_framework.csv` | 294 | Sector → Framework mapping (mandatory/conditional/voluntary) |
| `matrix2_size_framework.csv` | 18 | Size threshold per framework |
| `matrix3_bizmodel_framework.csv` | 22 | Business model → additional frameworks |
| `matrix4_ownership_obligations.csv` | 10 | Ownership → governance overlay |
| `matrix5_composite_personas.csv` | 41 | Realistic persona scenarios |
| `matrix6_evidence_per_persona.csv` | 1,835 | Evidence required for each persona |

---

## ✅ PART 13: KEY TAKEAWAYS

### What This Analysis Reveals

1. **No organization escapes PDPL.** If you process personal data of anyone in KSA, PDPL applies. Period. No size threshold.

2. **NCNICC (2026) is the great equalizer.** Starting January 2026, **all private sector** organizations must meet baseline cybersecurity controls — not just CNI or government.

3. **Listing on Tadawul = +3 frameworks.** CMA-CG + CMA-IC + CMA-DISCLOSURE is a non-trivial overhead.

4. **PIF/Government ownership ≠ relaxation.** It often means *more* scrutiny via DGA-DCC and continuous monitoring.

5. **Foreign-owned subsidiaries face double compliance.** KSA frameworks + parent group policies typically yields 18-25 frameworks.

6. **Size matters most for operations, not framework count.** Saudization tier and audit frequency change dramatically with size; framework applicability changes less.

7. **Business model is the multiplier.** Pure B2B → ~8 frameworks. Same business with B2C + payment + cloud → can double.

8. **Evidence reuse is the cornerstone of efficiency.** 60-80% of evidence can satisfy multiple frameworks if properly tagged.

9. **CNI designation overrides all.** It pushes you to NCA-CSCC + continuous monitoring + maturity Level 4+.

10. **The lifecycle dimension is the cost driver.** A control isn't done when implemented — it's done when its evidence has been collected, validated, stored, used, reviewed, refreshed, retained, archived, and disposed of, possibly across 7-10 year timeframes.

---

## 🇸🇦 AUTHORITATIVE SOURCES

All mappings in this analysis are based on authoritative public sources:

- **Monsha'at SME Definition:** https://www.monshaat.gov.sa/en/SMEs-definition (Board Decision 2-1-1438)
- **NCA Frameworks:** https://nca.gov.sa/en/regulatory-documents/
- **SAMA Rulebook:** https://rulebook.sama.gov.sa
- **CMA Regulations:** https://cma.org.sa
- **SDAIA / PDPL:** Royal Decree M/19 + M/148; Implementing Regulations
- **ZATCA:** https://zatca.gov.sa
- **MoCI:** Saudi Companies Law M/132 (2022)
- **Monsha'at + SAMA SME definition harmonization:** https://rulebook.sama.gov.sa/en/definition-small-and-medium-enterprises

This is a **living document.** Saudi regulatory landscape evolves rapidly with Vision 2030; expect annual updates to all frameworks and additions of new ones.
