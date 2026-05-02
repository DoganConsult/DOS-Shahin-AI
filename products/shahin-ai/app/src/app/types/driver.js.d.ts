declare module 'driver.js' {
  export interface DriveStep {
    element?: string | HTMLElement;
    popover?: {
      title?: string;
      description?: string;
      side?: 'top' | 'right' | 'bottom' | 'left';
      align?: 'start' | 'center' | 'end';
    };
  }

  export interface DriverConfig {
    steps?: DriveStep[];
    showProgress?: boolean;
    animate?: boolean;
    overlayColor?: string;
    stagePadding?: number;
    stageRadius?: number;
    popoverClass?: string;
    nextBtnText?: string;
    prevBtnText?: string;
    doneBtnText?: string;
    progressText?: string;
    onDestroyed?: () => void;
    onHighlightStarted?: (element?: HTMLElement, step?: DriveStep) => void;
    onHighlighted?: (element?: HTMLElement, step?: DriveStep) => void;
    onDeselected?: (element?: HTMLElement, step?: DriveStep) => void;
  }

  export interface Driver {
    drive(stepIndex?: number): void;
    highlight(step: DriveStep): void;
    moveNext(): void;
    movePrevious(): void;
    destroy(): void;
    isActive(): boolean;
  }

  export function driver(config?: DriverConfig): Driver;
}
