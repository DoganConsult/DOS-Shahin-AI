import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf-8');
}

describe('UI ↔ AI Compatibility Contracts', () => {
  it('Dynamic UI widget-key map registers AI widget keys', () => {
    const src = readFile('platform/config-center/shared/dynamic-ui/registry/widget-key-map.ts');
    expect(src).toContain("'ai-recommendations-panel'");
    expect(src).toContain("'agent-copilot-panel'");
    expect(src).toContain('AiPanelComponent');
  });

  it('AI Panel widget supports Dynamic UI host config injection', () => {
    const src = readFile('platform/foundation/ui/shared/ai-panel/ai-panel.component.ts');
    expect(src).toContain("module: AIModule = 'risks'");
    expect(src).toContain('set config');
    expect(src).toContain("?.['module']");
  });

  it('DynamicPageHost rerenders on invalidation events (throttled)', () => {
    const src = readFile('platform/config-center/shared/dynamic-ui/components/dynamic-page-host.component.ts');
    expect(src).toContain('ui.widget.invalidate');
    expect(src).toContain('ui.route.invalidate');
    expect(src).toContain('ui.dynamic_ui.changed');
    expect(src).toContain('auditTime(250)');
  });

  it('Mutation interceptor recognizes AI endpoints for live refresh', () => {
    const src = readFile('platform/runtime/interceptors/grc-mutation.interceptor.ts');
    expect(src).toContain("'ai'");
    expect(src).toMatch(/\/api\\\/ai/);
  });
});

