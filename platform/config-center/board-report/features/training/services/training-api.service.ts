import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class TrainingApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getContent(category?: string): Observable<any[]> {
    const params = category ? `?category=${category}` : '';
    return this.http.get<unknown[]>(`${this.base}/training-advanced/content${params}`);
  }

  createContent(data: any): Observable<any> {
    return this.http.post<unknown>(`${this.base}/training-advanced/content`, data);
  }

  updateContent(contentId: string, data: any): Observable<any> {
    return this.http.put<unknown>(`${this.base}/training-advanced/content/${contentId}`, data);
  }

  getCampaigns(status?: string): Observable<any[]> {
    const params = status ? `?status=${status}` : '';
    return this.http.get<unknown[]>(`${this.base}/training-advanced/campaigns${params}`);
  }

  createCampaign(data: any): Observable<any> {
    return this.http.post<unknown>(`${this.base}/training-advanced/campaigns`, data);
  }

  launchCampaign(campaignId: string): Observable<any> {
    return this.http.post<unknown>(`${this.base}/training-advanced/campaigns/${campaignId}/launch`, {});
  }

  getAssignments(userId?: string, status?: string): Observable<any[]> {
    const params = new URLSearchParams();
    if (userId) params.set('user_id', userId);
    if (status) params.set('status', status);
    const q = params.toString();
    return this.http.get<unknown[]>(`${this.base}/training-advanced/assignments${q ? '?' + q : ''}`);
  }

  assignTraining(data: any): Observable<any> {
    return this.http.post<unknown>(`${this.base}/training-advanced/assignments`, data);
  }

  completeAssignment(assignmentId: string, score: number): Observable<any> {
    return this.http.post<unknown>(`${this.base}/training-advanced/assignments/${assignmentId}/complete`, { score });
  }

  getCertifications(userId?: string): Observable<any[]> {
    const params = userId ? `?user_id=${userId}` : '';
    return this.http.get<unknown[]>(`${this.base}/training-advanced/certifications${params}`);
  }

  revokeCertificate(certificateId: string, reason: string): Observable<any> {
    return this.http.post<unknown>(`${this.base}/training-advanced/certifications/${certificateId}/revoke`, { reason });
  }

  createPhishingCampaign(data: any): Observable<any> {
    return this.http.post<unknown>(`${this.base}/training-advanced/phishing`, data);
  }

  getPhishingCampaigns(): Observable<any[]> {
    return this.http.get<unknown[]>(`${this.base}/training-advanced/phishing`);
  }

  launchPhishingCampaign(phishingId: string): Observable<any> {
    return this.http.post<unknown>(`${this.base}/training-advanced/phishing/${phishingId}/launch`, {});
  }

  recordPhishingResult(phishingId: string, data: any): Observable<any> {
    return this.http.post<unknown>(`${this.base}/training-advanced/phishing/${phishingId}/result`, data);
  }

  getComplianceSnapshot(): Observable<any> {
    return this.http.get<unknown>(`${this.base}/training-advanced/compliance-snapshot`);
  }

  getOverdueAssignments(): Observable<any> {
    return this.http.get<unknown>(`${this.base}/training-advanced/overdue`);
  }

  getExpiringCertifications(): Observable<any[]> {
    return this.http.get<unknown[]>(`${this.base}/training-advanced/expiring-certs`);
  }

  // ── KSA Regulatory Training ───────────────────────────────────────────────

  getSectorTrainingPath(sectorCode: string): Observable<any[]> {
    return this.http.get<unknown[]>(`${this.base}/training-advanced/sector-path/${sectorCode}`);
  }

  assignSectorTraining(sectorCode: string, userId: string, userRole?: string): Observable<any> {
    return this.http.post<unknown>(`${this.base}/training-advanced/sector-path/${sectorCode}/assign`, { userId, userRole });
  }

  getTrainingByFramework(): Observable<any[]> {
    return this.http.get<unknown[]>(`${this.base}/training-advanced/by-framework`);
  }

  getRegulatorTrainingStatus(): Observable<any[]> {
    return this.http.get<unknown[]>(`${this.base}/training-advanced/by-regulator`);
  }
}
