import { Injectable, signal } from '@angular/core';

/** View modes available in the policy library. */
export type PolicyView = 'table' | 'grouped_category' | 'grouped_owner' | 'stale' | 'no_linkage';

/**
 * Manages transient UI state for the Policy Module.
 * Signals enable reactive updates without manual change detection.
 */
@Injectable({ providedIn: 'root' })
export class PolicyUiStateService {
  /** Current library view mode. */
  readonly activeView = signal<PolicyView>('table');

  /** Currently selected policy ID (drives detail panel). */
  readonly selectedPolicyId = signal<string | null>(null);

  /** Whether the detail side-panel is open. */
  readonly detailPanelOpen = signal<boolean>(false);

  /** Active tab inside the detail panel (e.g. 'overview', 'versions', 'attestations'). */
  readonly activeDetailTab = signal<string>('overview');

  /** Whether the module sidebar is collapsed. */
  readonly sidebarCollapsed = signal<boolean>(false);

  /** Open the detail panel for a specific policy, optionally jumping to a tab. */
  openDetail(policyId: string, tab?: string): void {
    this.selectedPolicyId.set(policyId);
    this.detailPanelOpen.set(true);
    if (tab) {
      this.activeDetailTab.set(tab);
    }
  }

  /** Close the detail panel and clear selection. */
  closeDetail(): void {
    this.detailPanelOpen.set(false);
    this.selectedPolicyId.set(null);
    this.activeDetailTab.set('overview');
  }

  /** Toggle the module sidebar collapsed state. */
  toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
  }
}
