// ============================================
// Shahin GRC — WebGL Detection Utility
// Shared utility for detecting WebGL support
// Used by 3D visualization components
// ============================================

/** Detection result with capability level */
export interface WebGLDetectResult {
  supported: boolean;
  version: 1 | 2 | 0;
  renderer: string;
}

/**
 * Detect WebGL support in the current browser.
 * Returns a result object with support level and renderer info.
 * Safe to call in SSR (returns unsupported).
 */
export function detectWebGL(): WebGLDetectResult {
  if (typeof document === 'undefined') {
    return { supported: false, version: 0, renderer: 'ssr' };
  }
  try {
    const canvas = document.createElement('canvas');
    // Try WebGL2 first
    const gl2 = canvas.getContext('webgl2') as WebGL2RenderingContext | null;
    if (gl2) {
      const dbg = gl2.getExtension('WEBGL_debug_renderer_info');
      const renderer = dbg ? gl2.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'any';
      return { supported: true, version: 2, renderer };
    }
    // Fall back to WebGL1
    const gl1 = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (gl1) {
      const dbg = gl1.getExtension('WEBGL_debug_renderer_info');
      const renderer = dbg ? gl1.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'any';
      return { supported: true, version: 1, renderer };
    }
  } catch {
    // Canvas or context creation failed
  }
  return { supported: false, version: 0, renderer: 'none' };
}

/** Simple boolean check — convenience wrapper */
export function isWebGLAvailable(): boolean {
  return detectWebGL().supported;
}
