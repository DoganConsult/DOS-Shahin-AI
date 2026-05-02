import { Injectable, inject, signal } from '@angular/core';
import { RiskApiService } from './risk-api.service';

/**
 * Risk-module-owned foundation data lookup.
 *
 * Owner: risk module (features/risk)
 * Purpose: derives risk category options from the risk register API
 * for use in dropdowns and filter bars within risk pages.
 *
 * NOT a shared/core service — scoped to risk feature surfaces only.
 */
@Injectable({ providedIn: 'root' })
export class RiskFoundationLookupService {
  private api = inject(RiskApiService);
  private loaded = false;

  /** Risk category dropdown options — populated after load(). */
  riskCatOptions = signal<{ label: string; value: string }[]>([]);

  /** Trigger data loading. Safe to call multiple times — only fetches once. */
  load(): void {
    if (this.loaded) return;
    this.loaded = true;

    this.api.getRegister({}).subscribe({
      next: (res) => {
        const risks = res.risks || [];
        const cats = new Set<string>();
        for (const r of risks) {
          if (r.category) cats.add(r.category);
        }
        this.riskCatOptions.set(
          Array.from(cats).sort().map(c => ({ label: c.charAt(0).toUpperCase() + c.slice(1), value: c })),
        );
      },
      error: () => {
        this.riskCatOptions.set([
          { label: 'Operational', value: 'operational' },
          { label: 'Financial', value: 'financial' },
          { label: 'Compliance', value: 'compliance' },
          { label: 'Strategic', value: 'strategic' },
          { label: 'Reputational', value: 'reputational' },
          { label: 'Cybersecurity', value: 'cybersecurity' },
          { label: 'Legal', value: 'legal' },
          { label: 'Third Party', value: 'third_party' },
        ]);
      },
    });
  }
}
