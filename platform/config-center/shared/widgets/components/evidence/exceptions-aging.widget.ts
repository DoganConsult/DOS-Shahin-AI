import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { devError } from '@app/runtime/utils/dev-logger';
import { ApiClientService } from "@app/core/services/api-client.service";

interface ExceptionsAgingBucket {
  label: string;
  count: number;
}

interface ExceptionsAgingResponse {
  buckets?: ExceptionsAgingBucket[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-exceptions-aging',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="aging-widget">
      <div class="heatmap">
        <div *ngFor="let bucket of buckets" class="bucket" [class]="bucketColor(bucket)">
          <div class="count">{{ bucket.count }}</div>
          <div class="label">{{ bucket.label }} {{ i18n.translate('widgets.exceptionsAging.days') }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .heatmap { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .bucket {
      padding: 14px 8px; border-radius: var(--radius, 12px); text-align: center; cursor: pointer; transition: all 250ms;
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.20);
    }
    .bucket:hover { transform: scale(1.06); box-shadow: inset 0 1px 0 rgba(255,255,255,0.30), 0 4px 12px rgba(0,0,0,0.08); }
    .bucket-green { background: rgba(220,252,231,0.7); color: #166534; border: 1px solid rgba(34,197,94,0.18); }
    .bucket-yellow { background: rgba(254,249,195,0.7); color: #854d0e; border: 1px solid rgba(234,179,8,0.18); }
    .bucket-orange { background: rgba(255,237,213,0.7); color: #9a3412; border: 1px solid rgba(249,115,22,0.18); }
    .bucket-red { background: rgba(254,242,242,0.7); color: #991b1b; border: 1px solid rgba(239,68,68,0.18); }
    .count { font-size: var(--font-size-2xl); font-weight: var(--font-black, 800); letter-spacing: -0.02em; }
    .label { font-size: var(--font-size-xs); margin-top: 4px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
  `]
})
export class ExceptionsAgingWidget implements OnInit {
  buckets: ExceptionsAgingBucket[] = [];
  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}
  ngOnInit() {
    this.apiclientSvc.get<ExceptionsAgingResponse>('/dashboard/exceptions-aging').subscribe({ next: (d) => this.buckets = d.buckets ?? [], error: (e: unknown) => devError("[API]", e) });
  }
  bucketColor(b: ExceptionsAgingBucket): string {
    if (b.label === '0-30') return 'bucket-green';
    if (b.label === '31-60') return 'bucket-yellow';
    if (b.label === '61-90') return 'bucket-orange';
    return 'bucket-red';
  }

}
