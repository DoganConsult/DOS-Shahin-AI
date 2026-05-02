import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AcceleratorAction { actionId: string; label: string; moduleCode: string; type: string; }
export interface AcceleratorProgress { totalSteps: number; completedSteps: number; currentStep: string; }
export interface ActionResult { success: boolean; message?: string; data?: unknown; }

@Injectable({ providedIn: 'root' })
export class QuickGrcAcceleratorService {
  private http = inject(HttpClient);

  getActions(): Observable<AcceleratorAction[]> {
    return this.http.get<AcceleratorAction[]>('/api/grc/accelerator/actions');
  }

  execute(actionId: string): Observable<ActionResult> {
    return this.http.post<ActionResult>(`/api/grc/accelerator/actions/${actionId}/execute`, {});
  }

  getProgress(): Observable<AcceleratorProgress> {
    return this.http.get<AcceleratorProgress>('/api/grc/accelerator/progress');
  }
}
