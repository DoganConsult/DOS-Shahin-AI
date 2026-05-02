import { Component, Input, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

/** Minimal stub: shows a small (i) icon; popover content can be added later. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-why-how-popover',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <span class="why-how-trigger" [attr.title]="whyText">
      <i class="pi pi-info-circle" aria-hidden="true"></i>
    </span>
  `,
  styles: [`
    .why-how-trigger {
      display: inline-flex;
      margin-inline-start: 4px;
      color: var(--text-color-secondary, var(--text-muted));
      cursor: help;
      font-size: var(--font-size-base);
    }
  `],
})
export class WhyHowPopoverComponent {
  @Input() whyText = '';
  @Input() whyAr = '';
  @Input() howText = '';
  @Input() howAr = '';
  @Input() howLink: string | null = null;
}
