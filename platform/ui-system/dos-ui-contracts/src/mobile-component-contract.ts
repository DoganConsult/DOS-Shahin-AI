/**
 * @dos/ui-contracts Mobile Component Props Schema
 *
 * Defines the mobile-specific props schema for components.
 * These props are stored in dos.dynamic_ui_component_registry.mobile_variant_props
 * and dos.mobile_component_variants.props_override.
 */

/**
 * Standard mobile props for components.
 * All props are optional with sensible defaults.
 */
export interface MobileComponentProps {
  /** Minimum touch target size in pixels (default: 44px per Apple HIG) */
  touchTargetSize?: number;

  /** Whether to provide haptic feedback on interaction (default: false) */
  hapticFeedback?: boolean;

  /** Swipe gesture configurations (left, right, up, down actions) */
  swipeActions?: SwipeAction[];

  /** Whether to enable pull-to-refresh (default: false) */
  pullToRefresh?: boolean;

  /** Whether to enable infinite scroll (default: false) */
  infiniteScroll?: boolean;

  /** Mobile density preference (default: 'normal') */
  density?: 'compact' | 'normal' | 'comfortable';

  /** Font size in pixels (default: 16px minimum for iOS to prevent zoom) */
  fontSize?: number;

  /** Whether to use full-width layout (default: false) */
  fullWidth?: boolean;

  /** Whether to use native picker on iOS (for dropdowns/date pickers) */
  nativePicker?: boolean;

  /** Whether to use stacked layout (for forms/cards) */
  stackedLayout?: boolean;

  /** Whether to use larger inputs (for forms) */
  largerInputs?: boolean;

  /** Whether to auto-scroll to errors (for forms) */
  autoScrollErrors?: boolean;

  /** Whether to enable bottom sheet on mobile (for modals) */
  bottomSheet?: boolean;

  /** Whether to enable swipe to dismiss (for modals) */
  swipeDismiss?: boolean;

  /** Whether to enable backdrop blur (for modals) */
  backdropBlur?: boolean;

  /** Whether to enable long-press menu (for cards) */
  longPressMenu?: boolean;

  /** Whether to enable swipe navigation (for tabs) */
  swipeNav?: boolean;

  /** Whether to enable scrollable tabs (for tabs) */
  scrollable?: boolean;

  /** Whether to enable horizontal scroll (for tables) */
  horizontalScroll?: boolean;

  /** Whether to use stacked rows on mobile (for tables) */
  stackedRows?: boolean;

  /** Whether to enable auto-focus (for inputs) */
  autoFocus?: boolean;

  /** Padding in pixels (for inputs) */
  padding?: number;
}

/**
 * Swipe action configuration.
 */
export interface SwipeAction {
  /** Direction of the swipe gesture */
  direction: 'left' | 'right' | 'up' | 'down';

  /** Action to execute on swipe (ShellAction shape) */
  action: {
    kind: 'navigate' | 'open_external' | 'toggle_language' | 'open_context_tab' | 'open_command' | 'close_overlay' | 'clear_error' | 'dispatch_event';
    path?: string;
    url?: string;
    tab?: string;
    eventName?: string;
    payload?: Record<string, unknown>;
  };

  /** Whether to provide haptic feedback */
  hapticFeedback?: boolean;

  /** Minimum swipe threshold in pixels */
  threshold?: number;
}

/**
 * Mobile layout configuration for routes.
 * Stored in dos.dynamic_ui_routes.mobile_layout_config.
 */
export interface MobileLayoutConfig {
  header?: {
    sticky?: boolean;
    height?: number;
  };
  main?: {
    padding?: number;
    scroll?: boolean;
  };
  bottomNav?: {
    height?: number;
    safeArea?: boolean;
  };
  drawer?: {
    enabled?: boolean;
    position?: 'left' | 'right';
  };
}

/**
 * Mobile touch configuration for routes.
 * Stored in dos.dynamic_ui_routes.mobile_touch_config.
 */
export interface MobileTouchConfig {
  /** Whether to enable swipe-to-navigate */
  swipeToNavigate?: boolean;

  /** Whether to enable pull-to-refresh */
  pullToRefresh?: boolean;

  /** Whether to enable long-press menu */
  longPressMenu?: boolean;

  /** Whether to enable haptic feedback */
  hapticFeedback?: boolean;
}

/**
 * Mobile variant configuration for routes.
 * Stored in dos.dynamic_ui_routes.mobile_variant.
 */
export interface MobileVariant {
  /** Layout strategy for mobile */
  layout: 'stacked' | 'bottom-nav' | 'drawer' | 'custom';

  /** Mobile density preference */
  density: 'compact' | 'normal' | 'comfortable';

  /** Whether touch interactions are enabled */
  touchEnabled: boolean;

  /** Gesture configurations */
  gestures: string[];

  /** Bottom navigation configuration */
  bottomNav?: {
    enabled: boolean;
    maxItems: number;
  };

  /** Drawer configuration */
  drawer?: {
    enabled: boolean;
    position: 'left' | 'right';
  };
}

/**
 * Mobile component variant for specific breakpoints.
 * Stored in dos.mobile_component_variants.
 */
export interface MobileComponentVariant {
  variant_id: string;
  tenant_id: string | null;
  component_key: string;
  variant_name: string;
  breakpoint: 'mobile' | 'tablet' | 'desktop';
  props_override: MobileComponentProps;
  layout_override: Record<string, unknown> | null;
  is_default: boolean;
}

/**
 * Mobile breakpoint configuration.
 * Stored in dos.mobile_breakpoint_config.
 */
export interface MobileBreakpointConfig {
  tenant_id: string | null;
  breakpoint_key: 'mobile' | 'tablet' | 'desktop';
  min_px: number;
  max_px: number;
  default_behavior: string;
  is_active: boolean;
}

/**
 * Mobile touch gesture configuration.
 * Stored in dos.mobile_touch_gestures.
 */
export interface MobileTouchGesture {
  gesture_id: string;
  tenant_id: string | null;
  gesture_type: 'swipe' | 'pinch' | 'long-press' | 'double-tap';
  component_key: string | null;
  action_config: {
    kind: string;
    path?: string;
    url?: string;
    tab?: string;
    eventName?: string;
    payload?: Record<string, unknown>;
    pattern?: {
      pattern: string;
      intensity: number;
      duration: number;
    };
  };
  haptic_feedback: boolean;
  is_active: boolean;
}
