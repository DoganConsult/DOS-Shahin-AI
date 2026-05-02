/**
 * ForgotPasswordFormComponent — Handles forgot-password email submission + confirmation.
 *
 * @owner DAuth
 * @since 2026-04-02  Step 4 decomposition
 */
import { Component, inject, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/infrastructure';
import { environment } from '@env/environment';
import { GrcRecord } from '@app/core/models/shared.types';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-forgot-password-form',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, ReactiveFormsModule],
    template: `
    <h1 class="auth-title">{{ i18n.translate('auth.resetEmailTitle') }}</h1>
    <p class="auth-subtitle">{{ i18n.translate('auth.resetEmailSubtitle') }}</p>

    <div *ngIf="!forgotSent">
      <form [formGroup]="forgotForm" (ngSubmit)="onForgotPassword()">
        <div class="auth-field">
          <label for="forgot-email"><i class="pi pi-envelope"></i> {{ i18n.translate('auth.email') }}</label>
          <input id="forgot-email" class="auth-input" type="email" formControlName="email"
                 [placeholder]="i18n.translate('auth.emailPlaceholder')" autocomplete="email" [attr.aria-label]="i18n.translate('auth.emailPlaceholder')">
        </div>

        <p class="auth-error" role="alert" *ngIf="error"><i class="pi pi-exclamation-triangle"></i> {{ error }}</p>

        <button class="auth-submit-btn" type="submit" [disabled]="forgotLoading || forgotForm.invalid">
          <i class="pi pi-envelope" *ngIf="!forgotLoading"></i>
          <i class="pi pi-spin pi-spinner" *ngIf="forgotLoading"></i>
          {{ forgotLoading ? i18n.translate('auth.resetEmailSending') : i18n.translate('auth.resetEmailSend') }}
        </button>
      </form>
    </div>

    <div *ngIf="forgotSent" class="forgot-sent-box">
      <i class="pi pi-check-circle forgot-sent-icon"></i>
      <p class="forgot-sent-msg">{{ i18n.translate('auth.resetEmailSent') }}</p>
      <p class="forgot-sent-hint">{{ i18n.translate('auth.resetEmailCheck') }}</p>
    </div>

    <p class="auth-footer-link auth-footer-link--spaced">
      <button type="button" class="auth-text-btn" (click)="backToLogin.emit()">
        <i class="pi pi-arrow-left"></i> {{ i18n.translate('auth.resetEmailBack') }}
      </button>
    </p>
  `,
    styles: [`
    .auth-text-btn {
      background: none; border: none; color: var(--primary); cursor: pointer;
      font-size: var(--font-size-base); display: inline-flex; align-items: center; gap: 0.4rem; padding: 0;
    }
    .auth-text-btn:hover { text-decoration: underline; }
    .forgot-sent-box { text-align: center; padding: 1.5rem 0; }
    .forgot-sent-icon { font-size: 56px; color: var(--success); margin-bottom: 1rem; display: block; }
    .forgot-sent-msg { font-size: var(--font-size-md); color: var(--text-heading); margin-bottom: 0.5rem; font-weight: 500; }
    .forgot-sent-hint { font-size: var(--font-size-tag); color: var(--text-muted); }
    .auth-footer-link--spaced { margin-top: 1.5rem; }
  `]
})
export class ForgotPasswordFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  i18n = inject(I18nService);
  private http = inject(HttpClient);

  /** Pre-fill email from the login form. */
  @Input() initialEmail = '';

  @Output() backToLogin = new EventEmitter<void>();

  error = '';
  forgotLoading = false;
  forgotSent = false;

  forgotForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    if (this.initialEmail) {
      this.forgotForm.patchValue({ email: this.initialEmail });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onForgotPassword(): void {
    this.forgotForm.markAllAsTouched();
    if (this.forgotForm.invalid) return;
    this.forgotLoading = true;
    this.error = '';
    const forgotEmail = this.forgotForm.getRawValue().email!;
    this.http.post<GrcRecord>(`${environment.apiUrl}/auth/forgot-password`, { email: forgotEmail.trim() }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.forgotLoading = false;
        this.forgotSent = true;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.forgotLoading = false;
        this.cdr.markForCheck();
        const status = ((err as GrcRecord).status);
        if (status === 502) {
          this.error = this.i18n.translate('auth.resetEmailDeliveryFailed');
        } else {
          console.warn('[ForgotPassword] error:', ((err as GrcRecord).error as GrcRecord | undefined)?.error);
          this.error = this.i18n.translate('auth.resetEmailCheck') || 'Please check your email address and try again.';
        }
      },
    });
  }

  /** Reset the form state when the container re-shows the forgot view. */
  reset(): void {
    this.error = '';
    this.forgotSent = false;
    this.forgotForm.reset();
  }
}
