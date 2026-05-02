import { Injectable } from '@angular/core';

export interface AdminUserDto { id: string; }
export interface InvitationDto { email: string; }
export interface MemberDirectoryDto { users: string[]; }

@Injectable({ providedIn: 'root' })
export class AdminUserApiService {
  constructor() {}
}
