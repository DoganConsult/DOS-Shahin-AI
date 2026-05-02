import { Component, ChangeDetectionStrategy, inject, signal, ErrorHandler, Injectable, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

@Injectable({ providedIn: 'root' })
export class GlobalErrorBoundaryService {
  private _hasError = signal(false);
  private _errorMessage = signal('');
  private _errorStack = signal('');

  readonly hasError = this._hasError.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();
  readonly errorStack = this._errorStack.asReadonly();

  captureError(error: unknown): void {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack || '' : '';
    this._hasError.set(true);
    this._errorMessage.set(msg);
    this._errorStack.set(stack);
  }

  reset(): void {
    this._hasError.set(false);
    this._errorMessage.set('');
    this._errorStack.set('');
  }
}

@Injectable()
export class AppErrorHandler implements ErrorHandler {
  private boundary = inject(GlobalErrorBoundaryService);
  private zone = inject(NgZone);

  handleError(error: unknown): void {
    this.zone.run(() => {
      this.boundary.captureError(error);
    });
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : '';
    if (typeof console !== 'undefined') {
      console.error('[ErrorBoundary]', msg, stack);
    }
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-error-boundary',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .error-boundary { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; padding: 40px 20px; text-align: center; }
    .error-icon { font-size: 4rem; color: var(--red-400); margin-bottom: 20px; }
    .error-title { font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-color); margin: 0 0 8px; }
    .error-msg { font-size: 0.9375rem; color: var(--text-color-secondary); margin: 0 0 24px; max-width: 500px; word-break: break-word; }
    .error-actions { display: flex; gap: 12px; }
    .btn { padding: 10px 24px; border-radius: var(--radius); font-size: var(--font-size-base); font-weight: 500; cursor: pointer; border: none; }
    .btn-primary { background: var(--primary-500); color: #fff; }
    .btn-primary:hover { background: var(--primary-600); }
    .btn-secondary { background: var(--surface-100); color: var(--text-color); border: 1px solid var(--surface-border); }
    .btn-secondary:hover { background: var(--surface-200); }
    .error-details { margin-top: 20px; max-width: 600px; text-align: start; }
    .error-stack { background: var(--surface-50); border: 1px solid var(--surface-border); border-radius: var(--radius); padding: 12px; font-size: var(--font-size-sm); font-family: monospace; color: var(--text-color-secondary); white-space: pre-wrap; word-break: break-all; max-height: 200px; overflow-y: auto; }
  `],
  template: `
    @if (boundary.hasError()) {
      <div class="error-boundary" [dir]="i18n.direction()">
        <i class="pi pi-exclamation-circle error-icon"></i>
        <h2 class="error-title">{{ i18n.translate('error.title') }}</h2>
        <p class="error-msg">{{ boundary.errorMessage() }}</p>
        <div class="error-actions">
          <button class="btn btn-primary" (click)="reload()">{{ i18n.translate('error.reload') }}</button>
          <button class="btn btn-secondary" (click)="dismiss()">{{ i18n.translate('error.dismiss') }}</button>
          <button class="btn btn-secondary" (click)="showDetails.set(!showDetails())">{{ showDetails() ? i18n.translate('error.hideDetails') : i18n.translate('error.showDetails') }}</button>
        </div>
        @if (showDetails() && boundary.errorStack()) {
          <div class="error-details">
            <pre class="error-stack">{{ boundary.errorStack() }}</pre>
          </div>
        }
      </div>
    } @else {
      <ng-content />
    }
  `,
})
export class ErrorBoundaryComponent {
  boundary = inject(GlobalErrorBoundaryService);
  i18n = inject(I18nService);
  showDetails = signal(false);

  reload(): void {
    this.boundary.reset();
    window.location.reload();
  }

  dismiss(): void {
    this.boundary.reset();
  }
}
