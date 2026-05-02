import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { OnboardingApiService } from '../../services/onboarding-api.service';
import { SectorConfigService } from '../../services/sector-config.service';
import { OnboardingFormFieldComponent as GrcFormFieldComponent } from '../shared/onboarding-form-field.component';
import { FREEMAIL_DOMAINS, EMAIL_RE, isFreeMailDomain, extractEmailDomain } from '../../models/registration.constants';

export interface RegistrationResult {
  token: string;
  refreshToken: string;
  userId: string;
  tenantId: string;
  role: string;
  userName: string;
  orgName: string;
  sessionId: string;
}

@Component({
    selector: 'app-registration-hero',
    imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, SelectModule, InputSwitchModule, GrcFormFieldComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './registration-hero.component.html',
    styleUrls: ['../../../../auth-form.styles.css', './registration-hero.component.scss']
})
export class RegistrationHeroComponent {
  private api = inject(OnboardingApiService);
  private sectorConfig = inject(SectorConfigService);

  @Input() lang: 'en' | 'ar' = 'en';
  @Output() registered = new EventEmitter<RegistrationResult>();
  @Output() switchToLogin = new EventEmitter<void>();

  loading = false;
  error = '';
  detectedCompany = '';
  slugAvailable: boolean | null = null;
  slugCheckPending = false;
  private slugCheckTimeout: ReturnType<typeof setTimeout> | null = null;
  private submitPending = false;
  private detectionDismissed = false;

  form = {
    companyNameEn: '',
    companyNameAr: '',
    sector: '',
    country: '',
    orgType: '',
    employeeBand: '',
    appName: '',
    email: '',
    password: '',
    userName: '',
    userTitle: '',
    consent: false,
  };

  passwordStrength = 0;
  passwordHints: string[] = [];

  private readonly EMAIL_RE = EMAIL_RE;

  readonly countryOptions = [
    { label: 'Saudi Arabia', labelAr: '\u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629', value: 'SA' },
    { label: 'United Arab Emirates', labelAr: '\u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062A', value: 'AE' },
    { label: 'Bahrain', labelAr: '\u0627\u0644\u0628\u062D\u0631\u064A\u0646', value: 'BH' },
    { label: 'Kuwait', labelAr: '\u0627\u0644\u0643\u0648\u064A\u062A', value: 'KW' },
    { label: 'Oman', labelAr: '\u0639\u064F\u0645\u0627\u0646', value: 'OM' },
    { label: 'Qatar', labelAr: '\u0642\u0637\u0631', value: 'QA' },
    { label: 'Egypt', labelAr: '\u0645\u0635\u0631', value: 'EG' },
    { label: 'Jordan', labelAr: '\u0627\u0644\u0623\u0631\u062F\u0646', value: 'JO' },
    { label: 'United Kingdom', labelAr: '\u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0645\u062A\u062D\u062F\u0629', value: 'GB' },
    { label: 'United States', labelAr: '\u0627\u0644\u0648\u0644\u0627\u064A\u0627\u062A \u0627\u0644\u0645\u062A\u062D\u062F\u0629', value: 'US' },
    { label: 'Other', labelAr: '\u0623\u062E\u0631\u0649', value: 'OTHER' },
  ];

  readonly orgTypeOptions = [
    { label: 'Startup', labelAr: '\u0634\u0631\u0643\u0629 \u0646\u0627\u0634\u0626\u0629', value: 'startup' },
    { label: 'SME', labelAr: '\u0645\u0646\u0634\u0623\u0629 \u0635\u063A\u064A\u0631\u0629 \u0648\u0645\u062A\u0648\u0633\u0637\u0629', value: 'sme' },
    { label: 'Enterprise', labelAr: '\u0645\u0624\u0633\u0633\u0629 \u0643\u0628\u064A\u0631\u0629', value: 'enterprise' },
    { label: 'Government', labelAr: '\u062C\u0647\u0629 \u062D\u0643\u0648\u0645\u064A\u0629', value: 'government' },
    { label: 'NGO', labelAr: '\u0645\u0646\u0638\u0645\u0629 \u063A\u064A\u0631 \u0631\u0628\u062D\u064A\u0629', value: 'ngo' },
  ];

  readonly employeeBandOptions = [
    { label: '1\u201350', value: '1-50' },
    { label: '51\u2013200', value: '51-200' },
    { label: '201\u20131,000', value: '201-1000' },
    { label: '1,001\u20135,000', value: '1001-5000' },
    { label: '5,000+', value: '5000+' },
  ];

  get sectorOptions(): Array<{ label: string; labelAr: string; value: string }> {
    return this.sectorConfig.getSectorOptions(this.lang).map(s => ({
      value: s.value,
      label: `${s.value} \u2014 ${s.label}`,
      labelAr: `${s.value} \u2014 ${s.ar ?? s.label}`,
    }));
  }

