/**
 * Phase M1.5 — Download-Kit components (3 standalone Angular components).
 *
 *   <dos-download-kit-card>     → IBM Carbon Tile/Tag/Button/StructuredList.
 *   <dos-gated-download-modal>  → IBM Carbon Modal/TextInput/Dropdown/Checkbox/
 *                                 InlineNotification/InlineLoading.
 *   <dos-download-success>      → IBM Carbon InlineNotification/Button/Tile.
 *
 * Components NEVER call fetch directly. The card/modal emit
 * MarketingDownloadEvents via @Output and the host page (or the
 * unauthenticated `/marketing/downloads` POST endpoint) is the executor.
 *
 * Mobile reflow:
 *   - Card    → compact tile under 480px container.
 *   - Modal   → bottom-sheet (data-mobile-mode='bottom-sheet') under 480px.
 *   - Form    → 1 input per row.
 */
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  type MarketingAsset,
  type MarketingDownloadEvent,
  type MarketingDownloadFormPayload,
} from './download-kit.contract';

function nowIso(): string { return new Date().toISOString(); }

// ═════════════════════════════════════════════════════════════════════════
// 1. <dos-download-kit-card>
// ═════════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-download-kit-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="dos-download-kit-card"
      data-cds-component="tile"
      [attr.data-asset-key]="asset?.assetKey"
      [attr.data-locale]="asset?.locale"
      [attr.data-gated]="asset?.isGated ? 'true' : 'false'"
    >
      @if (!asset) {
        <div data-cds-component="skeleton-text"></div>
      } @else {
        <header class="dos-dk-card-head">
          <span data-cds-component="tag" [attr.data-kind]="asset.isGated ? 'warm-gray' : 'cool-gray'">
            {{ asset.isGated ? gatedLabel : openLabel }}
          </span>
          <span data-cds-component="tag" data-kind="gray">{{ asset.assetType.toUpperCase() }}</span>
        </header>
        <h3 class="dos-dk-card-title">{{ asset.title }}</h3>
        <p class="dos-dk-card-desc">{{ asset.description }}</p>
        <ul class="dos-dk-card-meta" data-cds-component="structured-list">
          <li><span>v</span><strong>{{ asset.version }}</strong></li>
          <li><span>locale</span><strong>{{ asset.locale }}</strong></li>
        </ul>
        <footer>
          <button
            type="button"
            data-cds-component="button"
            data-kind="primary"
            (click)="onPrimary()"
          >{{ ctaLabel }}</button>
        </footer>
      }
    </article>
  `,
  styles: [`
    :host { display: block; container-type: inline-size; }
    .dos-download-kit-card { padding: var(--dos-space-4, 1rem); display: flex; flex-direction: column; gap: var(--dos-space-3, 0.75rem); }
    .dos-dk-card-head { display: flex; gap: 0.5rem; }
    .dos-dk-card-title { margin: 0; font-size: 1.25rem; }
    .dos-dk-card-desc { margin: 0; color: var(--dos-color-text-secondary, #525252); }
    .dos-dk-card-meta { list-style: none; padding: 0; margin: 0; display: flex; gap: 1rem; }
    .dos-dk-card-meta li { display: flex; flex-direction: column; }
    @container (max-width: 480px) {
      .dos-download-kit-card { padding: var(--dos-space-3, 0.75rem); }
      .dos-dk-card-meta { flex-direction: column; gap: 0.25rem; }
    }
  `],
})
export class DosDownloadKitCardComponent {
  @Input() asset: MarketingAsset | null = null;
  @Input() ctaLabel = 'Download kit';
  @Input() gatedLabel = 'Gated';
  @Input() openLabel = 'Open download';
  @Output() readonly event = new EventEmitter<MarketingDownloadEvent>();

  onPrimary() {
    if (!this.asset) return;
    // Card always emits `opened` — host shell decides whether to open the
    // gated modal or trigger the open download.
    this.event.emit({
      key: 'marketing.download.opened',
      assetKey: this.asset.assetKey,
      brandCode: this.asset.brandCode,
      locale: this.asset.locale,
      occurredAt: nowIso(),
    });
  }
}

// ═════════════════════════════════════════════════════════════════════════
// 2. <dos-gated-download-modal>
// ═════════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-gated-download-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="dos-gated-modal"
      data-cds-component="modal"
      [attr.data-asset-key]="asset?.assetKey"
      [attr.data-mobile-mode]="'bottom-sheet'"
      [attr.aria-hidden]="!open"
      [hidden]="!open"
      role="dialog"
      aria-modal="true"
    >
      <header><h3>{{ title }}</h3></header>
      @if (asset) {
        <p>{{ asset.title }}</p>
      }
      <form (ngSubmit)="onSubmit()" novalidate>
        <label data-cds-component="input">
          <span>{{ labelName }}</span>
          <input type="text" name="name" [(ngModel)]="form.name" required />
        </label>
        <label data-cds-component="input">
          <span>{{ labelEmail }}</span>
          <input type="email" name="email" [(ngModel)]="form.email" required />
        </label>
        <label data-cds-component="input">
          <span>{{ labelCompany }}</span>
          <input type="text" name="company" [(ngModel)]="form.company" required />
        </label>
        <label data-cds-component="input">
          <span>{{ labelJobTitle }}</span>
          <input type="text" name="jobTitle" [(ngModel)]="form.jobTitle" />
        </label>
        <label data-cds-component="dropdown">
          <span>{{ labelCountry }}</span>
          <select name="country" [(ngModel)]="form.country" required>
            @for (c of countries; track c) { <option [value]="c">{{ c }}</option> }
          </select>
        </label>
        <label data-cds-component="dropdown">
          <span>{{ labelInterest }}</span>
          <select name="interestArea" [(ngModel)]="form.interestArea">
            @for (i of interestAreas; track i) { <option [value]="i">{{ i }}</option> }
          </select>
        </label>
        <label data-cds-component="checkbox">
          <input type="checkbox" name="consent" [(ngModel)]="consent" required />
          <span>{{ labelConsent }}</span>
        </label>

        @if (errorMessage()) {
          <div data-cds-component="notification" data-kind="error" role="alert">
            {{ errorMessage() }}
          </div>
        }
        @if (submitting()) {
          <div data-cds-component="inline-loading">{{ submittingLabel }}</div>
        }

        <footer>
          <button type="button" data-cds-component="button" data-kind="tertiary" (click)="onClose()">
            {{ cancelLabel }}
          </button>
          <button type="submit" data-cds-component="button" data-kind="primary" [disabled]="submitting()">
            {{ submitLabel }}
          </button>
        </footer>
      </form>
    </section>
  `,
  styles: [`
    :host { display: contents; container-type: inline-size; }
    .dos-gated-modal { padding: var(--dos-space-4, 1rem); display: flex; flex-direction: column; gap: var(--dos-space-3, 0.75rem); background: var(--dos-color-surface, #fff); }
    form { display: grid; gap: var(--dos-space-3, 0.75rem); }
    label { display: grid; gap: 0.25rem; }
    footer { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: var(--dos-space-3, 0.75rem); }
    @container (max-width: 480px) {
      form { grid-template-columns: 1fr; }
      footer { position: sticky; inset-block-end: 0; background: inherit; padding-block: 0.5rem; }
    }
  `],
})
export class DosGatedDownloadModalComponent {
  @Input() asset: MarketingAsset | null = null;
  @Input() open = false;
  @Input() title = 'Get your download';
  @Input() labelName = 'Full name';
  @Input() labelEmail = 'Work email';
  @Input() labelCompany = 'Company';
  @Input() labelJobTitle = 'Job title';
  @Input() labelCountry = 'Country';
  @Input() labelInterest = 'Interest area';
  @Input() labelConsent = 'I agree to be contacted about this download.';
  @Input() submitLabel = 'Get download';
  @Input() cancelLabel = 'Cancel';
  @Input() submittingLabel = 'Submitting…';
  @Input() countries: ReadonlyArray<string> = ['Saudi Arabia','UAE','Qatar','Kuwait','Bahrain','Oman','Other'];
  @Input() interestAreas: ReadonlyArray<string> = ['GRC','Risk','Audit','Security','Privacy','Other'];

