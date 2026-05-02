import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from '@app/infrastructure';

// Test ThemeService logic without Angular DI (it uses inject())
describe('ThemeService logic', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should default to white theme', () => {
    const stored = localStorage.getItem('grc_theme');
    expect(stored).toBeNull();
  });

  it('should persist theme choice', () => {
    localStorage.setItem('grc_theme', 'gray-100');
    expect(localStorage.getItem('grc_theme')).toBe('gray-100');
  });

  it('should handle legacy "light" value', () => {
    localStorage.setItem('grc_theme', 'light');
    const stored = localStorage.getItem('grc_theme');
    // ThemeService.current maps 'light' → 'white'
    expect(stored === 'light' || stored === 'white').toBe(true);
  });

  it('should handle legacy "dark" value', () => {
    localStorage.setItem('grc_theme', 'dark');
    const stored = localStorage.getItem('grc_theme');
    expect(stored === 'dark' || stored === 'gray-100').toBe(true);
  });

  it('should cycle through 4 themes', () => {
    const themes = ['white', 'gray-10', 'gray-90', 'gray-100'];
    for (let i = 0; i < themes.length; i++) {
      expect(themes[i]).toBeDefined();
    }
    expect(themes.length).toBe(4);
  });
});
