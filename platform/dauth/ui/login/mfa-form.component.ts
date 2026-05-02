/**
 * MfaFormComponent — Handles MFA code verification with auto-submit + resend support.
 *
 * @owner DAuth
 * @since 2026-04-02  Step 4 decomposition
 */
import { Component, inject, Input, Output, EventEmitter, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/infrastructure';
import { environment } from '@env/environment';
import { GrcRecord } from '@app/core/models/shared.types';
import { Subject, Subscription, takeUntil, timer, map, takeWhile } from 'rxjs';

@Component({
    selector: 'app-mfa-form',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, ReactiveFormsModule],
    template: `
    <div class="mfa-icon-wrap">
      <i class="pi pi-shield mfa-shield-icon"></i>
    </div>
    <h1 class="auth-title">{{ i18n.translate('auth.mfaTitle') }}</h1>
    <p class="auth-subtitle">
      {{ mfaType === 'email' ? i18n.translate('auth.mfaEmailSent') : i18n.translate('auth.mfaTotpPrompt') }}
    </p>

    <form [formGroup]="mfaForm" (ngSubmit)="onVerifyMfa()">
      <div class="auth-field">
        <label for="mfa-code"><i class="pi pi-key"></i> {{ i18n.translate('auth.mfaCode') }}</label>
        <input id="mfa-code" class="auth-input mfa-code-input" type="text" formControlName="code"
               [placeholder]="i18n.translate('auth.mfaCodePlaceholder')"
               maxlength="6" pattern="[0-9]*" inputmode="numeric" autocomplete="one-time-code"
               [attr.aria-label]="i18n.translate('auth.mfaCodePlaceholder')"
               (input)="onMfaCodeInput()">
      </div>

      <p class="auth-error" role="alert" *ngIf="error"><i class="pi pi-exclamation-triangle"></i> {{ error }}</p>
      <p class="auth-success" *ngIf="mfaResent"><i class="pi pi-check-circle"></i> {{ i18n.translate('auth.mfaResent') }}</p>
      <p class="auth-hint" *ngIf="mfaExpiryCountdown > 0 && mfaExpiryCountdown <= 60" style="color:var(--warning);font-size:0.85rem">
        <i class="pi pi-clock"></i> {{ i18n.translate('auth.mfaExpiresIn') || 'Code expires in' }} {{ mfaExpiryCountdown }}s
      </p>

      <button class="auth-submit-btn" type="submit" [disabled]="mfaLoading || mfaForm.invalid">
        <i class="pi pi-check-circle" *ngIf="!mfaLoading"></i>
        <i class="pi pi-spin pi-spinner" *ngIf="mfaLoading"></i>
        {{ mfaLoading ? i18n.translate('auth.mfaVerifying') : i18n.translate('auth.mfaVerify') }}
      </button>
    </form>

    <div class="mfa-actions">
      <button *ngIf="mfaType === 'email'" class="auth-text-btn" (click)="onResendMfaCode()" [disabled]="resending || resendCooldown > 0">
        <i class="pi pi-refresh"></i>
        {{ resending ? i18n.translate('auth.mfaResending') : resendCooldown > 0 ? i18n.translate('auth.mfaResend') + ' (' + resendCooldown + 's)' : i18n.translate('auth.mfaResend') }}
      </button>
      <button class="auth-text-btn" (click)="backToLogin.emit()">
        <i class="pi pi-arrow-left"></i> {{ i18n.translate('auth.mfaBackToLogin') }}
      </button>
    </div>
  `,
    styles: [`
    .mfa-icon-wrap { text-align: center; margin-bottom: 1rem; }
    .mfa-shield-icon { font-size: var(--font-size-6xl); color: var(--primary); background: color-mix(in srgb, var(--primary) 8%, transparent); border-radius: var(--radius-pill); padding: 20px; }
    .mfa-code-input { font-size: var(--font-size-2xl); text-align: center; letter-spacing: 8px; font-family: monospace; }
    .mfa-actions { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; margin-top: 1.25rem; }
    .auth-text-btn {
      background: none; border: none; color: var(--primary); cursor: pointer;
      font-size: var(--font-size-base); display: inline-flex; align-items: center; gap: 0.4rem; padding: 0;
    }
    .auth-text-btn:hover { text-decoration: underline; }
    .auth-text-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .auth-success { color: var(--success); font-size: var(--font-size-base); display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.75rem; }
  `]
})
export class MfaFormComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  i18n = inject(I18nService);
  private http = inject(HttpClient);

  @Input() userId = '';
  @Input() mfaType = '';
  @Input() rememberMe = false;

  @Output() mfaResult = new EventEmitter<GrcRecord>();
  @Output() backToLogin = new EventEmitter<void>();

  error = '';
  mfaLoading = false;
  mfaResent = false;
  resending = false;

  mfaForm = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  // MFA code expiry countdown (5 minutes)
  mfaExpiryCountdown = 0;
  private _mfaExpirySub?: Subscription;

  // M4: MFA resend cooldown
  resendCooldown = 0;
  private _resendInterval: ReturnType<typeof setInterval> | null = null;

  // M3: MFA auto-submit debounce
  private _mfaAutoSubmitTimer: ReturnType<typeof setTimeout> | null = null;

  private destroy$ = new Subject<void>();

  /** Start the 5-minute expiry countdown when the MFA view becomes active. */
  startExpiryCountdown(seconds = 300): void {
    this._startMfaExpiryCountdown(seconds);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this._mfaExpirySub?.unsubscribe();
    if (this._resendInterval) { clearInterval(this._resendInterval); this._resendInterval = null; }
    if (this._mfaAutoSubmitTimer) { clearTimeout(this._mfaAutoSubmitTimer); this._mfaAutoSubmitTimer = null; }
  }

  onVerifyMfa(): void {
    this.mfaForm.markAllAsTouched();
    if (this.mfaForm.invalid) return;
    this.mfaLoading = true;
    this.error = '';
    this.mfaResent = false;
    const code = this.mfaForm.getRawValue().code!;
    this.http.post<GrcRecord>(`${environment.apiUrl}/auth/mfa/login-verify`, {
      userId: this.userId, code: code.trim(), mfaType: this.mfaType, rememberMe: this.rememberMe,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.mfaLoading = false;
        this.cdr.markForCheck();
        this.mfaResult.emit(res);
      },
      error: (err) => {
        this.mfaLoading = false;
        this.cdr.markForCheck();
        console.warn('[MfaForm] MFA verify error:', ((err as GrcRecord).error as GrcRecord | undefined)?.error);
        this.error = this.i18n.translate('auth.mfaInvalid') || 'Invalid verification code. Please try again.';
      },
    });
  }

  onMfaCodeInput(): void {
    if (this._mfaAutoSubmitTimer) { clearTimeout(this._mfaAutoSubmitTimer); this._mfaAutoSubmitTimer = null; }
    const code = this.mfaForm.getRawValue().code || '';
    if (code.length === 6 && this.mfaForm.valid && !this.mfaLoading) {
      this._mfaAutoSubmitTimer = setTimeout(() => this.onVerifyMfa(), 350);
    }
  }

  onResendMfaCode(): void {
    if (this.resendCooldown > 0) return;
    this.resending = true;
    this.mfaResent = false;
    this.error = '';
    this.http.post<GrcRecord>(`${environment.apiUrl}/auth/mfa/resend`, {
      userId: this.userId, mfaType: this.mfaType,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.resending = false;
        this.mfaResent = true;
        this.mfaForm.reset();
        this._startResendCooldown(60);
        this._startMfaExpiryCountdown(300); // Reset expiry
        this.cdr.markForCheck();
      },
      error: () => { this.resending = false; this.cdr.markForCheck(); },
    });
  }

  private _startMfaExpiryCountdown(seconds: number): void {
    this._mfaExpirySub?.unsubscribe();
    this._mfaExpirySub = timer(0, 1000).pipe(
      map(tick => seconds - tick),
      takeWhile(remaining => remaining >= 0),
      takeUntil(this.destroy$),
    ).subscribe(remaining => {
      this.mfaExpiryCountdown = remaining;
      if (remaining <= 0) {
        this.error = this.i18n.translate('auth.mfaExpired') || 'Verification code expired. Please request a new one.';
      }
      this.cdr.markForCheck();
    });
  }

  private _startResendCooldown(seconds: number): void {
    if (this._resendInterval) { clearInterval(this._resendInterval); }
    this.resendCooldown = seconds;
    this._resendInterval = setInterval(() => {
      this.resendCooldown -= 1;
      if (this.resendCooldown <= 0) {
        clearInterval(this._resendInterval!);
        this._resendInterval = null;
        this.resendCooldown = 0;
      }
      this.cdr.markForCheck();
    }, 1000);
  }
}
