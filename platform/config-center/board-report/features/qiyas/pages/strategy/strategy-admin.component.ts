// @ts-nocheck
import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TabViewModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { QiyasStrategyApiService } from '../services/qiyas-strategy-api.service';
import { PageHeaderComponent } from '../../../../../shared/components/page-chrome/page-header.component';

@Component({
    selector: 'app-strategy-admin', changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [MessageService],
    imports: [CommonModule, FormsModule, RouterModule, TabViewModule, ButtonModule, InputNumberModule, ToggleButtonModule, SkeletonModule, ToastModule, PageHeaderComponent],
    template: `
    <app-page-header titleEn="Strategy Admin" titleAr="إعدادات الاستراتيجية" icon="pi-cog"
                     subtitleEn="Module configuration for Qiyas and strategy direction" subtitleAr="تكوين الموديول للقياس والتوجيه الاستراتيجي" />
    @if (loading()) { <p-skeleton width="100%" height="300px" /> }
    @else {
      <p-tabView>
        <p-tabPanel header="General">
          <div class="settings-grid">
            <div class="sf"><label>Default Maturity Model</label><input pInputText [(ngModel)]="settings.defaultMaturityModel" /></div>
            <div class="sf"><label>Snapshot Frequency (days)</label><p-inputNumber [(ngModel)]="settings.snapshotFrequencyDays" [min]="1" [max]="365" /></div>
            <div class="sf"><label>Auto-Snapshot on Assessment</label><p-toggleButton [(ngModel)]="settings.autoSnapshotOnAssessment" onLabel="Yes" offLabel="No" /></div>
          </div>
          <button pButton label="Save" icon="pi pi-save" class="p-button-sm mt-3" (click)="save()" [loading]="saving()"></button>
        </p-tabPanel>
        <p-tabPanel header="Themes"><p class="panel-info">Manage strategic themes from the Themes page.</p>
          <button pButton label="Go to Themes" icon="pi pi-external-link" class="p-button-outlined p-button-sm" routerLink="/qiyas/strategy/themes"></button></p-tabPanel>
        <p-tabPanel header="Models"><p class="panel-info">Manage maturity models from the Qiyas Models page.</p>
          <button pButton label="Go to Models" icon="pi pi-external-link" class="p-button-outlined p-button-sm" routerLink="/qiyas/models"></button></p-tabPanel>
      </p-tabView>
    }
    <p-toast />
  `,
    styles: [`:host { display: block; padding: 0 16px 24px; }
    .settings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; padding: 16px 0; }
    .sf { display: flex; flex-direction: column; gap: 6px; } .sf label { font-size: var(--font-size-tag); font-weight: 600; color: var(--text-muted); }
    .panel-info { color: var(--text-muted); margin-bottom: 12px; }`]
})
export class StrategyAdminComponent implements OnInit {
  private readonly api = inject(QiyasStrategyApiService);
  private readonly msg = inject(MessageService);
  loading = signal(true);
  saving = signal(false);
  settings: any = { defaultMaturityModel: '', snapshotFrequencyDays: 30, autoSnapshotOnAssessment: true };

  ngOnInit(): void {
    this.api.getSettings().subscribe({ next: d => { Object.assign(this.settings, d); this.loading.set(false); }, error: () => this.loading.set(false) });
  }
  save(): void {
    this.saving.set(true);
    this.api.updateSettings(this.settings).subscribe({
      next: () => { this.saving.set(false); this.msg.add({ severity: 'success', summary: 'Settings saved' }); },
      error: () => { this.saving.set(false); this.msg.add({ severity: 'error', summary: 'Failed' }); }
    });
  }
}
