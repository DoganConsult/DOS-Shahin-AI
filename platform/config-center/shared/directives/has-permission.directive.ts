/**
 * Structural directive that conditionally renders elements based on user permissions.
 *
 * Usage:
 *   <button *appHasPermission="'risk:write'">Edit</button>
 *   <button *appHasPermission="'risk:delete'">Delete</button>
 *
 * Uses GrcAuthService.hasPermission() which checks:
 *   1. Enterprise RBAC (authz-client)
 *   2. Role-based permission matrix
 */

import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
  effect,
} from '@angular/core';
import { GrcAuthService } from '../../../core/services/grc-auth.service';

@Directive({
  selector: '[appHasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private readonly auth = inject(GrcAuthService);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);

  private hasView = false;
  private requiredPermission = '';

  private readonly permissionEffect = effect(() => {
    // Re-evaluate when role changes (currentRole is a signal)
    const _role = this.auth.currentRole();
    this.updateView();
  });

  @Input()
  set appHasPermission(permission: string) {
    this.requiredPermission = permission;
    this.updateView();
  }

  private updateView(): void {
    if (!this.requiredPermission) return;

    const allowed = this.auth.hasPermission(this.requiredPermission);

    if (allowed && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!allowed && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }

}
