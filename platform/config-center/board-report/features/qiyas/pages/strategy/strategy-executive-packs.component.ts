// @ts-nocheck
import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { QiyasStrategyApiService } from '../services/qiyas-strategy-api.service';
import { PageHeaderComponent } from '../../../../../shared/components/page-chrome/page-header.component';

@Component({
    selector: 'app-strategy-executive-packs', changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [MessageService],
    imports: [CommonModule, ButtonModule, CardModule, TagModule, ToastModule, PageHeaderComponent],
    template: `
    <app-page-header titleEn="Executive Packs" titleAr="الحزم التنفيذية" icon="pi-briefcase"
                     subtitleEn="Generate strategy and maturity report packs for leadership" subtitleAr="إنشاء حزم تقارير الاستراتيجية والنضج للقيادة" />
    <div class="packs-grid">
      @for (pack of packs(); track pack.id) {
        <p-card styleClass="pack-card">
          <h3>{{ pack.name }}</h3>
          <p class="pack-audience"><p-tag [value]="pack.audience" severity="info" /></p>
          <ng-template pTemplate="footer">
            <div class="pack-actions">
              @for (fmt of pack.formats; track fmt) {
                <button pButton [label]="fmt.toUpperCase()" class="p-button-sm p-button-outlined"
                        (click)="generate(pack.id, fmt)" [loading]="generating() === pack.id + '-' + fmt"></button>
              }
            </div>
          </ng-template>
        </p-card>
      }
    </div>
    <p-toast />
  `,
    styles: [`:host { display: block; padding: 0 16px 24px; }
    .packs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-top: 16px; }
    h3 { margin: 0 0 8px; font-size: var(--font-size-md); } .pack-audience { margin: 8px 0; }
    .pack-actions { display: flex; gap: 8px; }`]
})
export class StrategyExecutivePacksComponent implements OnInit {
  private readonly api = inject(QiyasStrategyApiService);
  private readonly msg = inject(MessageService);
  packs = signal<any[]>([]);
  generating = signal('');

  ngOnInit(): void {
    this.api.getExecutivePacks().subscribe({ next: d => this.packs.set(d.packs || []), error: () => {} });
  }
  generate(packId: string, format: string): void {
    this.generating.set(`${packId}-${format}`);
    this.api.generatePack(packId, format).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: `${packId} queued` }); this.generating.set(''); },
      error: () => { this.msg.add({ severity: 'error', summary: 'Generation failed' }); this.generating.set(''); }
    });
  }
}
