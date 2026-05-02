// ISOLATION SHIM for @dos/ui-system. Type surface only.
export type ThemeMode = 'light' | 'dark' | 'system';
export interface UiTokens { [k: string]: string | number }
export const designTokens: UiTokens = {};
export interface UiContract { name: string; version: string }
export const __SHIM__ = true;
