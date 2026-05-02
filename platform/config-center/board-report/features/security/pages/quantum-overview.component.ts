import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

interface QuantumKpi { totalInventory: number; vulnerableAlgorithms: number; migrationPlans: number; pqcTestsPassed: number; readinessScore: number; }

@Component({
  selector: 'app-quantum-overview',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="module-page" [dir]="i18n.direction()">
      <div class="page-header">
        <h1 class="page-title">{{ i18n.translate('quantum.overview') || 'Quantum Readiness Dashboard' }}</h1>
        <p class="page-subtitle">{{ i18n.translate('quantum.overviewDesc') || 'Assess and track organizational readiness for the post-quantum cryptography transition (NIST PQC).' }}</p>
      </div>
      <div class="kpi-grid">
        <div class="kpi-card" routerLink="../crypto-inventory"><span class="kpi-value">{{ kpis().totalInventory }}</span><span class="kpi-label">Crypto Assets</span></div>
        <div class="kpi-card kpi-danger" routerLink="../vulnerability"><span class="kpi-value">{{ kpis().vulnerableAlgorithms }}</span><span class="kpi-label">Vulnerable Algorithms</span></div>
        <div class="kpi-card kpi-info" routerLink="../migration-plans"><span class="kpi-value">{{ kpis().migrationPlans }}</span><span class="kpi-label">Migration Plans</span></div>
        <div class="kpi-card kpi-success" routerLink="../pqc-tests"><span class="kpi-value">{{ kpis().pqcTestsPassed }}</span><span class="kpi-label">PQC Tests Passed</span></div>
        <div class="kpi-card"><span class="kpi-value">{{ kpis().readinessScore }}%</span><span class="kpi-label">Readiness Score</span></div>
      </div>
      <div class="section-grid">
        <div class="section-card">
          <h3>NIST PQC Standards</h3>
          <div class="framework-list">
            <div class="fw-item"><span class="fw-name">CRYSTALS-Kyber (ML-KEM)</span><span class="fw-badge fw-active">Supported</span></div>
            <div class="fw-item"><span class="fw-name">CRYSTALS-Dilithium (ML-DSA)</span><span class="fw-badge fw-active">Supported</span></div>
            <div class="fw-item"><span class="fw-name">FALCON</span><span class="fw-badge fw-pending">Planned</span></div>
            <div class="fw-item"><span class="fw-name">SPHINCS+ (SLH-DSA)</span><span class="fw-badge fw-pending">Planned</span></div>
          </div>
        </div>
        <div class="section-card">
          <h3>Quick Actions</h3>
          <div class="action-list">
            <a routerLink="../crypto-inventory" class="action-link"><i class="pi pi-lock"></i> Crypto Inventory</a>
            <a routerLink="../vulnerability" class="action-link"><i class="pi pi-exclamation-triangle"></i> Vulnerability Assessment</a>
            <a routerLink="../migration-plans" class="action-link"><i class="pi pi-directions"></i> Migration Plans</a>
            <a routerLink="../pqc-tests" class="action-link"><i class="pi pi-check-square"></i> PQC Validation Tests</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .module-page { padding: 1.5rem; } .page-header { margin-bottom: 1.5rem; }
    .page-title { margin: 0 0 0.25rem; font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-color); }
    .page-subtitle { margin: 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .kpi-card { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.25rem; cursor: pointer; transition: all 0.15s; display: flex; flex-direction: column; gap: 0.25rem; }
    .kpi-card:hover { box-shadow: var(--shadow-sm); transform: translateY(-1px); }
    .kpi-value { font-size: var(--font-size-3xl); font-weight: 700; color: var(--primary-500); } .kpi-label { font-size: var(--font-size-caption); color: var(--text-color-secondary); }
    .kpi-danger .kpi-value { color: var(--red-500); } .kpi-info .kpi-value { color: var(--blue-500); } .kpi-success .kpi-value { color: var(--green-500); }
    .section-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 1rem; }
    .section-card { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.25rem; }
    .section-card h3 { margin: 0 0 0.75rem; font-size: var(--font-size-md); font-weight: 600; }
    .framework-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .fw-item { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; border-radius: var(--radius); background: var(--surface-ground); }
    .fw-name { font-size: var(--font-size-base); font-weight: 500; } .fw-badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-lg); font-weight: 500; }
    .fw-active { background: var(--green-50); color: var(--green-700); } .fw-pending { background: var(--yellow-50); color: var(--yellow-700); }
    .action-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .action-link { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; border-radius: var(--radius); color: var(--text-color); text-decoration: none; transition: background 0.15s; font-size: var(--font-size-base); }
    .action-link:hover { background: var(--surface-hover); } .action-link i { color: var(--primary-500); }
  `],
})
export class QuantumOverviewComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  protected readonly kpis = signal<QuantumKpi>({ totalInventory: 0, vulnerableAlgorithms: 0, migrationPlans: 0, pqcTestsPassed: 0, readinessScore: 0 });

  ngOnInit(): void {
    this.http.get<any>('/api/security/quantum/kpis').subscribe({ next: (d) => this.kpis.set(d), error: () => {} });
  }
}
