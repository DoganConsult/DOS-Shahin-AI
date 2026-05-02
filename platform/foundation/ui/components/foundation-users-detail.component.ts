import {
  Component, ChangeDetectionStrategy, input, output, computed, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';

/**
 * User detail side panel: profile fields, team memberships,
 * assigned tasks, delegations, lifecycle info, and GRC footprint links.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-foundation-users-detail',
  standalone: true,
  imports: [
    CommonModule, AppDatePipe, FormsModule, RouterLink,
    TagModule, ButtonModule, DropdownModule, TooltipModule,
  ],
  template: `
    <div class="fu-detail-panel">
      <!-- Header -->
      <div class="fud-header">
        <h3 class="fud-title">{{ user().first_name || '' }} {{ user().last_name || '' }}</h3>
        <button aria-label="Close" class="fu-btn-close" (click)="closed.emit()"><i class="pi pi-times"></i></button>
      </div>
      <span class="fud-email">{{ user().email }}</span>

      <!-- Core fields -->
      <div class="fud-grid">
        <div class="fud-field">
          <span class="fud-label">{{ isAr() ? 'الحالة' : 'Status' }}</span>
          <span class="fud-value"><p-tag [value]="user().status" [severity]="statusSeverity(user().status)" /></span>
        </div>
        <div class="fud-field">
          <span class="fud-label">{{ isAr() ? 'الدور' : 'Role' }}</span>
          <span class="fud-value">{{ user().role || '\u2014' }}</span>
        </div>
        <div class="fud-field">
          <span class="fud-label">{{ isAr() ? 'القسم' : 'Department' }}</span>
          <span class="fud-value">{{ resolveDept(user().department_id || user().dept_id) }}</span>
        </div>
        <div class="fud-field">
          <span class="fud-label">{{ isAr() ? 'آخر دخول' : 'Last Login' }}</span>
          <span class="fud-value">{{ user().last_login ? (user().last_login | appDate:'medium') : '\u2014' }}</span>
        </div>
        <div class="fud-field">
          <span class="fud-label">{{ isAr() ? 'تاريخ الإنشاء' : 'Created' }}</span>
          <span class="fud-value">{{ user().created_at | appDate:'medium' }}</span>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="fud-actions">
        <button class="fu-cta" (click)="auditClick.emit()">
          <i class="pi pi-history"></i> {{ isAr() ? 'عرض النشاط' : 'View Activity' }}
        </button>
        <button class="fu-cta" (click)="roleAssignClick.emit()">
          <i class="pi pi-id-card"></i> {{ isAr() ? 'تعيين دور' : 'Assign Role' }}
        </button>
      </div>

      <!-- Team memberships -->
      <div class="fud-section">
        <h4 class="fud-fp-title"><i class="pi pi-users"></i> {{ isAr() ? 'عضوية الفرق' : 'Team Memberships' }}</h4>
        @if (userTeams().length > 0) {
          <div class="fud-team-list">
            @for (t of userTeams(); track t.team_id) {
              <div class="fud-team-item">
                <span class="fud-team-name">{{ t.team_name || t.team_id }}</span>
                <p-tag [value]="t.team_role" severity="info" [rounded]="true" />
                <p-button icon="pi pi-times" [rounded]="true" [text]="true" severity="danger" size="small"
                  (onClick)="removeTeam.emit(t.team_id)" pTooltip="Remove" />
              </div>
            }
          </div>
        } @else {
          <p class="text-sm text-color-secondary">{{ isAr() ? 'لا توجد فرق' : 'No team memberships' }}</p>
        }
        <div class="fud-team-add">
          <p-dropdown [options]="teamOptions()" [(ngModel)]="teamAssignIdLocal" optionLabel="label" optionValue="value"
            [placeholder]="isAr() ? 'اختر فريقاً...' : 'Select team...'" [filter]="true" [showClear]="true" styleClass="w-12rem" appendTo="body" />
          <p-button [label]="isAr() ? 'إضافة' : 'Add'" icon="pi pi-plus" size="small" severity="secondary"
            (onClick)="addTeamClick.emit(teamAssignIdLocal); teamAssignIdLocal = null" [disabled]="!teamAssignIdLocal" />
        </div>
      </div>

      <!-- Assigned tasks -->
      <div class="fud-section">
        <h4 class="fud-fp-title"><i class="pi pi-list-check"></i> {{ isAr() ? 'المهام المعينة' : 'Assigned Tasks' }}</h4>
        @if (userTasks().length > 0) {
          <div class="fud-task-list">
            @for (task of userTasks(); track task.id) {
              <div class="fud-task-item">
                <span class="fud-task-title">{{ task.title }}</span>
                <div class="fud-task-meta">
                  <p-tag [value]="task.status" [severity]="task.status === 'completed' ? 'success' : task.status === 'overdue' ? 'danger' : 'warning'" [rounded]="true" />
                  @if (task.due_date) {
                    <span class="text-xs text-color-secondary">{{ task.due_date | appDate:'medium' }}</span>
                  }
                </div>
              </div>
            }
          </div>
        } @else {
          <p class="text-sm text-color-secondary">{{ isAr() ? 'لا توجد مهام' : 'No assigned tasks' }}</p>
        }
      </div>

      <!-- Delegations -->
      <div class="fud-section">
        <h4 class="fud-fp-title"><i class="pi pi-arrows-h"></i> {{ isAr() ? 'التفويضات' : 'Delegations' }}</h4>
        @if (userDelegations().length > 0) {
          <div class="fud-deleg-list">
            @for (d of userDelegations(); track d.delegation_id) {
              <div class="fud-deleg-item">
                <span class="fud-deleg-type">{{ d.delegation_type || d.authority_area || 'general' }}</span>
                <span class="fud-deleg-to">&rarr; {{ d.delegate_name || d.delegate_user_id || '\u2014' }}</span>
                <p-tag [value]="d.status" [severity]="d.status === 'active' ? 'success' : 'secondary'" [rounded]="true" />
                @if (d.status === 'active') {
                  <p-button icon="pi pi-times" [rounded]="true" [text]="true" severity="danger" size="small"
                    (onClick)="revokeDelegation.emit(d)" pTooltip="Revoke" />
                }
              </div>
            }
          </div>
        } @else {
          <p class="text-sm text-color-secondary">{{ isAr() ? 'لا توجد تفويضات' : 'No active delegations' }}</p>
        }
        <p-button [label]="isAr() ? 'إنشاء تفويض' : 'Create Delegation'" icon="pi pi-plus" size="small" severity="secondary" [outlined]="true"
          (onClick)="createDelegation.emit()" styleClass="mt-2" />
      </div>

      <!-- Lifecycle -->
      <div class="fud-section">
        <h4 class="fud-fp-title"><i class="pi pi-sync"></i> {{ isAr() ? 'دورة الحياة' : 'Lifecycle' }}</h4>
        @if (userLifecycle()) {
          <div class="fud-lifecycle-grid">
            <div class="fud-lc-item">
              <span class="fud-lc-label">{{ isAr() ? 'الحالة' : 'Status' }}</span>
              <p-tag [value]="userLifecycle()!.lifecycle_status || userLifecycle()!.status || 'active'" />
            </div>
            @if (userLifecycle()!.onboarding_completed_at) {
              <div class="fud-lc-item">
                <span class="fud-lc-label">{{ isAr() ? 'اكتمال التأهيل' : 'Onboarded' }}</span>
                <span>{{ userLifecycle()!.onboarding_completed_at | date:'mediumDate' }}</span>
              </div>
            }
            @if (userLifecycle()!.activation_mode) {
              <div class="fud-lc-item">
                <span class="fud-lc-label">{{ isAr() ? 'وضع التفعيل' : 'Activation' }}</span>
                <span>{{ userLifecycle()!.activation_mode }}</span>
              </div>
            }
          </div>
        } @else {
          <p class="text-sm text-color-secondary">{{ isAr() ? 'لا توجد بيانات دورة حياة' : 'No lifecycle data' }}</p>
        }
      </div>

      <!-- GRC footprint -->
      <div class="fud-footprint">
        <h4 class="fud-fp-title"><i class="pi pi-sitemap"></i> {{ isAr() ? 'البصمة في منصة GRC' : 'GRC Footprint' }}</h4>
        <div class="fud-fp-links">
          <a class="fud-fp-link" [routerLink]="['/risk/register']" [queryParams]="{owner: user().email}">
            <i class="pi pi-exclamation-triangle"></i>
            {{ isAr() ? 'المخاطر المملوكة' : 'Owned Risks' }}
          </a>
          <a class="fud-fp-link" [routerLink]="['/governance/actions']" [queryParams]="{assignee: user().email}">
            <i class="pi pi-check-square"></i>
            {{ isAr() ? 'الإجراءات المعينة' : 'Assigned Actions' }}
          </a>
          <a class="fud-fp-link" [routerLink]="['/compliance/controls']" [queryParams]="{owner: user().email}">
            <i class="pi pi-shield"></i>
            {{ isAr() ? 'الضوابط المسؤولة' : 'Owned Controls' }}
          </a>
          <a class="fud-fp-link" [routerLink]="['/audit/findings']" [queryParams]="{assignee: user().email}">
            <i class="pi pi-search"></i>
            {{ isAr() ? 'النتائج المعينة' : 'Assigned Findings' }}
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .fu-detail-panel{margin-top:20px;background:var(--surface-card);border:1px solid var(--surface-border);border-radius:var(--radius-lg);padding:20px 24px}
    .fud-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
    .fud-title{margin:0;font-size: var(--font-size-lg);font-weight:800;color:var(--text-heading)}
    .fud-email{font-size: var(--font-size-sm);color:var(--text-muted);display:block;margin-bottom:14px}
    .fud-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px 20px;margin-bottom:16px}
    .fud-field{display:flex;flex-direction:column;gap:2px}
    .fud-label{font-size: var(--font-size-xs);font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--text-muted)}
    .fud-value{font-size: var(--font-size-base);font-weight:500;color:var(--text-heading)}
    .fud-actions{display:flex;gap:8px;border-top:1px solid var(--surface-border);padding-top:14px}
    .fu-cta{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border:1px solid var(--surface-border);border-radius:var(--radius);background:var(--surface-card);color:var(--text-color);font-size: var(--font-size-sm);font-weight:600;cursor:pointer}
    .fu-cta:hover{background:var(--surface-ice)}
    .fu-btn-close{width:28px;height:28px;border:1px solid var(--surface-border);border-radius:var(--radius-sm);background:var(--surface-card);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-muted)}
    .fu-btn-close:hover{background:var(--surface-ice)}
    .fud-footprint{margin-top:16px;padding-top:14px;border-top:1px solid var(--surface-border)}
    .fud-fp-title{font-size: var(--font-size-sm);font-weight:700;color:var(--text-heading);margin:0 0 10px;display:flex;align-items:center;gap:6px}
    .fud-fp-links{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .fud-fp-link{display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:var(--radius);background:var(--surface-hover);color:var(--text-color);font-size: var(--font-size-sm);font-weight:600;text-decoration:none;transition:background .15s}
    .fud-fp-link:hover{background:var(--primary-50);color:var(--primary-600)}
    .fud-section{margin-top:16px;padding-top:14px;border-top:1px solid var(--surface-border)}
    .fud-team-list{display:flex;flex-direction:column;gap:6px;margin-bottom:10px}
    .fud-team-item{display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--surface-hover);border-radius:var(--radius)}
    .fud-team-name{font-size: var(--font-size-sm);font-weight:600;color:var(--text-heading);flex:1}
    .fud-team-add{display:flex;align-items:center;gap:8px;margin-top:8px}
    .fud-task-list{display:flex;flex-direction:column;gap:6px}
    .fud-task-item{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:var(--surface-hover);border-radius:var(--radius)}
    .fud-task-title{font-size: var(--font-size-sm);font-weight:500;color:var(--text-heading);flex:1}
    .fud-task-meta{display:flex;align-items:center;gap:8px}
    .fud-deleg-list{display:flex;flex-direction:column;gap:6px}
    .fud-deleg-item{display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--surface-hover);border-radius:var(--radius)}
    .fud-deleg-type{font-size:var(--font-size-sm);font-weight:600;color:var(--text-heading);text-transform:capitalize}
    .fud-deleg-to{font-size:var(--font-size-sm);color:var(--text-muted);flex:1}
    .fud-lifecycle-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .fud-lc-item{display:flex;flex-direction:column;gap:2px}
    .fud-lc-label{font-size:var(--font-size-xs);font-weight:600;color:var(--text-muted)}
    @media(max-width:1024px){.fud-grid{grid-template-columns:1fr 1fr}}
    @media(max-width:768px){.fud-grid{grid-template-columns:1fr}}
  `],
})
export class FoundationUsersDetailComponent {
  readonly i18n = inject(I18nService);
  isAr = computed(() => this.i18n.currentLang() === 'ar');

  /* Inputs */
  user = input.required<unknown>();
  departments = input.required<any[]>();
  userTeams = input.required<any[]>();
  userTasks = input.required<any[]>();
  userDelegations = input.required<any[]>();
  userLifecycle = input.required<unknown>();
  teamOptions = input.required<{ label: string; value: string }[]>();

  /* Outputs */
  closed = output<void>();
  auditClick = output<void>();
  roleAssignClick = output<void>();
  removeTeam = output<string>();
  addTeamClick = output<string | null>();
  createDelegation = output<void>();
  revokeDelegation = output<unknown>();

  /** Local state for team dropdown */
  teamAssignIdLocal: string | null = null;

  resolveDept(deptId: string | null): string {
    if (!deptId) return '\u2014';
    const d = this.departments().find((x) => x.dept_id === deptId);
    return d ? d.name_en : '\u2014';
  }

  statusSeverity(status: string): 'success' | 'warning' | 'danger' | 'info' | 'secondary' {
    if (status === 'active') return 'success';
    if (status === 'invited' || status === 'pending') return 'warning';
    if (status === 'disabled' || status === 'inactive') return 'danger';
    return 'secondary';
  }
}
