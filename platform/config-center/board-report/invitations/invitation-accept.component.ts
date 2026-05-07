// ============================================
// Shahin GRC — Invitation Accept Component
// Public page for stakeholders to accept invitations.
//
// Auth model: ONE token source = httpOnly cookie issued by
// auth-service. The accept endpoints persist no JWT to the browser.
//
// - External roles (vendor, regulator, etc.): magic-link accept → backend
//   provisions membership + Set-Cookie → caller lands on /login so OIDC
//   can hydrate the canonical session, then is redirected to the role
//   portal by the post-auth orchestrator.
// - Internal roles (viewer, auditor, admin, etc.): registration form
//   (name + password) → full account → /login.
//
// Route: /invitations/accept?token=xxx&tenantId=yyy
// No auth guard — this is a public page.
// ============================================

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import { StorageService } from '@app/infrastructure';
import { SessionService } from '../../../dauth/session/session.service';
import { GrcRecord } from '@app/core/models/shared.types';

interface AcceptResponse {
  // Backend may still echo userId for diagnostics; the SPA never persists it.
  userId?: string;
  // The deprecated `jwt` field is intentionally NOT in this interface so
  // any downstream consumer that reads it must explicitly opt into the
  // legacy shape. Do not re-add. See A1 in the DAuth single-source
  // convergence plan.
}

interface AcceptRegisterResponse {
  userId: string;
  role: string;
  tenantId: string;
  // DB-resolved landing route (dos.tenant_landing_config via UI-OS).
  // null = operator has not seeded; SPA must render empty/no-op (NO
  // FRONTEND INVENTION).
  tenantLandingRoute?: string | null;
}

const EXTERNAL_ROLES = new Set(['vendor_contact', 'regulator_inspector', 'consultant_admin', 'external_auditor']);

// Portal redirect map for external auth-boundary roles. Returns null
// for non-portal roles so the caller defers to the DB-resolved landing
// route (dos.tenant_landing_config via UI-OS) — NO FRONTEND INVENTION.
function portalRedirect(role: string): string | null {
  switch (role) {
    case 'vendor_contact':       return '/vendor-portal';
    case 'regulator_inspector':  return '/regulator-portal';
    case 'consultant_admin':     return '/consultant-center';
    case 'external_auditor':     return '/audit-hub';
    default:                     return null;
  }
}

