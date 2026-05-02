import { Component, inject, OnInit, signal, ChangeDetectionStrategy} from '@angular/core';
import { RouterLink } from '@angular/router';
import { EvidenceApiService, type PolicyDto, type EvidenceAttachmentDto } from '../../../evidence/services/evidence-api.service';
import { RequiredEvidenceSectionComponent } from '../../shared/required-evidence-section/required-evidence-section.component';
import { getEvidenceTypeLabel } from '../../../../../../core/constants/evidence-artifact-types';
import { AppHeaderComponent } from '../../../../../shared/layout/app-header.component';
import { DashboardFiltersService } from '../../dashboard-filters.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-policies-page',
    imports: [AppHeaderComponent, RequiredEvidenceSectionComponent],
    template: `
    <div class="min-h-screen bg-[var(--bg-0)] text-[var(--text-0)]">
      <app-app-header title="Policies — السياسات" [backLink]="{ routerLink: '/dashboard', label: '← Dashboard' }" />

      <main class="mx-auto max-w-[1400px] px-4 py-5 space-y-4">
        @for (pol of policies(); track pol.id) {
          <div class="rounded-xl border border-[var(--border)] bg-[var(--bg-1)] overflow-hidden">
            <!-- Row header -->
            <button
              type="button"
              class="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--bg-0)]/50 transition"
              (click)="toggle(pol.id)"
            >
              <div class="flex items-center gap-3">
                <span class="text-sm font-medium">{{ pol.title }}</span>
                <span class="text-xs text-[var(--text-2)]">{{ pol.titleAr }}</span>
                <span class="text-xs rounded-full px-2 py-0.5"
                  [class]="pol.status === 'Published' ? 'bg-[var(--success)]/15 text-[var(--success)]' : pol.status === 'Draft' ? 'bg-[var(--text-2)]/15 text-[var(--text-2)]' : 'bg-[var(--warning)]/15 text-[var(--warning)]'">
                  {{ pol.status }}
                </span>
              </div>
              <div class="flex items-center gap-2 text-xs text-[var(--text-2)]">
                <span>{{ (pol.requiredEvidenceTypeCodes?.length || 0) }} required types</span>
                <span>{{ expanded() === pol.id ? '▲' : '▼' }}</span>
              </div>
            </button>

            <!-- Expanded detail -->
            @if (expanded() === pol.id) {
              <div class="border-t border-[var(--border)] px-4 py-3">
                <app-required-evidence-section
                  [requiredTypeCodes]="pol.requiredEvidenceTypeCodes"
                  [attachments]="attachmentsMap()[pol.id]"
                  [entityType]="'policy'"
                  [entityId]="pol.id"
                  locale="en"
                  (typesChanged)="onTypesChanged(pol.id, $event)"
                  (attachFile)="onAttach(pol.id, $event)"
                  (removeAttachment)="onRemoveAttachment($event)"
                />
              </div>
            }
          </div>
        }

        @if (policies().length === 0) {
          <p class="text-center text-[var(--text-2)] py-10">Loading policies...</p>
        }
      </main>
    </div>
  `
})
export class PoliciesPageComponent implements OnInit {
  private readonly api = inject(EvidenceApiService);
  private readonly filters = inject(DashboardFiltersService);

  policies = signal<PolicyDto[]>([]);
  expanded = signal<string | null>(null);
  attachmentsMap = signal<Record<string, EvidenceAttachmentDto[]>>({});

  ngOnInit(): void {
    const f = this.filters.filters();
    this.api.getPolicies(f.tenantId, f.workspaceId).subscribe((list) => this.policies.set(list));
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
    this.api.updatePolicyRequiredTypes(id, codes).subscribe((updated) => {
      this.policies.update((list) => list.map((p) => (p.id === id ? updated : p)));
    });
  }

  onAttach(entityId: string, ev: { typeCode: string; fileName: string }): void {
    this.api.addAttachment('policy', entityId, ev.typeCode, ev.fileName).subscribe(() => {
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
    this.api.getAttachments('policy', entityId).subscribe((atts) => {
      this.attachmentsMap.update((m) => ({ ...m, [entityId]: atts }));
    });
  }
}
