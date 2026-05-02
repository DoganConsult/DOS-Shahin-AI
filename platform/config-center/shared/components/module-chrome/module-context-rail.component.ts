// Shell-only build stub: the legacy implementation in
// ./module-navigation/module-context-rail.component depends on PrimeNG v19
// templates that are out-of-scope for the workspace shell frame.
// Replaced with a minimal Angular component preserving the public surface
// consumed by ShellHostComponent. Restore the original re-export when the
// module-chrome migration phase ships.
import {
  Component, Input, ChangeDetectionStrategy,
} from '@angular/core';

export interface RelatedRecord {
  id: string;
  type: string;
  label: string;
  icon: string;
  route?: string;
  severity?: string;
}
export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  detail?: string;
}
export interface NoteEntry {
  id: string;
  author: string;
  timestamp: string;
  content: string;
  pinned?: boolean;
}

@Component({
  selector: 'app-module-context-rail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
export class ModuleContextRailComponent {
  @Input() moduleCode: string = '';
  @Input() lang: 'en' | 'ar' = 'en';
  @Input() activity: any[] = [];
  @Input() relatedRecords: RelatedRecord[] = [];
  @Input() auditTrail: AuditEntry[] = [];
  @Input() notes: NoteEntry[] = [];
}
