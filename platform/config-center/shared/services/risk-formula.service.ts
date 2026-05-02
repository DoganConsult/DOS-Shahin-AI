import { Injectable, inject } from '@angular/core';
import { KatexService } from './katex.service';

export interface FormulaResult {
  name: string;
  nameAr: string;
  latex: string;
  html: string;
  value?: number;
}

@Injectable({ providedIn: 'root' })
export class RiskFormulaService {
  private katex = inject(KatexService);

  async renderRiskScore(likelihood: number, impact: number): Promise<FormulaResult> {
    const value = likelihood * impact;
    const latex = `\\text{Risk Score} = \\text{Likelihood} \\times \\text{Impact} = ${likelihood} \\times ${impact} = ${value}`;
    const html = await this.katex.renderToString(latex, true);
    return { name: 'Risk Score', nameAr: 'درجة المخاطر', latex, html, value };
  }

  async renderALE(sle: number, aro: number): Promise<FormulaResult> {
    const value = sle * aro;
    const latex = `\\text{ALE} = \\text{SLE} \\times \\text{ARO} = \\$${sle.toLocaleString()} \\times ${aro} = \\$${value.toLocaleString()}`;
    const html = await this.katex.renderToString(latex, true);
    return { name: 'Annualized Loss Expectancy', nameAr: 'توقع الخسارة السنوية', latex, html, value };
  }

  async renderComplianceScore(implemented: number, total: number): Promise<FormulaResult> {
    const value = total > 0 ? Math.round((implemented / total) * 100) : 0;
    const latex = `\\text{Compliance} = \\frac{\\text{Implemented}}{\\text{Total}} \\times 100 = \\frac{${implemented}}{${total}} \\times 100 = ${value}\\%`;
    const html = await this.katex.renderToString(latex, true);
    return { name: 'Compliance Score', nameAr: 'درجة الامتثال', latex, html, value };
  }

  async renderResidualRisk(inherent: number, controlEffectiveness: number): Promise<FormulaResult> {
    const value = Math.round(inherent * (1 - controlEffectiveness / 100));
    const latex = `\\text{Residual} = \\text{Inherent} \\times (1 - \\frac{\\text{Effectiveness}}{100}) = ${inherent} \\times (1 - \\frac{${controlEffectiveness}}{100}) = ${value}`;
    const html = await this.katex.renderToString(latex, true);
    return { name: 'Residual Risk', nameAr: 'المخاطر المتبقية', latex, html, value };
  }

  async renderVaR(portfolioValue: number, confidence: number, volatility: number, days: number): Promise<FormulaResult> {
    const zScore = confidence === 99 ? 2.326 : confidence === 95 ? 1.645 : 1.282;
    const value = Math.round(portfolioValue * zScore * volatility * Math.sqrt(days));
    const latex = `\\text{VaR}_{${confidence}\\%} = V \\times z_{${confidence/100}} \\times \\sigma \\times \\sqrt{T} = ${value.toLocaleString()}`;
    const html = await this.katex.renderToString(latex, true);
    return { name: `VaR (${confidence}%)`, nameAr: `القيمة المعرضة للخطر (${confidence}%)`, latex, html, value };
  }

  async renderMaturityScore(levels: number[], maxLevel = 5): Promise<FormulaResult> {
    const avg = levels.length > 0 ? levels.reduce((a, b) => a + b, 0) / levels.length : 0;
    const value = Math.round(avg * 100) / 100;
    const latex = `\\text{Maturity} = \\frac{\\sum_{i=1}^{n} L_i}{n} = \\frac{${levels.reduce((a, b) => a + b, 0)}}{${levels.length}} = ${value} \\text{ / } ${maxLevel}`;
    const html = await this.katex.renderToString(latex, true);
    return { name: 'Maturity Score', nameAr: 'درجة النضج', latex, html, value };
  }
}
