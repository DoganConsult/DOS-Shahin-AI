export const FOUNDATION_ENTITY_TYPES = ['organization', 'business_unit', 'department', 'position', 'legal_entity'] as const;

export const FOUNDATION_STATUSES = ['draft', 'in_review', 'approved', 'published', 'active', 'suspended', 'archived'] as const;

export const FOUNDATION_DEFAULT_STATUS = 'draft';

export const FOUNDATION_LIMITS = {
  maxDepth: 10,
  maxChildrenPerNode: 100,
  maxNodesPerTenant: 5000,
} as const;
