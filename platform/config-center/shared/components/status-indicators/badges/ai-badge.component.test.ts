import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('AiBadgeComponent', () => {
  const src = readFileSync(resolve(__dirname, 'ai-badge.component.ts'), 'utf-8');

  it('should be standalone component', () => {
    expect(src).toContain('standalone: true');
  });

  it('should use OnPush change detection', () => {
    expect(src).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('should have app-ai-badge selector', () => {
    expect(src).toContain("'app-ai-badge'");
  });

  it('should have default label "AI"', () => {
    expect(src).toContain("label = 'AI'");
  });

  it('should support inline, block, and subtle variants', () => {
    expect(src).toContain("'inline'");
    expect(src).toContain("'block'");
    expect(src).toContain("'subtle'");
  });

  it('should have accessibility attributes', () => {
    expect(src).toContain('aria-label');
    expect(src).toContain('role="status"');
  });

  it('should show AI icon SVG', () => {
    expect(src).toContain('<svg');
    expect(src).toContain('viewBox');
  });

  it('should accept model name input', () => {
    expect(src).toContain("@Input() model");
  });

  it('should have tooltip for transparency', () => {
    expect(src).toContain('AI-generated');
  });
});
