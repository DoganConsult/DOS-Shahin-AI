import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import type { WorkspacePreviewSection, GrcRecord } from '../../models/onboarding.models';
import { RegulatoryChainVisualComponent } from './regulatory-chain-visual.component';
import { CountUpDirective } from '../shared/count-up.directive';

/**
 * Workspace Preview Grid
 *
 * Renders the "What Shahin Has Prepared For You" preview grid during onboarding.
 * Each card represents a workspace section (frameworks, controls, agents, etc.)
 * inferred from the tenant's regulatory landscape and business profile.
 *
 * Supports EN/AR with RTL layout and uses design tokens throughout.
 */
@Component({
    selector: 'app-workspace-preview-grid',
    imports: [CommonModule, TagModule, RegulatoryChainVisualComponent, CountUpDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './workspace-preview-grid.component.html',
    styleUrls: ['./workspace-preview-grid.component.scss']
})
export class WorkspacePreviewGridComponent {
  /** Array of workspace preview sections to render */
  @Input() sections: WorkspacePreviewSection[] = [];

  /** Display language: 'en' for English, 'ar' for Arabic (RTL) */
  @Input() lang: 'en' | 'ar' = 'en';

  /** Icon class map keyed by section code */
  private static readonly SECTION_ICONS: Record<string, string> = {
    regulatory_chain: 'pi-sitemap',
    framework_rationale: 'pi-shield',
    control_preview: 'pi-list',
    ownership_preview: 'pi-users',
    dashboard_persona: 'pi-chart-bar',
    automation_preview: 'pi-bolt',
    ninety_day_preview: 'pi-calendar',
    ai_agents_preview: 'pi-android',
  };

  /** Cache for memoized totalCount */
  private _totalCountCache: { frameworks: number; controls: number; evidence: number; agents: number } | null = null;
  private _totalCountSectionsRef: WorkspacePreviewSection[] | null = null;

  getSectionIcon(section: string): string {
    return WorkspacePreviewGridComponent.SECTION_ICONS[section] ?? 'pi-box';
  }

  /** Returns the regulatory_chain section for dedicated rendering, or null */
  getChainSection(): WorkspacePreviewSection | null {
    return this.sections.find(s => s.section === 'regulatory_chain') ?? null;
  }

  /** Returns sections excluding regulatory_chain (rendered separately) */
  get gridSections(): WorkspacePreviewSection[] {
    return this.sections.filter(s => s.section !== 'regulatory_chain');
  }

  /** Helper to extract metric value for cockpit cards */
  getMetric(sectionCode: string): number {
    const totals = this.totalCount;
    if (!totals) return 0;
    switch (sectionCode) {
      case 'compliance': return totals.frameworks;
      case 'risk': return totals.controls;
      case 'evidence': return totals.evidence;
      case 'agents': return totals.agents;
      default: return 0;
    }
  }

  /**
   * Memoized aggregate totals from all preview sections.
   * Scans section data arrays/objects to extract framework, control,
   * evidence, and agent counts for the footer summary.
   */
  get totalCount(): {
    frameworks: number;
    controls: number;
    evidence: number;
    agents: number;
  } | null {
    // Memoize: only recompute if sections reference changed
    if (this._totalCountSectionsRef === this.sections && this._totalCountCache) {
      return this._totalCountCache;
    }
    this._totalCountSectionsRef = this.sections;

    let frameworks = 0;
    let controls = 0;
    let evidence = 0;
    let agents = 0;

    for (const sec of this.sections) {
      if (!sec.data) continue;

      switch (sec.section) {
        case 'framework_rationale':
          frameworks = Array.isArray(sec.data) ? sec.data.length : 0;
          break;
        case 'control_preview':
          if (Array.isArray(sec.data)) {
            controls = sec.data.reduce(
              (sum: number, item: GrcRecord) => sum + ((item.control_count as number) || (item.count as number) || 0),
              0
            );
          }
          break;
        case 'ownership_preview':
          if (this.isObject(sec.data) && (sec.data as GrcRecord).evidence_tasks != null) {
            evidence = (sec.data as GrcRecord).evidence_tasks as number;
          }
          break;
        case 'ai_agents_preview':
          agents = Array.isArray(sec.data) ? sec.data.length : 0;
          break;
      }
    }

    this._totalCountCache = { frameworks, controls, evidence, agents };
    return this._totalCountCache;
  }

  /** Type guard: returns true if val is a non-null, non-array object */
  isObject(val: unknown): boolean {
    return val !== null && typeof val === 'object' && !Array.isArray(val);
  }

  /** Returns the keys of an object for template iteration */
  objectKeys(obj: GrcRecord): string[] {
    return Object.keys(obj);
  }

  /** Formats a value for display in key-value rows */
  formatValue(val: unknown): string {
    if (typeof val === 'number') return val.toString();
    if (typeof val === 'boolean') return val ? (this.lang === 'ar' ? 'نعم' : 'Yes') : (this.lang === 'ar' ? 'لا' : 'No');
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) return val.join(', ');
    return JSON.stringify(val);
  }
}
