import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class PackInstallerApiService {
  private http = inject(HttpClient);

  installPack(body: {
    packCode: string;
    appliesToRole?: string | null;
    workspaceId?: string | null;
  }) {
    return this.http.post('/api/packs/install', body);
  }
}
