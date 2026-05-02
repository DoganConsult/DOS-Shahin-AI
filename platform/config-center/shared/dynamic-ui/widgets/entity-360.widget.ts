import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DosEntity360PanelComponent } from '@dos/ui-system';

@Component({
  selector: 'dos-dynamic-entity-360-widget',
  standalone: true,
  imports: [CommonModule, DosEntity360PanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dos-entity-360-panel
      [entityKind]="entityKind"
      [title]="title"
      [subtitle]="subtitle"
      [statusLabel]="statusLabel"
      [statusTone]="statusTone"
      [readonly]="readonly"
      [showSidePanel]="showSidePanel"
    >
      <div>{{ bodyLabel }}</div>
    </dos-entity-360-panel>
  `,
})
export class Entity360WidgetComponent {
  @Input() config?: Record<string, unknown>;

  get entityKind(): string {
    return typeof this.config?.['entityKind'] === 'string' ? (this.config['entityKind'] as string) : 'entity';
  }

  get title(): string {
    return typeof this.config?.['title'] === 'string' ? (this.config['title'] as string) : 'Entity';
  }

  get subtitle(): string | undefined {
    return typeof this.config?.['subtitle'] === 'string' ? (this.config['subtitle'] as string) : undefined;
  }

  get statusLabel(): string | undefined {
    return typeof this.config?.['statusLabel'] === 'string' ? (this.config['statusLabel'] as string) : undefined;
  }

  get statusTone(): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
    const raw = this.config?.['statusTone'];
    if (raw === 'success' || raw === 'info' || raw === 'warning' || raw === 'danger' || raw === 'neutral') return raw;
    return 'neutral';
  }

  get readonly(): boolean {
    return this.config?.['readonly'] === true;
  }

  get showSidePanel(): boolean {
    return this.config?.['showSidePanel'] === true;
  }

  get bodyLabel(): string {
    return typeof this.config?.['bodyLabel'] === 'string' ? (this.config['bodyLabel'] as string) : 'Entity 360 not configured.';
  }
}