  onPasswordChange(): void {
    const p = this.form.password || '';
    let score = 0;
    const hints: string[] = [];
    if (p.length >= 8) score++; else hints.push(this.lang === 'ar' ? '8 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644' : 'At least 8 characters');
    if (/[a-z]/.test(p)) score++; else hints.push(this.lang === 'ar' ? '\u062D\u0631\u0641 \u0635\u063A\u064A\u0631' : 'Lowercase letter');
    if (/[A-Z]/.test(p)) score++; else hints.push(this.lang === 'ar' ? '\u062D\u0631\u0641 \u0643\u0628\u064A\u0631' : 'Uppercase letter');
    if (/\d/.test(p)) score++; else hints.push(this.lang === 'ar' ? '\u0631\u0642\u0645' : 'A digit');
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(p)) score++; else hints.push(this.lang === 'ar' ? '\u0631\u0645\u0632 \u062E\u0627\u0635' : 'Special character');
    this.passwordStrength = score;
    this.passwordHints = hints;
  }

  toggleLang(): void {
    this.lang = this.lang === 'ar' ? 'en' : 'ar';
  }

  emailAvailable: boolean | null = null;
  emailCheckPending = false;
  private emailCheckTimeout: ReturnType<typeof setTimeout> | null = null;

  onEmailChange(): void {
    this.detectedCompany = '';
    this.detectionDismissed = false;
    this.emailAvailable = null;
    const email = (this.form.email || '').trim();
    const atIdx = email.indexOf('@');
    if (atIdx < 1) return;
    const domain = extractEmailDomain(email);
    if (!domain || isFreeMailDomain(domain)) return;
    if (this.detectionDismissed) return;
    const parts = domain.split('.');
    if (parts.length >= 2) {
      this.detectedCompany = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
    // Debounced email availability check
    if (this.emailCheckTimeout) clearTimeout(this.emailCheckTimeout);
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.emailCheckTimeout = setTimeout(() => {
        this.emailCheckPending = true;
        this.api.checkEmailAvailability(email).subscribe({
          next: (res) => { this.emailAvailable = res.available; this.emailCheckPending = false; },
          error: () => { this.emailAvailable = null; this.emailCheckPending = false; },
        });
      }, 800);
    }
  }

  onAppNameChange(): void {
    this.slugAvailable = null;
    const slug = (this.form.appName || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (slug.length < 3) return;
    if (this.slugCheckTimeout) clearTimeout(this.slugCheckTimeout);
    this.slugCheckTimeout = setTimeout(() => {
      this.slugCheckPending = true;
      this.api.checkSlugAvailability(slug).subscribe({
        next: (res) => { this.slugAvailable = res.available; this.slugCheckPending = false; },
        error: () => { this.slugAvailable = null; this.slugCheckPending = false; },
      });
    }, 800);
  }

  acceptDetection(): void {
    if (this.detectedCompany && !this.form.companyNameEn) {
      this.form.companyNameEn = this.detectedCompany;
    }
    this.detectedCompany = '';
  }

  dismissDetection(): void {
    this.detectedCompany = '';
    this.detectionDismissed = true;
  }

  submit(): void {
    this.error = '';
    // Debounce: prevent double-submit
    if (this.submitPending || this.loading) return;

    if (!this.form.companyNameEn?.trim()) {
      this.error = this.lang === 'ar' ? '\u0627\u0633\u0645 \u0627\u0644\u0634\u0631\u0643\u0629 \u0645\u0637\u0644\u0648\u0628' : 'Company name is required';
      return;
    }
    if (!this.form.email?.trim() || !this.EMAIL_RE.test(this.form.email.trim())) {
      this.error = this.lang === 'ar' ? '\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D' : 'Invalid email address';
      return;
    }
    if (!this.form.password || this.passwordStrength < 5) {
      this.onPasswordChange();
      this.error = this.passwordHints.length > 0
        ? (this.lang === 'ar' ? '\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u062A\u062D\u062A\u0627\u062C: ' : 'Password needs: ') + this.passwordHints.join(', ')
        : (this.lang === 'ar' ? '\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 8 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644' : 'Password must be at least 8 characters');
      return;
    }
    if (!this.form.userName?.trim()) {
      this.error = this.lang === 'ar' ? '\u0627\u0644\u0627\u0633\u0645 \u0645\u0637\u0644\u0648\u0628' : 'Full name is required';
      return;
    }

    this.loading = true;
    this.submitPending = true;
    this.api.register(this.form).subscribe({
      next: (res) => {
        this.form.password = '';  // Clear from memory after successful registration
        this.loading = false;
        this.submitPending = false;
        this.registered.emit({
          token: res.token,
          refreshToken: res.refreshToken,
          userId: res.userId,
          tenantId: res.tenantId,
          role: res.role,
          userName: res.userName,
          orgName: res.orgName,
          sessionId: res.sessionId,
        });
      },
      error: (err) => {
        this.loading = false;
        this.submitPending = false;
        this.error = err?.error?.error || (this.lang === 'ar' ? '\u062D\u062F\u062B \u062E\u0637\u0623\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u062C\u062F\u062F\u0627\u064B' : 'An error occurred, please try again');
      },
    });
  }
}