  @Output() readonly event = new EventEmitter<MarketingDownloadEvent>();
  @Output() readonly closed = new EventEmitter<void>();

  readonly form: MarketingDownloadFormPayload = {
    name: '', email: '', company: '', jobTitle: '', country: '', interestArea: '',
  };
  consent = false;

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  onClose() {
    this.open = false;
    this.closed.emit();
  }

  onSubmit() {
    if (!this.asset) return;
    this.errorMessage.set(null);
    if (!this.form.name || !this.form.email || !this.form.company || !this.consent) {
      this.errorMessage.set('Please complete the required fields.');
      return;
    }
    this.submitting.set(true);
    // Component does NOT execute — emits the event for the host shell to
    // POST /marketing/downloads. Submitting flag is reset by host via
    // `markCompleted()` / `markFailed()`.
    this.event.emit({
      key: 'marketing.download.submitted',
      assetKey: this.asset.assetKey,
      brandCode: this.asset.brandCode,
      locale: this.asset.locale,
      occurredAt: nowIso(),
      payload: { ...this.form },
    });
  }

  /** Host shell calls this after a successful POST /marketing/downloads. */
  markCompleted() {
    this.submitting.set(false);
    this.errorMessage.set(null);
    if (this.asset) {
      this.event.emit({
        key: 'marketing.download.completed',
        assetKey: this.asset.assetKey,
        brandCode: this.asset.brandCode,
        locale: this.asset.locale,
        occurredAt: nowIso(),
      });
    }
  }
  markFailed(message: string) {
    this.submitting.set(false);
    this.errorMessage.set(message);
  }
}

