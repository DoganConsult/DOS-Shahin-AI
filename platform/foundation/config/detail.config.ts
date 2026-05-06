/**
 * Runtime detail-view config for the Foundation module.
 *   GET /api/module-config/foundation/detail/:variant
 */
export interface DetailSection {
  key: string;
  i18nKey: string;
  layout: 'one-col' | 'two-col' | 'tabs';
  fields: { key: string; i18nKey: string; type: string; permission?: string }[];
}

export interface DetailVariantConfig {
  variant: string;
  header: { titleKey: string; subtitleKey?: string };
  sections: DetailSection[];
  tabs?: { key: string; i18nKey: string; loadFromEndpoint: string; permission?: string }[];
  actions: { key: string; i18nKey: string; permission: string; variant: 'primary' | 'secondary' | 'danger' }[];
}

const baseHeaderFields = [
  { key: 'code',   i18nKey: 'foundation.fields.code',   type: 'text' },
  { key: 'nameEn', i18nKey: 'foundation.fields.nameEn', type: 'text' },
  { key: 'nameAr', i18nKey: 'foundation.fields.nameAr', type: 'text' },
  { key: 'status', i18nKey: 'foundation.fields.status', type: 'badge' },
];

export const FOUNDATION_DETAIL_CONFIGS: Record<string, DetailVariantConfig> = {
  organization: {
    variant: 'organization',
    header: { titleKey: 'foundation.nav.organization' },
    sections: [
      { key: 'identity', i18nKey: 'foundation.module.title', layout: 'two-col', fields: baseHeaderFields },
    ],
    tabs: [
      { key: 'children', i18nKey: 'foundation.nav.businessUnits', loadFromEndpoint: '/api/foundation/organizations/:id/children', permission: 'foundation.org.read' },
      { key: 'audit',    i18nKey: 'foundation.nav.audit',         loadFromEndpoint: '/api/foundation/audit-trail?entityId=:id', permission: 'foundation.record.read' },
    ],
    actions: [
      { key: 'edit',   i18nKey: 'foundation.actions.edit',   permission: 'foundation.org.write', variant: 'primary' },
      { key: 'delete', i18nKey: 'foundation.actions.delete', permission: 'foundation:delete',    variant: 'danger' },
    ],
  },
};
