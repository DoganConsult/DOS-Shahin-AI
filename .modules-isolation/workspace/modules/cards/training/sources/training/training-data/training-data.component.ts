import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { MessageModule } from 'primeng/message';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-training-data',
  standalone: true,
  imports: [CommonModule, FormsModule, PageShellComponent, CardModule, ButtonModule, DropdownModule, MessageModule],
  template: `
    <app-page-shell icon="database" [title]="i18n.translate('trainingData.title')" [subtitle]="'Generate demo data for training'" [breadcrumbs]="['Dashboard', 'Training Data']" [loading]="loading">
      <p-message *ngIf="hasData" severity="warning" [text]="i18n.translate('trainingData.warning')"></p-message>
      <p-message *ngIf="hasData" severity="info" [text]="i18n.translate('trainingData.active')" class="ml-2"></p-message>
      <p-message *ngIf="!hasData && !loading" severity="success" [text]="i18n.translate('trainingData.inactive')"></p-message>

      <div class="flex gap-3 mt-4">
        <p-dropdown [options]="volumeOptions" [(ngModel)]="selectedVolume" [style]="{'min-width':'250px'}"></p-dropdown>
        <button pButton [label]="i18n.translate('trainingData.load')" icon="pi pi-download" (click)="loadData()" [loading]="loadingAction"></button>
        <button pButton [label]="i18n.translate('trainingData.purge')" icon="pi pi-trash" class="p-button-danger" (click)="purgeData()" [loading]="loadingAction" [disabled]="!hasData"></button>
      </div>

      <p-card *ngIf="result" class="mt-4">
        <pre>{{result | json}}</pre>
      </p-card>
    </app-page-shell>
  `
})
export class TrainingDataComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  hasData = false;
  loading = true;
  loadingAction = false;
  selectedVolume = 'small';
  result: Record<string, unknown> | null = null;
  volumeOptions = [
    { label: 'Small (50 records per type)', value: 'small' },
    { label: 'Medium (200 records per type)', value: 'medium' },
    { label: 'Large (500 records per type)', value: 'large' },
  ];

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit() { this.checkStatus(); }

  checkStatus() {
    this.loading = true;
    this.apiclientSvc.get('/training/status').subscribe({
      next: (data: any) => { this.hasData = data.hasTrainingData; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  loadData() {
    this.loadingAction = true;
    this.apiclientSvc.post('/training/load', { volume: this.selectedVolume }).subscribe({
      next: (data: any) => { this.result = data; this.loadingAction = false; this.checkStatus(); },
      error: () => { this.loadingAction = false; }
    });
  }

  purgeData() {
    this.loadingAction = true;
    this.apiclientSvc.post('/training/purge', {}).subscribe({
      next: (data: any) => { this.result = data; this.loadingAction = false; this.checkStatus(); },
      error: () => { this.loadingAction = false; }
    });
  }
}
