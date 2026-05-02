import {
  Component,
  inject,
  signal,
  OnInit,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FitchApiService, ExampleProof, FitchProofSummary } from '../services/fitch-api.service';
import { FitchProofEditorComponent } from '../components/fitch-proof-editor.component';
import { FitchRulePaletteComponent } from '../components/fitch-rule-palette.component';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    selector: 'app-fitch-hub',
    imports: [CommonModule, FitchProofEditorComponent, FitchRulePaletteComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="fitch-hub" dir="ltr">
      <!-- Top bar -->
      <header class="hub-header">
        <div class="header-left">
          <h1 class="hub-title">Fitch Natural Deduction</h1>
          <span class="hub-subtitle">Propositional Logic Proof System</span>
        </div>
        <div class="header-right">
          <span class="status-badge" [class.has-proofs]="savedProofs().length > 0">
            {{ savedProofs().length }} saved proof{{ savedProofs().length !== 1 ? 's' : '' }}
          </span>
        </div>
      </header>

      <div class="hub-body">
        <!-- Sidebar: rule palette + examples -->
        <aside class="hub-sidebar">
          <app-fitch-rule-palette (ruleSelected)="onRuleSelected($event)" />

          <div class="examples-panel">
            <h3 class="panel-title">Example Proofs</h3>
            @for (ex of examples(); track ex.name) {
              <button class="example-btn" (click)="loadExample(ex)">
                <span class="ex-name">{{ ex.name }}</span>
                <span class="ex-desc">{{ ex.description }}</span>
              </button>
            }
          </div>

          <!-- Saved proofs -->
          @if (savedProofs().length > 0) {
            <div class="saved-panel">
              <h3 class="panel-title">Saved Proofs</h3>
              @for (proof of savedProofs(); track proof.id) {
                <div class="saved-item">
                  <span class="saved-name">{{ proof.name }}</span>
                  <span class="saved-meta">{{ proof.lineCount }} lines</span>
                </div>
              }
            </div>
          }
        </aside>

        <!-- Main: proof editor -->
        <main class="hub-main">
          <app-fitch-proof-editor
            #editor
            (proofVerified)="onProofVerified($event)"
          />

          <!-- Quick reference -->
          <div class="quick-ref">
            <h4>Quick Reference — Connective Syntax</h4>
            <div class="ref-grid">
              <div class="ref-item"><code>P ∧ Q</code> or <code>P ^ Q</code> — Conjunction</div>
              <div class="ref-item"><code>P ∨ Q</code> or <code>P v Q</code> — Disjunction</div>
              <div class="ref-item"><code>P → Q</code> or <code>P -> Q</code> — Conditional</div>
              <div class="ref-item"><code>P ↔ Q</code> or <code>P &lt;-> Q</code> — Biconditional</div>
              <div class="ref-item"><code>¬P</code> or <code>~P</code> or <code>!P</code> — Negation</div>
              <div class="ref-item"><code>⊥</code> or <code>_|_</code> — Contradiction (bottom)</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  `,
    styles: [`
    .fitch-hub {
      min-height: 100vh;
      background: var(--surface-ground, #11111b);
      color: var(--text-color, #cdd6f4);
      padding: 20px;
    }
    .hub-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--surface-border, #313244);
    }
    .hub-title {
      font-size: 22px;
      font-weight: 700;
      margin: 0;
      color: var(--primary-color, #89b4fa);
    }
    .hub-subtitle {
      font-size: var(--font-size-sm);
      color: var(--text-color-secondary, #a6adc8);
      margin-left: 12px;
    }
    .status-badge {
      padding: 4px 12px;
      border-radius: var(--radius-lg);
      font-size: var(--font-size-sm);
      background: var(--surface-card, #1e1e2e);
      color: var(--text-color-secondary, #a6adc8);
    }
    .status-badge.has-proofs {
      background: rgba(var(--color-green-300-rgb), 0.15);
      color: #a6e3a1;
    }
    .hub-body {
      display: flex;
      gap: 20px;
      align-items: flex-start;
    }
    .hub-sidebar {
      width: 260px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .hub-main {
      flex: 1;
      min-width: 0;
    }
    .examples-panel, .saved-panel {
      background: var(--surface-card, #1e1e2e);
      border: 1px solid var(--surface-border, #333);
      border-radius: var(--radius);
      padding: 12px;
    }
    .panel-title {
      font-size: var(--font-size-base);
      font-weight: 600;
      margin: 0 0 8px 0;
      color: var(--text-color, #cdd6f4);
    }
    .example-btn {
      display: block;
      width: 100%;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid transparent;
      border-radius: var(--radius-xs);
      background: transparent;
      color: var(--text-color, #cdd6f4);
      cursor: pointer;
      margin-bottom: 4px;
      transition: all 0.15s;
    }
    .example-btn:hover {
      background: var(--surface-hover, #313244);
      border-color: var(--primary-color, #89b4fa);
    }
    .ex-name {
      display: block;
      font-weight: 600;
      font-size: var(--font-size-sm);
    }
    .ex-desc {
      display: block;
      font-size: var(--font-size-xs);
      color: var(--text-color-secondary, #a6adc8);
      margin-top: 2px;
    }
    .saved-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 8px;
      border-radius: var(--radius-xs);
      margin-bottom: 4px;
    }
    .saved-item:hover { background: var(--surface-hover, #313244); }
    .saved-name { font-size: var(--font-size-sm); }
    .saved-meta {
      font-size: var(--font-size-xs);
      color: var(--text-color-secondary, #a6adc8);
    }
    .quick-ref {
      margin-top: 20px;
      padding: 16px;
      background: var(--surface-card, #1e1e2e);
      border: 1px solid var(--surface-border, #333);
      border-radius: var(--radius);
    }
    .quick-ref h4 {
      margin: 0 0 12px 0;
      font-size: var(--font-size-base);
      color: var(--text-color-secondary, #a6adc8);
    }
    .ref-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 8px;
    }
    .ref-item {
      font-size: var(--font-size-sm);
      padding: 4px 0;
    }
    .ref-item code {
      background: var(--surface-ground, #181825);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Fira Code', monospace;
      color: var(--primary-color, #89b4fa);
    }

    @media (max-width: 768px) {
      .hub-body { flex-direction: column; }
      .hub-sidebar { width: 100%; }
    }
  `]
})
export class FitchHubComponent implements OnInit {
  private api = inject(FitchApiService);

  @ViewChild('editor') editor!: FitchProofEditorComponent;

  examples = signal<ExampleProof[]>([]);
  savedProofs = signal<FitchProofSummary[]>([]);

  ngOnInit() {
    this.api.getExamples().subscribe({
      next: (res) => this.examples.set(res.examples),
    });
    this.loadSavedProofs();
  }

  loadSavedProofs() {
    this.api.listProofs().subscribe({
      next: (res) => this.savedProofs.set(res.proofs),
      error: () => this.savedProofs.set([]),
    });
  }

  loadExample(ex: ExampleProof) {
    this.editor.loadExample(ex);
  }

  onRuleSelected(ruleName: string) {
    // Could auto-set the rule on the current/last line — keeping it simple for now
  }

  onProofVerified(result: GrcRecord) {
    // Could auto-save or show toast — keeping it simple
  }
}
