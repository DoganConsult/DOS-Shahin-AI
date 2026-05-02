import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Vendor } from '@dos/types/vendor';

@Injectable({
  providedIn: 'root'
})
export class VendorService {
  private http = inject(HttpClient);
  private readonly MOUNT_PATH = '/api/vendors';

  getVendors(params?: any): Observable<{ vendors: any[], count: number }> {
    return this.http.get<{ vendors: any[], count: number }>(this.MOUNT_PATH, { params });
  }

  getVendorById(id: string): Observable<any> {
    return this.http.get<any>(`${this.MOUNT_PATH}/${id}`);
  }

  createVendor(payload: any): Observable<any> {
    return this.http.post<any>(this.MOUNT_PATH, payload);
  }

  updateVendor(id: string, payload: any): Observable<any> {
    return this.http.put<any>(`${this.MOUNT_PATH}/${id}`, payload);
  }

  triggerSLACheck(id: string): Observable<any> {
    return this.http.get<any>(`${this.MOUNT_PATH}/${id}/sla`);
  }
}
