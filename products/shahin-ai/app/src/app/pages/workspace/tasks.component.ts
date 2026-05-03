import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkspaceStubComponent } from './workspace-stub.component';
import { WorkspaceShellConfigService } from '../../shell/workspace-shell-config.service';

@Component({
  selector: 'app-workspace-tasks',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, WorkspaceStubComponent],
  template: `<app-workspace-stub [title]="title()" [description]="desc()"></app-workspace-stub>`,
})
export class WorkspaceTasksComponent {
  readonly cfg = inject(WorkspaceShellConfigService);
  readonly title = computed(() => this.cfg.locale() === 'ar' ? 'مهامي' : 'My tasks');
  readonly desc  = computed(() => this.cfg.locale() === 'ar' ? 'صندوق موحد للمهام المسندة إليك عبر الوحدات.' : 'Unified inbox of tasks assigned to you across modules.');
}
