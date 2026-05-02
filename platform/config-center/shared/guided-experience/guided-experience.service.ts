import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '@env/environment';

export interface SetupStep {
  id: string; order: number; label: string; labelAr: string;
  description: string; descriptionAr: string;
  route: string; icon: string; category: string; completed: boolean;
}
export interface SetupProgress {
  steps: SetupStep[]; completedCount: number; totalCount: number; percentage: number;
  categories: Record<string, { total: number; completed: number }>;
}
export interface NextAction {
  label: string; labelAr: string; route: string; reason: string; reasonAr: string; priority: number;
}
export interface PageHelp {
  pageId: string; route: string; title: string; titleAr: string;
  purpose: string; purposeAr: string;
  howToUse: string[]; howToUseAr: string[];
  commonActions: { label: string; labelAr: string; description: string; descriptionAr: string; route?: string }[];
  relatedPages: { route: string; label: string; labelAr: string }[];
  faq: { question: string; questionAr: string; answer: string; answerAr: string }[];
}
export interface TeamSetupWizard {
  steps: { id: string; order: number; label: string; labelAr: string; description: string; descriptionAr: string; route: string; action: string; completed: boolean }[];
  completed: number; total: number; percentage: number;
}
export interface FaqItem {
  id: string; category: string; question: string; questionAr: string;
  answer: string; answerAr: string; route: string;
}

@Injectable({ providedIn: 'root' })
export class GuidedExperienceService {
  private api = environment.apiUrl + '/agrc-os/guided';
  private http = inject(HttpClient);

  getSetupProgress(): Observable<SetupProgress> {
    return this.http.get<SetupProgress>(`${this.api}/setup-progress`).pipe(
      catchError(() => of({ steps: [], completedCount: 0, totalCount: 0, percentage: 0, categories: {} }))
    );
  }

  getNextActions(): Observable<NextAction[]> {
    return this.http.get<{ actions: NextAction[] }>(`${this.api}/next-actions`).pipe(
      map(r => r.actions || []),
      catchError(() => of([]))
    );
  }

  getPageHelp(route: string): Observable<PageHelp | null> {
    const encoded = route.replace(/^\//, '');
    return this.http.get<PageHelp>(`${this.api}/page-help/${encoded}`).pipe(
      catchError(() => of(null))
    );
  }

  getAllPageHelp(): Observable<PageHelp[]> {
    return this.http.get<{ pages: PageHelp[] }>(`${this.api}/page-help`).pipe(
      map(r => r.pages || []),
      catchError(() => of([]))
    );
  }

  getTeamSetup(): Observable<TeamSetupWizard> {
    return this.http.get<TeamSetupWizard>(`${this.api}/team-setup`).pipe(
      catchError(() => of({ steps: [], completed: 0, total: 0, percentage: 0 }))
    );
  }

  getFaq(category?: string): Observable<FaqItem[]> {
    const url = category ? `${this.api}/faq?category=${category}` : `${this.api}/faq`;
    return this.http.get<{ questions: FaqItem[] }>(url).pipe(
      map(r => r.questions || []),
      catchError(() => of([]))
    );
  }
}
