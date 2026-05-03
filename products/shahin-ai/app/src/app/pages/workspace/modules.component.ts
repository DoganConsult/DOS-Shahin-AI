import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkspaceStubComponent } from './workspace-stub.component';
import { WorkspaceResolverService } from '../../shell/workspace-resolver.service';

@Component({
  selector: 'app-workspace-modules',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, WorkspaceStubComponent],
  template: `<app-workspace-stub [title]="title()" [description]="desc()"></app-workspace-stub>`,
})
export class WorkspaceModulesComponent {
  private readonly resolver = inject(WorkspaceResolverService);
  readonly title = computed(() => this.resolver.string('workspace.page.modules.title'));
  readonly desc = computed(() => this.resolver.string('workspace.page.modules.description'));
}
