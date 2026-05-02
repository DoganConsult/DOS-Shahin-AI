import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, Subject } from 'rxjs';
import { catchError, debounceTime, map, switchMap } from 'rxjs/operators';
import { environment } from '@env/environment';
import { LayoutPreferences, GridWidget } from './layout-grid.types';
import { deserializeLayoutPreferences, serializeLayoutPreferences } from './layout-preferences.utils';
import { DashboardRole, ROLE_WIDGETS } from './role-widget-map';
import { WidgetRegistryService } from '../../widget-core/widget-infra/widget-registry.service';

const DEBOUNCE_MS = 2000;
const DEFAULT_COLUMNS = 4;

@Injectable({ providedIn: 'root' })
export class LayoutPreferencesService {
  private api = environment.apiUrl;
  private saveSubject = new Subject<{ userId: string; prefs: LayoutPreferences }>();
  private saveStream$: Observable<void>;

  constructor(
    private http: HttpClient,
    private widgetRegistry: WidgetRegistryService,
  ) {
    this.saveStream$ = this.saveSubject.pipe(
      debounceTime(DEBOUNCE_MS),
      switchMap(({ userId, prefs }) =>
        this.http.put<void>(`${this.api}/dashboard/layout`, {
          userId,
          layout: serializeLayoutPreferences(prefs),
        }),
      ),
    );
    // Keep the debounced save stream alive
    this.saveStream$.subscribe();
  }

  /**
   * Fetches layout preferences from GET /api/dashboard/layout.
   * Returns null when no preferences exist or on error (triggers default fallback).
   */
  load(userId: string): Observable<LayoutPreferences | null> {
    return this.http
      .get<{ layout: string }>(`${this.api}/dashboard/layout`, {
        params: { userId },
      })
      .pipe(
        map((res) => deserializeLayoutPreferences(res.layout)),
        catchError(() => of(null)),
      );
  }

  /**
   * Debounced save — pushes to the internal subject which debounces at 2s
   * then PUTs to /api/dashboard/layout.
   */
  save(userId: string, prefs: LayoutPreferences): void {
    this.saveSubject.next({ userId, prefs });
  }

  /**
   * Returns role-based default layout using the widget registry and role-widget-map.
   */
  getDefaults(role: DashboardRole): LayoutPreferences {
    const allowed = ROLE_WIDGETS[role] ?? [];
    const allDefs = this.widgetRegistry.list();

    // Resolve widget IDs for this role
    const widgetIds =
      allowed.some((e) => e.widgetId === '*')
        ? allDefs.map((d) => d.id)
        : allowed.map((e) => e.widgetId).filter((id) => allDefs.some((d) => d.id === id));

    // Build grid widgets with default positions laid out left-to-right, top-to-bottom
    let x = 0;
    let y = 0;
    const widgets: GridWidget[] = widgetIds.map((id) => {
      const def = allDefs.find((d) => d.id === id);
      const w = def?.defaultSize?.cols ? Math.ceil(def.defaultSize.cols / 3) : 1;
      const h = def?.defaultSize?.rows ?? 1;

      // Wrap to next row if widget doesn't fit
      if (x + w > DEFAULT_COLUMNS) {
        x = 0;
        y++;
      }

      const widget: GridWidget = {
        id,
        position: { x, y, w, h },
        visible: true,
      };

      x += w;
      if (x >= DEFAULT_COLUMNS) {
        x = 0;
        y++;
      }

      return widget;
    });

    return {
      widgets,
      displayMode: 'expanded',
      version: 2,
    };
  }
}
