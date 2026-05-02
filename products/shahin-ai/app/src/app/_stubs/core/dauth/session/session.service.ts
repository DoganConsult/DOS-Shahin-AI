// Landing-only build stub for SessionService.
// Real implementation in platform/core/dauth/session/ pulls in StorageService,
// AccessStore, GrcAuthService and other broken transitive deps.
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SessionService {
  isLoggedIn(): boolean { return false; }
  logout(): void { /* noop */ }
}
