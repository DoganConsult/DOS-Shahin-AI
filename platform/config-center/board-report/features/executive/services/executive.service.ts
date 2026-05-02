import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BriefingType {
  briefId: string;
  title: string;
  generationMethod: string;
  status: string;
  createdAt: string;
}

export interface ObjectiveType {
  objectiveId: string;
  title: string;
  category: string;
  progressPct: number;
}

export interface AppetiteType {
  appetiteId: string;
  riskDomain: string;
  currentExposure: number;
  limitThreshold: number;
  isBreached: boolean;
}

@Injectable({ providedIn: 'root' })
export class ExecutiveService {
  constructor(private http: HttpClient) {}

  getBriefings(): Observable<{data: BriefingType[]}> {
    return this.http.get<{data: BriefingType[]}>('/api/executive/briefs');
  }

  getObjectives(): Observable<{data: ObjectiveType[]}> {
    return this.http.get<{data: ObjectiveType[]}>('/api/executive/objectives');
  }

  getRiskAppetite(): Observable<{data: AppetiteType[]}> {
    return this.http.get<{data: AppetiteType[]}>('/api/executive/risk-appetite');
  }
}
