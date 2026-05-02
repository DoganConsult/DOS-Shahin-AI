import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkspaceStubComponent } from './workspace-stub.component';
import { WorkspaceShellConfigService } from '../../shell/workspace-shell-config.service';

@Component({
  selector: 'app-workspace-ai',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, WorkspaceStubComponent],
  template: `<app-workspace-stub eyebrow="workspace" [title]="title()" [description]="desc()"></app-workspace-stub>`,
})
export class WorkspaceAiComponent {
  readonly cfg = inject(WorkspaceShellConfigService);
  readonly title = computed(() => this.cfg.locale() === 'ar' ? 'مساعد الذكاء' : 'AI Copilot');
  readonly desc  = computed(() => this.cfg.locale() === 'ar' ? 'مساعد مساحة العمل — اسأل، ابحث، أنشئ، تنقّل.' : 'Workspace assistant — ask, search, create, navigate.');
}
