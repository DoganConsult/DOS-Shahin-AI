// KSA framework static metadata index.
// These are the minimal type definitions + seed catalogs referenced by
// sama-assessment, nca-assessment, and framework-harmonization. The full
// control catalog lives in the tenant DB (dos.frameworks + dos.controls);
// this module supplies canonical codes/labels when a tenant is bootstrapped
// or when a service needs type shapes for typed access.

export interface ControlDef {
  code: string;
  title: string;
  description?: string;
  domainCode?: string;
  subdomainCode?: string;
}

export interface SubdomainDef {
  code: string;
  name: string;
  controls: ControlDef[];
}

export interface DomainDef {
  code: string;
  name: string;
  subdomains: SubdomainDef[];
}

export interface FrameworkDef {
  code: string;
  name: string;
  regulator: string;
  jurisdiction: string;
  version: string;
  categories?: Array<{ code: string; name: string; controls: string[] }>;
  domains?: DomainDef[];
  controls?: ControlDef[];
}

export { SAMA_CSF } from './financial-regulatory/ksa-fw-sama.js';

export const NCA_ECC: FrameworkDef = {
  code: 'NCA-ECC',
  name: 'NCA Essential Cybersecurity Controls',
  regulator: 'NCA',
  jurisdiction: 'KSA',
  version: '2.0',
  domains: [],
  controls: [],
};

export const KSA_FRAMEWORKS: FrameworkDef[] = [NCA_ECC];
