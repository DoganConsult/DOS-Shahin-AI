import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-entity-detail-drawer',
    standalone: true,
    imports: [CommonModule],
    template: `
      <div class="drawer-overlay" *ngIf="visible" (click)="close()">
        <div class="drawer-panel" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <h3>{{ title }}</h3>
            <button class="drawer-close" (click)="close()">&times;</button>
          </div>
          <div class="drawer-body"><ng-content></ng-content></div>
        </div>
      </div>
    `,
    styles: [`
      .drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 1000; display: flex; justify-content: flex-end; }
      .drawer-panel { width: 480px; max-width: 90vw; background: var(--surface-card); height: 100%; overflow-y: auto; box-shadow: -4px 0 16px rgba(0,0,0,0.1); }
      .drawer-header { display: flex; align-items: center; justify-content: space-between; padding: var(--space-md); border-bottom: 1px solid var(--surface-border); }
      .drawer-header h3 { margin: 0; font-size: 1.1rem; }
      .drawer-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted); }
      .drawer-body { padding: var(--space-md); }
    `]
})
export class EntityDetailDrawerComponent {
    @Input() visible: boolean = false;
    @Input() title: string = '';
    @Input() entityType: string = '';
    @Input() entityId: string = '';
    @Output() visibleChange = new EventEmitter<boolean>();

    close(): void {
        this.visible = false;
        this.visibleChange.emit(false);
    }
}
