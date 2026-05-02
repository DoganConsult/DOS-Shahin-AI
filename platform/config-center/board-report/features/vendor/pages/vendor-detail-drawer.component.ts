import { Component, ChangeDetectionStrategy, inject, Input, Output, EventEmitter, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
// Wave D-2 (Roadmap §2 P0 #18) — adopt DosSideDrawer (Wave H-2).
// Original chrome: hand-rolled .drawer-overlay + .drawer { width:560;
// height:100vh; box-shadow:-4px 0 24px... } with custom raw rgba.
// DosSideDrawer ships the exact same right-edge sliding panel
// pattern with tokenised chrome, focus + ESC, and overlay handling.
import { DosSideDrawerComponent } from '@dos/ui-system';
import { VendorApiService, VendorDto, VendorAssessmentDto } from '../services/vendor-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-vendor-detail-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, DosSideDrawerComponent],
  styles: [`
    /* Wave D-2: .drawer-overlay/.drawer/.drawer-header/.drawer-title/
       .close-btn removed — chrome now flows from <dos-side-drawer>
       and the canonical UI-OS stylesheet. Body section/grid/card/etc
       styles below remain (domain content). */
    .section { margin-bottom: 20px; }
    .section-title { font-size: var(--font-size-xs-plus); font-weight: 700; color: var(--text-color-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .detail-item label { display: block; font-size: var(--font-size-2xs); color: var(--text-color-secondary); margin-bottom: 2px; }
    .detail-item .value { font-size: var(--font-size-base); font-weight: 500; }
    .risk-score-bar { width: 100%; height: 8px; background: var(--surface-200); border-radius: var(--radius-xs); overflow: hidden; margin-top: 4px; }
    .risk-score-fill { height: 100%; border-radius: var(--radius-xs); transition: width .3s; }
    .assessment-card { padding: 12px; border: 1px solid var(--surface-border); border-radius: var(--radius); margin-bottom: 8px; }
    .assessment-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .assessment-type { font-size: var(--font-size-base); font-weight: 600; }
    .score-text { font-size: var(--font-size-xs-plus); font-weight: 600; }
    .finding-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: var(--font-size-xs-plus); border-bottom: 1px solid var(--surface-50); }
    .severity-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .s-low { background: var(--green-500); }
    .s-medium { background: var(--yellow-500); }
    .s-high { background: var(--orange-500); }
    .s-critical { background: var(--red-500); }
    .edit-form { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--surface-border); }
    .form-row { margin-bottom: 12px; }
    .form-row label { display: block; font-size: var(--font-size-sm); font-weight: 600; color: var(--text-color-secondary); margin-bottom: 4px; }
    .form-row input, .form-row select { width: 100%; padding: 8px 12px; border: 1px solid var(--surface-border); border-radius: var(--radius); font-size: var(--font-size-xs-plus); box-sizing: border-box; }
    .action-bar { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
    .btn { padding: 8px 18px; border-radius: var(--radius); border: 1px solid var(--surface-border); font-size: var(--font-size-xs-plus); cursor: pointer; }
    .btn-primary { background: var(--primary-500); color: #fff; border-color: var(--primary-500); }
    .btn-danger { background: var(--red-500); color: #fff; border-color: var(--red-500); }
  `],
  template: `
    <dos-side-drawer
      [open]="true"
      [title]="vendor.name"
      position="right"
      width="md"
      (closed)="closed.emit()">
      <div [dir]="i18n.direction()">
        <div class="section">
          <div class="section-title">{{ i18n.translate('vendor.details') }}</div>
          <div class="detail-grid">
            <div class="detail-item">
              <label>{{ i18n.translate('vendor.category') }}</label>
              <span class="value">{{ vendor.category }}</span>
            </div>
            <div class="detail-item">
              <label>{{ i18n.translate('vendor.status') }}</label>
              <span class="value">{{ vendor.status }}</span>
            </div>
            <div class="detail-item">
              <label>{{ i18n.translate('vendor.criticality') }}</label>
              <span class="value">{{ vendor.criticality }}</span>
            </div>
            <div class="detail-item">
              <label>{{ i18n.translate('vendor.riskLevel') }}</label>
              <span class="value">{{ vendor.riskLevel }}</span>
            </div>
            <div class="detail-item">
              <label>{{ i18n.translate('vendor.contact') }}</label>
              <span class="value">{{ vendor.contactName || '—' }}</span>
            </div>
            <div class="detail-item">
              <label>{{ i18n.translate('vendor.email') }}</label>
              <span class="value">{{ vendor.contactEmail || '—' }}</span>
            </div>
            <div class="detail-item">
              <label>{{ i18n.translate('vendor.contractStart') }}</label>
              <span class="value">{{ vendor.contractStartDate ? (vendor.contractStartDate | date:'mediumDate') : '—' }}</span>
            </div>
            <div class="detail-item">
              <label>{{ i18n.translate('vendor.contractEnd') }}</label>
              <span class="value">{{ vendor.contractEndDate ? (vendor.contractEndDate | date:'mediumDate') : '—' }}</span>
            </div>
          </div>
        </div>

        @if (riskScore()) {
          <div class="section">
            <div class="section-title">{{ i18n.translate('vendor.riskScore') }}</div>
            <div class="score-text" [style.color]="riskScoreColor()">{{ riskScore() }} / 100</div>
            <div class="risk-score-bar">
              <div class="risk-score-fill" [style.width.%]="riskScore()" [style.background]="riskScoreColor()"></div>
            </div>
          </div>
        }

        <div class="section">
          <div class="section-title">{{ i18n.translate('vendor.assessments') }} ({{ assessments().length }})</div>
          @for (a of assessments(); track a.id) {
            <div class="assessment-card">
              <div class="assessment-header">
                <span class="assessment-type">{{ a.assessmentType }}</span>
                <span class="score-text">{{ a.score ?? '—' }} / {{ a.maxScore ?? 100 }}</span>
              </div>
              <div style="font-size:0.75rem;color:var(--text-color-secondary)">{{ a.status }} · {{ a.createdAt | date:'mediumDate' }}</div>
              @for (f of a.findings; track f.id) {
                <div class="finding-row">
                  <div class="severity-dot" [ngClass]="'s-' + f.severity"></div>
                  <span>{{ f.title }}</span>
                  <span style="margin-inline-start:auto;font-size:0.6875rem;color:var(--text-color-secondary)">{{ f.status }}</span>
                </div>
              }
            </div>
          }
        </div>

        <div class="action-bar">
          <button class="btn btn-danger" (click)="deleteVendor()">{{ i18n.translate('common.delete') }}</button>
          <button class="btn btn-primary" (click)="toggleEdit()">{{ editing() ? i18n.translate('common.cancel') : i18n.translate('common.edit') }}</button>
        </div>

        @if (editing()) {
          <div class="edit-form">
            <div class="form-row">
              <label>{{ i18n.translate('vendor.name') }}</label>
              <input [ngModel]="editName()" (ngModelChange)="editName.set($event)">
            </div>
            <div class="form-row">
              <label>{{ i18n.translate('vendor.status') }}</label>
              <select [ngModel]="editStatus()" (ngModelChange)="editStatus.set($event)">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="onboarding">Onboarding</option>
                <option value="offboarding">Offboarding</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div class="action-bar">
              <button class="btn btn-primary" (click)="saveVendor()" [disabled]="saving()">{{ i18n.translate('common.save') }}</button>
            </div>
          </div>
        }
      </div>
    </dos-side-drawer>
  `,
})
export class VendorDetailDrawerComponent implements OnInit {
  @Input({ required: true }) vendor!: VendorDto & { riskScore?: number };
  @Output() closed = new EventEmitter<void>();
  @Output() updated = new EventEmitter<VendorDto>();

