import { TRAINING_MANIFEST } from '../training.module';

export { TRAINING_MANIFEST };

export const TRAINING_MANIFEST_META = {
  code: TRAINING_MANIFEST.code,
  version: TRAINING_MANIFEST.version,
  tier: TRAINING_MANIFEST.tier,
  category: TRAINING_MANIFEST.category,
  routeBase: TRAINING_MANIFEST.routeBase,
  eventNamespace: TRAINING_MANIFEST.eventNamespace,
  tablePrefix: TRAINING_MANIFEST.tablePrefix,
  ownedTables: TRAINING_MANIFEST.ownedTables,
  publishedEvents: TRAINING_MANIFEST.publishedEvents,
  consumedEvents: TRAINING_MANIFEST.consumedEvents,
  hardDeps: TRAINING_MANIFEST.hardDeps,
  softDeps: TRAINING_MANIFEST.softDeps,
  provisioningOrder: TRAINING_MANIFEST.provisioningOrder,
  lifecycleParticipation: true,
  uiSurfaces: [
    'training-hub',
    'course-catalog',
    'campaign-management',
    'assignment-tracking',
    'quiz-management',
    'certificate-management',
    'completion-dashboard',
    'diagnostics',
  ],
  adminSurfaces: TRAINING_MANIFEST.adminSurfaces,
  healthSignals: ['schema_exists', 'tables_exist', 'overdue_assignments', 'campaign_completion_rate', 'certificate_expiry', 'quiz_failure_rate'],
} as const;
