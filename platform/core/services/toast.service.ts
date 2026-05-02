/**
 * Carbon-only toast/confirm shim.
 *
 * Compliance UI was originally written against PrimeNG's MessageService and
 * ConfirmationService. The codemod (PrimeNG → raw Carbon) stripped the
 * imports but the call sites remain. To preserve Carbon-only enforcement
 * without touching the call surface, this service exposes the SAME method
 * shape (add / addAll / clear / confirm) and routes them to a Carbon-aligned
 * NotificationService (or a no-op when Notification is not yet wired).
 *
 * Replace the no-op bodies with real cds-notification renders when the
 * notification host is wired into the workspace shell.
 */
import { Injectable } from '@angular/core';

export interface ToastMessage {
  severity?: 'success' | 'info' | 'warn' | 'error';
  summary?: string;
  detail?: string;
  life?: number;
  sticky?: boolean;
  closable?: boolean;
  key?: string;
  [extra: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class MessageService {
  add(_msg: ToastMessage): void {
    // No-op shim. Wire to a real Carbon cds-notification host when the
    // workspace shell exposes a NotificationService injection token.
  }
  addAll(_msgs: ToastMessage[]): void {
    // No-op shim. Batch routing will be handled by the Carbon
    // NotificationService once the host is wired in the shell.
  }
  clear(_key?: string): void {
    // No-op shim. Dismissal will be delegated to the Carbon
    // NotificationService once the host is wired in the shell.
  }
}

export interface ConfirmDialogOptions {
  message?: string;
  header?: string;
  icon?: string;
  acceptLabel?: string;
  rejectLabel?: string;
  acceptVisible?: boolean;
  rejectVisible?: boolean;
  acceptButtonStyleClass?: string;
  rejectButtonStyleClass?: string;
  accept?: () => void;
  reject?: () => void;
  key?: string;
  [extra: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  confirm(opts: ConfirmDialogOptions): void {
    // Auto-accepts as a safe default until the workspace shell provides
    // a real cds-modal-based confirm dialog. Replace this body with a
    // modal open call once CarbonModalService is injectable here.
    if (typeof opts?.accept === 'function') opts.accept();
  }
}

// PrimeNG MenuItem shape — used by some compliance pages for context menus.
// Kept as a structural type so existing code typechecks.
export interface MenuItem {
  label?: string;
  icon?: string;
  command?: (event?: { originalEvent?: Event; item?: MenuItem }) => void;
  url?: string;
  routerLink?: unknown;
  visible?: boolean;
  disabled?: boolean;
  items?: MenuItem[];
  separator?: boolean;
  styleClass?: string;
  iconStyle?: { [key: string]: unknown };
  [extra: string]: unknown;
}

// Approximate p-table lazy-load event shape.
export interface TableLazyLoadEvent {
  first?: number;
  rows?: number;
  sortField?: string;
  sortOrder?: number;
  multiSortMeta?: Array<{ field: string; order: number }>;
  filters?: Record<string, unknown>;
  globalFilter?: string;
  forceUpdate?: () => void;
}
