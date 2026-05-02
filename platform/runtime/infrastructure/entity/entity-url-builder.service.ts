import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class EntityUrlBuilderService {
  buildUrl(moduleCode: string, entityType: string, entityId: string): string {
    return `/${moduleCode}/${entityType}/${entityId}`;
  }

  buildEntityUrl(entityType: string, entityId: string, moduleCode?: string): string {
    return moduleCode ? this.buildUrl(moduleCode, entityType, entityId) : `/${entityType}/${entityId}`;
  }

  buildListUrl(moduleCode: string, entityType: string): string {
    return `/${moduleCode}/${entityType}`;
  }
}
