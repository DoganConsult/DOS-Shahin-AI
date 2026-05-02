export interface ControlDef {
  code: string;
  title: string;
  titleAr?: string;
  domain: string;
  description?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface FrameworkDef {
  code: string;
  name: string;
  nameAr: string;
  version: string;
  issuer: string;
  country: 'SA';
  category: 'cybersecurity' | 'data_privacy' | 'financial' | 'telecom' | 'cloud';
  mandatory: boolean;
  sectors: string[];
  controls: ControlDef[];
}

export const KSA_FRAMEWORKS: FrameworkDef[] = [
  {
    code: 'NCA-ECC',
    name: 'NCA Essential Cybersecurity Controls',
    nameAr: 'الضوابط الأساسية للأمن السيبراني',
    version: '2.0',
    issuer: 'NCA',
    country: 'SA',
    category: 'cybersecurity',
    mandatory: true,
    sectors: ['all'],
    controls: [
      { code: 'NCA-ECC-1-1', title: 'Cybersecurity Governance', domain: 'Governance', priority: 'critical' },
      { code: 'NCA-ECC-1-2', title: 'Cybersecurity Risk Management', domain: 'Governance', priority: 'critical' },
      { code: 'NCA-ECC-1-3', title: 'Cybersecurity Policies and Procedures', domain: 'Governance', priority: 'high' },
      { code: 'NCA-ECC-2-1', title: 'Asset Management', domain: 'Defense', priority: 'high' },
      { code: 'NCA-ECC-2-2', title: 'Identity and Access Management', domain: 'Defense', priority: 'critical' },
      { code: 'NCA-ECC-2-3', title: 'Information Systems Security', domain: 'Defense', priority: 'high' },
      { code: 'NCA-ECC-2-4', title: 'Email and Web Security', domain: 'Defense', priority: 'high' },
      { code: 'NCA-ECC-2-5', title: 'Endpoint Security', domain: 'Defense', priority: 'high' },
      { code: 'NCA-ECC-2-6', title: 'Network Security Management', domain: 'Defense', priority: 'high' },
      { code: 'NCA-ECC-2-7', title: 'Data and Privacy Protection', domain: 'Defense', priority: 'critical' },
      { code: 'NCA-ECC-2-8', title: 'Cryptography', domain: 'Defense', priority: 'high' },
      { code: 'NCA-ECC-2-9', title: 'Backup and Recovery', domain: 'Resilience', priority: 'high' },
      { code: 'NCA-ECC-2-10', title: 'Vulnerability Management', domain: 'Defense', priority: 'high' },
      { code: 'NCA-ECC-2-11', title: 'Penetration Testing', domain: 'Defense', priority: 'medium' },
      { code: 'NCA-ECC-3-1', title: 'Cybersecurity Event Management', domain: 'Operations', priority: 'critical' },
      { code: 'NCA-ECC-3-2', title: 'Cybersecurity Incident Management', domain: 'Operations', priority: 'critical' },
      { code: 'NCA-ECC-4-1', title: 'Third Party and Supply Chain Security', domain: 'Supply Chain', priority: 'high' },
      { code: 'NCA-ECC-5-1', title: 'Physical Security', domain: 'Physical', priority: 'medium' },
    ],
  },
  {
    code: 'SAMA-CSF',
    name: 'SAMA Cyber Security Framework',
    nameAr: 'إطار الأمن السيبراني للبنك المركزي السعودي',
    version: '1.0',
    issuer: 'SAMA',
    country: 'SA',
    category: 'financial',
    mandatory: true,
    sectors: ['banking', 'insurance', 'finance'],
    controls: [
      { code: 'SAMA-CSF-1.1', title: 'Cyber Security Leadership and Governance', domain: 'Governance', priority: 'critical' },
      { code: 'SAMA-CSF-1.2', title: 'Cyber Security Risk Management', domain: 'Governance', priority: 'critical' },
      { code: 'SAMA-CSF-1.3', title: 'Cyber Security in Information and Technology Projects', domain: 'Governance', priority: 'high' },
      { code: 'SAMA-CSF-2.1', title: 'Human Resources Security', domain: 'People', priority: 'high' },
      { code: 'SAMA-CSF-2.2', title: 'Awareness and Training', domain: 'People', priority: 'medium' },
      { code: 'SAMA-CSF-3.1', title: 'Information Asset Management', domain: 'Assets', priority: 'high' },
      { code: 'SAMA-CSF-3.2', title: 'Physical and Environmental Security', domain: 'Physical', priority: 'medium' },
      { code: 'SAMA-CSF-3.3', title: 'Identity and Access Management', domain: 'Access', priority: 'critical' },
      { code: 'SAMA-CSF-3.4', title: 'Operations Security', domain: 'Operations', priority: 'high' },
      { code: 'SAMA-CSF-3.5', title: 'Communications Security', domain: 'Network', priority: 'high' },
      { code: 'SAMA-CSF-3.6', title: 'System Acquisition and Development', domain: 'Development', priority: 'high' },
      { code: 'SAMA-CSF-3.7', title: 'Threat Intelligence', domain: 'Intelligence', priority: 'high' },
      { code: 'SAMA-CSF-3.8', title: 'Cybersecurity Incident Management', domain: 'Incident', priority: 'critical' },
      { code: 'SAMA-CSF-3.9', title: 'IT Disaster Recovery', domain: 'Resilience', priority: 'critical' },
      { code: 'SAMA-CSF-3.10', title: 'Outsourcing and Third Party Management', domain: 'Supply Chain', priority: 'high' },
      { code: 'SAMA-CSF-3.11', title: 'Compliance', domain: 'Compliance', priority: 'high' },
    ],
  },
  {
    code: 'PDPL',
    name: 'Personal Data Protection Law',
    nameAr: 'نظام حماية البيانات الشخصية',
    version: '1.0',
    issuer: 'SDAIA',
    country: 'SA',
    category: 'data_privacy',
    mandatory: true,
    sectors: ['all'],
    controls: [
      { code: 'PDPL-1', title: 'Lawful Basis for Processing', domain: 'Legal', priority: 'critical' },
      { code: 'PDPL-2', title: 'Data Subject Rights', domain: 'Rights', priority: 'critical' },
      { code: 'PDPL-3', title: 'Privacy Notice and Consent', domain: 'Transparency', priority: 'high' },
      { code: 'PDPL-4', title: 'Data Minimisation', domain: 'Minimisation', priority: 'high' },
      { code: 'PDPL-5', title: 'Data Accuracy', domain: 'Quality', priority: 'medium' },
      { code: 'PDPL-6', title: 'Storage Limitation', domain: 'Retention', priority: 'high' },
      { code: 'PDPL-7', title: 'Security of Processing', domain: 'Security', priority: 'critical' },
      { code: 'PDPL-8', title: 'Cross-Border Transfers', domain: 'Transfers', priority: 'high' },
      { code: 'PDPL-9', title: 'Data Processor Contracts', domain: 'Processors', priority: 'high' },
      { code: 'PDPL-10', title: 'Breach Notification', domain: 'Incident', priority: 'critical' },
      { code: 'PDPL-11', title: 'Data Protection Officer', domain: 'Governance', priority: 'medium' },
      { code: 'PDPL-12', title: 'Privacy Impact Assessment', domain: 'Assessment', priority: 'high' },
    ],
  },
  {
    code: 'NDMO',
    name: 'National Data Management Office Framework',
    nameAr: 'إطار الجهة الوطنية لحوكمة البيانات',
    version: '2.0',
    issuer: 'NDMO',
    country: 'SA',
    category: 'data_privacy',
    mandatory: true,
    sectors: ['government', 'public'],
    controls: [
      { code: 'NDMO-DG-1', title: 'Data Governance Framework', domain: 'Governance', priority: 'critical' },
      { code: 'NDMO-DG-2', title: 'Data Governance Roles and Responsibilities', domain: 'Governance', priority: 'high' },
      { code: 'NDMO-DQ-1', title: 'Data Quality Management', domain: 'Quality', priority: 'high' },
      { code: 'NDMO-DQ-2', title: 'Data Standards and Taxonomy', domain: 'Quality', priority: 'medium' },
      { code: 'NDMO-DL-1', title: 'Data Lifecycle Management', domain: 'Lifecycle', priority: 'high' },
      { code: 'NDMO-DS-1', title: 'Data Security and Privacy', domain: 'Security', priority: 'critical' },
      { code: 'NDMO-DI-1', title: 'Data Integration and Interoperability', domain: 'Integration', priority: 'medium' },
      { code: 'NDMO-DA-1', title: 'Data Architecture', domain: 'Architecture', priority: 'high' },
    ],
  },
  {
    code: 'CITC',
    name: 'Communications and Information Technology Commission Framework',
    nameAr: 'إطار هيئة الاتصالات وتقنية المعلومات',
    version: '1.0',
    issuer: 'CITC',
    country: 'SA',
    category: 'telecom',
    mandatory: true,
    sectors: ['telecom', 'ict', 'internet'],
    controls: [
      { code: 'CITC-CS-1', title: 'Network Security', domain: 'Network', priority: 'critical' },
      { code: 'CITC-CS-2', title: 'Service Continuity', domain: 'Continuity', priority: 'critical' },
      { code: 'CITC-CS-3', title: 'User Data Protection', domain: 'Privacy', priority: 'critical' },
      { code: 'CITC-CS-4', title: 'Incident Response', domain: 'Incident', priority: 'high' },
      { code: 'CITC-CS-5', title: 'Access Control', domain: 'Access', priority: 'high' },
      { code: 'CITC-CS-6', title: 'Vulnerability Assessment', domain: 'Assessment', priority: 'high' },
      { code: 'CITC-CS-7', title: 'Supply Chain Security', domain: 'Supply Chain', priority: 'medium' },
    ],
  },
];