// ═════════════════════════════════════════════════════════════════════════
// 3. <dos-download-success>
// ═════════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-download-success',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="dos-download-success"
      data-cds-component="tile"
      [attr.data-asset-key]="asset?.assetKey"
    >
      <div data-cds-component="notification" data-kind="success" role="status">
        {{ successHeading }}
      </div>
      @if (asset) {
        <p>{{ successBody }} <strong>{{ asset.title }}</strong>.</p>
      }
      <footer>
        @if (asset?.fileUrl) {
          <a
            data-cds-component="button"
            data-kind="primary"
            [attr.href]="asset?.fileUrl"
            target="_blank" rel="noopener"
            (click)="emitOpenedNow()"
          >{{ downloadNowLabel }}</a>
        }
        <button type="button" data-cds-component="button" data-kind="tertiary" (click)="emitEmail()">
          {{ emailLabel }}
        </button>
        <a data-cds-component="button" data-kind="tertiary" [href]="bookDemoHref">
          {{ bookDemoLabel }}
        </a>
        <a data-cds-component="button" data-kind="tertiary" [href]="exploreHref">
          {{ exploreLabel }}
        </a>
      </footer>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .dos-download-success { padding: var(--dos-space-4, 1rem); display: flex; flex-direction: column; gap: var(--dos-space-3, 0.75rem); }
    footer { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  `],
})
export class DosDownloadSuccessComponent {
  @Input() asset: MarketingAsset | null = null;
  @Input() successHeading = 'Your kit is ready.';
  @Input() successBody = 'You can now access';
  @Input() downloadNowLabel = 'Download now';
  @Input() emailLabel = 'Email me a link';
  @Input() bookDemoLabel = 'Book a demo';
  @Input() bookDemoHref = '/demo';
  @Input() exploreLabel = 'Explore the platform';
  @Input() exploreHref = '/platform';

  @Output() readonly event = new EventEmitter<MarketingDownloadEvent>();

  emitOpenedNow() {
    if (!this.asset) return;
    this.event.emit({
      key: 'marketing.download.completed',
      assetKey: this.asset.assetKey,
      brandCode: this.asset.brandCode,
      locale: this.asset.locale,
      occurredAt: nowIso(),
    });
  }
  emitEmail() {
    if (!this.asset) return;
    this.event.emit({
      key: 'marketing.download.completed',
      assetKey: this.asset.assetKey,
      brandCode: this.asset.brandCode,
      locale: this.asset.locale,
      occurredAt: nowIso(),
      payload: { interestArea: 'email-link' },
    });
  }
}
