// AGRC-OS — Shared TypeScript Models

export interface LoginRequest { email: string; password: string; }
export interface RegisterRequest { email: string; password: string; name: string; }
export interface MfaVerifyRequest { userId: string; code: string; mfaType: string; }
export interface AuthResponse { token: string; refreshToken?: string; userId: string; tenantId: string; role?: string; onboardingComplete: boolean; orgName?: string; userName?: string; isSuperAdmin?: boolean; mfaRequired?: boolean; mfaType?: string; message?: string; }

export interface OnboardingQuestion {
  id: string; step: number; category: string;
  question: string; helpText: string;
  type: 'single' | 'multi' | 'text' | 'scale';
  options?: { value: string; label: string; description?: string; icon?: string }[];
}

export interface WorkspaceSummary {
  tenantId: string; frameworkCount: number; riskCount: number;
  policyCount: number; controlCount: number; dashboardLayout: string;
}

export interface Framework {
  frameworkId: string; name: string; description: string;
  category: string; totalControls: number; implementedControls: number;
  completionPercent: number; status: string; targetDate?: string;
}

export interface Risk {
  riskId: string; title: string; description: string;
  category: string; likelihood: number; impact: number;
  riskScore: number; status: string; owner: string;
  next_review_date?: string;
  controlIds?: string[]; controlCount?: number;
}

export interface Policy {
  [key: string]: unknown;
  policyId: string; title: string; content: string;
  version: number; status: string; frameworks: string[];
  owner: string;
  next_review_date?: string;
}

export interface Control {
  controlId: string; title: string; description: string;
  frameworks: string[]; status: string; automatable: boolean; owner: string;
  next_review_date?: string;
  ownerTeamId?: string | null; ownerTeamName?: string | null; ownerTeamCode?: string | null;
  secondaryOwnerTeamId?: string | null;
  evidenceCount?: number; riskCount?: number;
}

export interface DashboardData {
  summary: {
    totalFrameworks: number; totalRisks: number;
    totalPolicies: number; totalControls: number;
    risksByLevel: { critical: number; high: number; medium: number; low: number };
    controlStatus: { implemented: number; in_progress: number; not_started: number };
  };
  frameworks: Framework[]; risks: Risk[];
  policies: Policy[]; controls: Control[];
}
