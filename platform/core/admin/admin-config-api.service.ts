import { Injectable } from '@angular/core';

export interface AdminTenantDto { id: string; name: string; }
export interface AdminHealthDto { status: string; }
export interface ProfileDto { userId: string; email: string; }

@Injectable({ providedIn: 'root' })
export class AdminConfigApiService {
  constructor() {}
}
