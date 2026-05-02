import { Component, inject, OnInit, signal, ChangeDetectionStrategy} from '@angular/core';
import { RouterLink } from '@angular/router';
import { EvidenceApiService, type GrcFrameworkDto, type EvidenceAttachmentDto } from '../../../evidence/services/evidence-api.service';
import { RequiredEvidenceSectionComponent } from '../../shared/required-evidence-section/required-evidence-section.component';
import { AppHeaderComponent } from '../../../../../shared/layout/app-header.component';
import { DashboardFiltersService } from '../../dashboard-filters.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-frameworks-page',
    imports: [AppHeaderComponent, RequiredEvidenceSectionComponent],
    template: `
    <div class="min-h-screen bg-[var(--bg-0)] text-[var(--text-0)]">
      <app-app-header title="Frameworks — الأُطُر التنظيمية" [backLink]="{ routerLink: '/dashboard', label: '← Dashboard' }" />

      <main class="mx-auto max-w-[1400px] px-4 py-5 space-y-4">
        @for (fw of frameworks(); track fw.id) {
          <div class="rounded-xl border border-[var(--border)] bg-[var(--bg-1)] overflow-hidden">
            <button
              type="button"
              class="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--bg-0)]/50 transition"
              (click)="toggle(fw.id)"
            >
              <div class="flex items-center gap-3">
                <span class="text-xs font-mono bg-[var(--bg-0)] rounded px-2 py-0.5 text-[var(--text-1)]">{{ fw.key }}</span>
                <span class="text-sm font-medium">{{ fw.title }}</span>
                <span class="text-xs text-[var(--text-2)]">{{ fw.titleAr }}</span>
              </div>
              <div class="flex items-center gap-2 text-xs text-[var(--text-2)]">
                <span>{{ (fw.defaultRequiredEvidenceTypeCodes?.length || 0) }} default types</span>
                <span>{{ expanded() === fw.id ? '▲' : '▼' }}</span>
              </div>
            </button>

            @if (expanded() === fw.id) {
              <div class="border-t border-[var(--border)] px-4 py-3">
                <app-required-evidence-section
                  [requiredTypeCodes]="fw.defaultRequiredEvidenceTypeCodes"
                  [attachments]="attachmentsMap()[fw.id]"
                  [entityType]="'framework'"
                  [entityId]="fw.id"
                  locale="en"
                  (typesChanged)="onTypesChanged(fw.id, $event)"
                  (attachFile)="onAttach(fw.id, $event)"
                  (removeAttachment)="onRemoveAttachment($event)"
                />
              </div>
            }
          </div>
        }

        @if (frameworks().length === 0) {
          <p class="text-center text-[var(--text-2)] py-10">Loading frameworks...</p>
        }
      </main>
    </div>
  `
})
export class FrameworksPageComponent implements OnInit {
  private readonly api = inject(EvidenceApiService);
  private readonly filters = inject(DashboardFiltersService);

  frameworks = signal<GrcFrameworkDto[]>([]);
  expanded = signal<string | null>(null);
  attachmentsMap = signal<Record<string, EvidenceAttachmentDto[]>>({});

  ngOnInit(): void {
    const f = this.filters.filters();
    this.api.getFrameworks(f.tenantId, f.workspaceId).subscribe((list) => this.frameworks.set(list));
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
    this.api.updateFrameworkRequiredTypes(id, codes).subscribe((updated) => {
      this.frameworks.update((list) => list.map((f) => (f.id === id ? updated : f)));
    });
  }

  onAttach(entityId: string, ev: { typeCode: string; fileName: string }): void {
    this.api.addAttachment('framework', entityId, ev.typeCode, ev.fileName).subscribe(() => {
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
    this.api.getAttachments('framework', entityId).subscribe((atts) => {
      this.attachmentsMap.update((m) => ({ ...m, [entityId]: atts }));
    });
  }
}
