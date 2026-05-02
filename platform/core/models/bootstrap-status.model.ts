export interface BootstrapChecklistItem {
  key: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  category: 'org' | 'roles' | 'modules' | 'frameworks' | 'workflows' | 'integrations' | 'users';
  route: string;
  required: boolean;
  completed: boolean;
  completedAt?: string | null;
}

export interface BootstrapStatus {
  tenantId: string;
  tenantStatus: string;
  firstLoginCompleted: boolean;
  completedRequired: number;
  totalRequired: number;
  items: BootstrapChecklistItem[];
}
