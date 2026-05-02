/** GRC ECharts theme helpers. */
export interface GrcTheme {
  animation: (duration: number) => Record<string, unknown>;
  tooltip: () => Record<string, unknown>;
  legend: () => Record<string, unknown>;
  text1: string;
  text2: string;
  border: string;
  primary: string;
  success: string;
  alpha: (hexOrColor: string, opacity: number) => string;
}

export function grc(): GrcTheme {
  return {
    animation: (duration: number) => ({ animationDuration: duration }),
    tooltip: () => ({ confine: true, trigger: 'item' }),
    legend: () => ({ bottom: 0, left: 'center' }),
    text1: '#1a1a1a',
    text2: '#666',
    border: '#e0e0e0',
    primary: '#1976d2',
    success: '#2e7d32',
    alpha: (_hexOrColor: string, opacity: number) => `rgba(var(--color-black-rgb), ${opacity})`,
  };
}
