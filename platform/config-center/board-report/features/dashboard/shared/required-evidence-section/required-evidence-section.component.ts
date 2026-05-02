import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  EVIDENCE_ARTIFACT_TYPES,
  EVIDENCE_ARTIFACT_TYPE_CODES,
  getEvidenceTypeLabel,
} from '../../../../../../core/constants/evidence-artifact-types';
import { FormsModule } from '@angular/forms';
import type { EvidenceAttachmentDto } from '../../../evidence/services/evidence-api.service';

@Component({
    selector: 'app-required-evidence-section',
    imports: [FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <section class="rounded-xl border border-[var(--border)] bg-[var(--bg-1)] p-4">
      <!-- Header -->
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-[var(--text-0)]">
          {{ locale === 'ar' ? 'الأدلة المطلوبة' : 'Required Evidence' }}
          <span class="ml-1 text-xs text-[var(--text-2)]">({{ requiredTypeCodes.length }})</span>
        </h3>
        <div class="flex items-center gap-2">
          <!-- Add type dropdown -->
          <select
            class="text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-0)] px-2 py-1 text-[var(--text-1)] outline-none"
            #addSelect
            (change)="onAddType(addSelect.value); addSelect.value = ''"
          >
            <option value="">+ {{ locale === 'ar' ? 'إضافة نوع' : 'Add type' }}</option>
            @for (t of availableTypes; track t.code) {
              <option [value]="t.code">{{ locale === 'ar' ? t.labelAr : t.labelEn }}</option>
            }
          </select>
        </div>
      </div>

      <!-- Required type tags -->
      <div class="flex flex-wrap gap-2 mb-3">
        @for (code of requiredTypeCodes; track code) {
          <span class="inline-flex items-center gap-1 rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-medium text-[var(--primary)]">
            {{ getLabel(code) }}
            <button
              type="button"
              class="ml-1 text-[var(--text-2)] hover:text-[var(--danger)] text-xs"
              (click)="onRemoveType(code)"
              [attr.aria-label]="'Remove ' + code"
            >&times;</button>
          </span>
        }
        @if (requiredTypeCodes.length === 0) {
          <span class="text-xs text-[var(--text-2)] italic">
            {{ locale === 'ar' ? 'لا توجد أنواع أدلة مطلوبة' : 'No required evidence types' }}
          </span>
        }
      </div>

      <!-- Attachments per type -->
      @for (code of requiredTypeCodes; track code) {
        <div class="mb-2 rounded-lg border border-[var(--border)] bg-[var(--bg-0)] p-3">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-medium text-[var(--text-0)]">
              📎 {{ getLabel(code) }}
            </span>
            <button
              type="button"
              class="text-xs px-2 py-0.5 rounded-lg bg-[var(--primary)] text-white hover:opacity-90"
              (click)="onAttach(code)"
            >
              {{ locale === 'ar' ? 'إرفاق' : 'Attach' }}
            </button>
          </div>
          @if (getAttachmentsForType(code).length > 0) {
            <ul class="mt-1 space-y-1">
              @for (att of getAttachmentsForType(code); track att.id) {
                <li class="flex items-center justify-between text-xs text-[var(--text-1)]">
                  <span>{{ att.fileName }}</span>
                  <button
                    type="button"
                    class="text-[var(--danger)] hover:underline"
                    (click)="removeAttachment.emit(att.id)"
                  >{{ locale === 'ar' ? 'حذف' : 'Remove' }}</button>
                </li>
              }
            </ul>
          } @else {
            <p class="text-xs text-[var(--text-2)] italic mt-1">
              {{ locale === 'ar' ? 'لا توجد مرفقات بعد' : 'No attachments yet' }}
            </p>
          }
        </div>
      }

      <!-- Summary -->
      @if (requiredTypeCodes.length > 0) {
        <div class="mt-3 flex items-center gap-3 text-xs text-[var(--text-2)]">
          <span class="text-[var(--success)]">✓ {{ attachedCount }} {{ locale === 'ar' ? 'مرفق' : 'attached' }}</span>
          <span class="text-[var(--danger)]">✗ {{ missingCount }} {{ locale === 'ar' ? 'مفقود' : 'missing' }}</span>
        </div>
      }
    </section>
    @if (attachDialogVisible) {
      <div tabindex="0" role="button" (keyup.enter)="attachDialogVisible = false" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" (click)="attachDialogVisible = false">
        <div tabindex="0" role="button" (keyup.enter)="$event.stopPropagation()" class="bg-[var(--bg-0)] rounded-xl p-6 w-[360px] shadow-xl" (click)="$event.stopPropagation()">
          <h4 class="text-sm font-semibold mb-3">{{ locale === 'ar' ? 'أدخل اسم الملف' : 'Enter file name' }}</h4>
          <input class="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[var(--bg-0)] text-[var(--text-0)]"
            [(ngModel)]="attachFileName" (keyup.enter)="submitAttach()" />
          <div class="flex justify-end gap-2 mt-4">
            <button type="button" class="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-1)]" (click)="attachDialogVisible = false">{{ locale === 'ar' ? 'إلغاء' : 'Cancel' }}</button>
            <button type="button" class="text-xs px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white" [disabled]="!attachFileName.trim()" (click)="submitAttach()">{{ locale === 'ar' ? 'إرفاق' : 'Attach' }}</button>
          </div>
        </div>
      </div>
    }
  `
})
export class RequiredEvidenceSectionComponent {
  @Input() requiredTypeCodes: string[] = [];
  @Input() attachments: EvidenceAttachmentDto[] = [];
  @Input() entityType = '';
  @Input() entityId = '';
  @Input() locale: 'en' | 'ar' = 'en';

  @Output() typesChanged = new EventEmitter<string[]>();
  @Output() attachFile = new EventEmitter<{ typeCode: string; fileName: string }>();
  @Output() removeAttachment = new EventEmitter<string>();

  readonly allTypes = EVIDENCE_ARTIFACT_TYPES;

  get availableTypes() {
    const used = new Set(this.requiredTypeCodes);
    return this.allTypes.filter((t) => !used.has(t.code));
  }

  get attachedCount(): number {
    const requiredSet = new Set(this.requiredTypeCodes);
    return this.attachments.filter((a) => requiredSet.has(a.evidenceTypeCode)).length;
  }

  get missingCount(): number {
    const attachedTypes = new Set(this.attachments.map((a) => a.evidenceTypeCode));
    return this.requiredTypeCodes.filter((c) => !attachedTypes.has(c)).length;
  }

  getLabel(code: string): string {
    return getEvidenceTypeLabel(code, this.locale);
  }

  getAttachmentsForType(code: string): EvidenceAttachmentDto[] {
    return this.attachments.filter((a) => a.evidenceTypeCode === code);
  }

  onAddType(code: string): void {
    if (!code || this.requiredTypeCodes.includes(code)) return;
    const updated = [...this.requiredTypeCodes, code];
    this.typesChanged.emit(updated);
  }

  onRemoveType(code: string): void {
    const updated = this.requiredTypeCodes.filter((c) => c !== code);
    this.typesChanged.emit(updated);
  }

  attachDialogVisible = false;
  attachFileName = '';
  private attachTypeCode = '';

  onAttach(typeCode: string): void {
    this.attachTypeCode = typeCode;
    this.attachFileName = '';
    this.attachDialogVisible = true;
  }

  submitAttach(): void {
    if (!this.attachFileName.trim()) return;
    this.attachFile.emit({ typeCode: this.attachTypeCode, fileName: this.attachFileName.trim() });
    this.attachDialogVisible = false;
  }
}
