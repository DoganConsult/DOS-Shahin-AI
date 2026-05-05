/**
 * Workspace resolver — stub.
 * Labels resolved from DB via DynamicUiBootstrapService.
 */
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WorkspaceResolverService {
  resolve(_key: string): string { return _key; }
}
