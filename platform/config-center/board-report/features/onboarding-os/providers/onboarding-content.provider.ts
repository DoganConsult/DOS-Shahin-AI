/**
 * OnboardingContentProvider — Interface and token for product-specific onboarding content.
 *
 * Platform components (the onboarding shell) inject this token and delegate
 * product-specific UI decisions (will-create previews, AI suggestions) to the
 * active product's provider. When no product is installed, falls back to empty results.
 *
 * @owner DOS (Platform)
 * @spec DOS-AIO Patch 0 Law 15 (product removable)
 * @since 2026-04-02  Step 6 boundary cleanup
 */
import { InjectionToken } from '@angular/core';

// ── Will-create item displayed during onboarding to show what gets provisioned ──
export interface WillCreateItem {
  icon: string;
  labelEn: string;
  labelAr: string;
  count?: number;
}

// ── Provider interface ──
export interface OnboardingContentProvider {
  /**
   * Return the list of items that will be created in the workspace
   * for the given stage. Empty array = no preview for this stage.
   */
  getWillCreateItems(stageCode: string): WillCreateItem[];

  /**
   * Request AI-generated responsibility suggestions.
   * Returns a promise that resolves when the suggestion flow completes.
   * Implementations should handle their own toasts/notifications.
   */
  suggestResponsibilities(sessionId: string): Promise<void>;
}

/**
 * Injection token for the active product's onboarding content provider.
 * Defaults to null — the shell checks before calling.
 */
export const ONBOARDING_CONTENT_PROVIDER = new InjectionToken<OnboardingContentProvider | null>(
  'ONBOARDING_CONTENT_PROVIDER',
  { providedIn: 'root', factory: () => null }
);
