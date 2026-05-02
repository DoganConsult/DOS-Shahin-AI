// ============================================
// AGRC-OS contextual drawer: template zones + action items
// ============================================

import { Component, Input, OnInit, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgrcosUiService, type DrawerPayload } from '@app/grc/agrc-os-ui.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-agrc-os-drawer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="agrc-drawer" *ngIf="payload">
      <header class="drawer-header" *ngIf="payload.template">
        <h3 class="drawer-title">{{ payload.template.nameEn }}</h3>
      </header>
      <div class="drawer-zones" *ngIf="payload.template?.zones?.length">
        <section *ngFor="let zone of (payload.template?.zones ?? [])" class="drawer-zone">
          <h4 class="zone-title">{{ zone.title_en || zone.id }}</h4>
          <div class="zone-content" *ngIf="zone.id === 'header' && payload.workspaceProfile">
            <p class="profile-line">{{ payload.workspaceProfile.industry }} · {{ payload.workspaceProfile.orgSize }}</p>
            <p class="profile-line" *ngIf="payload.workspaceProfile.defaultDashboard">Default: {{ payload.workspaceProfile.defaultDashboard }}</p>
          </div>
          <ul class="action-list" *ngIf="zone.id === 'actions' && payload.actionItems?.length">
            <li *ngFor="let item of payload.actionItems" class="action-item">
              <span class="action-title">{{ item.title }}</span>
              <span class="action-meta">{{ item.status }} · P{{ item.priority }}</span>
            </li>
          </ul>
          <div class="zone-placeholder" *ngIf="zone.id !== 'header' && zone.id !== 'actions'">
            {{ zone.title_en || zone.id }}
          </div>
        </section>
      </div>
      <div class="drawer-actions-standalone" *ngIf="payload.actionItems?.length && !payload.template">
        <h4>Action items</h4>
        <ul class="action-list">
          <li *ngFor="let item of payload.actionItems" class="action-item">
            <span class="action-title">{{ item.title }}</span>
            <span class="action-meta">{{ item.status }} · P{{ item.priority }}</span>
          </li>
        </ul>
      </div>
    </aside>
  `,
  styles: [`
    .agrc-drawer {
      width: 320px;
      max-width: 100%;
      background: var(--surface-card, #fff);
      border-inline-start: 1px solid var(--surface-border, #dee2e6);
      padding: 1rem;
      min-height: 200px;
    }
    .drawer-header { margin-bottom: 1rem; }
    .drawer-title { font-size: var(--font-size-md); font-weight: 700; margin: 0; color: var(--text-color); }
    .drawer-zones { display: flex; flex-direction: column; gap: 1rem; }
    .drawer-zone { border-bottom: 1px solid var(--surface-border); padding-bottom: 0.75rem; }
    .drawer-zone:last-child { border-bottom: none; }
    .zone-title { font-size: var(--font-size-sm); font-weight: 600; text-transform: uppercase; color: var(--text-color-secondary); margin: 0 0 0.5rem 0; }
    .zone-content .profile-line { font-size: var(--font-size-base); margin: 0.25rem 0; color: var(--text-color); }
    .action-list { list-style: none; margin: 0; padding: 0; }
    .action-item { padding: 0.5rem 0; border-bottom: 1px solid var(--surface-ice); display: flex; flex-direction: column; gap: 2px; }
    .action-item:last-child { border-bottom: none; }
    .action-title { font-size: var(--font-size-base); font-weight: 500; }
    .action-meta { font-size: var(--font-size-sm); color: var(--text-color-secondary); }
    .zone-placeholder { font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .drawer-actions-standalone { margin-top: 1rem; }
    .drawer-actions-standalone h4 { font-size: var(--font-size-sm); font-weight: 600; margin: 0 0 0.5rem 0; }
  `],
})
export class AgrcosDrawerComponent implements OnInit {
  @Input() context?: string;

  payload: DrawerPayload | null = null;
  private readonly ui = inject(AgrcosUiService);

  ngOnInit(): void {
    this.ui.getDrawer(this.context).subscribe({
      next: (p: DrawerPayload) => (this.payload = p),
      error: () => (this.payload = null),
    });
  }

}
