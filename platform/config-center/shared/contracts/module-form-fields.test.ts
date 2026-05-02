import { describe, it, expect } from 'vitest';
import { MODULE_CREATE_FORM_FIELDS, MODULE_REPORT_DEFINITIONS } from './module-form-fields';
import type { ModuleFormFieldDefinition } from './module-shell-definition';

const EXPECTED_MODULE_CODES = [
  'risk', 'compliance', 'policy', 'evidence', 'audit', 'incident', 'exception',
  'governance', 'vendor', 'bcp', 'asset', 'remediation', 'action', 'training',
  'privacy', 'dora', 'journey', 'notification', 'ai-governance', 'qiyas',
  'foundation', 'reporting', 'ai', 'integrations', 'admin', 'workflow',
  'analytics', 'team', 'issues', 'inbox', 'portals', 'records', 'controls',
];

const VALID_FIELD_TYPES: ModuleFormFieldDefinition['type'][] = [
  'text', 'textarea', 'select', 'multiselect', 'date', 'number', 'toggle', 'rich-text',
];

const VALID_REPORT_TYPES = ['chart', 'table', 'kpi-summary', 'trend', 'heatmap'];

describe('MODULE_CREATE_FORM_FIELDS — coverage', () => {
  it('covers all 33 modules', () => {
    const keys = Object.keys(MODULE_CREATE_FORM_FIELDS);
    expect(keys.length).toBeGreaterThanOrEqual(33);
    for (const code of EXPECTED_MODULE_CODES) {
      expect(keys, `MODULE_CREATE_FORM_FIELDS missing "${code}"`).toContain(code);
    }
  });

  it('every module has at least one form field', () => {
    for (const code of EXPECTED_MODULE_CODES) {
      const fields = MODULE_CREATE_FORM_FIELDS[code];
      expect(
        fields.length,
        `"${code}" createFormFields is empty`,
      ).toBeGreaterThan(0);
    }
  });
});

describe('MODULE_CREATE_FORM_FIELDS — required fields', () => {
  it('every module has at least one required field', () => {
    for (const code of EXPECTED_MODULE_CODES) {
      const fields = MODULE_CREATE_FORM_FIELDS[code];
      const requiredFields = fields.filter(f => f.required === true);
      expect(
        requiredFields.length,
        `"${code}" has no required form fields`,
      ).toBeGreaterThan(0);
    }
  });

  it('every required field has a valid type', () => {
    for (const code of EXPECTED_MODULE_CODES) {
      const fields = MODULE_CREATE_FORM_FIELDS[code].filter(f => f.required);
      for (const field of fields) {
        expect(
          VALID_FIELD_TYPES.includes(field.type),
          `required field "${field.id}" in "${code}" has invalid type "${field.type}"`,
        ).toBe(true);
      }
    }
  });
});

describe('MODULE_CREATE_FORM_FIELDS — field shape', () => {
  it('every field has a unique id within its module', () => {
    for (const code of EXPECTED_MODULE_CODES) {
      const ids = MODULE_CREATE_FORM_FIELDS[code].map(f => f.id);
      const unique = new Set(ids);
      expect(unique.size, `"${code}" has duplicate field ids`).toBe(ids.length);
    }
  });

  it('every field has bilingual labels (labelEn + labelAr)', () => {
    for (const code of EXPECTED_MODULE_CODES) {
      for (const field of MODULE_CREATE_FORM_FIELDS[code]) {
        expect(field.labelEn, `field "${field.id}" in "${code}" missing labelEn`).toBeTruthy();
        expect(field.labelAr, `field "${field.id}" in "${code}" missing labelAr`).toBeTruthy();
      }
    }
  });

  it('every field has a valid type', () => {
    for (const code of EXPECTED_MODULE_CODES) {
      for (const field of MODULE_CREATE_FORM_FIELDS[code]) {
        expect(
          VALID_FIELD_TYPES.includes(field.type),
          `field "${field.id}" in "${code}" has invalid type "${field.type}"`,
        ).toBe(true);
      }
    }
  });

  it('span when defined is 1 or 2', () => {
    for (const code of EXPECTED_MODULE_CODES) {
      for (const field of MODULE_CREATE_FORM_FIELDS[code]) {
        if (field.span !== undefined) {
          expect(
            [1, 2].includes(field.span),
            `field "${field.id}" in "${code}" has invalid span "${field.span}"`,
          ).toBe(true);
        }
      }
    }
  });
});

describe('MODULE_CREATE_FORM_FIELDS — select/multiselect fields', () => {
  it('select fields that have options provide at least one option', () => {
    for (const code of EXPECTED_MODULE_CODES) {
      for (const field of MODULE_CREATE_FORM_FIELDS[code]) {
        if (field.type === 'select' && field.options !== undefined) {
          expect(
            field.options.length,
            `select field "${field.id}" in "${code}" has empty options array`,
          ).toBeGreaterThan(0);
        }
      }
    }
  });

  it('select/multiselect options have bilingual labels and a value', () => {
    for (const code of EXPECTED_MODULE_CODES) {
      for (const field of MODULE_CREATE_FORM_FIELDS[code]) {
        if ((field.type === 'select' || field.type === 'multiselect') && field.options) {
          for (const opt of field.options) {
            expect(opt.value, `option in field "${field.id}" in "${code}" missing value`).toBeDefined();
            expect(opt.labelEn, `option "${opt.value}" in "${field.id}" of "${code}" missing labelEn`).toBeTruthy();
            expect(opt.labelAr, `option "${opt.value}" in "${field.id}" of "${code}" missing labelAr`).toBeTruthy();
          }
        }
      }
    }
  });
});

