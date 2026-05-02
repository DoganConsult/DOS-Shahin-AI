import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import type { ProvisioningStep, GrcRecord } from '../models/onboarding.models';
import type { ProvisioningStepDefinition } from '../services/onboarding-config.service';

/** Module-to-provisioning-step mapping for module cards */
const STEP_MODULE_MAP: Record<string, { label: string; icon: string; color: string }> = {
  create_tenant_master:       { label: 'Tenant',            icon: 'pi-building',              color: '#3b82f6' },
  create_workspace:           { label: 'Workspace',         icon: 'pi-th-large',              color: '#6366f1' },
  allocate_tenant_schema:     { label: 'Schema',            icon: 'pi-database',              color: '#8b5cf6' },
  run_tenant_migrations:      { label: 'Migrations',        icon: 'pi-cog',                   color: '#64748b' },
  seed_tenant_preferences:    { label: 'Preferences',       icon: 'pi-sliders-h',             color: '#0ea5e9' },
  seed_org_structure:         { label: 'Structure',         icon: 'pi-sitemap',               color: '#14b8a6' },
  seed_frameworks:            { label: 'Frameworks',        icon: 'pi-shield',                color: '#3b82f6' },
  seed_controls:              { label: 'Controls',          icon: 'pi-check-circle',          color: '#06b6d4' },
  seed_risks:                 { label: 'Risks',             icon: 'pi-exclamation-triangle',  color: '#ef4444' },
  seed_policies:              { label: 'Policies',          icon: 'pi-book',                  color: '#10b981' },
  seed_evidence_plan:         { label: 'Evidence',          icon: 'pi-folder',                color: '#6366f1' },
  seed_workflows:             { label: 'Workflows',         icon: 'pi-directions',            color: '#a855f7' },
  seed_dashboard_profile:     { label: 'Dashboard',         icon: 'pi-chart-bar',             color: '#f59e0b' },
  create_default_roles:       { label: 'Roles',             icon: 'pi-users',                 color: '#ec4899' },
  create_user_invitations:    { label: 'Invitations',       icon: 'pi-envelope',              color: '#0ea5e9' },
  run_post_seed_validations:  { label: 'Validation',        icon: 'pi-verified',              color: '#22c55e' },
  activate_workspace:         { label: 'Activation',        icon: 'pi-play',                  color: '#3b82f6' },
  generate_startup_checklist: { label: 'Checklist',         icon: 'pi-list-check',            color: '#f59e0b' },
  handover_complete:          { label: 'Handover',          icon: 'pi-flag',                  color: '#22c55e' },
};

