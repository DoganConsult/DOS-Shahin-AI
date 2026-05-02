import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface Team {
  team_id: string;
  name_en: string;
  name_ar?: string;
  code?: string;
  department_id?: string;
  lead_user_id?: string;
  description?: string;
  status: string;
  member_count?: number;
  created_at: string;
}

export interface TeamMember {
  member_id: string;
  team_id: string;
  user_id: string;
  role_in_team?: string;
  joined_at: string;
  full_name?: string;
  email?: string;
}

export interface TeamCharter {
  charter_id: string;
  team_id: string;
  title: string;
  content?: string;
  status: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class TeamService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/teams`;

  getTeams(): Observable<{ data: Team[]; meta: { total: number } }> {
    return this.http.get<{ data: Team[]; meta: { total: number } }>(this.apiUrl);
  }

  getTeamById(id: string): Observable<{ data: Team }> {
    return this.http.get<{ data: Team }>(`${this.apiUrl}/${id}`);
  }

  createTeam(team: Partial<Team>): Observable<{ data: Team }> {
    return this.http.post<{ data: Team }>(this.apiUrl, team);
  }

  updateTeam(id: string, team: Partial<Team>): Observable<{ data: Team }> {
    return this.http.patch<{ data: Team }>(`${this.apiUrl}/${id}`, team);
  }

  deleteTeam(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getMembers(teamId: string): Observable<{ data: TeamMember[] }> {
    return this.http.get<{ data: TeamMember[] }>(`${this.apiUrl}/${teamId}/members`);
  }

  addMember(teamId: string, userId: string, roleInTeam: string): Observable<{ data: TeamMember }> {
    return this.http.post<{ data: TeamMember }>(`${this.apiUrl}/${teamId}/members`, { userId, roleInTeam });
  }

  removeMember(teamId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${teamId}/members/${userId}`);
  }

  getCharters(teamId: string): Observable<{ data: TeamCharter[] }> {
    return this.http.get<{ data: TeamCharter[] }>(`${this.apiUrl}/${teamId}/charters`);
  }
}
