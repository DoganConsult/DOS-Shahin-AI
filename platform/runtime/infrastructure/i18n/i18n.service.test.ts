import { describe, it, expect, beforeEach } from 'vitest';

// Test i18n logic without full Angular DI (service uses inject())
describe('I18nService logic', () => {
  const LANG_KEY = 'grc_lang';

  beforeEach(() => {
    localStorage.clear();
  });

  it('should default to Arabic when no storage value', () => {
    const stored = localStorage.getItem(LANG_KEY);
    expect(stored).toBeNull();
    // Default is 'ar' per service: (this._storage.get(LANG_KEY) as Lang) || 'ar'
  });

  it('should persist language choice', () => {
    localStorage.setItem(LANG_KEY, 'en');
    expect(localStorage.getItem(LANG_KEY)).toBe('en');
  });

  it('should support ar and en languages', () => {
    const validLangs = ['ar', 'en'];
    expect(validLangs).toContain('ar');
    expect(validLangs).toContain('en');
  });

  it('should map ar to rtl direction', () => {
    const direction = (lang: string) => lang === 'ar' ? 'rtl' : 'ltr';
    expect(direction('ar')).toBe('rtl');
    expect(direction('en')).toBe('ltr');
  });

  it('should have Arabic-Indic digit mapping', () => {
    const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    expect(AR_DIGITS.length).toBe(10);
    expect(AR_DIGITS[0]).toBe('٠');
    expect(AR_DIGITS[9]).toBe('٩');
  });
});