@Component({
  selector: 'app-provisioning-progress',
  standalone: true,
  imports: [CommonModule, TagModule, ButtonModule],
  template: `
    <div class="pp-root" [class.pp-completed]="jobStatus === 'completed'" [class.pp-failed]="jobStatus === 'failed'">

      <!-- ============================================================ -->
      <!-- HEADER with status, elapsed, estimated time                   -->
      <!-- ============================================================ -->
      <div class="pp-header-card">
        <div class="pp-header-top">
          <div class="pp-header-title">
            <i class="pi" [ngClass]="jobStatus === 'completed' ? 'pi-check-circle' : jobStatus === 'failed' ? 'pi-times-circle' : 'pi-play'"></i>
            <h2>{{ isAr ? 'تهيئة مساحة العمل' : 'Provisioning Workspace' }}</h2>
          </div>
          <p-tag [value]="statusLabel" [severity]="statusSeverity" styleClass="pp-status-tag" />
        </div>

        <!-- Progress bar -->
        <div class="pp-progress-track">
          <div class="pp-progress-fill" [style.width.%]="progressPercent"
               [class.pp-fill-success]="jobStatus === 'completed'"
               [class.pp-fill-error]="jobStatus === 'failed'"
               [class.pp-fill-active]="jobStatus !== 'completed' && jobStatus !== 'failed'">
          </div>
        </div>

        <div class="pp-header-stats">
          <div class="pp-stat">
            <i class="pi pi-clock"></i>
            <span>{{ isAr ? 'المنقضي' : 'Elapsed' }}: <strong>{{ elapsedTime }}</strong></span>
          </div>
          <div class="pp-stat" *ngIf="estimatedRemaining && jobStatus !== 'completed' && jobStatus !== 'failed'">
            <i class="pi pi-stopwatch"></i>
            <span>{{ isAr ? 'المتبقي (تقديري)' : 'Est. remaining' }}: <strong>{{ estimatedRemaining }}</strong></span>
          </div>
          <div class="pp-stat">
            <i class="pi pi-list"></i>
            <span>{{ completedCount }}/{{ steps.length }} {{ isAr ? 'خطوات' : 'steps' }}</span>
          </div>
        </div>
      </div>

      <!-- ============================================================ -->
      <!-- MODULE CARDS — visual grid of provisioning modules             -->
      <!-- ============================================================ -->
      <div class="pp-module-grid">
        <div *ngFor="let step of steps; let i = index"
             class="pp-module-card"
             [class.pp-mod-queued]="step.status === 'queued'"
             [class.pp-mod-running]="step.status === 'running'"
             [class.pp-mod-completed]="step.status === 'completed'"
             [class.pp-mod-failed]="step.status === 'failed'"
             [style.animationDelay]="(i * 50) + 'ms'"
             (click)="toggleLog(step.step_code)">
          <div class="pp-mod-icon-wrap">
            <div class="pp-mod-icon" [style.background]="getStepMeta(step.step_code).color + (step.status === 'completed' ? '20' : '10')"
                 [style.color]="step.status === 'completed' ? getStepMeta(step.step_code).color : (step.status === 'running' ? getStepMeta(step.step_code).color : '#94a3b8')">
              <i class="pi" [ngClass]="step.status === 'running' ? 'pi-spin pi-spinner' : (step.status === 'completed' ? 'pi-check' : (step.status === 'failed' ? 'pi-times' : getStepMeta(step.step_code).icon))"></i>
            </div>
            <!-- Pulse ring for running step -->
            <div *ngIf="step.status === 'running'" class="pp-mod-pulse"></div>
          </div>
          <span class="pp-mod-label">{{ getStepMeta(step.step_code).label }}</span>
          <span class="pp-mod-dur" *ngIf="step.duration_ms">{{ step.duration_ms | number:'1.0-0' }}ms</span>
        </div>
      </div>

      <!-- ============================================================ -->
      <!-- STEP-BY-STEP TIMELINE                                         -->
      <!-- ============================================================ -->
      <div class="pp-timeline">
        <div *ngFor="let step of steps; let i = index; let last = last"
             class="pp-tl-item"
             [class.pp-tl-queued]="step.status === 'queued'"
             [class.pp-tl-running]="step.status === 'running'"
             [class.pp-tl-completed]="step.status === 'completed'"
             [class.pp-tl-failed]="step.status === 'failed'"
             [style.animationDelay]="(i * 30) + 'ms'">
          <!-- Timeline connector line -->
          <div class="pp-tl-connector" *ngIf="!last">
            <div class="pp-tl-line" [class.pp-tl-line-done]="step.status === 'completed'"></div>
          </div>

          <!-- Timeline dot -->
          <div class="pp-tl-dot">
            <i *ngIf="step.status === 'queued'" class="pi pi-circle"></i>
            <i *ngIf="step.status === 'running'" class="pi pi-spin pi-spinner"></i>
            <i *ngIf="step.status === 'completed'" class="pi pi-check"></i>
            <i *ngIf="step.status === 'failed'" class="pi pi-times"></i>
          </div>

          <!-- Step info -->
          <div class="pp-tl-info">
            <div class="pp-tl-header">
              <span class="pp-tl-name">{{ step.step_name }}</span>
              <div class="pp-tl-meta">
                <span *ngIf="step.duration_ms" class="pp-tl-dur">{{ step.duration_ms | number:'1.0-0' }}ms</span>
                <p-tag [value]="step.status" [severity]="stepSeverity(step.status)" />
              </div>
            </div>
            <span *ngIf="step.error_message" class="pp-tl-error">
              <i class="pi pi-exclamation-circle"></i> {{ step.error_message }}
            </span>
          </div>
        </div>
      </div>

      <!-- ============================================================ -->
      <!-- LIVE LOG VIEWER (expandable)                                  -->
      <!-- ============================================================ -->
      <div class="pp-log-section" *ngIf="events.length > 0 || logExpanded">
        <div class="pp-log-header" (click)="logExpanded = !logExpanded">
          <i class="pi pi-code"></i>
          <span>{{ isAr ? 'سجل الأحداث' : 'Event Log' }}</span>
          <span class="pp-log-count" *ngIf="events.length">{{ events.length }}</span>
          <i class="pi" [ngClass]="logExpanded ? 'pi-chevron-up' : 'pi-chevron-down'" style="margin-inline-start:auto"></i>
        </div>
        <div class="pp-log-body" *ngIf="logExpanded">
          <div *ngFor="let evt of events; let i = index" class="pp-log-entry" [style.animationDelay]="(i * 20) + 'ms'">
            <span class="pp-log-time">{{ formatEventTime(evt) }}</span>
            <span class="pp-log-step">{{ evt.step_code || evt.stepCode || '' }}</span>
            <span class="pp-log-msg">{{ evt.message || evt.event_type || '' }}</span>
          </div>
          <div *ngIf="events.length === 0" class="pp-log-empty">
            {{ isAr ? 'لا توجد أحداث حتى الآن' : 'No events yet' }}
          </div>
        </div>
      </div>

      <!-- ============================================================ -->
      <!-- COMPLETION CELEBRATION                                        -->
      <!-- ============================================================ -->
      <div *ngIf="jobStatus === 'completed'" class="pp-celebration">
        <!-- Confetti particles -->
        <div class="pp-confetti-container">
          <div *ngFor="let p of confettiParticles" class="pp-confetti"
               [style.left]="p.left" [style.animationDelay]="p.delay"
               [style.background]="p.color" [style.width]="p.size" [style.height]="p.size">
          </div>
        </div>
        <div class="pp-celebration-content">
          <div class="pp-success-icon">
            <svg viewBox="0 0 52 52" class="pp-check-svg">
              <circle class="pp-check-circle" cx="26" cy="26" r="25" fill="none" />
              <path class="pp-check-path" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
            </svg>
          </div>
          <h3>{{ isAr ? 'مساحة العمل جاهزة!' : 'Workspace Ready!' }}</h3>
          <p>{{ isAr ? 'تم إنشاء مساحة العمل بنجاح. يمكنك الآن البدء في استخدام المنصة.' : 'Your workspace has been created successfully. You can now start using the platform.' }}</p>
        </div>
      </div>

      <!-- ============================================================ -->
      <!-- FAILURE + RETRY                                               -->
      <!-- ============================================================ -->
      <div *ngIf="jobStatus === 'failed'" class="pp-failure">
        <div class="pp-failure-icon">
          <i class="pi pi-times-circle"></i>
        </div>
        <h3>{{ isAr ? 'فشلت التهيئة' : 'Provisioning Failed' }}</h3>
        <p class="pp-failure-detail" *ngIf="failedStepMessage">{{ failedStepMessage }}</p>
        <p>{{ isAr ? 'يمكنك إعادة المحاولة أو الاتصال بالدعم الفني.' : 'You can retry or contact support for assistance.' }}</p>
        <button pButton
          [label]="isAr ? 'إعادة المحاولة' : 'Retry Provisioning'"
          icon="pi pi-refresh"
          severity="warning"
          class="pp-retry-btn"
          (click)="retryClicked.emit()">
        </button>
      </div>

      <!-- ============================================================ -->
      <!-- STARTUP CHECKLIST (after success)                             -->
      <!-- ============================================================ -->
      <div class="pp-checklist" *ngIf="jobStatus === 'completed' && checklist.length > 0">
        <h4 class="pp-checklist-title">
          <i class="pi pi-list-check"></i>
          {{ isAr ? 'قائمة مهام البدء' : 'Startup Checklist' }}
        </h4>
        <div *ngFor="let item of checklist" class="pp-checklist-item" [class.done]="item.is_completed">
          <label class="pp-checklist-label">
            <input type="checkbox" [checked]="item.is_completed" (change)="checklistToggle.emit(item)" [disabled]="item.is_completed" />
            <div class="pp-checklist-text">
              <span class="pp-checklist-item-title">{{ isAr ? item.title_ar : item.title_en }}</span>
              <small class="pp-checklist-desc">{{ isAr ? item.description_ar : item.description_en }}</small>
            </div>
          </label>
          <p-tag *ngIf="item.is_completed" value="Done" severity="success" />
        </div>
      </div>

      <!-- ============================================================ -->
      <!-- GO TO WORKSPACE BUTTON                                        -->
      <!-- ============================================================ -->
      <div *ngIf="jobStatus === 'completed'" class="pp-go-workspace">
        <button pButton
          [label]="isAr ? 'دخول لوحة القيادة' : 'Enter AGRC-OS Dashboard'"
          icon="pi pi-arrow-right"
          class="pp-go-btn"
          (click)="goToWorkspace.emit()">
        </button>
      </div>
    </div>
  `,
  styles: [`
    /* ================================================================
       PROVISIONING PROGRESS — Premium Enterprise Design
       ================================================================ */
    .pp-root {
      display: flex; flex-direction: column; gap: 1.5rem;
    }

    /* ── Header Card ── */
    .pp-header-card {
      padding: 1.5rem 1.75rem;
      background: linear-gradient(135deg, rgba(15,98,254,0.03) 0%, rgba(14,165,233,0.05) 100%);
      border: 1px solid rgba(15,98,254,0.1);
      border-radius: 16px;
      backdrop-filter: blur(8px);
    }
    .pp-header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    .pp-header-title { display: flex; align-items: center; gap: 0.5rem; }
    .pp-header-title i { font-size: 1.2rem; color: var(--primary-color); }
    .pp-header-title h2 { margin: 0; font-size: 1.2rem; font-weight: 700; color: var(--text-color); }
    .pp-completed .pp-header-title i { color: var(--green-500); }
    .pp-failed .pp-header-title i { color: var(--red-500); }

    /* Progress track */
    .pp-progress-track {
      height: 8px; background: rgba(15,98,254,0.06);
      border-radius: 8px; overflow: hidden; margin-bottom: 1rem;
    }
    .pp-progress-fill {
      height: 100%; border-radius: 8px;
      transition: width 600ms cubic-bezier(0.4,0,0.2,1);
    }
    .pp-fill-active {
      background: linear-gradient(90deg, var(--primary-color), #0ea5e9);
      animation: pp-shimmer 2s infinite;
    }
    .pp-fill-success { background: linear-gradient(90deg, #22c55e, #10b981); }
    .pp-fill-error { background: linear-gradient(90deg, #ef4444, #f87171); }
    @keyframes pp-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    .pp-header-stats { display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; }
    .pp-stat {
      display: flex; align-items: center; gap: 0.35rem;
      font-size: 0.82rem; color: var(--text-color-secondary);
    }
    .pp-stat i { font-size: 0.85rem; }
    .pp-stat strong { color: var(--text-color); font-weight: 700; }

    /* ── Module Cards Grid ── */
    .pp-module-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 0.6rem;
    }
    .pp-module-card {
      display: flex; flex-direction: column; align-items: center; gap: 0.35rem;
      padding: 0.85rem 0.5rem; border-radius: 12px;
      background: var(--surface-card, #fff); border: 1px solid var(--surface-border);
      cursor: pointer;
      transition: all 300ms cubic-bezier(0.4,0,0.2,1);
      animation: pp-cardIn 400ms ease both;
      text-align: center;
    }
    @keyframes pp-cardIn {
      from { opacity: 0; transform: translateY(8px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .pp-module-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
    .pp-mod-queued { opacity: 0.5; }
    .pp-mod-running { border-color: var(--primary-color); box-shadow: 0 0 0 2px rgba(15,98,254,0.1); }
    .pp-mod-completed { border-color: rgba(34,197,94,0.3); }
    .pp-mod-completed .pp-mod-icon { animation: pp-lightUp 500ms ease; }
    @keyframes pp-lightUp {
      0% { transform: scale(1); }
      50% { transform: scale(1.15); }
      100% { transform: scale(1); }
    }
    .pp-mod-failed { border-color: rgba(239,68,68,0.3); }

    .pp-mod-icon-wrap { position: relative; }
    .pp-mod-icon {
      width: 38px; height: 38px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem;
      transition: all 300ms ease;
    }
    .pp-mod-pulse {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 38px; height: 38px; border-radius: 10px;
      border: 2px solid var(--primary-color); opacity: 0;
      animation: pp-pulse 1.5s infinite;
    }
    @keyframes pp-pulse {
      0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
      100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
    }
    .pp-mod-label { font-size: 0.7rem; font-weight: 600; color: var(--text-color); line-height: 1.2; }
    .pp-mod-dur { font-size: 0.6rem; color: var(--text-color-secondary); }

    /* ── Timeline ── */
    .pp-timeline { display: flex; flex-direction: column; position: relative; }
    .pp-tl-item {
      display: flex; align-items: flex-start; gap: 0.75rem;
      padding: 0.5rem 0; position: relative;
      animation: pp-tlIn 300ms ease both;
    }
    @keyframes pp-tlIn {
      from { opacity: 0; transform: translateX(-8px); }
      to { opacity: 1; transform: translateX(0); }
    }

    .pp-tl-connector {
      position: absolute; left: 14px; top: 36px; bottom: -8px; width: 1px;
    }
    .pp-tl-line {
      width: 1px; height: 100%;
      background: var(--surface-border);
      transition: background 300ms ease;
    }
    .pp-tl-line-done { background: var(--green-400); }

    .pp-tl-dot {
      width: 28px; height: 28px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.75rem; flex-shrink: 0;
      background: var(--surface-ground); color: var(--text-color-secondary);
      border: 2px solid var(--surface-border);
      transition: all 300ms ease;
      z-index: 1;
    }
    .pp-tl-running .pp-tl-dot {
      background: rgba(15,98,254,0.1); color: var(--primary-color);
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(15,98,254,0.12);
    }
    .pp-tl-completed .pp-tl-dot {
      background: var(--green-500); color: #fff;
      border-color: var(--green-500);
    }
    .pp-tl-failed .pp-tl-dot {
      background: var(--red-500); color: #fff;
      border-color: var(--red-500);
    }

    .pp-tl-info { flex: 1; min-width: 0; }
    .pp-tl-header { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
    .pp-tl-name { font-size: 0.85rem; font-weight: 600; color: var(--text-color); }
    .pp-tl-queued .pp-tl-name { color: var(--text-color-secondary); }
    .pp-tl-meta { display: flex; align-items: center; gap: 0.5rem; }
    .pp-tl-dur { font-size: 0.72rem; color: var(--text-color-secondary); font-weight: 500; }
    .pp-tl-error {
      display: flex; align-items: center; gap: 0.3rem;
      font-size: 0.78rem; color: var(--red-500); margin-top: 0.2rem;
    }
    .pp-tl-error i { font-size: 0.7rem; }

    /* ── Log Viewer ── */
    .pp-log-section {
      border: 1px solid var(--surface-border); border-radius: 12px;
      background: var(--surface-card, #fff); overflow: hidden;
    }
    .pp-log-header {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.75rem 1rem; cursor: pointer;
      font-size: 0.85rem; font-weight: 700; color: var(--text-color);
      transition: background 150ms ease;
    }
    .pp-log-header:hover { background: rgba(0,0,0,0.02); }
    .pp-log-header i:first-child { color: var(--primary-color); }
    .pp-log-count {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 20px; height: 20px; padding: 0 6px;
      font-size: 0.68rem; font-weight: 700;
      background: rgba(15,98,254,0.08); color: var(--primary-color);
      border-radius: 10px;
    }
    .pp-log-body {
      max-height: 300px; overflow-y: auto;
      border-top: 1px solid var(--surface-border);
      background: #0f172a; color: #e2e8f0; padding: 0.5rem;
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 0.75rem;
    }
    .pp-log-entry {
      display: flex; gap: 0.75rem; padding: 0.2rem 0.35rem;
      border-radius: 4px; animation: pp-logIn 200ms ease both;
    }
    @keyframes pp-logIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .pp-log-entry:hover { background: rgba(255,255,255,0.04); }
    .pp-log-time { color: #64748b; min-width: 60px; flex-shrink: 0; }
    .pp-log-step { color: #38bdf8; min-width: 140px; flex-shrink: 0; }
    .pp-log-msg { color: #e2e8f0; }
    .pp-log-empty { padding: 1rem; text-align: center; color: #64748b; }

    /* ── Celebration ── */
    .pp-celebration {
      position: relative; overflow: hidden;
      padding: 2.5rem 2rem; text-align: center;
      background: linear-gradient(135deg, rgba(34,197,94,0.04) 0%, rgba(16,185,129,0.06) 100%);
      border: 1px solid rgba(34,197,94,0.15);
      border-radius: 16px;
    }
    .pp-celebration-content { position: relative; z-index: 1; }
    .pp-celebration h3 { margin: 1rem 0 0.5rem; font-size: 1.4rem; font-weight: 800; color: var(--green-600); }
    .pp-celebration p { margin: 0; color: var(--text-color-secondary); font-size: 0.9rem; }

    /* Animated checkmark SVG */
    .pp-success-icon { width: 64px; height: 64px; margin: 0 auto; }
    .pp-check-svg { width: 64px; height: 64px; }
    .pp-check-circle {
      stroke: #22c55e; stroke-width: 2;
      stroke-dasharray: 157; stroke-dashoffset: 157;
      animation: pp-circleDraw 0.6s 0.2s ease forwards;
    }
    .pp-check-path {
      stroke: #22c55e; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round;
      stroke-dasharray: 48; stroke-dashoffset: 48;
      animation: pp-checkDraw 0.4s 0.7s ease forwards;
    }
    @keyframes pp-circleDraw {
      to { stroke-dashoffset: 0; }
    }
    @keyframes pp-checkDraw {
      to { stroke-dashoffset: 0; }
    }

    /* Confetti */
    .pp-confetti-container { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
    .pp-confetti {
      position: absolute; top: -10px; border-radius: 2px;
      animation: pp-confettiFall 3s ease-in forwards;
    }
    @keyframes pp-confettiFall {
      0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
      100% { transform: translateY(400px) rotate(720deg); opacity: 0; }
    }

    /* ── Failure ── */
    .pp-failure {
      padding: 2rem; text-align: center;
      background: rgba(239,68,68,0.04); border: 1px solid rgba(239,68,68,0.15);
      border-radius: 16px;
    }
    .pp-failure-icon i { font-size: 3rem; color: var(--red-500); }
    .pp-failure h3 { margin: 0.75rem 0 0.5rem; color: var(--red-600); font-size: 1.2rem; }
    .pp-failure p { color: var(--text-color-secondary); font-size: 0.88rem; margin: 0.25rem 0; }
    .pp-failure-detail { color: var(--red-500) !important; font-family: monospace; font-size: 0.82rem !important; }
    .pp-retry-btn { margin-top: 1rem; border-radius: 10px; }

    /* ── Checklist ── */
    .pp-checklist {
      background: var(--surface-card, #fff); border: 1px solid var(--surface-border);
      border-radius: 12px; padding: 1.25rem;
    }
    .pp-checklist-title {
      display: flex; align-items: center; gap: 0.4rem;
      margin: 0 0 1rem; font-size: 1rem; font-weight: 700;
    }
    .pp-checklist-item {
      display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
      padding: 0.6rem 0; border-bottom: 1px solid var(--surface-border);
    }
    .pp-checklist-item:last-child { border-bottom: none; }
    .pp-checklist-item.done { opacity: 0.6; }
    .pp-checklist-label {
      display: flex; align-items: flex-start; gap: 0.6rem;
      cursor: pointer; flex: 1;
    }
    .pp-checklist-label input[type="checkbox"] { margin-top: 3px; accent-color: var(--green-500); }
    .pp-checklist-text { display: flex; flex-direction: column; }
    .pp-checklist-item-title { font-size: 0.88rem; font-weight: 600; }
    .pp-checklist-desc { font-size: 0.75rem; color: var(--text-color-secondary); margin-top: 2px; }

    /* ── Go to workspace ── */
    .pp-go-workspace { display: flex; justify-content: center; padding-top: 0.5rem; }
    .pp-go-btn {
      border-radius: 12px; font-weight: 700; font-size: 1rem;
      padding: 0.85rem 2rem; gap: 0.5rem;
      box-shadow: 0 4px 16px rgba(15,98,254,0.2);
      transition: all 200ms ease;
    }
    .pp-go-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(15,98,254,0.25); }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .pp-module-grid { grid-template-columns: repeat(3, 1fr); }
      .pp-header-stats { flex-direction: column; gap: 0.5rem; }
    }
  `]
})
export class ProvisioningProgressComponent implements OnChanges, OnDestroy {
  @Input() steps: ProvisioningStep[] = [];
  @Input() job: GrcRecord = null;
  @Input() events: GrcRecord[] = [];
  @Input() checklist: GrcRecord[] = [];
  @Input() isAr = false;
  @Input() stepDefinitions: ProvisioningStepDefinition[] = [];

