// Shell-only build stub: the legacy implementation in
// ./module-navigation/module-action-bar.component depends on PrimeNG v19
// templates that are out-of-scope for the workspace shell frame.
// Replaced with a minimal Angular component preserving the public surface
// consumed by ShellHostComponent. Restore the original re-export when the
// module-chrome migration phase ships.
import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy,
} from '@angular/core';

export type ActionBarSlot = 'new' | 'import' | 'bulk' | 'filter' | 'viewSwitch' | 'export' | 'aiAssist';
export interface ActionBarItem {
  slot: ActionBarSlot;
  labelEn: string;
  labelAr: string;
  icon: string;
  primary?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  badge?: number;
}
export type ViewMode = 'table' | 'cards' | 'board' | 'timeline';

@Component({
  selector: 'app-module-action-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
export class ModuleActionBarComponent {
  @Input() items: ActionBarItem[] = [];
  @Input() lang: 'en' | 'ar' = 'en';
  @Input() showSearch: boolean = false;
  @Input() viewModes: ViewMode[] = [];
  @Input() activeView: ViewMode | null = null;
  @Output() slotClick = new EventEmitter<ActionBarSlot>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() viewChange = new EventEmitter<ViewMode>();
}
