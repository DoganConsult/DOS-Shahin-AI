import type { SeedFnDef } from '@dos/contracts';

export const AGRC_SEEDS: SeedFnDef[] = [
  { name: 'seedRegistry', description: 'Core GRC module and entity registry', order: 10 },
  { name: 'seedQuestionBank', description: 'Assessment question bank', order: 20 },
  { name: 'seedOnboardingQuestionBank', description: 'Onboarding v2 question bank', order: 30 },
  { name: 'seedAssessmentTemplates', description: 'Assessment templates across all tenants', order: 40 },
  { name: 'seedQuotes', description: 'Motivational quotes library', order: 50 },
  { name: 'seedLandingContent', description: 'Landing/marketing page content', order: 60 },
  { name: 'seedPlatformAdmin', description: 'Platform admin bootstrap user', order: 70 },
];
