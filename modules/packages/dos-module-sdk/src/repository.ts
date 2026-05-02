import type { PaginatedResult, PaginationParams } from '@dos/types';

/**
 * Standard Read-Only Repository Interface
 * @typeParam T - The core entity type returned by the repository
 * @typeParam ID - The identifier type (defaults to string/UUID)
 * @typeParam Filter - Optional filter parameters type
 */
export interface ReadRepository<T, ID = string, Filter extends Record<string, unknown> = Record<string, unknown>> {
  /** Find a specific entity by its identifier */
  findById(id: ID, tenantId?: string): Promise<T | null>;

  /** Retrieve all entities (without pagination) */
  findAll(tenantId?: string): Promise<T[]>;

  /** Retrieve entities matching specific filters (without pagination) */
  findBy?(filter: Filter, tenantId?: string): Promise<T[]>;

  /** Retrieve paginated entities */
  findPaginated?(params: PaginationParams, filter?: Filter, tenantId?: string): Promise<PaginatedResult<T>>;

  /** Count entities matching filters */
  count?(filter?: Filter, tenantId?: string): Promise<number>;
}

/**
 * Standard Read/Write Repository Interface
 * Extends the ReadRepository with mutation methods.
 * 
 * @typeParam T - The core entity type returned by the repository
 * @typeParam ID - The identifier type (defaults to string/UUID)
 * @typeParam CreateDTO - The DTO type used for creating entities
 * @typeParam UpdateDTO - The DTO type used for updating entities
 */
export interface Repository<
  T,
  ID = string,
  CreateDTO = Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
  UpdateDTO = Partial<CreateDTO>,
  Filter extends Record<string, unknown> = Record<string, unknown>
> extends ReadRepository<T, ID, Filter> {
  /** Create a new entity */
  create(data: CreateDTO, tenantId?: string): Promise<T>;

  /** Update an existing entity by its identifier */
  update(id: ID, data: UpdateDTO, tenantId?: string): Promise<T>;

  /** Delete an entity by its identifier */
  delete(id: ID, tenantId?: string): Promise<boolean>;

  /** Soft-delete an entity (if supported by schema) */
  softDelete?(id: ID, tenantId?: string): Promise<boolean>;

  /** Restore a soft-deleted entity */
  restore?(id: ID, tenantId?: string): Promise<boolean>;
}
