import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, EMPTY } from 'rxjs';

/**
 * Selective preloading strategy that only preloads routes marked with
 * `data: { preload: true }` in their route configuration.
 * All other lazy routes are loaded on demand.
 */
@Injectable({ providedIn: 'root' })
export class SelectivePreloadStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    if (route.data?.['preload']) {
      return load();
    }
    return EMPTY;
  }
}
