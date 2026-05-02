import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface GrcModuleInfo { moduleCode: string; label: string; enabled: boolean; }

@Injectable({ providedIn: 'root' })
export class GrcService {
  private http = inject(HttpClient);

  getModules(): Observable<GrcModuleInfo[]> {
    return this.http.get<GrcModuleInfo[]>('/api/grc/modules');
  }
}
