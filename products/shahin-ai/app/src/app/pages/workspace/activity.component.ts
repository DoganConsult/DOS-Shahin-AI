import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkspaceStubComponent } from './workspace-stub.component';
import { WorkspaceShellConfigService } from '../../shell/workspace-shell-config.service';

@Component({
  selector: 'app-workspace-activity',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, WorkspaceStubComponent],
  template: `<app-workspace-stub eyebrow="workspace" [title]="title()" [description]="desc()"></app-workspace-stub>`,
})
export class WorkspaceActivityComponent {
  readonly cfg = inject(WorkspaceShellConfigService);
  readonly title = computed(() => this.cfg.locale() === 'ar' ? 'النشاط الأخير' : 'Recent activity');
  readonly desc  = computed(() => this.cfg.locale() === 'ar' ? 'سجل النشاط والتدقيق عبر الوحدات لهذا المستأجر.' : 'Cross-module audit and activity feed for this tenant.');
}
