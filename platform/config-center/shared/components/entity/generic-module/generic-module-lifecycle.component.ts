import {
  Component, ChangeDetectionStrategy, inject, signal, computed, OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ModuleCrudApiService } from '@app/core/modules/module-crud-api.service';

interface LifecycleEntry {
  id: string;
  entity_type: string;
  current_state: string;
  previous_state: string;
  transitioned_at: string;
  transitioned_by: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-generic-module-lifecycle',
  standalone: true,
  imports: [CommonModule, TagModule, SkeletonModule, TableModule, ButtonModule],
  template: `
    <div class="gml-page" [attr.dir]="isAr ? 'rtl' : 'ltr'">
      <h2>{{ isAr ? 'دورة الحياة' : 'Lifecycle' }}</h2>
      @if (loading()) {
        <div class="gml-skeleton">
          <p-skeleton width="100%" height="48px" />
          <p-skeleton width="100%" height="300px" styleClass="mt-3" />
        </div>
      } @else if (errorMsg()) {
        <app-empty-state
          [icon]="'pi pi-exclamation-circle'"
          [title]="isAr ? 'خطأ في تحميل البيانات' : 'Error loading data'"
          [message]="errorMsg()!"
        />
      } @else if (!entries().length) {
        <app-empty-state
          [icon]="'pi pi-history'"
          [title]="isAr ? 'لا توجد أحداث دورة حياة' : 'No lifecycle events'"
          [message]="isAr ? 'لم يتم تسجيل أي انتقالات حتى الآن' : 'No transitions recorded yet'"
        />
      } @else {
        <p-table [value]="entries()" [rows]="25" [paginator]="entries().length > 25" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>{{ isAr ? 'النوع' : 'Entity Type' }}</th>
              <th>{{ isAr ? 'من' : 'From' }}</th>
              <th>{{ isAr ? 'إلى' : 'To' }}</th>
              <th>{{ isAr ? 'التاريخ' : 'Date' }}</th>
              <th>{{ isAr ? 'بواسطة' : 'By' }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr>
              <td>{{ row.entity_type }}</td>
              <td><p-tag [value]="row.previous_state" severity="info" /></td>
              <td><p-tag [value]="row.current_state" severity="success" /></td>
              <td>{{ row.transitioned_at | date:'medium' }}</td>
              <td>{{ row.transitioned_by }}</td>
            </tr>
          </ng-template>
        </p-table>
      }
    </div>
  `,
  styles: [`
    .gml-page { padding: 1.5rem; }
    .gml-skeleton { display: flex; flex-direction: column; gap: 1rem; }
    h2 { color: var(--text-body); margin-bottom: 1rem; }
  `],
})
export class GenericModuleLifecycleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private crud = inject(ModuleCrudApiService);
  private i18n = inject(I18nService);

  loading = signal(true);
  errorMsg = signal<string | null>(null);
  entries = signal<LifecycleEntry[]>([]);

  get isAr() { return this.i18n.currentLang() === 'ar'; }

  get moduleCode(): string {
    return this.route.snapshot.data['moduleCode'] ?? 'unknown';
  }

  ngOnInit() {
    this.loadEntries();
  }

  async loadEntries() {
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      const res = await firstValueFrom(this.crud.listRecords(`/auto-crud/${this.moduleCode}/lifecycle`, { pageSize: 100 }));
      this.entries.set((res?.data as unknown as LifecycleEntry[]) ?? []);
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Failed to load lifecycle data');
    } finally {
      this.loading.set(false);
    }
  }
}
