import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';

import { I18nService } from '@app/core/services/ui-infra/i18n.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface KillSwitch {
  id: string;
  asset_id?: string;
  asset_name: string;
  asset_type: string;
  kill_switch_type?: string;
  trigger_method?: string;
  fallback_procedure?: string;
  status: 'ready' | 'activated' | 'testing';
  last_tested_at?: string;
  activated_at?: string;
  created_at?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
    selector: 'app-ai-killswitch-panel',
    imports: [
        CommonModule,
        DatePipe,
        TagModule,
        ButtonModule,
        ToolbarModule,
        TooltipModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="section-title mt-section-lg">
      {{ i18n.translate('aiGov.killswitch.title') || 'Kill Switches' }}
    </div>

    <p-toolbar styleClass="mb-3">
      <ng-template #start>
        <button pButton icon="pi pi-plus"
          [label]="i18n.translate('aiGov.killswitch.register') || 'Register Kill Switch'"
          class="p-button-sm"
          (click)="register.emit()">
        </button>
      </ng-template>
    </p-toolbar>

    <div class="ks-grid">
      @for (ks of killSwitches; track ks.id) {
        <div class="ks-card">
          <div class="ks-card-header">
            <span class="ks-name">{{ ks.asset_name }}</span>
            <p-tag [value]="ks.status" [severity]="ksStatusColor(ks.status)" />
          </div>
          <div class="ks-type">{{ ks.asset_type }}{{ ks.kill_switch_type ? ' / ' + ks.kill_switch_type : '' }}</div>
          @if (ks.last_tested_at) {
            <div class="text-xs-muted">
              {{ i18n.translate('aiGov.killswitch.lastTested') || 'Last tested' }}: {{ ks.last_tested_at | date:'short' }}
            </div>
          }
          <div class="ks-actions">
            <button pButton icon="pi pi-play"
              [label]="i18n.translate('aiGov.killswitch.test') || 'Test'"
              class="p-button-sm p-button-outlined"
              [loading]="testingId === ks.id"
              (click)="test.emit(ks)">
            </button>
            <button pButton icon="pi pi-power-off"
              [label]="i18n.translate('aiGov.killswitch.activate') || 'Activate'"
              class="p-button-sm p-button-danger"
              [disabled]="ks.status === 'activated'"
              (click)="activate.emit(ks)">
            </button>
            <button pButton icon="pi pi-trash"
              class="p-button-sm p-button-text p-button-danger"
              [pTooltip]="i18n.translate('common.delete') || 'Delete'"
              (click)="deleteKs.emit(ks)">
            </button>
          </div>
        </div>
      } @empty {
        <div class="empty-cell col-full">
          {{ i18n.translate('aiGov.killswitch.none') || 'No kill switches registered.' }}
        </div>
      }
    </div>
  `,
    styles: [`
    .section-title { font-size:var(--font-size-lg); font-weight:700; color:var(--text-heading); margin:16px 0 8px; }
    .mt-section-lg { margin-top:32px; }
    .mb-3 { margin-bottom:16px; }
    .ks-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px; }
    .ks-card { background:var(--surface-card); border:1px solid var(--surface-border); border-radius:var(--radius-md); padding:16px; display:flex; flex-direction:column; gap:8px; }
    .ks-card-header { display:flex; align-items:center; gap:8px; }
    .ks-name { font-weight:700; font-size:var(--font-size-base); }
    .ks-type { font-size:var(--font-size-sm); color:var(--text-muted); }
    .ks-actions { display:flex; gap:6px; margin-top:auto; }
    .text-xs-muted { font-size:var(--font-size-xs); color:var(--text-muted); }
    .empty-cell { text-align:center; padding:24px; color:var(--text-muted); }
    .col-full { grid-column:1/-1; }
    @media(max-width:768px) { .ks-grid { grid-template-columns:1fr; } }
  `]
})
export class AiKillswitchPanelComponent {
  readonly i18n = inject(I18nService);

  /** Kill switches to display. */
  @Input() killSwitches: KillSwitch[] = [];

  /** ID of the kill switch currently being tested (for loading state). */
  @Input() testingId: string | null = null;

  /** Emitted when "Register Kill Switch" is clicked. */
  @Output() register = new EventEmitter<void>();

  /** Emitted when a kill switch's test button is clicked. */
  @Output() test = new EventEmitter<KillSwitch>();

  /** Emitted when a kill switch's activate button is clicked. */
  @Output() activate = new EventEmitter<KillSwitch>();

  /** Emitted when a kill switch's delete button is clicked. */
  @Output() deleteKs = new EventEmitter<KillSwitch>();

  /** Map kill switch status to PrimeNG tag severity. */
  ksStatusColor(status: string): 'success' | 'danger' | 'warning' | 'secondary' {
    switch (status) {
      case 'ready': return 'success';
      case 'activated': return 'danger';
      case 'testing': return 'warning';
      default: return 'secondary';
    }
  }
}
