import {
  Component,
  inject,
  signal,
  computed,
  input,
  output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FitchApiService, ProofLineDto, VerificationResult } from '../services/fitch-api.service';
import { GrcFormFieldComponent } from '@app/widgets';

@Component({
    selector: 'app-fitch-proof-editor',
    imports: [CommonModule, FormsModule, GrcFormFieldComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './fitch-proof-editor.component.html',
    styleUrls: ['./fitch-proof-editor.component.scss']
})
export class FitchProofEditorComponent {
  private api = inject(FitchApiService);

  /** Editable state */
  lines = signal<Array<ProofLineDto & { citationsStr: string }>>([
    { formula: '', rule: 'premise', citations: [], depth: 0, citationsStr: '' },
  ]);
  premisesStr = signal('');
  conclusionStr = signal('');
  verificationResult = signal<VerificationResult | null>(null);
  errorLines = signal<Set<number>>(new Set());

  /** Called when emitting proof data externally */
  proofVerified = output<VerificationResult>();

  onPremisesChange(val: string) {
    this.premisesStr.set(val);
  }

  depthArray(depth: number): number[] {
    return Array.from({ length: depth }, (_, i) => i + 1);
  }

  lineHasError(lineNum: number): boolean {
    return this.errorLines().has(lineNum);
  }

  addLine() {
    const current = this.lines();
    const lastDepth = current.length > 0 ? current[current.length - 1].depth : 0;
    this.lines.set([
      ...current,
      { formula: '', rule: 'premise', citations: [], depth: lastDepth, citationsStr: '' },
    ]);
  }

  addLineAfter(index: number) {
    const current = [...this.lines()];
    const depth = current[index]?.depth ?? 0;
    current.splice(index + 1, 0, {
      formula: '',
      rule: 'premise',
      citations: [],
      depth,
      citationsStr: '',
    });
    this.lines.set(current);
  }

  removeLine(index: number) {
    const current = [...this.lines()];
    current.splice(index, 1);
    this.lines.set(current);
  }

  increaseDepth(index: number) {
    const current = [...this.lines()];
    current[index] = {
      ...current[index],
      depth: current[index].depth + 1,
      isAssumption: true,
      rule: 'assumption',
    };
    this.lines.set(current);
  }

  decreaseDepth(index: number) {
    const current = [...this.lines()];
    if (current[index].depth > 0) {
      current[index] = {
        ...current[index],
        depth: current[index].depth - 1,
        isAssumption: false,
      };
      this.lines.set(current);
    }
  }

  verify() {
    const premiseStrs = this.premisesStr()
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const conclusion = this.conclusionStr().trim();

    if (!conclusion) return;

    const proofLines: ProofLineDto[] = this.lines().map((l, i) => ({
      lineNumber: i + 1,
      formula: l.formula,
      rule: l.rule,
      citations: l.citationsStr
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n)),
      depth: l.depth,
      isAssumption: l.isAssumption,
    }));

    this.api
      .verify({ premises: premiseStrs, conclusion, lines: proofLines })
      .subscribe({
        next: (result) => {
          this.verificationResult.set(result);
          this.errorLines.set(new Set(result.errors.map((e) => e.lineNumber)));
          this.proofVerified.emit(result);
        },
        error: (err) => {
          this.verificationResult.set({
            valid: false,
            errors: [{ lineNumber: 0, message: err.error?.error || 'Verification failed' }],
            completeness: 'incomplete',
          });
        },
      });
  }

  clear() {
    this.lines.set([{ formula: '', rule: 'premise', citations: [], depth: 0, citationsStr: '' }]);
    this.premisesStr.set('');
    this.conclusionStr.set('');
    this.verificationResult.set(null);
    this.errorLines.set(new Set());
  }

  /** Load an example proof into the editor */
  loadExample(example: {
    premises: string[];
    conclusion: string;
    lines: ProofLineDto[];
  }) {
    this.premisesStr.set(example.premises.join(', '));
    this.conclusionStr.set(example.conclusion);
    this.lines.set(
      example.lines.map((l) => ({
        ...l,
        citationsStr: l.citations.join(', '),
      }))
    );
    this.verificationResult.set(null);
    this.errorLines.set(new Set());
  }
}