  @Output() retryClicked = new EventEmitter<void>();
  @Output() goToWorkspace = new EventEmitter<void>();
  @Output() checklistToggle = new EventEmitter<unknown>();

  /** Computed values */
  elapsedTime = '0s';
  estimatedRemaining: string | null = null;
  completedCount = 0;
  progressPercent = 0;
  jobStatus = '';
  statusLabel = '';
  failedStepMessage = '';
  logExpanded = false;

  /** Confetti particles for celebration */
  confettiParticles: Array<{ left: string; delay: string; color: string; size: string }> = [];

  /** Timer for elapsed time updates */
  private elapsedTimer: ReturnType<typeof setTimeout> | null;

  get statusSeverity(): 'success' | 'info' | 'warning' | 'danger' | undefined {
    switch (this.jobStatus) {
      case 'completed': return 'success';
      case 'failed': return 'danger';
      case 'running': return 'info';
      default: return undefined;
    }
  }

  ngOnChanges(_changes: SimpleChanges): void {
    this.computeState();
    this.startElapsedTimer();
  }

  ngOnDestroy(): void {
    clearInterval(this.elapsedTimer);
  }

  getStepMeta(stepCode: string): { label: string; icon: string; color: string } {
    return STEP_MODULE_MAP[stepCode] || {
      label: stepCode.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      icon: 'pi-circle',
      color: '#64748b',
    };
  }

  stepSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | undefined {
    switch (status) {
      case 'completed': return 'success';
      case 'running': return 'info';
      case 'failed': return 'danger';
      default: return undefined;
    }
  }

  toggleLog(stepCode: string): void {
    this.logExpanded = !this.logExpanded;
  }

  formatEventTime(evt: GrcRecord): string {
    const ts = evt.created_at || evt.timestamp;
    if (!ts) return '--:--';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '--:--';
    }
  }

  private computeState(): void {
    this.jobStatus = this.job?.job_status || '';
    this.statusLabel = this.jobStatus || 'pending';
    this.completedCount = this.steps.filter(s => s.status === 'completed').length;
    this.progressPercent = this.steps.length > 0
      ? Math.round((this.completedCount / this.steps.length) * 100)
      : 0;

    // Elapsed time
    this.updateElapsedTime();

    // Estimated remaining
    this.computeEstimatedRemaining();

    // Failed step message
    const failedStep = this.steps.find(s => s.status === 'failed');
    this.failedStepMessage = failedStep?.error_message || '';

    // Generate confetti on first completion
    if (this.jobStatus === 'completed' && this.confettiParticles.length === 0) {
      this.generateConfetti();
    }
  }

  private updateElapsedTime(): void {
    if (!this.job?.started_at) { this.elapsedTime = '0s'; return; }
    const start = new Date(this.job.started_at).getTime();
    const end = this.job.completed_at ? new Date(this.job.completed_at).getTime() : Date.now();
    const secs = Math.round((end - start) / 1000);
    if (secs < 60) this.elapsedTime = `${secs}s`;
    else this.elapsedTime = `${Math.floor(secs / 60)}m ${secs % 60}s`;
  }

  private computeEstimatedRemaining(): void {
    if (this.jobStatus === 'completed' || this.jobStatus === 'failed' || this.completedCount === 0) {
      this.estimatedRemaining = null;
      return;
    }

    // Calculate average duration of completed steps
    const completedWithDuration = this.steps.filter(s => s.status === 'completed' && s.duration_ms);
    if (completedWithDuration.length === 0) {
      this.estimatedRemaining = null;
      return;
    }
    const avgMs = completedWithDuration.reduce((sum, s) => sum + (s.duration_ms || 0), 0) / completedWithDuration.length;
    const remainingSteps = this.steps.length - this.completedCount;
    const estRemainingMs = avgMs * remainingSteps;
    const estSecs = Math.round(estRemainingMs / 1000);

    if (estSecs < 60) this.estimatedRemaining = `~${estSecs}s`;
    else this.estimatedRemaining = `~${Math.floor(estSecs / 60)}m ${estSecs % 60}s`;
  }

  private startElapsedTimer(): void {
    clearInterval(this.elapsedTimer);
    if (this.jobStatus !== 'completed' && this.jobStatus !== 'failed' && this.job?.started_at) {
      this.elapsedTimer = setInterval(() => {
        this.updateElapsedTime();
        this.computeEstimatedRemaining();
      }, 1000);
    }
  }

  private generateConfetti(): void {
    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];
    this.confettiParticles = Array.from({ length: 40 }, (_, i) => ({
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 1.5}s`,
      color: colors[i % colors.length],
      size: `${4 + Math.random() * 6}px`,
    }));
  }
}
