export interface RegisterTenantRequest {
  orgName: string;
  fullName: string;
  email: string;
  password: string;
  tenantSlug?: string;
  selectedTier?: string;
  locale?: 'en' | 'ar';
}

export interface RegisterTenantResponse {
  tenantId: string;
  tenantSlug: string;
  userId: string;
  subscriptionStatus: string;
  tenantStatus: string;
  onboardingSessionId: string;
  redirectTo: string;
}
