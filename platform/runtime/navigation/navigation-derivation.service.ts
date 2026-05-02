import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NavigationDerivationService {
  buildSidebar(): void {
    console.log('[NavigationDerivationService] Building sidebar...');
  }
}
