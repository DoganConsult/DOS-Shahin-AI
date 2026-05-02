import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkspaceStubComponent } from './workspace-stub.component';
import { WorkspaceShellConfigService } from '../../shell/workspace-shell-config.service';

@Component({
  selector: 'app-workspace-modules',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, WorkspaceStubComponent],
  template: `<app-workspace-stub eyebrow="workspace" [title]="title()" [description]="desc()"></app-workspace-stub>`,
})
export class WorkspaceModulesComponent {
  readonly cfg = inject(WorkspaceShellConfigService);
  readonly title = computed(() => this.cfg.locale() === 'ar' ? 'مشغل الوحدات' : 'Module launcher');
  readonly desc  = computed(() => this.cfg.locale() === 'ar' ? 'الوحدات النشطة والمعلقة والمقفلة لهذا المستأجر.' : 'Active, pending and locked modules for this tenant.');
}
