/**
 * Structural directive that conditionally renders action elements based on
 * action visibility rules from the security barrel.
 *
 * Two-layer check: the element is shown only if the action is both visible
 * AND enabled for the current role. If visible but not enabled, the element
 * is rendered but disabled via a context variable.
 *
 * Usage:
 *   <button *appActionVisible="'risk.record.create'">Create Risk</button>
 *
 *   <!-- With enabled context -->
 *   <button *appActionVisible="'risk.record.approve'; let ctx"
 *           [disabled]="!ctx.enabled">Approve</button>
 */

import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
  effect,
  EmbeddedViewRef,
} from '@angular/core';
import { SessionService } from '../../../dauth/session/session.service';
import { isActionVisible, isActionEnabled } from '../security/module-action-visibility';

interface ActionVisibilityContext {
  /** Whether the action is enabled (clickable) for the current role */
  enabled: boolean;
  /** The action code being checked */
  actionCode: string;
}

@Directive({
  selector: '[appActionVisible]',
  standalone: true,
})
export class HasActionVisibilityDirective {
  private readonly auth = inject(SessionService);
  private readonly templateRef = inject(TemplateRef<ActionVisibilityContext>);
  private readonly viewContainer = inject(ViewContainerRef);

  private viewRef: EmbeddedViewRef<ActionVisibilityContext> | null = null;
  private actionCode = '';

  private readonly visibilityEffect = effect(() => {
    const _role = this.auth.currentRole();
    this.updateView();
  });

  @Input()
  set appActionVisible(actionCode: string) {
    this.actionCode = actionCode;
    this.updateView();
  }

  private updateView(): void {
    if (!this.actionCode) return;

    const role = this.auth.currentRole();
    if (!role) {
      this.clearView();
      return;
    }

    const visible = isActionVisible(this.actionCode, role);
    const enabled = isActionEnabled(this.actionCode, role);

    if (visible) {
      const ctx: ActionVisibilityContext = { enabled, actionCode: this.actionCode };
      if (this.viewRef) {
        this.viewRef.context = ctx;
      } else {
        this.viewRef = this.viewContainer.createEmbeddedView(this.templateRef, ctx);
      }
    } else {
      this.clearView();
    }
  }

  private clearView(): void {
    if (this.viewRef) {
      this.viewContainer.clear();
      this.viewRef = null;
    }
  }

}
