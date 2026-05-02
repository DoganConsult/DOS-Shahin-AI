import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { isCapabilityActive } from '@app/core/platform/navigation/active-modules';

export interface JourneyPhase {
  phaseId: string;
  title: string;
  description: string;
  order: number;
  status: 'pending' | 'active' | 'completed' | 'skipped';
}

export interface ConversationEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface JourneyState {
  currentPhase: string;
  phases: JourneyPhase[];
  conversations: ConversationEntry[];
  startedAt: string;
  completedAt?: string;
}

export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'skipped' | 'pending';

export interface MaturityScore { domain: string; score: number; maxScore: number; level: string; overall?: number; computedAt?: string; components?: MaturityComponent[]; trend?: TrendPoint[]; }
export interface MaturityComponent { componentId: string; name: string; score: MaturityScore; }
export interface TrendPoint { date: string; score: number; }
export interface ExecutiveSummary { overallScore: number; maturityLevel: string; domains: MaturityScore[]; trends: TrendPoint[]; recommendations: string[]; }
export interface RoadmapMilestone { milestoneId: string; title: string; tasks: RoadmapTask[]; status: TaskStatus; }
export interface RoadmapTask { taskId: string; title: string; status: TaskStatus; priority: string; dueDate?: string; assignee?: string; moduleCode?: string; targetModule?: string; }
export interface RoadmapPhase { phaseId: string; title: string; order: number; tasks: RoadmapTask[]; milestones: RoadmapMilestone[]; status: TaskStatus; type?: string; nameEn?: string; nameAr?: string; }
export interface GRCRoadmap { roadmapId: string; title: string; phases: RoadmapPhase[]; createdAt: string; updatedAt?: string; }
export interface NextActionResponse { actionId: string; title: string; description: string; priority: string; moduleCode: string; route?: string; task?: any; message?: string; [key: string]: any; }
export interface FrameworkRecommendation { frameworkCode: string; frameworkName: string; relevance: number; reason: string; }
export interface RoleRecommendation { roleCode: string; roleName: string; description: string; suggestedFor: string; }
export interface SetupAnswerResponse { questionId: string; answer: unknown; nextQuestionId?: string; recommendations?: FrameworkRecommendation[]; profile?: Record<string, any>; }

export interface Nudge {
  id: string;
  nudgeId?: string;
  type: string;
  titleEn: string;
  titleAr?: string;
  messageEn: string;
  messageAr?: string;
  severity: 'info' | 'warning' | 'critical';
  route?: string;
  targetModule?: string;
  dismissible?: boolean;
  createdAt: string;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class JourneyService {
  private http = inject(HttpClient);

  loadJourney(tenantId: string) {
    return this.http.get<JourneyState>(`/api/tenants/${tenantId}/journey`);
  }

  getActiveNudges() {
    if (!isCapabilityActive('nudges')) {
      return of({ nudges: [] as Nudge[] });
    }
    return this.http.get<{ nudges: Nudge[] }>('/api/nudges/active');
  }

  dismissNudge(nudgeId: string | undefined) {
    return this.http.patch<void>(`/api/nudges/${nudgeId}/dismiss`, {});
  }

  getRoadmap(): Observable<GRCRoadmap> {
    return this.http.get<GRCRoadmap>('/api/journey/roadmap');
  }

  getMaturityScore(): Observable<MaturityScore> {
    return this.http.get<MaturityScore>('/api/journey/maturity');
  }

  getExecutiveSummary(): Observable<ExecutiveSummary> {
    return this.http.get<ExecutiveSummary>('/api/journey/executive-summary');
  }

  getNextAction(): Observable<NextActionResponse> {
    return this.http.get<NextActionResponse>('/api/journey/next-action');
  }

  submitSetupAnswer(questionId: string, answer: any): Observable<SetupAnswerResponse> {
    return this.http.post<SetupAnswerResponse>('/api/journey/setup-answer', { questionId, answer });
  }

  updateTaskStatus(taskId: string, status: TaskStatus): Observable<any> {
    return this.http.patch<any>(`/api/journey/tasks/${taskId}/status`, { status });
  }

  getBilingualPair(obj: Record<string, any>, field: string): { en: string; ar: string } {
    return { en: obj[`${field}En`] || '', ar: obj[`${field}Ar`] || '' };
  }

  resolveBilingual(obj: Record<string, any>, field: string): string {
    return (obj[`${field}En`] || obj[`${field}Ar`] || obj[field] || '') as string;
  }
}
