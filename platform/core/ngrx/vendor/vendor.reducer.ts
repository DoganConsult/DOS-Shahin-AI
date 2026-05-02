import { createFeature, createReducer, on } from '@ngrx/store';
import { VendorActions, VendorItemDto, VendorRiskProfileDto, SLABreachDto } from './vendor.actions';

export interface VendorState {
  vendors: VendorItemDto[];
  riskProfiles: VendorRiskProfileDto[];
  slaBreaches: SLABreachDto[];
  loading: boolean;
  error: string | null;
}

const initialState: VendorState = {
  vendors: [],
  riskProfiles: [],
  slaBreaches: [],
  loading: false,
  error: null,
};

export const vendorFeature = createFeature({
  name: 'vendor',
  reducer: createReducer(
    initialState,
    on(VendorActions.loadVendors, VendorActions.loadRiskProfiles, VendorActions.loadSLABreaches, VendorActions.loadAll,
      (state) => ({ ...state, loading: true, error: null })),

    on(VendorActions.vendorsLoaded, (state, { vendors }) => ({ ...state, vendors, loading: false })),
    on(VendorActions.vendorsLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),

    on(VendorActions.riskProfilesLoaded, (state, { profiles }) => ({ ...state, riskProfiles: profiles, loading: false })),
    on(VendorActions.riskProfilesLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),

    on(VendorActions.sLABreachesLoaded, (state, { breaches }) => ({ ...state, slaBreaches: breaches, loading: false })),
    on(VendorActions.sLABreachesLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),

    on(VendorActions.reset, () => initialState),
  ),
});

export const {
  selectVendors: selectVendorList,
  selectRiskProfiles: selectVendorRiskProfiles,
  selectSlaBreaches: selectVendorSLABreaches,
  selectLoading: selectVendorLoading,
  selectError: selectVendorError,
} = vendorFeature;
