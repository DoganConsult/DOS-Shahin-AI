import { Component, inject, signal, computed, OnInit, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AuditApiService } from '../../services/audit-api.service';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { AgentBadgeComponent } from '@app/shared/agent-badge/agent-badge.component';
import { HubHelpPanelComponent } from '@app/shared/guided-experience/hub-help-panel.component';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { devError } from '../../../core/utils/dev-logger';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-audit-module',
  standalone: true,
  imports: [CommonModule, RouterModule, AgentBadgeComponent, HubHelpPanelComponent, ToastModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="grc-hub" [dir]="i18n.direction()">
      <div class="hub-toolbar">
        <app-agent-badge [agentId]="agentId" />
        <app-hub-help-panel [hubRoute]="'/audit'" />
      </div>

      <!-- Module-level KPI bar -->
      <div class="hub-kpi-bar" *ngIf="kpis()">
        <div tabindex="0" role="button" (keyup.enter)="navigateTo('/audit/engagements')" class="kpi-chip" (click)="navigateTo('/audit/engagements')">
          <span class="kpi-val">{{ kpis()?.activeAudits || 0 }}</span>
          <span class="kpi-lbl">{{ isAr() ? 'تدقيقات نشطة' : 'Active Audits' }}</span>
        </div>
        <div tabindex="0" role="button" (keyup.enter)="navigateTo('/audit/findings', {severity: 'critical'})" class="kpi-chip kpi-danger" (click)="navigateTo('/audit/findings', {severity: 'critical'})">
          <span class="kpi-val">{{ kpis()?.criticalFindings || 0 }}</span>
          <span class="kpi-lbl">{{ isAr() ? 'نتائج حرجة' : 'Critical' }}</span>
        </div>
        <div tabindex="0" role="button" (keyup.enter)="navigateTo('/audit/findings', {status: 'open'})" class="kpi-chip kpi-warning" (click)="navigateTo('/audit/findings', {status: 'open'})">
          <span class="kpi-val">{{ kpis()?.openFindings || 0 }}</span>
          <span class="kpi-lbl">{{ isAr() ? 'نتائج مفتوحة' : 'Open Findings' }}</span>
        </div>
        <div tabindex="0" role="button" (keyup.enter)="navigateTo('/audit/capa')" class="kpi-chip kpi-info" (click)="navigateTo('/audit/capa')">
          <span class="kpi-val">{{ kpis()?.capaOpen || 0 }}</span>
          <span class="kpi-lbl">{{ isAr() ? 'إجراءات تصحيحية' : 'Open CAPA' }}</span>
        </div>
        <div tabindex="0" role="button" (keyup.enter)="navigateTo('/audit/validation')" class="kpi-chip kpi-success" (click)="navigateTo('/audit/validation')">
          <span class="kpi-val">{{ kpis()?.closureRate || 0 }}%</span>
          <span class="kpi-lbl">{{ isAr() ? 'معدل الإغلاق' : 'Closure Rate' }}</span>
        </div>
      </div>

      <div class="hub-content">
        <router-outlet />
      </div>

      <!-- Quick Action FAB -->
      <div class="fab-container" [class.fab-open]="fabOpen">
        <button class="fab-main" (click)="fabOpen = !fabOpen" [attr.aria-label]="isAr() ? 'إجراءات سريعة' : 'Quick Actions'" [attr.aria-expanded]="fabOpen">
          <i class="pi" [class.pi-plus]="!fabOpen" [class.pi-times]="fabOpen"></i>
        </button>
        <div class="fab-menu" *ngIf="fabOpen">
          <button class="fab-item" (click)="fabAction('/audit/engagements', 'create')"><i class="pi pi-briefcase"></i> {{ isAr() ? 'تدقيق جديد' : 'New Audit' }}</button>
          <button class="fab-item" (click)="fabAction('/audit/findings', 'create')"><i class="pi pi-search"></i> {{ isAr() ? 'نتيجة جديدة' : 'New Finding' }}</button>
          <button class="fab-item" (click)="fabAction('/audit/capa', 'create')"><i class="pi pi-wrench"></i> {{ isAr() ? 'إجراء تصحيحي' : 'New CAPA' }}</button>
          <button class="fab-item" (click)="fabAction('/audit/reports')"><i class="pi pi-file"></i> {{ isAr() ? 'تقرير' : 'Reports' }}</button>
          <button class="fab-item" (click)="fabAction('/risk/register')"><i class="pi pi-shield"></i> {{ isAr() ? 'سجل المخاطر' : 'Risk Register' }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .grc-hub { min-height: 100vh; background: var(--surface-ground, var(--surface-ice)); position: relative; }
    .hub-toolbar {
      position: sticky; top: 0; z-index: var(--z-dropdown);
      display: flex; align-items: center; gap: 8px;
      justify-content: flex-end;
      padding: 6px 20px;
      pointer-events: none;
    }
    .hub-toolbar > * { pointer-events: auto; }
    .hub-content { padding: 0; }
    .hub-kpi-bar { display: flex; gap: 8px; padding: 6px 20px 2px; flex-wrap: wrap; }
    .kpi-chip { display: flex; align-items: center; gap: 6px; padding: 5px 14px; background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg, 20px); cursor: pointer; transition: all .15s; font-size: var(--font-size-sm); }
    .kpi-chip:hover { box-shadow: var(--shadow-sm); border-color: var(--primary-200, #93c5fd); }
    .kpi-val { font-weight: 700; }
    .kpi-lbl { color: var(--text-muted); }
    .kpi-danger .kpi-val { color: var(--error); }
    .kpi-warning .kpi-val { color: #d97706; }
    .kpi-info .kpi-val { color: var(--primary); }
    .kpi-success .kpi-val { color: var(--success); }
    .fab-container { position: fixed; bottom: 24px; right: 24px; z-index: var(--z-dropdown); display: flex; flex-direction: column-reverse; align-items: flex-end; gap: 8px; }
    [dir='rtl'] .fab-container { right: auto; left: 24px; }
    .fab-main { width: 52px; height: 52px; border-radius: 50%; background: var(--primary); color: #fff; border: none; cursor: pointer; font-size: 1.3rem; display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-md); transition: transform .2s; }
    .fab-main:hover { transform: scale(1.08); }
    .fab-menu { display: flex; flex-direction: column; gap: 6px; }
    .fab-item { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); cursor: pointer; font-size: var(--font-size-sm); font-weight: 500; white-space: nowrap; box-shadow: var(--shadow-sm); transition: all .15s; }
    .fab-item:hover { background: var(--primary); color: #fff; border-color: var(--primary); }
    .fab-item i { font-size: var(--font-size-sm); }
  `]
})
export class AuditModuleComponent implements OnInit {
  i18n = inject(I18nService);
  private api = inject(AuditApiService);
  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private msg = inject(MessageService);

  readonly agentId = 'A10';
  isAr = computed(() => this.i18n.currentLang() === 'ar');
  kpis = signal<GrcRecord | null>(null);
  fabOpen = false;

  ngOnInit(): void {
    this.loadKpis();
    this.live.audit$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadKpis());
  }

  private loadKpis(): void {
    this.api.getOverview().subscribe({
      next: (d) => this.kpis.set(d),
      error: (err) => {
        devError('[Audit] Failed to load KPIs', err);
        this.kpis.set(null);
      },
    });
  }

  navigateTo(route: string, queryParams?: GrcRecord): void {
    this.router.navigate([route], { queryParams });
  }

  fabAction(route: string, action?: string): void {
    this.fabOpen = false;
    this.router.navigate([route], { queryParams: action ? { action } : undefined });
  }
}
