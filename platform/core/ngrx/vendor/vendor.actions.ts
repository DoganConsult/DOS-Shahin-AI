import { createActionGroup, emptyProps, props } from '@ngrx/store';

export interface VendorItemDto {
  vendorId: string;
  name: string;
  riskTier: string;
  status: string;
  contractExpiry: string | null;
  overallScore: number;
}

export interface VendorRiskProfileDto {
  vendorId: string;
  vendorName: string;
  riskScore: number;
  riskTier: string;
  assessmentDate: string;
}

export interface SLABreachDto {
  vendorId: string;
  vendorName: string;
  slaMetric: string;
  threshold: number;
  actual: number;
  breachedAt: string;
}

export const VendorActions = createActionGroup({
  source: 'Vendor',
  events: {
    'Load Vendors': emptyProps(),
    'Vendors Loaded': props<{ vendors: VendorItemDto[] }>(),
    'Vendors Load Failed': props<{ error: string }>(),

    'Load Risk Profiles': emptyProps(),
    'Risk Profiles Loaded': props<{ profiles: VendorRiskProfileDto[] }>(),
    'Risk Profiles Load Failed': props<{ error: string }>(),

    'Load SLA Breaches': emptyProps(),
    'SLA Breaches Loaded': props<{ breaches: SLABreachDto[] }>(),
    'SLA Breaches Load Failed': props<{ error: string }>(),

    'Load All': emptyProps(),
    'Reset': emptyProps(),
  },
});
