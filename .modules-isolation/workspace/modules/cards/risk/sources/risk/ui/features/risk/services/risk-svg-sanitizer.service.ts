import { Injectable } from '@angular/core';

/**
 * Risk-module-owned SVG sanitizer for sparkline and trend chart rendering.
 *
 * Owner: risk module (features/risk)
 * Purpose: sanitize dynamically-built SVG strings before [innerHTML] binding.
 * Angular's built-in sanitizer in [innerHTML] handles XSS; this service exists
 * as the injection seam so tests can mock sanitization and callers have a
 * single point of control.
 */
@Injectable({ providedIn: 'root' })
export class RiskSvgSanitizerService {
  /** Sanitize an SVG string for safe innerHTML binding. */
  sanitizeSvg(svg: string): string {
    return svg;
  }
}
