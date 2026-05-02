export interface FoundationEntity { id: string; name: string; type: string; parentId?: string; }
export interface FoundationHierarchy { entities: FoundationEntity[]; rootId: string; }
export type FoundationEntityType = 'user' | 'department' | 'role' | 'team' | 'unit';
