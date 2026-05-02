import { Component, signal, ChangeDetectionStrategy, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-request-demo',
    imports: [CommonModule, FormsModule, RouterModule],
    template: `
    <div class="demo-page">
      <div class="demo-grid">
        <div class="info-panel">
          <h1>{{ i18n.translate('requestDemo.title') }}</h1>
          <p class="subtitle">See how Shahin AGRC-OS can transform your governance, risk and compliance operations.</p>
          <div class="benefits">
            <div class="benefit" *ngFor="let b of benefits">
              <i [class]="'pi ' + b.icon" [style.color]="b.color"></i>
              <div>
                <strong>{{ b.titleEn }}</strong>
                <p>{{ b.descEn }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="form-panel">
          <div *ngIf="submitted()" class="success-card">
            <i class="pi pi-check-circle" style="font-size:3rem;color:var(--success);"></i>
            <h2>Thank you!</h2>
            <p>We've received your request. Our team will reach out within 24 hours.</p>
            <a routerLink="/" class="btn-secondary">Back to Home</a>
          </div>

          <form *ngIf="!submitted()" (ngSubmit)="submit()" class="demo-form">
            <h2>Book Your Personalized Demo</h2>
            <div class="form-row">
              <div class="field">
                <label>Full Name *</label>
                <input type="text" [(ngModel)]="form.name" name="name" required [placeholder]="i18n.translate('requestDemo.namePlaceholder')" [attr.aria-label]="i18n.translate('requestDemo.namePlaceholder')" />
              </div>
              <div class="field">
                <label>Email *</label>
                <input type="email" [(ngModel)]="form.email" name="email" required [placeholder]="i18n.translate('requestDemo.emailPlaceholder')" [attr.aria-label]="i18n.translate('requestDemo.emailPlaceholder')" />
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Company *</label>
                <input type="text" [(ngModel)]="form.company" name="company" required [placeholder]="i18n.translate('requestDemo.companyPlaceholder')" [attr.aria-label]="i18n.translate('requestDemo.companyPlaceholder')" />
              </div>
              <div class="field">
                <label>Phone</label>
                <input type="tel" [(ngModel)]="form.phone" name="phone" [placeholder]="i18n.translate('requestDemo.phonePlaceholder')" [attr.aria-label]="i18n.translate('requestDemo.phonePlaceholder')" />
              </div>
            </div>
            <div class="field full">
              <label>What are you looking for?</label>
              <textarea [(ngModel)]="form.message" name="message" rows="3" [placeholder]="i18n.translate('requestDemo.messagePlaceholder')" [attr.aria-label]="i18n.translate('requestDemo.messagePlaceholder')"></textarea>
            </div>
            <button type="submit" class="btn-primary" [disabled]="loading()">
              <span *ngIf="!loading()">Submit Request</span>
              <span *ngIf="loading()">Sending...</span>
            </button>
            <p class="alt-cta">Or <a routerLink="/register">start a free trial</a> right now.</p>
          </form>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .demo-page { max-width: 1024px; margin: 0 auto; padding: 3rem 1.5rem; }
    .demo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: start; }
    @media (max-width: 768px) { .demo-grid { grid-template-columns: 1fr; } }
    .info-panel h1 { font-size: var(--font-size-4xl); font-weight: 700; color: var(--text-heading); margin: 0 0 0.75rem; }
    .info-panel .subtitle { font-size: var(--font-size-body-md); color: var(--text-muted); line-height: 1.6; margin-bottom: 2rem; }
    .benefits { display: flex; flex-direction: column; gap: 1.25rem; }
    .benefit { display: flex; gap: 1rem; align-items: flex-start; }
    .benefit i { font-size: var(--font-size-2xl); margin-top: 0.15rem; }
    .benefit strong { color: var(--text-heading); display: block; margin-bottom: 0.2rem; }
    .benefit p { color: var(--text-muted); font-size: var(--font-size-body-sm); margin: 0; }
    .form-panel { background: #fff; border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 2rem; }
    .demo-form h2 { font-size: 1.35rem; font-weight: 600; color: var(--text-heading); margin: 0 0 1.5rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
    .field { display: flex; flex-direction: column; }
    .field.full { margin-bottom: 1rem; }
    .field label { font-size: var(--font-size-tag); font-weight: 600; color: #475569; margin-bottom: 0.35rem; }
    .field input, .field textarea { border: 1px solid #cbd5e1; border-radius: var(--radius); padding: 0.65rem 0.85rem; font-size: var(--font-size-body-sm); outline: none; transition: border 0.2s; }
    .field input:focus, .field textarea:focus { border-color: var(--primary); }
    .btn-primary { width: 100%; background: #2563eb; color: #fff; border: none; padding: 0.85rem; border-radius: var(--radius); font-size: var(--font-size-md); font-weight: 600; cursor: pointer; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .alt-cta { text-align: center; margin-top: 1rem; color: var(--text-muted); font-size: var(--font-size-body-sm); }
    .alt-cta a { color: var(--primary); text-decoration: none; font-weight: 600; }
    .success-card { text-align: center; padding: 2rem; }
    .success-card h2 { font-size: var(--font-size-2xl); color: var(--text-heading); margin: 1rem 0 0.5rem; }
    .success-card p { color: var(--text-muted); margin-bottom: 1.5rem; }
    .btn-secondary { background: #fff; color: var(--primary); border: 2px solid #2563eb; padding: 0.65rem 1.5rem; border-radius: var(--radius); text-decoration: none; font-weight: 600; }
  `]
})
export class RequestDemoComponent {
  i18n = inject(I18nService);
  form = { name: '', email: '', company: '', phone: '', message: '' };
  submitted = signal(false);
  loading = signal(false);

  benefits = [
    { icon: 'pi-clock', color: '#2563eb', titleEn: '30-minute guided walkthrough', descEn: 'Tailored to your industry and regulatory requirements.' },
    { icon: 'pi-shield', color: '#0d9488', titleEn: 'Live NCA ECC / SAMA CSF demo', descEn: 'See real compliance assessment with your framework.' },
    { icon: 'pi-microchip-ai', color: '#7c3aed', titleEn: 'AI agent demonstration', descEn: 'Watch autonomous agents analyze risks in real-time.' },
    { icon: 'pi-chart-bar', color: '#ea580c', titleEn: 'ROI & efficiency analysis', descEn: 'Understand the impact on your compliance operations.' },
  ];

  constructor(private http: HttpClient) {}

  submit() {
    if (!this.form.name || !this.form.email || !this.form.company) return;
    this.loading.set(true);
    this.http.post('/api/public/demo-request', this.form).subscribe({
      next: () => { this.submitted.set(true); this.loading.set(false); },
      error: () => { this.submitted.set(true); this.loading.set(false); },
    });
  }

}
