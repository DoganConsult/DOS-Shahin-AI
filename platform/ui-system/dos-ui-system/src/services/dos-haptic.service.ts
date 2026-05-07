import { Injectable } from '@angular/core';

/**
 * @dos/ui-system Haptic Feedback Service
 *
 * Wraps the Vibration API to provide haptic feedback for mobile interactions.
 * Supports different vibration patterns for different interaction types.
 */
@Injectable({
  providedIn: 'root',
})
export class DosHapticService {
  private readonly isSupported = 'vibrate' in navigator;

  /**
   * Light tap feedback (5ms)
   */
  tap(): void {
    if (this.isSupported) {
      navigator.vibrate(5);
    }
  }

  /**
   * Impact feedback (10ms)
   */
  impact(): void {
    if (this.isSupported) {
      navigator.vibrate(10);
    }
  }

  /**
   * Notification feedback (15ms)
   */
  notification(): void {
    if (this.isSupported) {
      navigator.vibrate(15);
    }
  }

  /**
   * Selection feedback (10ms)
   */
  selection(): void {
    if (this.isSupported) {
      navigator.vibrate(10);
    }
  }

  /**
   * Success feedback pattern (20ms)
   */
  success(): void {
    if (this.isSupported) {
      navigator.vibrate(20);
    }
  }

  /**
   * Error feedback pattern (50ms)
   */
  error(): void {
    if (this.isSupported) {
      navigator.vibrate(50);
    }
  }

  /**
   * Warning feedback pattern (30ms)
   */
  warning(): void {
    if (this.isSupported) {
      navigator.vibrate(30);
    }
  }

  /**
   * Custom vibration pattern
   * @param pattern Array of vibration durations in milliseconds
   */
  vibrate(pattern: number | number[]): void {
    if (this.isSupported) {
      navigator.vibrate(pattern);
    }
  }

  /**
   * Check if haptic feedback is supported
   */
  isHapticSupported(): boolean {
    return this.isSupported;
  }
}
