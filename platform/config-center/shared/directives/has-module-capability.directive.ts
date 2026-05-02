/**
 * Structural directive that conditionally renders elements based on
 * module-level capabilities (canRead, canWrite, canApprove, etc.).
 *
 * Usage:
 *   <button *appModuleCap="'risk:canWrite'">Edit Risk</button>
 *   <div *appModuleCap="'audit:canExport'">Export Section</div>
 *
 * Format: 'moduleCode:capability' where capability is one of:
 *   canRead, canWrite, canApprove, canDelete, canExport, canAdmin
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
import { hasModuleCapability, ModuleRoleCapability } from '../security/module-role-map';

@Directive({
  selector: '[appModuleCap]',
  standalone: true,
})
export class HasModuleCapabilityDirective {
  private readonly auth = inject(GrcAuthService);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);

  private hasView = false;
  private moduleCode = '';
  private capability: keyof ModuleRoleCapability = 'canRead';

  private readonly capEffect = effect(() => {
    const _role = this.auth.currentRole();
    this.updateView();
  });

  @Input()
  set appModuleCap(expr: string) {
    const [mod, cap] = expr.split(':');
    this.moduleCode = mod ?? '';
    this.capability = (cap as keyof ModuleRoleCapability) ?? 'canRead';
    this.updateView();
  }

  private updateView(): void {
    if (!this.moduleCode) return;

    const role = this.auth.currentRole();
    const allowed = role ? hasModuleCapability(this.moduleCode, role, this.capability) : false;

    if (allowed && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!allowed && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }

}
