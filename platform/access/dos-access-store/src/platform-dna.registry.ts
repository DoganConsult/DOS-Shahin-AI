// Platform DNA registry — the modules under platform/<x>/ that may surface
// in workspace nav when their nav contracts + health probes line up.
//
// Foundation is the only currently nav-visible DNA module. The others are
// listed so PlatformReadinessService can probe them once their health
// endpoints land.

export const DNA_MODULE_CODES = [
  'foundation',
  'dauth',
  'dnoc',
  'dsoc',
  'dos',
  'ai',
] as const;

export type DnaModuleCode = (typeof DNA_MODULE_CODES)[number];
