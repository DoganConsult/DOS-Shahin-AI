import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-framework-compliance',
    imports: [CommonModule],
    template: `
    <div class="framework-compliance-widget">
      <div class="compliance-list" *ngFor="let item of items">
        <span class="framework-name">{{ item.name }}</span>
        <span class="compliance-pct">{{ item.pct }}%</span>
      </div>
    </div>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class FrameworkComplianceComponent implements OnInit {
  items: { name: string; pct: number }[] = [];

  ngOnInit(): void {
    this.items = [
      { name: 'ISO 27001', pct: 82 },
      { name: 'NIST CSF', pct: 74 },
      { name: 'SOC 2', pct: 91 },
    ];
  }

}
