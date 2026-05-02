import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function listRoutePaths(router: any): string[] {
  const stack = Array.isArray(router?.stack) ? router.stack : [];
  const out: string[] = [];
  for (const layer of stack) {
    const routePath = layer?.route?.path;
    if (typeof routePath === 'string') out.push(routePath);
  }
  return out;
}

describe('cooperative-workflows routes contract', () => {
  it('exposes frontend cooperative-workflows endpoints', async () => {
    const repoRoot = path.resolve(__dirname, '../../../..');
    const routerPath = path.join(
      repoRoot,
      'modules/workflow/dist/workflow/routes/misc/cooperative-workflows.routes.js',
    );

    const mod = await import(pathToFileURL(routerPath).href);
    const router = mod.default || mod;
    const paths = listRoutePaths(router);

    expect(paths).toEqual(expect.arrayContaining([
      '/triage-proposals',
      '/co-draft-sessions',
      '/co-draft-sessions/:id',
      '/co-draft-sessions/:id/resolve-question',
      '/co-draft-sessions/:id/finalize',
      '/evidence-relay-queue',
      '/evidence-relay-queue/:id/review',
      '/risk-pair-reviews',
      '/risk-pair-reviews/:id',
      '/risk-pair-reviews/:id/human-assessment',
      '/risk-pair-reviews/:id/finalize',
      '/approval-pre-screens',
      '/approval-pre-screens/:approvalId',
      '/approval-pre-screens/:approvalId/run',
      '/audit-prep-checklists',
      '/audit-prep-checklists/:id',
      '/audit-prep-checklists/:id/items',
      '/audit-prep-checklists/:checklistId/items/:itemId/ready',
      '/audit-prep-checklists/:id',
      '/standup-digests',
      '/standup-digests/:id',
      '/standup-digests/:id/acknowledge',
      '/score-calibrations',
      '/score-calibrations/:id',
      '/score-calibrations/:id/submit',
      '/score-calibrations/:id/accept',
    ]));
  });
});

