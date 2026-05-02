import { Component, inject, signal, OnInit, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FitchApiService, FitchRule } from '../services/fitch-api.service';

@Component({
    selector: 'app-fitch-rule-palette',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="rule-palette">
      <h3 class="palette-title">Inference Rules</h3>

      @for (group of ruleGroups(); track group.label) {
        <div class="rule-group">
          <div class="group-label">{{ group.label }}</div>
          @for (rule of group.rules; track rule.name) {
            <button
              class="rule-btn"
              [class.selected]="selectedRule() === rule.name"
              (click)="selectRule(rule)"
              [title]="rule.description"
            >
              <span class="rule-symbol">{{ rule.symbol || '—' }}</span>
              <span class="rule-label">{{ rule.label }}</span>
            </button>
          }
        </div>
      }

      @if (selectedRule()) {
        <div class="rule-detail">
          <div class="detail-name">{{ selectedRuleObj()?.label }}</div>
          <div class="detail-desc">{{ selectedRuleObj()?.description }}</div>
          <div class="detail-cite">Citations: {{ selectedRuleObj()?.citationsRequired }}</div>
        </div>
      }
    </div>
  `,
    styles: [`
    .rule-palette {
      background: var(--surface-card, #1e1e2e);
      border: 1px solid var(--surface-border, #333);
      border-radius: var(--radius);
      padding: 12px;
      min-width: 220px;
    }
    .palette-title {
      font-size: var(--font-size-base);
      font-weight: 600;
      margin: 0 0 12px 0;
      color: var(--text-color, #cdd6f4);
    }
    .rule-group {
      margin-bottom: 12px;
    }
    .group-label {
      font-size: var(--font-size-xs);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-color-secondary, #a6adc8);
      margin-bottom: 4px;
      padding-left: 4px;
    }
    .rule-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 6px 8px;
      border: 1px solid transparent;
      border-radius: var(--radius-xs);
      background: transparent;
      color: var(--text-color, #cdd6f4);
      cursor: pointer;
      font-size: var(--font-size-sm);
      text-align: left;
      transition: background 0.15s;
    }
    .rule-btn:hover {
      background: var(--surface-hover, #313244);
    }
    .rule-btn.selected {
      background: var(--primary-color, #89b4fa);
      color: var(--primary-color-text, #1e1e2e);
      border-color: var(--primary-color, #89b4fa);
    }
    .rule-symbol {
      font-weight: 700;
      min-width: 28px;
      text-align: center;
      font-family: 'Fira Code', monospace;
    }
    .rule-label {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .rule-detail {
      margin-top: 12px;
      padding: 10px;
      background: var(--surface-ground, #181825);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-sm);
    }
    .detail-name {
      font-weight: 600;
      margin-bottom: 4px;
      color: var(--primary-color, #89b4fa);
    }
    .detail-desc {
      color: var(--text-color, #cdd6f4);
      margin-bottom: 4px;
    }
    .detail-cite {
      color: var(--text-color-secondary, #a6adc8);
      font-style: italic;
    }
  `]
})
export class FitchRulePaletteComponent implements OnInit {
  private api = inject(FitchApiService);

  rules = signal<FitchRule[]>([]);
  selectedRule = signal<string | null>(null);
  selectedRuleObj = signal<FitchRule | null>(null);

  ruleSelected = output<string>();

  ruleGroups = signal<Array<{ label: string; rules: FitchRule[] }>>([]);

  ngOnInit() {
    this.api.getRules().subscribe({
      next: (res) => {
        this.rules.set(res.rules);
        this.ruleGroups.set(this.groupRules(res.rules));
      },
    });
  }

  selectRule(rule: FitchRule) {
    this.selectedRule.set(rule.name);
    this.selectedRuleObj.set(rule);
    this.ruleSelected.emit(rule.name);
  }

  private groupRules(rules: FitchRule[]): Array<{ label: string; rules: FitchRule[] }> {
    const groups: Record<string, FitchRule[]> = {
      Basic: [],
      Conjunction: [],
      Disjunction: [],
      Conditional: [],
      Negation: [],
      Biconditional: [],
      Contradiction: [],
    };
    for (const r of rules) {
      if (['premise', 'assumption', 'reiteration'].includes(r.name)) groups['Basic'].push(r);
      else if (r.name.startsWith('and_')) groups['Conjunction'].push(r);
      else if (r.name.startsWith('or_')) groups['Disjunction'].push(r);
      else if (r.name.startsWith('implies_')) groups['Conditional'].push(r);
      else if (r.name.startsWith('not_')) groups['Negation'].push(r);
      else if (r.name.startsWith('biconditional_')) groups['Biconditional'].push(r);
      else if (r.name.startsWith('bottom_')) groups['Contradiction'].push(r);
    }
    return Object.entries(groups)
      .filter(([, v]) => v.length > 0)
      .map(([label, rules]) => ({ label, rules }));
  }
}
