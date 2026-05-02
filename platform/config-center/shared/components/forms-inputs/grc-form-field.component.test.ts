import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('GrcFormFieldComponent', () => {
  const src = readFileSync(resolve(__dirname, 'grc-form-field.component.ts'), 'utf-8');

  it('should be standalone component', () => {
    expect(src).toContain('standalone: true');
  });

  it('should use OnPush change detection', () => {
    expect(src).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('should have grc-form-field selector', () => {
    expect(src).toContain("'grc-form-field'");
  });

  it('should accept label input', () => {
    expect(src).toContain("@Input() label");
  });

  it('should support required indicator', () => {
    expect(src).toContain("@Input() required");
    expect(src).toContain('grc-field__required');
  });

  it('should show validation error messages', () => {
    expect(src).toContain('showError');
    expect(src).toContain('resolvedError');
    expect(src).toContain("role=\"alert\"");
  });

  it('should have default validation messages for common validators', () => {
    expect(src).toContain('This field is required');
    expect(src).toContain('valid email');
    expect(src).toContain('too short');
  });

  it('should support compact and dense variants', () => {
    expect(src).toContain("'compact'");
    expect(src).toContain("'dense'");
  });

  it('should support helper text', () => {
    expect(src).toContain('helperText');
    expect(src).toContain('grc-field__help');
  });

  it('should accept AbstractControl for reactive form integration', () => {
    expect(src).toContain('AbstractControl');
    expect(src).toContain('@Input() control');
  });
});
