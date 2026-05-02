/**
 * Phase G T6 — contract-driven trial banner, rendered with raw IBM Carbon.
 *
 * Reads chrome from `product.manifest.json` `trialChrome.banner`. Pulls live
 * trial state from `/api/trials/current`. Renders via raw
 * `cds-actionable-notification` from `carbon-components-angular` directly —
 * no DOS wrappers, per "100% IBM Carbon original" rule.
 */

import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NotificationModule } from 'carbon-components-angular';
import productManifest from '../../../../product.manifest.json';

type TrialStatus =
  | 'trial_pending_verification'
  | 'trial_active'
  | 'trial_expiring'
  | 'trial_grace'
  | 'trial_suspended'
  | 'trial_converted'
  | 'trial_cancelled'
  | 'trial_expired'
  | 'tenant_archived';

interface LocalizedText { en: string; ar?: string; [k: string]: string | undefined; }
interface BannerAction { id: string; label: LocalizedText; kind: 'primary' | 'secondary' | 'tertiary'; route: string; }
interface BannerContract {
  show: boolean;
  showWhenStatus: TrialStatus[];
  tone: Partial<Record<TrialStatus, 'info' | 'warning' | 'danger' | 'success'>>;
  title: LocalizedText;
  subtitleByStatus: Partial<Record<TrialStatus, LocalizedText>>;
  actions: BannerAction[];
}
interface TrialChromeContract { banner?: BannerContract; card?: unknown; }
interface TrialCurrentResponse {
  ok: boolean;
  productCode: string;
  hasTrial: boolean;
  trial?: { status: TrialStatus; ends_at?: string; grace_ends_at?: string | null; product_code?: string; };
  daysRemaining?: number;
  graceDaysRemaining?: number | null;
  allowedModules?: string[];
}

const CHROME = (productManifest as { trialChrome?: TrialChromeContract }).trialChrome ?? {};

function pickLocale<T extends LocalizedText>(text: T | undefined, locale: string): string {
  if (!text) return '';
  return text[locale] || text.en || Object.values(text).find((v): v is string => typeof v === 'string') || '';
}

function fmt(template: string, values: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => (values[k] !== undefined && values[k] !== null ? String(values[k]) : ''));
}

function carbonNotificationType(tone: 'info' | 'warning' | 'danger' | 'success'): 'info' | 'warning' | 'error' | 'success' {
  if (tone === 'danger') return 'error';
  return tone;
}

@Component({
  selector: 'app-trial-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NotificationModule],
  template: `
    @if (visible()) {
      <cds-actionable-notification
        [kind]="carbonType()"
        [title]="title()"
        [subtitle]="subtitle()"
        [lowContrast]="true"
        [hideCloseButton]="true"
        [actionButtonLabel]="primaryActionLabel()"
        (action)="onPrimaryAction()"
      ></cds-actionable-notification>
    }
  `,
  styles: [`:host { display: block; }`],
})
export class TrialBannerComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly locale = signal<'en' | 'ar'>('en');
  readonly summary = signal<TrialCurrentResponse | null>(null);
  readonly chrome  = signal<TrialChromeContract>(CHROME);

  readonly visible = computed(() => {
    const s = this.summary();
    const banner = this.chrome().banner;
    if (!banner || banner.show === false) return false;
    if (!s || !s.hasTrial || !s.trial) return false;
    return banner.showWhenStatus.includes(s.trial.status);
  });

  readonly carbonType = computed<'info' | 'warning' | 'error' | 'success'>(() => {
    const s = this.summary()?.trial?.status;
    const banner = this.chrome().banner;
    if (!s || !banner) return 'info';
    return carbonNotificationType(banner.tone[s] ?? 'info');
  });

  readonly title = computed(() => {
    const banner = this.chrome().banner;
    const s = this.summary();
    if (!banner || !s) return '';
    return fmt(pickLocale(banner.title, this.locale()), {
      daysRemaining: s.daysRemaining ?? 0,
      graceDaysRemaining: s.graceDaysRemaining ?? 0,
    });
  });

  readonly subtitle = computed(() => {
    const banner = this.chrome().banner;
    const status = this.summary()?.trial?.status;
    if (!banner || !status) return '';
    const text = banner.subtitleByStatus[status];
    if (!text) return '';
    return fmt(pickLocale(text, this.locale()), {
      daysRemaining: this.summary()?.daysRemaining ?? 0,
    });
  });

  readonly primaryAction = computed<BannerAction | undefined>(() => {
    const actions = this.chrome().banner?.actions ?? [];
    return actions.find(a => a.kind === 'primary') ?? actions[0];
  });

  readonly primaryActionLabel = computed(() => {
    const a = this.primaryAction();
    return a ? pickLocale(a.label, this.locale()) : '';
  });

  onPrimaryAction(): void {
    const a = this.primaryAction();
    if (a?.route && typeof window !== 'undefined') window.location.href = a.route;
  }

  ngOnInit(): void {
    this.http.get<TrialCurrentResponse>('/api/trials/current').subscribe({
      next: (resp) => this.summary.set(resp),
      error: () => this.summary.set({ ok: false, productCode: '', hasTrial: false }),
    });
  }
}
