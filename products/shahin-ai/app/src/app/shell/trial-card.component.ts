/**
 * Phase G T6 (full) — contract-driven trial card, rendered with raw IBM Carbon.
 *
 * Reads `productManifest.trialChrome.card` for fields/labels/actions.
 * Renders via raw `cds-tile` + `cds-structured-list` + `cdsButton` + `cds-tag`
 * imported directly from `carbon-components-angular`. Zero DOS wrappers.
 */

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  TilesModule,
  StructuredListModule,
  ButtonModule,
  TagModule,
} from 'carbon-components-angular';
import productManifest from '../../../../product.manifest.json';

type ButtonKind = 'primary' | 'secondary' | 'tertiary';

interface LocalizedText { en: string; ar?: string; [k: string]: string | undefined; }
interface CardField {
  key: string;
  label: LocalizedText;
  format?: 'date' | 'list' | 'text' | 'number';
}
interface BannerAction {
  id: string;
  label: LocalizedText;
  kind: ButtonKind;
  route: string;
}
interface CardContract {
  show?: boolean;
  title?: LocalizedText;
  fields?: CardField[];
  actions?: BannerAction[];
}
interface BannerContract {
  show: boolean;
  showWhenStatus: string[];
  actions?: BannerAction[];
}
interface TrialChromeContract { banner?: BannerContract; card?: CardContract; }
interface TrialCurrentResponse {
  ok: boolean;
  productCode: string;
  hasTrial: boolean;
  trial?: {
    status: string;
    plan_code?: string;
    ends_at?: string;
    grace_ends_at?: string | null;
    starts_at?: string;
  };
  subscription?: { plan_code?: string; status?: string; billing_status?: string };
  daysRemaining?: number;
  graceDaysRemaining?: number | null;
  allowedModules?: string[];
  expiredModules?: string[];
  limits?: Record<string, Record<string, unknown>>;
}

const CHROME = (productManifest as { trialChrome?: TrialChromeContract }).trialChrome ?? {};

function pickLocale<T extends LocalizedText>(text: T | undefined, locale: string): string {
  if (!text) return '';
  return text[locale] || text.en || Object.values(text).find((v): v is string => typeof v === 'string') || '';
}

function fmtDate(v: unknown): string {
  if (!v) return '—';
  try { return new Date(String(v)).toISOString().slice(0, 10); }
  catch { return String(v); }
}

@Component({
  selector: 'app-trial-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TilesModule, StructuredListModule, ButtonModule, TagModule],
  template: `
    @if (visible()) {
      <cds-tile>
        <header class="trial-card__head">
          <h3 class="trial-card__title">{{ title() }}</h3>
        </header>

        <cds-structured-list>
          @for (f of simpleRows(); track f.key) {
            <cds-list-row>
              <cds-list-column>{{ f.label }}</cds-list-column>
              <cds-list-column>{{ f.value }}</cds-list-column>
            </cds-list-row>
          }
          @for (f of chipRows(); track f.key) {
            <cds-list-row>
              <cds-list-column>{{ f.label }}</cds-list-column>
              <cds-list-column>
                @for (chip of f.values; track chip) {
                  <cds-tag type="blue" size="sm" style="margin-inline-end:4px">{{ chip }}</cds-tag>
                }
              </cds-list-column>
            </cds-list-row>
          }
        </cds-structured-list>

        @if (actions().length > 0) {
          <footer class="trial-card__footer">
            @for (a of actions(); track a.id) {
              <button
                cdsButton
                [ngClass]="'cds--btn--' + a.kind"
                size="md"
                (click)="onAction(a)"
              >{{ actionLabel(a) }}</button>
            }
          </footer>
        }
      </cds-tile>
    }
  `,
  styles: [`
    :host { display: block; }
    .trial-card__head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 0.5rem;
    }
    .trial-card__title {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 400;
      color: var(--cds-text-primary);
    }
    .trial-card__footer {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
      flex-wrap: wrap;
    }
  `],
})
export class TrialCardComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly locale  = signal<'en' | 'ar'>('en');
  readonly summary = signal<TrialCurrentResponse | null>(null);
  readonly chrome  = signal<TrialChromeContract>(CHROME);

  readonly visible = computed(() => {
    const c = this.chrome().card;
    const s = this.summary();
    if (!c || c.show === false) return false;
    return Boolean(s?.hasTrial);
  });

  readonly title = computed(() =>
    pickLocale(this.chrome().card?.title, this.locale()));

  readonly actions = computed<BannerAction[]>(() =>
    this.chrome().card?.actions ?? this.chrome().banner?.actions ?? []);

  readonly resolvedFields = computed<Array<{ key: string; label: string; value: string; isList: boolean; values: string[] }>>(() => {
    const fields = this.chrome().card?.fields ?? [];
    const s = this.summary();
    if (!s) return [];

    return fields.map(f => {
      const label = pickLocale(f.label, this.locale());
      let raw: unknown;
      switch (f.key) {
        case 'plan':           raw = s.trial?.plan_code ?? s.subscription?.plan_code ?? '—'; break;
        case 'status':         raw = s.trial?.status ?? '—'; break;
        case 'daysRemaining':  raw = typeof s.daysRemaining === 'number' ? s.daysRemaining : '—'; break;
        case 'endsAt':         raw = s.trial?.ends_at ?? '—'; break;
        case 'graceEndsAt':    raw = s.trial?.grace_ends_at ?? '—'; break;
        case 'allowedModules': raw = s.allowedModules ?? []; break;
        case 'expiredModules': raw = s.expiredModules ?? []; break;
        default: {
          const segments = f.key.split('.');
          let cur: any = s;
          for (const seg of segments) cur = cur != null ? cur[seg] : undefined;
          raw = cur ?? '—';
        }
      }

      if (f.format === 'list' || Array.isArray(raw)) {
        const values = Array.isArray(raw) ? raw.map(v => String(v)) : [String(raw)];
        return { key: f.key, label, value: '', isList: true, values };
      }
      if (f.format === 'date') {
        return { key: f.key, label, value: fmtDate(raw), isList: false, values: [] };
      }
      return { key: f.key, label, value: String(raw), isList: false, values: [] };
    });
  });

  actionLabel(a: BannerAction): string {
    return pickLocale(a.label, this.locale());
  }

  readonly simpleRows = computed(() =>
    this.resolvedFields().filter((f) => !f.isList),
  );

  readonly chipRows = computed(() =>
    this.resolvedFields().filter((f) => f.isList),
  );

  onAction(a: BannerAction): void {
    if (a?.route && typeof window !== 'undefined') window.location.href = a.route;
  }

  ngOnInit(): void {
    this.http.get<TrialCurrentResponse>('/api/trials/current').subscribe({
      next: (resp) => this.summary.set(resp),
      error: () => this.summary.set({ ok: false, productCode: '', hasTrial: false }),
    });
  }
}
