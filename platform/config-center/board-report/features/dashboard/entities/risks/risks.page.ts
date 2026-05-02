import { Component, inject, OnInit, signal, ChangeDetectionStrategy} from '@angular/core';
import { RouterLink } from '@angular/router';
import { EvidenceApiService, type GrcRiskDto, type EvidenceAttachmentDto } from '../../../evidence/services/evidence-api.service';
import { RequiredEvidenceSectionComponent } from '../../shared/required-evidence-section/required-evidence-section.component';
import { AppHeaderComponent } from '../../../../../shared/layout/app-header.component';
import { DashboardFiltersService } from '../../dashboard-filters.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-risks-page',
    imports: [AppHeaderComponent, RequiredEvidenceSectionComponent],
    template: `
    <div class="min-h-screen bg-[var(--bg-0)] text-[var(--text-0)]">
      <app-app-header title="Risks — المخاطر" [backLink]="{ routerLink: '/dashboard', label: '← Dashboard' }" />

      <main class="mx-auto max-w-[1400px] px-4 py-5 space-y-4">
        @for (risk of risks(); track risk.id) {
          <div class="rounded-xl border border-[var(--border)] bg-[var(--bg-1)] overflow-hidden">
            <button
              type="button"
              class="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--bg-0)]/50 transition"
              (click)="toggle(risk.id)"
            >
              <div class="flex items-center gap-3">
                <span class="text-sm font-medium">{{ risk.title }}</span>
                <span class="text-xs text-[var(--text-2)]">{{ risk.titleAr }}</span>
                <span class="text-xs rounded-full px-2 py-0.5"
                  [class]="risk.severity === 'Critical' ? 'bg-[var(--danger)]/15 text-[var(--danger)]' : risk.severity === 'High' ? 'bg-[var(--warning)]/15 text-[var(--warning)]' : 'bg-[var(--info)]/15 text-[var(--info)]'">
                  {{ risk.severity }}
                </span>
                <span class="text-xs rounded-full px-2 py-0.5 bg-[var(--bg-0)] text-[var(--text-1)]">{{ risk.status }}</span>
              </div>
              <div class="flex items-center gap-2 text-xs text-[var(--text-2)]">
                <span>{{ (risk.requiredEvidenceTypeCodes?.length || 0) }} required</span>
                <span>{{ expanded() === risk.id ? '▲' : '▼' }}</span>
              </div>
            </button>

            @if (expanded() === risk.id) {
              <div class="border-t border-[var(--border)] px-4 py-3">
                <app-required-evidence-section
                  [requiredTypeCodes]="risk.requiredEvidenceTypeCodes"
                  [attachments]="attachmentsMap()[risk.id]"
                  [entityType]="'risk'"
                  [entityId]="risk.id"
                  locale="en"
                  (typesChanged)="onTypesChanged(risk.id, $event)"
                  (attachFile)="onAttach(risk.id, $event)"
                  (removeAttachment)="onRemoveAttachment($event)"
                />
              </div>
            }
          </div>
        }

        @if (risks().length === 0) {
          <p class="text-center text-[var(--text-2)] py-10">Loading risks...</p>
        }
      </main>
    </div>
  `
})
export class RisksPageComponent implements OnInit {
  private readonly api = inject(EvidenceApiService);
  private readonly filters = inject(DashboardFiltersService);

  risks = signal<GrcRiskDto[]>([]);
  expanded = signal<string | null>(null);
  attachmentsMap = signal<Record<string, EvidenceAttachmentDto[]>>({});

  ngOnInit(): void {
    const f = this.filters.filters();
    this.api.getRisks(f.tenantId, f.workspaceId).subscribe((list) => this.risks.set(list));
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
    this.api.updateRiskRequiredTypes(id, codes).subscribe((updated) => {
      this.risks.update((list) => list.map((r) => (r.id === id ? updated : r)));
    });
  }

  onAttach(entityId: string, ev: { typeCode: string; fileName: string }): void {
    this.api.addAttachment('risk', entityId, ev.typeCode, ev.fileName).subscribe(() => {
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
    this.api.getAttachments('risk', entityId).subscribe((atts) => {
      this.attachmentsMap.update((m) => ({ ...m, [entityId]: atts }));
    });
  }
}
