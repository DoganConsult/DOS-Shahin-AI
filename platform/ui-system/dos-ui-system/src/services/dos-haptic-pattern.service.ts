import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

/**
 * @dos/ui-system Haptic Pattern Service
 *
 * Loads haptic feedback patterns from dos.mobile_touch_gestures
 * and applies them based on gesture configurations.
 */
@Injectable({
  providedIn: 'root',
})
export class DosHapticPatternService {
  private patterns = new BehaviorSubject<Map<string, HapticPattern>>(new Map());

  constructor(private http: HttpClient) {}

  /**
   * Load haptic patterns from DB
   */
  loadPatterns(): Observable<void> {
    return this.http
      .get<{ data: MobileTouchGesture[] }>('/api/ui-os/mobile-touch-gestures')
      .pipe(
        map((response) => {
          const patternMap = new Map<string, HapticPattern>();
          for (const gesture of response.data) {
            if (gesture.haptic_feedback && gesture.action_config.pattern) {
              patternMap.set(gesture.gesture_type, gesture.action_config.pattern);
            }
          }
          this.patterns.next(patternMap);
        }),
        catchError(() => of(void 0))
      );
  }

  /**
   * Get haptic pattern for a gesture type
   */
  getPattern(gestureType: string): HapticPattern | null {
    return this.patterns.value.get(gestureType) || null;
  }

  /**
   * Apply haptic pattern
   */
  applyPattern(gestureType: string): void {
    const pattern = this.getPattern(gestureType);
    if (pattern && 'vibrate' in navigator) {
      if (pattern.pattern === 'custom' && pattern.duration) {
        navigator.vibrate(pattern.duration);
      } else {
        this.applyPresetPattern(pattern.pattern, pattern.intensity);
      }
    }
  }

  private applyPresetPattern(preset: string, intensity: number): void {
    const duration = Math.round(10 * intensity);
    switch (preset) {
      case 'light':
        navigator.vibrate(duration);
        break;
      case 'medium':
        navigator.vibrate([duration, 50, duration]);
        break;
      case 'heavy':
        navigator.vibrate([duration, 30, duration * 2]);
        break;
      case 'success':
        navigator.vibrate([duration, 50, duration]);
        break;
      case 'error':
        navigator.vibrate([duration, 30, duration, 30, duration]);
        break;
      default:
        navigator.vibrate(duration);
    }
  }
}

interface HapticPattern {
  pattern: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'custom';
  intensity: number;
  duration?: number;
}

interface MobileTouchGesture {
  gesture_id: string;
  gesture_type: string;
  component_key: string | null;
  action_config: {
    kind: string;
    pattern?: HapticPattern;
  };
  haptic_feedback: boolean;
}
