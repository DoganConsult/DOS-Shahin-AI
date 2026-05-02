import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface QuantumKpis {
  totalCryptoAssets: number;
  quantumVulnerableAssets: number;
  pqcMigratedAssets: number;
  migrationProgress: number;
  criticalVulnerabilities: number;
  pqcTestsPassed: number;
  pqcTestsFailed: number;
  readinessScore: number;
  lastUpdatedAt: string;
}

export interface CryptoAsset {
  id: string;
  name: string;
  assetType: string;
  algorithm: string;
  quantumVulnerable: boolean;
  pqcStatus: string;
  riskLevel: string;
  createdAt: string;
}

export interface InventoryResponse {
  assets: CryptoAsset[];
  page: number;
  limit: number;
}

@Injectable({
  providedIn: 'root'
})
export class SecurityApiService {
  private http = inject(HttpClient);

  getKpis(): Observable<QuantumKpis> {
    return this.http.get<QuantumKpis>('/api/security/quantum/kpis');
  }

  getInventory(page = 1, limit = 5): Observable<InventoryResponse> {
    return this.http.get<InventoryResponse>(`/api/security/quantum/inventory?page=${page}&limit=${limit}`);
  }
}
