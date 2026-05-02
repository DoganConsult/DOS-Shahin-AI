/**
 * Part C / G4 — UserContextResolver.
 *
 * Single source of truth (SPA-side) for the active user's persona-oriented
 * workspace context. Backend RLS is authoritative; this signal is a
 * presentation hint used by DynamicPageExperienceResolver and
 * WhyAmISeeingThisResolver to compute audience-gated UI.
 */
import { Injectable, computed, inject } from '@angular/core';
import { BootstrapStore } from './bootstrap.store';

export type ProfileType =
  | 'tenant_owner' | 'platform_admin' | 'foundation_admin'
  | 'hr_manager' | 'department_manager' | 'auditor'
  | 'viewer' | 'external_user';

export interface UserContext {
  userId: string;
  tenantId: string;
  roleCode: string;
  profileType: ProfileType;
  permissions: ReadonlySet<string>;
  orgScope: ReadonlyArray<{ scopeType: string; scopeId: string; isPrimary: boolean }>;
  language: 'en' | 'ar';
  direction: 'ltr' | 'rtl';
}

@Injectable({ providedIn: 'root' })
export class UserContextResolver {
  private bootstrap = inject(BootstrapStore);

  readonly context = computed<UserContext | null>(() => {
    const u = this.bootstrap.user();
    const t = this.bootstrap.tenant();
    const rp = this.bootstrap.roleProfile();
    if (!u || !t) return null;
    const roleCode = rp?.roleCode ?? u.roleCode ?? 'viewer';
    const profileType = this.deriveProfileType(roleCode, (u as any).profileType);
    const perms = new Set<string>(
      ((u as any).permissions as string[] | undefined) ??
      ((rp as any)?.permissions as string[] | undefined) ??
      [],
    );
    return {
      userId: u.userId ?? 'anonymous',
      tenantId: t.tenantId ?? 'default',
      roleCode,
      profileType,
      permissions: perms,
      orgScope: ((u as any).orgScope as UserContext['orgScope']) ?? [],
      language: ((u as any).language as 'en' | 'ar') ?? 'en',
      direction: ((u as any).direction as 'ltr' | 'rtl') ?? 'ltr',
    };
  });

  hasPermission(key: string): boolean {
    const ctx = this.context();
    return !!ctx && ctx.permissions.has(key);
  }

  hasProfile(profile: ProfileType | ProfileType[]): boolean {
    const ctx = this.context();
    if (!ctx) return false;
    return Array.isArray(profile) ? profile.includes(ctx.profileType) : ctx.profileType === profile;
  }

  private deriveProfileType(roleCode: string, explicit?: string): ProfileType {
    if (explicit && this.isProfile(explicit)) return explicit;
    const r = (roleCode || '').toLowerCase();
    if (r.includes('platform_admin') || r === 'super_admin') return 'platform_admin';
    if (r.includes('tenant_owner') || r === 'owner') return 'tenant_owner';
    if (r.includes('foundation') || r.includes('admin')) return 'foundation_admin';
    if (r.includes('hr')) return 'hr_manager';
    if (r.includes('department') || r.includes('manager')) return 'department_manager';
    if (r.includes('audit')) return 'auditor';
    if (r.includes('external') || r.includes('partner')) return 'external_user';
    return 'viewer';
  }

  private isProfile(v: string): v is ProfileType {
    return [
      'tenant_owner','platform_admin','foundation_admin',
      'hr_manager','department_manager','auditor',
      'viewer','external_user',
    ].includes(v);
  }
}