describe('MODULE_CREATE_FORM_FIELDS — per-module spot checks', () => {
  it('risk module has title, severity, and owner fields', () => {
    const fields = MODULE_CREATE_FORM_FIELDS['risk'];
    const ids = fields.map(f => f.id);
    expect(ids).toContain('title');
    expect(ids).toContain('severity');
    expect(ids).toContain('owner');
  });

  it('compliance module has title, framework, and owner fields', () => {
    const fields = MODULE_CREATE_FORM_FIELDS['compliance'];
    const ids = fields.map(f => f.id);
    expect(ids).toContain('title');
    expect(ids).toContain('framework');
    expect(ids).toContain('owner');
  });

  it('incident module title is required and has severity as required', () => {
    const fields = MODULE_CREATE_FORM_FIELDS['incident'];
    const titleField = fields.find(f => f.id === 'title');
    const severityField = fields.find(f => f.id === 'severity');
    expect(titleField?.required).toBe(true);
    expect(severityField?.required).toBe(true);
  });

  it('ai module has autonomyLevel select field', () => {
    const fields = MODULE_CREATE_FORM_FIELDS['ai'];
    const autonomy = fields.find(f => f.id === 'autonomyLevel');
    expect(autonomy).toBeDefined();
    expect(autonomy?.type).toBe('select');
    expect(autonomy?.options?.length).toBeGreaterThan(0);
  });

  it('admin module has adminEmail field', () => {
    const fields = MODULE_CREATE_FORM_FIELDS['admin'];
    const emailField = fields.find(f => f.id === 'adminEmail');
    expect(emailField).toBeDefined();
    expect(emailField?.type).toBe('text');
  });

  it('privacy module has type select with dsar option', () => {
    const fields = MODULE_CREATE_FORM_FIELDS['privacy'];
    const typeField = fields.find(f => f.id === 'type');
    expect(typeField).toBeDefined();
    expect(typeField?.options?.some(o => o.value === 'dsar')).toBe(true);
  });

  it('foundation module has Entity Type select', () => {
    const fields = MODULE_CREATE_FORM_FIELDS['foundation'];
    const typeField = fields.find(f => f.id === 'type');
    expect(typeField).toBeDefined();
    expect(typeField?.type).toBe('select');
  });
});

describe('MODULE_REPORT_DEFINITIONS — coverage', () => {
  it('covers all 33 modules', () => {
    const keys = Object.keys(MODULE_REPORT_DEFINITIONS);
    expect(keys.length).toBeGreaterThanOrEqual(33);
    for (const code of EXPECTED_MODULE_CODES) {
      expect(keys, `MODULE_REPORT_DEFINITIONS missing "${code}"`).toContain(code);
    }
  });

  it('every module has at least one report definition', () => {
    for (const code of EXPECTED_MODULE_CODES) {
      expect(
        MODULE_REPORT_DEFINITIONS[code].length,
        `"${code}" has no report definitions`,
      ).toBeGreaterThan(0);
    }
  });
});

describe('MODULE_REPORT_DEFINITIONS — shape', () => {
  it('every report has id, bilingual labels, icon, and valid type', () => {
    for (const code of EXPECTED_MODULE_CODES) {
      for (const rpt of MODULE_REPORT_DEFINITIONS[code]) {
        expect(rpt.id, `report in "${code}" missing id`).toBeTruthy();
        expect(rpt.labelEn, `report "${rpt.id}" in "${code}" missing labelEn`).toBeTruthy();
        expect(rpt.labelAr, `report "${rpt.id}" in "${code}" missing labelAr`).toBeTruthy();
        expect(rpt.icon, `report "${rpt.id}" in "${code}" missing icon`).toMatch(/^pi-/);
        expect(
          VALID_REPORT_TYPES.includes(rpt.type),
          `report "${rpt.id}" in "${code}" has invalid type "${rpt.type}"`,
        ).toBe(true);
      }
    }
  });

  it('report ids are unique within each module', () => {
    for (const code of EXPECTED_MODULE_CODES) {
      const ids = MODULE_REPORT_DEFINITIONS[code].map(r => r.id);
      const unique = new Set(ids);
      expect(unique.size, `"${code}" has duplicate report ids`).toBe(ids.length);
    }
  });
});

describe('MODULE_REPORT_DEFINITIONS — per-module spot checks', () => {
  it('risk module has a heatmap report', () => {
    const reports = MODULE_REPORT_DEFINITIONS['risk'];
    const heatmap = reports.find(r => r.type === 'heatmap');
    expect(heatmap).toBeDefined();
  });

  it('compliance module has a trend report', () => {
    const reports = MODULE_REPORT_DEFINITIONS['compliance'];
    const trend = reports.find(r => r.type === 'trend');
    expect(trend).toBeDefined();
  });

  it('ai module has at least 4 reports covering runs, accuracy, guardrails, usage', () => {
    const reports = MODULE_REPORT_DEFINITIONS['ai'];
    expect(reports.length).toBeGreaterThanOrEqual(4);
    const types = reports.map(r => r.type);
    expect(types).toContain('trend');
    expect(types).toContain('chart');
  });

  it('admin module has a table-type audit log report', () => {
    const reports = MODULE_REPORT_DEFINITIONS['admin'];
    const auditLog = reports.find(r => r.type === 'table');
    expect(auditLog).toBeDefined();
  });
});
