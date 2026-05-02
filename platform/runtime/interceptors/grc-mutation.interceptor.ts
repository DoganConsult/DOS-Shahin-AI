import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs/operators';
import { GrcLiveService, GrcEntity } from './grc-live.service';
import { environment } from '@env/environment';

/**
 * URL → entity mapping.
 * Order matters — more specific patterns first.
 */
const ENTITY_PATTERNS: [RegExp, GrcEntity][] = [
  [/\/vulnerabilities/, 'risk'],
  [/\/model-risk/, 'risk'],
  [/\/api\/risk-ws|\/risk-smart|\/risk-scoring|\/risk-metrics|\/risk-appetite|\/risks/, 'risk'],
  [/\/api\/ai-(explainability|compliance-framework|dpia|model-risk|agent-performance)\b|\/api\/ai-governance\b|\/api\/ai-gateway\b|\/api\/ai\b|\/ai\/(insights|risk-assessment|gap-analysis|audit-prep|vendor-risk|triage-incident|evidence-gap|bcp-analysis)\b|\/ai-enhanced\b/i, 'ai'],
  [/\/control-lifecycle|\/controls/, 'control'],
  [/\/governance\/mandates|\/governance\/delegations|\/governance\/obligations|\/governance\/charters|\/governance\/health|\/governance\/structure|\/governance\/board-packs|\/governance\/responsibilities|\/governance\/raci|\/governance\/enforcement|\/governance\/reviews|\/governance\/acknowledgements|\/governance\/objectives|\/governance-os|\/governance/, 'governance'],
  [/\/policy-code|\/policy-lifecycle|\/policies|\/attestation/, 'governance'],
  [/\/frameworks|\/framework-mapping/, 'framework'],
  [/\/evidence-catalog|\/evidence-tasks|\/evidence/, 'evidence'],
  [/\/incidents/, 'incident'],
  [/\/findings/, 'finding'],
  [/\/vendor-risk|\/vendors/, 'vendor'],
  [/\/audit-package|\/audit-workpapers|\/audit-trail|\/audit/, 'audit'],
  [/\/compliance-ws|\/compliance|\/assessments|\/nca-assessment|\/rcsa/, 'compliance'],
  [/\/workflows|\/workflow-templates|\/subflows/, 'workflow'],
  [/\/team-management|\/teams|\/raci/, 'team'],
  [/\/workspace|\/provisioning/, 'workspace'],
];

function detectEntity(url: string): GrcEntity | null {
  for (const [pattern, entity] of ENTITY_PATTERNS) {
    if (pattern.test(url)) return entity;
  }
  return null;
}

/**
 * grcMutationInterceptor
 *
 * Intercepts every successful POST/PUT/PATCH/DELETE call to the API and emits
 * a typed GrcChangeEvent on GrcLiveService.change$ + the relevant entity stream.
 *
 * This is the only wiring needed to make all related layers react automatically:
 * workspace-home KPIs, AGRC-OS metrics, analytics dashboard, audit trail, and
 * any other component that subscribes to GrcLiveService.debounced().
 */
export const grcMutationInterceptor: HttpInterceptorFn = (req, next) => {
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const isApiCall  = req.url.includes(environment.apiUrl) || req.url.startsWith('/api');
  if (!isMutation || !isApiCall) return next(req);

  const live = inject(GrcLiveService);

  return next(req).pipe(
    tap(event => {
      if (event instanceof HttpResponse && event.status >= 200 && event.status < 300) {
        const entity = detectEntity(req.url);
        if (entity) {
          live.emit({
            entity,
            action: req.method.toLowerCase() as 'post' | 'put' | 'patch' | 'delete',
            url: req.url,
          });
        }
      }
    }),
  );
};
