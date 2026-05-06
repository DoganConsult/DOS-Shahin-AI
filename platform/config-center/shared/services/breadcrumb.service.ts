/**
 * Breadcrumb Service
 * 
 * Tracks navigation history and builds breadcrumbs from routes.
 * Requirements: 1.2, 1.3
 */
import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface Breadcrumb {
  label: string;
  labelAr: string;
  url: string;
  icon?: string;
}

const ROUTE_LABELS: Record<string, { en: string; ar: string; icon: string }> = {
  'workspace-home': { en: 'Dashboard', ar: 'لوحة التحكم', icon: 'pi pi-home' },
  'risks': { en: 'Risks', ar: 'المخاطر', icon: 'pi pi-exclamation-triangle' },
  'controls': { en: 'Controls', ar: 'الضوابط', icon: 'pi pi-shield' },
  'policies': { en: 'Policies', ar: 'السياسات', icon: 'pi pi-file' },
  'frameworks': { en: 'Frameworks', ar: 'الأطر', icon: 'pi pi-sitemap' },
  'incidents': { en: 'Incidents', ar: 'الحوادث', icon: 'pi pi-bolt' },
  'vendors': { en: 'Vendors', ar: 'الموردين', icon: 'pi pi-building' },
  'evidence': { en: 'Evidence', ar: 'الأدلة', icon: 'pi pi-folder' },
  'compliance': { en: 'Compliance', ar: 'الامتثال', icon: 'pi pi-check-circle' },
  'audit': { en: 'Audit', ar: 'التدقيق', icon: 'pi pi-search' },
  'governance': { en: 'Governance', ar: 'الحوكمة', icon: 'pi pi-briefcase' },
  'workflows': { en: 'Workflows', ar: 'سير العمل', icon: 'pi pi-share-alt' },
};

@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
  private history: Breadcrumb[][] = [];
  private maxHistory = 20;

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => {
      const crumbs = this.buildFromUrl(this.router.url);
      this.history.push(crumbs);
      if (this.history.length > this.maxHistory) this.history.shift();
    });
  }

  buildFromUrl(url: string): Breadcrumb[] {
    const segments = url.split('?')[0].split('/').filter(Boolean);
    // No static "Home" crumb — the workspace breadcrumb (label + href)
    // is published by UI-OS via shell.chrome.breadcrumbs.workspace
    // (dos.workspace_shell_i18n + dos.tenant_landing_config). The
    // shell-host renders that crumb separately; this service only
    // builds the URL-segment-derived trail (NO FRONTEND INVENTION).
    const crumbs: Breadcrumb[] = [];
    let path = '';
    for (const seg of segments) {
      path += `/${seg}`;
      const info = ROUTE_LABELS[seg];
      const label = info?.en || seg;
      // Deduplicate: skip if same label as previous crumb
      const prev = crumbs[crumbs.length - 1];
      if (prev && prev.label.toLowerCase() === label.toLowerCase()) continue;
      crumbs.push({
        label,
        labelAr: info?.ar || seg,
        url: path,
        icon: info?.icon,
      });
    }
    return crumbs;
  }

  getCurrent(): Breadcrumb[] {
    return this.history.length > 0 ? this.history[this.history.length - 1] : [];
  }

  getHistory(): Breadcrumb[][] {
    return [...this.history];
  }

  /** Collapse breadcrumbs if longer than maxVisible */
  collapse(crumbs: Breadcrumb[], maxVisible = 4): Breadcrumb[] {
    if (crumbs.length <= maxVisible) return crumbs;
    return [crumbs[0], { label: '...', labelAr: '...', url: '' }, ...crumbs.slice(-2)];
  }
}