  private destroyRef = inject(DestroyRef);
  private api = inject(VendorApiService);
  i18n = inject(I18nService);

  assessments = signal<VendorAssessmentDto[]>([]);
  riskScore = signal<number | null>(null);
  editing = signal(false);
  saving = signal(false);
  editName = signal('');
  editStatus = signal('');

  riskScoreColor = () => {
    const s = this.riskScore() ?? 0;
    if (s >= 75) return 'var(--red-500)';
    if (s >= 50) return 'var(--orange-500)';
    if (s >= 25) return 'var(--yellow-500)';
    return 'var(--green-500)';
  };

  ngOnInit(): void {
    this.api.getVendorAssessments(this.vendor.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(a => this.assessments.set(a as any));
    this.api.getVendorRiskProfile(this.vendor.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: r => this.riskScore.set(r.riskScore ?? null),
      error: () => this.riskScore.set(this.vendor.riskScore ?? null),
    });
    this.editName.set(this.vendor.name || '');
    this.editStatus.set(this.vendor.status || '');
  }

  toggleEdit(): void {
    this.editing.update(v => !v);
  }

  saveVendor(): void {
    this.saving.set(true);
    this.api.update(this.vendor.id, { name: this.editName(), status: this.editStatus() as VendorDto['status'] })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: v => { this.updated.emit(v); this.saving.set(false); },
        error: () => this.saving.set(false),
      });
  }

  deleteVendor(): void {
    if (!confirm('Delete this vendor?')) return;
    this.api.delete(this.vendor.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.closed.emit());
  }
}
