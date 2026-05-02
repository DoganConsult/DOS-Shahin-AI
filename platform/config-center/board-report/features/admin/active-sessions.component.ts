// ============================================
// AGRC-OS — Active Sessions Management
// Admin page showing recent login sessions
// derived from audit_trail, with revoke capability.
// ============================================

import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

/** Shape returned by GET /api/admin/sessions */
interface Session {
  session_id: string;
  user_id: string;
  email: string;
  full_name: string;
  ip_address: string;
  created_at: string;
  last_active_at: string;
  status: 'active' | 'expired';
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-active-sessions',
    imports: [CommonModule],
    template: `
    <div class="p-6 max-w-[1400px] mx-auto space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-gray-900">Active Sessions</h1>
          <p class="text-sm text-gray-500 mt-1">
            Recent login activity across all users in this workspace
          </p>
        </div>
        <button
          class="rounded-lg px-4 py-2 bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50"
          (click)="loadSessions()"
          [disabled]="loading()"
          aria-label="Refresh sessions list">
          {{ loading() ? 'Loading...' : 'Refresh' }}
        </button>
      </div>

      <!-- Loading state -->
      <div *ngIf="loading()" class="text-center py-8 text-gray-500">Loading sessions...</div>

      <!-- Sessions table -->
      <div *ngIf="!loading() && sessions().length" class="overflow-x-auto rounded-xl border border-gray-200">
        <table class="w-full border-collapse text-sm" aria-label="Active sessions table">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-200">
              <th class="text-left p-3 font-medium text-gray-600">User</th>
              <th class="text-left p-3 font-medium text-gray-600">IP Address</th>
              <th class="text-left p-3 font-medium text-gray-600">Last Active</th>
              <th class="text-left p-3 font-medium text-gray-600">Status</th>
              <th class="text-left p-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let s of sessions(); trackBy: trackBySessionId"
                class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <td class="p-3">
                <div class="font-medium text-gray-900">{{ s.full_name || s.email }}</div>
                <div class="text-xs text-gray-500">{{ s.email }}</div>
              </td>
              <td class="p-3 text-gray-600 font-mono text-xs">{{ s.ip_address || '\u2014' }}</td>
              <td class="p-3 text-gray-600">{{ s.last_active_at | date:'short' }}</td>
              <td class="p-3">
                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      [class]="s.status === 'active'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-100 text-gray-500'">
                  {{ s.status }}
                </span>
              </td>
              <td class="p-3">
                <button *ngIf="s.status === 'active'"
                        (click)="revoke(s.session_id)"
                        class="text-red-600 hover:text-red-800 hover:underline text-xs font-medium transition"
                        aria-label="Revoke session">
                  Revoke
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty state -->
      <div *ngIf="!loading() && !sessions().length"
           class="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
        No active sessions found.
      </div>
    </div>
  `
})
export class ActiveSessionsComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly sessions = signal<Session[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.loadSessions();
  }

  /** Fetch sessions from the admin API */
  loadSessions(): void {
    this.loading.set(true);
    this.http.get<{ sessions: Session[] }>(`${environment.apiUrl}/admin/sessions`).subscribe({
      next: (res) => {
        this.sessions.set(res.sessions);
        this.loading.set(false);
      },
      error: () => {
        this.sessions.set([]);
        this.loading.set(false);
      },
    });
  }

  /** Revoke a session and reload the list */
  revoke(sessionId: string): void {
    this.http.delete(`${environment.apiUrl}/admin/sessions/${sessionId}`).subscribe({
      next: () => this.loadSessions(),
    });
  }

  /** TrackBy function for ngFor performance */
  trackBySessionId(_index: number, session: Session): string {
    return session.session_id;
  }
}
