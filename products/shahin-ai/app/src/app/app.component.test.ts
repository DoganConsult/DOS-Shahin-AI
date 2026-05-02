import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, 'app.component.ts'), 'utf-8');

describe('AppComponent — authenticated startup gating', () => {
  it('does not mount nudge notifications before the access snapshot is loaded', () => {
    expect(src).toContain('<app-nudge-notifications *ngIf="authService.isLoggedIn() && accessStore.loaded()" />');
  });

  it('gates proactive assistance behind authenticated access readiness', () => {
    expect(src).toContain('<app-proactive-assistance *ngIf="authService.isLoggedIn() && accessStore.loaded() && !isNative()" />');
  });
});
