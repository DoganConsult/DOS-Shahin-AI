import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkspaceStubComponent } from './workspace-stub.component';
import { WorkspaceShellConfigService } from '../../shell/workspace-shell-config.service';

@Component({
  selector: 'app-workspace-approvals',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, WorkspaceStubComponent],
  template: `<app-workspace-stub [title]="title()" [description]="desc()"></app-workspace-stub>`,
})
export class WorkspaceApprovalsComponent {
  readonly cfg = inject(WorkspaceShellConfigService);
  readonly title = computed(() => this.cfg.locale() === 'ar' ? 'الموافقات' : 'Approvals');
  readonly desc  = computed(() => this.cfg.locale() === 'ar' ? 'راجع واتخذ قرار بشأن الموافقات قيد الانتظار.' : 'Review and decide pending workflow approvals.');
}