@Component({
  selector: 'app-invitation-accept',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="invite-page" [dir]="i18n.direction()">
      <div class="auth-top-bar">
        <a routerLink="/">{{ i18n.translate('invitation.home') }}</a>
        <select class="auth-lang-dropdown" [value]="i18n.currentLang()" (change)="i18n.switchLanguage(($event.target as HTMLSelectElement).value)">
          <option value="en">EN</option>
          <option value="ar">عربي</option>
        </select>
      </div>
      <div class="invite-card">
        <img loading="eager" src="logoiconapphero.png" alt="Shahin GRC" width="48" height="48"
             style="border-radius:12px; margin-bottom:16px" />

        <!-- Loading state -->
        <div *ngIf="state === 'loading'" class="state-block">
          <div class="spinner"></div>
          <p>{{ i18n.currentLang() === 'ar' ? 'جاري التحقق من الدعوة...' : 'Validating your invitation…' }}</p>
        </div>

        <!-- Ready: External role → set password + accept -->
        <div *ngIf="state === 'ready' && isExternal" class="state-block">
          <i class="pi pi-envelope" style="font-size:48px;color:var(--primary)"></i>
          <h2>{{ i18n.currentLang() === 'ar' ? 'لقد تمت دعوتك' : 'You\\'ve Been Invited' }}</h2>
          <p class="detail">
            {{ i18n.currentLang() === 'ar' ? 'تمت دعوتك للانضمام إلى' : 'You are invited to join' }}
            <strong>{{ organizationName }}</strong>
            {{ i18n.currentLang() === 'ar' ? 'كـ' : 'as' }} <strong>{{ roleLabel }}</strong>.
          </p>
          <p class="detail sub">
            {{ i18n.currentLang() === 'ar' ? 'أنشئ كلمة مرور للوصول إلى البوابة الخاصة بك.' : 'Set a password to access your portal.' }}
          </p>
          <form class="register-form" (ngSubmit)="acceptExternal()">
            <div class="form-group">
              <label>{{ i18n.currentLang() === 'ar' ? 'البريد الإلكتروني' : 'Email' }}</label>
              <input type="email" [value]="inviteeEmail" disabled class="form-input disabled" />
            </div>
            <div class="form-group">
              <label>{{ i18n.currentLang() === 'ar' ? 'كلمة المرور' : 'Password' }} *</label>
              <input [type]="showPassword ? 'text' : 'password'" [(ngModel)]="regPassword" name="password" class="form-input"
                     [placeholder]="i18n.currentLang() === 'ar' ? '8 أحرف على الأقل' : 'At least 8 characters'" required minlength="8" />
              <button type="button" class="toggle-pw" (click)="showPassword = !showPassword">
                <i [class]="showPassword ? 'pi pi-eye-slash' : 'pi pi-eye'"></i>
              </button>
            </div>
            <div class="form-group">
              <label>{{ i18n.currentLang() === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password' }} *</label>
              <input [type]="showPassword ? 'text' : 'password'" [(ngModel)]="regConfirmPassword" name="confirmPassword" class="form-input"
                     [placeholder]="i18n.currentLang() === 'ar' ? 'أعد إدخال كلمة المرور' : 'Re-enter your password'" required />
            </div>

            <div *ngIf="formError" class="form-error">{{ formError }}</div>

            <button type="submit" class="btn-accept" [disabled]="accepting">
              {{ accepting
                ? (i18n.currentLang() === 'ar' ? 'جاري القبول...' : 'Accepting…')
                : (i18n.currentLang() === 'ar' ? 'قبول الدعوة' : 'Accept Invitation') }}
            </button>
          </form>
        </div>

        <!-- Ready: Internal role → registration form with role details -->
        <div *ngIf="state === 'ready' && !isExternal" class="state-block">
          <i class="pi pi-user-plus" style="font-size:48px;color:var(--primary)"></i>
          <h2>{{ i18n.currentLang() === 'ar' ? 'انضم إلى الفريق' : 'Join the Team' }}</h2>
          <p class="detail">
            {{ i18n.currentLang() === 'ar' ? 'تمت دعوتك للانضمام إلى' : 'You are invited to join' }}
            <strong>{{ organizationName }}</strong>
            {{ i18n.currentLang() === 'ar' ? 'كـ' : 'as' }} <strong>{{ roleLabel }}</strong>.
          </p>

          <!-- Role description -->
          <div *ngIf="roleDescription" class="role-detail-box">
            <p class="role-desc">{{ roleDescription }}</p>
          </div>

          <!-- Profile info from invitation metadata -->
          <div *ngIf="jobTitle || department" class="profile-summary">
            <div *ngIf="jobTitle" class="profile-row">
              <span class="profile-label">{{ i18n.currentLang() === 'ar' ? 'المسمى الوظيفي' : 'Job Title' }}</span>
              <span class="profile-value">{{ jobTitle }}</span>
            </div>
            <div *ngIf="department" class="profile-row">
              <span class="profile-label">{{ i18n.currentLang() === 'ar' ? 'القسم' : 'Department' }}</span>
              <span class="profile-value">{{ department }}</span>
            </div>
          </div>

          <!-- Modules access badges -->
          <div *ngIf="roleModules.length > 0" class="modules-section">
            <p class="section-label">{{ i18n.currentLang() === 'ar' ? 'الموديولات المتاحة لك' : 'Modules you can access' }}</p>
            <div class="module-badges">
              <span *ngFor="let m of roleModules" class="module-badge">{{ m }}</span>
            </div>
          </div>

          <p class="detail sub">
            {{ i18n.currentLang() === 'ar' ? 'أنشئ حسابك للبدء.' : 'Create your account to get started.' }}
          </p>

          <form class="register-form" (ngSubmit)="acceptAndRegister()">
            <div class="form-group">
              <label>{{ i18n.currentLang() === 'ar' ? 'البريد الإلكتروني' : 'Email' }}</label>
              <input type="email" [value]="inviteeEmail" disabled class="form-input disabled" />
            </div>
            <div class="form-group">
              <label>{{ i18n.currentLang() === 'ar' ? 'الاسم الكامل' : 'Full Name' }} *</label>
              <input type="text" [(ngModel)]="regName" name="name" class="form-input"
                     [placeholder]="i18n.currentLang() === 'ar' ? 'أدخل اسمك' : 'Enter your full name'" required />
            </div>
            <div class="form-group">
              <label>{{ i18n.currentLang() === 'ar' ? 'كلمة المرور' : 'Password' }} *</label>
              <input [type]="showPassword ? 'text' : 'password'" [(ngModel)]="regPassword" name="password" class="form-input"
                     [placeholder]="i18n.currentLang() === 'ar' ? '8 أحرف على الأقل' : 'At least 8 characters'" required minlength="8" />
              <button type="button" class="toggle-pw" (click)="showPassword = !showPassword">
                <i [class]="showPassword ? 'pi pi-eye-slash' : 'pi pi-eye'"></i>
              </button>
            </div>
            <div class="form-group">
              <label>{{ i18n.currentLang() === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password' }} *</label>
              <input [type]="showPassword ? 'text' : 'password'" [(ngModel)]="regConfirmPassword" name="confirmPassword" class="form-input"
                     [placeholder]="i18n.currentLang() === 'ar' ? 'أعد إدخال كلمة المرور' : 'Re-enter your password'" required />
            </div>

            <div *ngIf="formError" class="form-error">{{ formError }}</div>

            <button type="submit" class="btn-accept" [disabled]="accepting">
              {{ accepting
                ? (i18n.currentLang() === 'ar' ? 'جاري إنشاء الحساب...' : 'Creating Account…')
                : (i18n.currentLang() === 'ar' ? 'إنشاء حساب والانضمام' : 'Create Account & Join') }}
            </button>
          </form>
        </div>

        <!-- Success -->
        <div *ngIf="state === 'success'" class="state-block">
          <i class="pi pi-check-circle" style="font-size:48px;color:var(--success, #22c55e)"></i>
          <h2>{{ i18n.currentLang() === 'ar' ? 'مرحباً بك!' : 'Welcome!' }}</h2>
          <p>{{ i18n.currentLang() === 'ar' ? 'تم إنشاء حسابك بنجاح. جاري التحويل...' : 'Your account has been created. Redirecting…' }}</p>
        </div>

        <!-- Error -->
        <div *ngIf="state === 'error'" class="state-block">
          <i class="pi pi-times-circle" style="font-size:48px;color:var(--error, #ef4444)"></i>
          <h2>{{ i18n.currentLang() === 'ar' ? 'خطأ في الدعوة' : 'Invitation Error' }}</h2>
          <p>{{ errorMessage }}</p>
          <button class="btn-secondary" (click)="requestNew()">
            {{ i18n.currentLang() === 'ar' ? 'طلب دعوة جديدة' : 'Request New Invitation' }}
          </button>
          <button class="btn-link" (click)="router.navigate(['/login'])">
            {{ i18n.currentLang() === 'ar' ? 'الذهاب لتسجيل الدخول' : 'Go to Login' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .invite-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--surface-sunken, #f4f5f7);
      position: relative;
    }
    .auth-top-bar { position: absolute; top: 1rem; right: 1rem; display: flex; align-items: center; gap: 1rem; }
    .auth-top-bar a { color: var(--text-muted); text-decoration: none; font-size: 0.9rem; }
    .auth-top-bar a:hover { color: var(--primary); }
    .auth-lang-dropdown { padding: 0.4rem 0.6rem; border-radius: 6px; border: 1px solid var(--border); background: var(--surface); font-size: 0.875rem; }
    .invite-card {
      max-width: 480px;
      width: 100%;
      padding: 2.5rem 2rem;
      text-align: center;
      background: var(--surface, #fff);
      border-radius: var(--radius-lg, 12px);
      box-shadow: var(--shadow-lg, 0 4px 24px rgba(0,0,0,.08));
    }
    .state-block { margin-top: 1rem; }
    h2 { margin: 1rem 0 0.5rem; color: var(--text-heading, #1a1a2e); }
    p { color: var(--text-muted, #6b7280); margin-bottom: 0.5rem; }
    p.sub { font-size: 0.9rem; margin-bottom: 1.25rem; }
    .detail strong { color: var(--text-heading, #1a1a2e); }

    .register-form { text-align: start; margin-top: 1rem; }
    .form-group {
      margin-bottom: 1rem;
      position: relative;
    }
    .form-group label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-heading, #1a1a2e);
      margin-bottom: 0.35rem;
    }
    .form-input {
      width: 100%;
      padding: 0.65rem 0.85rem;
      border: 1px solid var(--border, #d1d5db);
      border-radius: var(--radius-md, 8px);
      font-size: 0.95rem;
      background: var(--surface, #fff);
      color: var(--text, #1a1a2e);
      box-sizing: border-box;
      transition: border-color 0.15s;
    }
    .form-input:focus {
      outline: none;
      border-color: var(--primary, #4f46e5);
      box-shadow: 0 0 0 3px rgba(79,70,229,0.1);
    }
    .form-input.disabled {
      background: var(--surface-alt, #f3f4f6);
      color: var(--text-muted, #6b7280);
      cursor: not-allowed;
    }
    .toggle-pw {
      position: absolute;
      right: 0.75rem;
      top: 2.1rem;
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0.25rem;
    }
    [dir="rtl"] .toggle-pw { right: auto; left: 0.75rem; }
    .form-error {
      color: var(--error, #ef4444);
      font-size: 0.85rem;
      margin-bottom: 0.75rem;
      text-align: center;
    }

    .btn-accept {
      display: block;
      width: 100%;
      padding: 0.75rem 2rem;
      background: var(--primary, #4f46e5);
      color: #fff;
      border: none;
      border-radius: var(--radius-md, 8px);
      font-size: 1rem;
      cursor: pointer;
      margin-top: 0.5rem;
    }
    .btn-accept:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-accept:hover:not(:disabled) { filter: brightness(1.1); }
    .btn-secondary {
      display: inline-block;
      padding: 0.65rem 1.5rem;
      background: var(--surface-alt, #e5e7eb);
      color: var(--text-heading, #1a1a2e);
      border: none;
      border-radius: var(--radius-md, 8px);
      font-size: 0.9rem;
      cursor: pointer;
      margin-top: 0.5rem;
    }
    .btn-secondary:hover { filter: brightness(0.95); }
    .btn-link {
      display: block;
      margin-top: 1rem;
      background: none;
      border: none;
      color: var(--primary, #4f46e5);
      cursor: pointer;
      font-size: 0.9rem;
      text-decoration: underline;
    }
    .spinner {
      width: 40px; height: 40px;
      margin: 0 auto 1rem;
      border: 4px solid var(--surface-alt, #e5e7eb);
      border-top-color: var(--primary, #4f46e5);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .role-detail-box {
      background: var(--surface-alt, #f0f4ff);
      border: 1px solid var(--primary-light, #dbe4ff);
      border-radius: var(--radius-md, 8px);
      padding: 12px 16px;
      margin: 12px 0;
      text-align: start;
    }
    .role-desc {
      color: var(--text, #374151);
      font-size: 0.9rem;
      line-height: 1.5;
      margin: 0;
    }
    .profile-summary {
      background: var(--surface-card, #fff);
      border: 1px solid var(--border, #e5e7eb);
      border-radius: var(--radius-md, 8px);
      padding: 12px 16px;
      margin: 8px 0 12px;
      text-align: start;
    }
    .profile-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
    }
    .profile-label {
      font-size: 0.8rem;
      color: var(--text-muted, #6b7280);
    }
    .profile-value {
      font-size: 0.9rem;
      color: var(--text-heading, #1a1a2e);
      font-weight: 600;
    }
    .modules-section {
      margin: 8px 0 12px;
      text-align: start;
    }
    .section-label {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted, #6b7280);
      margin: 0 0 6px;
      font-weight: 600;
    }
    .module-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .module-badge {
      display: inline-block;
      padding: 3px 10px;
      background: var(--primary-light, #e0e7ff);
      color: var(--primary-dark, #3730a3);
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: capitalize;
    }
  `],
})
export class InvitationAcceptComponent implements OnInit {
  readonly router = inject(Router);
  readonly i18n = inject(I18nService);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  state: 'loading' | 'ready' | 'error' | 'success' = 'loading';
  accepting = false;
  errorMessage = '';

  organizationName = '';
  roleLabel = '';
  inviteeEmail = '';
  isExternal = false;
  roleDescription = '';
  jobTitle = '';
  department = '';
  roleModules: string[] = [];
  // DB-resolved landing route from invitation profile (UI-OS resolver).
  // null = operator has not seeded; SPA must render empty/no-op.
  tenantLandingRoute: string | null = null;

  // Registration form fields
  regName = '';
  regPassword = '';
  regConfirmPassword = '';
  showPassword = false;
  formError = '';

  private token = '';
  private tenantId = '';
  private invitationRole = '';

  private static readonly ROLE_LABELS: Record<string, string> = {
    vendor_contact: 'Vendor Contact',
    regulator_inspector: 'Regulator Inspector',
    consultant_admin: 'Consultant Administrator',
    external_auditor: 'External Auditor',
    owner: 'Platform Owner',
    admin: 'Administrator',
    compliance_officer: 'Compliance Officer',
    risk_manager: 'Risk Manager',
    auditor: 'Auditor',
    viewer: 'Viewer',
    user: 'Team Member',
    manager: 'Manager',
    ciso: 'CISO',
    dpo: 'Data Protection Officer',
    erm_lead: 'ERM Lead',
    it_security: 'IT Security',
    internal_auditor: 'Internal Auditor',
    bc_lead: 'Business Continuity Lead',
    legal_counsel: 'Legal Counsel',
    hr_lead: 'HR Lead',
  };

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParams['token'] || '';
    this.tenantId = this.route.snapshot.queryParams['tenantId'] || '';

    if (!this.token || !this.tenantId) {
      this.state = 'error';
      this.errorMessage = this.i18n.currentLang() === 'ar'
        ? 'رابط الدعوة غير صالح — معرّف المنظمة أو الرمز مفقود.'
        : 'Invalid invitation link — missing token or organization identifier.';
      return;
    }

    this.validateInvitation();
  }

  private validateInvitation(): void {
    this.http
      .post<unknown>(`${environment.apiUrl}/invitations/validate`, {
        token: this.token,
        tenantId: this.tenantId,
      })
      .subscribe({
        next: (res) => {
          const payload = res && typeof res === 'object' ? (res as GrcRecord) : {};
          const metadata = payload['metadata'] && typeof payload['metadata'] === 'object'
            ? (payload['metadata'] as GrcRecord)
            : {};
          const roleProfile = payload['roleProfile'] && typeof payload['roleProfile'] === 'object'
            ? (payload['roleProfile'] as GrcRecord)
            : {};
          const modules = Array.isArray(roleProfile['modules']) ? roleProfile['modules'] : [];

          this.organizationName = String(payload['organizationName'] ?? payload['tenantId'] ?? this.tenantId);
          this.invitationRole = typeof payload['role'] === 'string' ? payload['role'] : '';
          this.inviteeEmail = typeof payload['email'] === 'string' ? payload['email'] : '';
          this.isExternal = EXTERNAL_ROLES.has(this.invitationRole);
          this.roleLabel =
            InvitationAcceptComponent.ROLE_LABELS[this.invitationRole] || this.invitationRole.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          this.roleDescription = typeof payload['roleDescription'] === 'string' ? payload['roleDescription'] : '';
          this.jobTitle = typeof metadata['job_title'] === 'string' ? metadata['job_title'] : '';
          this.department = typeof metadata['department'] === 'string' ? metadata['department'] : '';

          const moduleNames = modules.filter((m): m is string => typeof m === 'string');
          this.roleModules = moduleNames.map((m) =>
            m.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
          );

          this.tenantLandingRoute = typeof roleProfile['tenantLandingRoute'] === 'string'
            ? roleProfile['tenantLandingRoute']
            : null;

          if (typeof metadata['name'] === 'string') {
            this.regName = metadata['name'];
          }

          this.state = 'ready';
        },
        error: (err) => {
          if (((err as GrcRecord).status) === 404) {
            this.organizationName = this.tenantId;
            this.roleLabel = 'Stakeholder';
            this.isExternal = true;
            this.state = 'ready';
          } else {
            this.state = 'error';
            this.errorMessage =
              ((err as GrcRecord).error)?.error || (this.i18n.currentLang() === 'ar'
                ? 'هذه الدعوة منتهية أو تم استخدامها بالفعل.'
                : 'This invitation is expired or has already been used.');
          }
        },
      });
  }

  /**
   * Accept for external roles (magic-link).
   *
   * Auth contract: the backend `/invitations/accept` endpoint provisions
   * the membership + role assignment server-side. The SPA never receives
   * a token here. After acceptance, we send the user through the
   * canonical /login flow which issues an httpOnly session cookie and
   * the post-auth orchestrator redirects to the appropriate role portal
   * via `portalRedirect(role)`.
   *
   * Previously this method stored a `scopedJwt` and `externalUserId` in
   * localStorage and decoded the JWT client-side to compute a redirect.
   * Both are forbidden under the DAuth single-source-of-token policy.
   * The role-based redirect now happens after OIDC hydrates the cookie.
   */
  acceptExternal(): void {
    this.formError = '';
    if (this.regPassword.length < 8) {
      this.formError = this.i18n.currentLang() === 'ar'
        ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
        : 'Password must be at least 8 characters';
      return;
    }
    if (this.regPassword !== this.regConfirmPassword) {
      this.formError = this.i18n.currentLang() === 'ar'
        ? 'كلمتا المرور غير متطابقتين'
        : 'Passwords do not match';
      return;
    }

    this.accepting = true;

    this.http
      .post<AcceptResponse>(`${environment.apiUrl}/invitations/accept`, {
        token: this.token,
        tenantId: this.tenantId,
        password: this.regPassword,
      })
      .subscribe({
        next: () => {
          this.state = 'success';
          // Land at /login with a returnUrl that the post-auth
          // orchestrator can resolve into the right portal once the
          // canonical cookie session is established.
          const role = this.invitationRole;
          const returnUrl = portalRedirect(role);
          setTimeout(
            () =>
              this.router.navigate(['/login'], {
                queryParams: returnUrl ? { returnUrl } : undefined,
              }),
            1200,
          );
        },
        error: (err) => {
          this.accepting = false;
          this.state = 'error';
          this.errorMessage =
            ((err as GrcRecord).error)?.error || (this.i18n.currentLang() === 'ar'
              ? 'تعذر قبول الدعوة. قد تكون منتهية أو مستخدمة.'
              : 'Unable to accept invitation. It may be expired or already used.');
        },
      });
  }

  /** Accept for internal roles: register with name + password, join existing tenant. */
  acceptAndRegister(): void {
    this.formError = '';

    if (!this.regName.trim()) {
      this.formError = this.i18n.currentLang() === 'ar' ? 'الاسم مطلوب' : 'Name is required';
      return;
    }
    if (this.regPassword.length < 8) {
      this.formError = this.i18n.currentLang() === 'ar' ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters';
      return;
    }
    if (this.regPassword !== this.regConfirmPassword) {
      this.formError = this.i18n.currentLang() === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match';
      return;
    }

    this.accepting = true;

    this.http
      .post<AcceptRegisterResponse>(`${environment.apiUrl}/invitations/accept-register`, {
        token: this.token,
        tenantId: this.tenantId,
        name: this.regName.trim(),
        password: this.regPassword,
      })
      .subscribe({
        next: (res) => {
          this.state = 'success';

          // Store ONLY non-sensitive display metadata. Auth truth = httpOnly
          // cookie set by auth-service /invitations/accept-register; the SPA
          // must NOT persist `res.jwt` to localStorage. Caller should land on
          // /login (OIDC start) so the cookie session hydrates canonically.
          localStorage.setItem('grc_userId', res.userId);
          localStorage.setItem('grc_tenantId', res.tenantId);
          localStorage.setItem('grc_role', res.role);
          localStorage.setItem('grc_userName', this.regName.trim());
          localStorage.setItem('grc_orgName', this.organizationName);

          // Landing route is DB-owned (dos.tenant_landing_config via UI-OS).
          // null on every source = render empty/no-op; do not invent a route.
          const landingPage = res.tenantLandingRoute || this.tenantLandingRoute;
          if (landingPage) setTimeout(() => this.router.navigate([landingPage]), 1500);
        },
        error: (err) => {
          this.accepting = false;
          this.formError =
            ((err as GrcRecord).error)?.error || (this.i18n.currentLang() === 'ar'
              ? 'تعذر إنشاء الحساب. حاول مرة أخرى.'
              : 'Unable to create account. Please try again.');
        },
      });
  }

  requestNew(): void {
    this.router.navigate(['/login'], {
      queryParams: { requestInvitation: true },
    });
  }
}
