// SAMA Cyber Security Framework static metadata.
// This is the baseline framework catalog entry used by the SAMA assessment
// service to seed a new tenant. The full control catalog lives in the tenant
// DB (dos.frameworks + dos.controls); this constant supplies the canonical
// code/labels when the catalog is bootstrapped.

export const SAMA_CSF = {
  code: 'SAMA-CSF',
  name: 'SAMA Cyber Security Framework',
  regulator: 'SAMA',
  jurisdiction: 'KSA',
  version: '1.0',
  categories: [] as Array<{ code: string; name: string; controls: string[] }>,
  controls: [] as Array<{ code: string; title: string; description?: string }>,
};

export default SAMA_CSF;
