/**
 * Part C / G4 — WhyAmISeeingThisResolver.
 *
 * Produces a human-readable explanation for why a route/action is visible
 * (or hidden) for the current user, by combining UserContext + Page
 * Experience contract. Used by the "Why am I seeing this?" affordance.
 */
import { Injectable, inject } from '@angular/core';
import { DynamicPageExperienceResolver } from './dynamic-page-experience.resolver';
import { UserContextResolver } from './user-context.resolver';

export interface WhyAmISeeingThisResult {
  route: string;
  visible: boolean;
  reasons: string[];
}

@Injectable({ providedIn: 'root' })
export class WhyAmISeeingThisResolver {
  private experience = inject(DynamicPageExperienceResolver);
  private user = inject(UserContextResolver);

  explain(route: string): WhyAmISeeingThisResult {
    const exp = this.experience.forRoute(route);
    const ctx = this.user.context();
    const reasons: string[] = [];
    if (!exp) {
      return { route, visible: false, reasons: ['No Page Experience contract for this route.'] };
    }
    if (!ctx) {
      reasons.push('No active user context (anonymous).');
      return { route, visible: false, reasons };
    }
    if (exp.audienceProfiles.length === 0) {
      reasons.push(`Page is open to all profiles; you are ${ctx.profileType}.`);
    } else if (exp.audienceProfiles.includes(ctx.profileType)) {
      reasons.push(`Your profile (${ctx.profileType}) is in the audience: ${exp.audienceProfiles.join(', ')}.`);
    } else {
      reasons.push(`Your profile (${ctx.profileType}) is NOT in the audience: ${exp.audienceProfiles.join(', ')}.`);
    }
    reasons.push(`Data scope: ${exp.dataScopeMode}.`);
    if (exp.evidenceRequired) reasons.push('Evidence is required for write actions on this page.');
    return { route, visible: exp.visibleForCurrentUser, reasons };
  }
}
