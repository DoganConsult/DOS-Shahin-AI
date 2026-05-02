import { Component, inject, OnInit, signal, ChangeDetectionStrategy} from '@angular/core';
import { RouterLink } from '@angular/router';
import { EvidenceApiService, type GrcControlDto, type EvidenceAttachmentDto } from '../../../evidence/services/evidence-api.service';
import { RequiredEvidenceSectionComponent } from '../../shared/required-evidence-section/required-evidence-section.component';
import { AppHeaderComponent } from '../../../../../shared/layout/app-header.component';
import { DashboardFiltersService } from '../../dashboard-filters.service';
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-controls-page',
    imports: [AppHeaderComponent, RequiredEvidenceSectionComponent],
    template: `
    <div class="min-h-screen bg-[var(--bg-0)] text-[var(--text-0)]">
      <app-app-header title="Controls — الضوابط" [backLink]="{ routerLink: '/dashboard', label: '← Dashboard' }" />

      <main class="mx-auto max-w-[1400px] px-4 py-5 space-y-4">
        @for (ctrl of controls(); track ctrl.id) {
          <div class="rounded-xl border border-[var(--border)] bg-[var(--bg-1)] overflow-hidden">
            <button
              type="button"
              class="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--bg-0)]/50 transition"
              (click)="toggle(ctrl.id)"
            >
              <div class="flex items-center gap-3">
                <span class="text-xs font-mono bg-[var(--bg-0)] rounded px-2 py-0.5 text-[var(--text-1)]">{{ ctrl.controlRef }}</span>
                <span class="text-sm font-medium">{{ ctrl.title }}</span>
                <span class="text-xs text-[var(--text-2)]">{{ ctrl.titleAr }}</span>
                <span class="text-xs rounded-full px-2 py-0.5"
                  [class]="ctrl.severity === 'Critical' ? 'bg-[var(--danger)]/15 text-[var(--danger)]' : ctrl.severity === 'High' ? 'bg-[var(--warning)]/15 text-[var(--warning)]' : 'bg-[var(--info)]/15 text-[var(--info)]'">
                  {{ ctrl.severity }}
                </span>
              </div>
              <div class="flex items-center gap-2 text-xs text-[var(--text-2)]">
                <span>{{ (ctrl.requiredEvidenceTypeCodes?.length || 0) }} required</span>
                <span>{{ expanded() === ctrl.id ? '▲' : '▼' }}</span>
              </div>
            </button>

            @if (expanded() === ctrl.id) {
              <div class="border-t border-[var(--border)] px-4 py-3 space-y-4">
                <app-ai-entity-context [entityType]="'control'" [entityId]="ctrl.id" />
                <app-required-evidence-section
                  [requiredTypeCodes]="ctrl.requiredEvidenceTypeCodes"
                  [attachments]="attachmentsMap()[ctrl.id]"
                  [entityType]="'control'"
                  [entityId]="ctrl.id"
                  locale="en"
                  (typesChanged)="onTypesChanged(ctrl.id, $event)"
                  (attachFile)="onAttach(ctrl.id, $event)"
                  (removeAttachment)="onRemoveAttachment($event)"
                />
              </div>
            }
          </div>
        }

        @if (controls().length === 0) {
          <p class="text-center text-[var(--text-2)] py-10">Loading controls...</p>
        }
      </main>
    </div>
  `
})
export class ControlsPageComponent implements OnInit {
  private readonly api = inject(EvidenceApiService);
  private readonly filters = inject(DashboardFiltersService);

  controls = signal<GrcControlDto[]>([]);
  expanded = signal<string | null>(null);
  attachmentsMap = signal<Record<string, EvidenceAttachmentDto[]>>({});

  ngOnInit(): void {
    const f = this.filters.filters();
    this.api.getControls(f.tenantId, f.workspaceId).subscribe((list) => this.controls.set(list));
  }

  toggle(id: string): void {
    if (this.expanded() === id) {
      this.expanded.set(null);
    } else {
      this.expanded.set(id);
      this.loadAttachments(id);
    }
  }

  onTypesChanged(id: string, codes: string[]): void {
    this.api.updateControlRequiredTypes(id, codes).subscribe((updated) => {
      this.controls.update((list) => list.map((c) => (c.id === id ? updated : c)));
    });
  }

  onAttach(entityId: string, ev: { typeCode: string; fileName: string }): void {
    this.api.addAttachment('control', entityId, ev.typeCode, ev.fileName).subscribe(() => {
      this.loadAttachments(entityId);
    });
  }

  onRemoveAttachment(attId: string): void {
    this.api.deleteAttachment(attId).subscribe(() => {
      const expId = this.expanded();
      if (expId) this.loadAttachments(expId);
    });
  }

  private loadAttachments(entityId: string): void {
    this.api.getAttachments('control', entityId).subscribe((atts) => {
      this.attachmentsMap.update((m) => ({ ...m, [entityId]: atts }));
    });
  }
}
