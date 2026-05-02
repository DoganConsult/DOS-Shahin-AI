/**
 * Runtime detail-view config for the Foundation module.
 *   GET /api/module-config/foundation/detail/:variant
 */
export interface DetailSection {
  key: string;
  labelKey: string;
  layout: 'one-col' | 'two-col' | 'tabs';
  fields: { key: string; labelKey: string; type: string; permission?: string }[];
}

export interface DetailVariantConfig {
  variant: string;
  header: { titleKey: string; subtitleKey?: string };
  sections: DetailSection[];
  tabs?: { key: string; labelKey: string; loadFromEndpoint: string; permission?: string }[];
  actions: { key: string; labelKey: string; permission: string; variant: 'primary' | 'secondary' | 'danger' }[];
}

const baseHeaderFields = [
  { key: 'code',   labelKey: 'foundation.fields.code',   type: 'text' },
  { key: 'nameEn', labelKey: 'foundation.fields.nameEn', type: 'text' },
  { key: 'nameAr', labelKey: 'foundation.fields.nameAr', type: 'text' },
  { key: 'status', labelKey: 'foundation.fields.status', type: 'badge' },
];

export const FOUNDATION_DETAIL_CONFIGS: Record<string, DetailVariantConfig> = {
  organization: {
    variant: 'organization',
    header: { titleKey: 'foundation.nav.organization' },
    sections: [
      { key: 'identity', labelKey: 'foundation.module.title', layout: 'two-col', fields: baseHeaderFields },
    ],
    tabs: [
      { key: 'children', labelKey: 'foundation.nav.businessUnits', loadFromEndpoint: '/api/foundation/organizations/:id/children', permission: 'foundation.org.read' },
      { key: 'audit',    labelKey: 'foundation.nav.audit',         loadFromEndpoint: '/api/foundation/audit-trail?entityId=:id', permission: 'foundation.record.read' },
    ],
    actions: [
      { key: 'edit',   labelKey: 'foundation.actions.edit',   permission: 'foundation.org.write', variant: 'primary' },
      { key: 'delete', labelKey: 'foundation.actions.delete', permission: 'foundation:delete',    variant: 'danger' },
    ],
  },
};
