import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface UserOption { userId: string; displayName: string; email: string; role?: string; }
export interface DeptOption { deptId: string; name: string; parentId?: string; }
export interface RoleOption { roleCode: string; label: string; scope: string; }

interface SelectOption { label: string; value: string; buId?: string; }

@Injectable({ providedIn: 'root' })
export class FoundationDataService {
  private http = inject(HttpClient);

  private _users = signal<UserOption[]>([]);
  private _departments = signal<DeptOption[]>([]);
  private _roles = signal<RoleOption[]>([]);

  readonly deptOptions = computed<SelectOption[]>(() =>
    this._departments().map(d => ({ label: d.name, value: d.deptId }))
  );
  readonly roleOptions = computed<SelectOption[]>(() =>
    this._roles().map(r => ({ label: r.label, value: r.roleCode }))
  );
  readonly locOptions = computed<SelectOption[]>(() => []);
  readonly policyCatOptions = computed<SelectOption[]>(() => []);

  load(): void {
    forkJoin({
      users: this.getUsers().pipe(catchError(() => of([]))),
      departments: this.getDepartments().pipe(catchError(() => of([]))),
      roles: this.getRoles().pipe(catchError(() => of([]))),
    }).subscribe(({ users, departments, roles }) => {
      this._users.set(users);
      this._departments.set(departments);
      this._roles.set(roles);
    });
  }

  resolveUser(userId: string): UserOption | undefined {
    return this._users().find(u => u.userId === userId);
  }

  getUsers(): Observable<UserOption[]> { return this.http.get<UserOption[]>('/api/foundation/users'); }
  getDepartments(): Observable<DeptOption[]> { return this.http.get<DeptOption[]>('/api/foundation/departments'); }
  getRoles(): Observable<RoleOption[]> { return this.http.get<RoleOption[]>('/api/foundation/roles'); }
}
