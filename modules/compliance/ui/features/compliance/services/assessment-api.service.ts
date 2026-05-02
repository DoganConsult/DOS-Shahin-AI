/**
 * Assessment API Service — AGRC-OS
 * Domain service for onboarding, maturity assessments, assessment templates,
 * scoring policies, and NCA ECC self-assessment.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { OnboardingQuestion } from '../../../../../core/models/grc.models';

// ── DTOs ──

export interface AssessmentDto {
  id: string;
  title: string;
  status: string;
  templateId?: string;
  score?: number;
  completionPercent?: number;
  createdAt?: string;
}

export interface AssessmentTemplateDto {
  id: string;
  title: string;
  category: string;
  industry?: string;
  difficulty?: string;
  sector?: string;
  questionCount: number;
  description?: string;
}

export interface AssessmentTemplateDetailDto extends AssessmentTemplateDto {
  questions: AssessmentQuestionDto[];
}

export interface AssessmentQuestionDto {
  id: string;
  text: string;
  category: string;
  type: string;
  options?: Array<{ value: string; label: string }>;
}

export interface AssessmentProgressDto {
  assessmentId: string;
  totalQuestions: number;
  answeredQuestions: number;
  completionPercent: number;
  score?: number;
}

export interface AssessmentAISummaryDto {
  assessmentId: string;
  summary: string;
  recommendations: string[];
  score: number;
}

export interface AIGuideDto {
  guidance: string;
  references?: string[];
  bestPractice?: string;
}

export interface TenantTemplateConfigDto {
  configs: Array<{ templateId: string; enabled: boolean }>;
}

export interface MaturityQuestionDto {
  id: string;
  text: string;
  category: string;
  weight: number;
}

export interface MaturityCategoryDto {
  key: string;
  label: string;
  questionCount: number;
}

export interface MaturityAssessmentDto {
  id: string;
  status: string;
  score?: number;
  createdAt: string;
}

export interface MaturityScoreDto {
  overall: number;
  byCategory: Array<{ category: string; score: number }>;
}

export interface ScoringPolicyDto {
  id: string;
  name: string;
  description?: string;
  rules: Array<Record<string, unknown>>;
}

export interface NCAStructureDto {
  domains: Array<{ id: string; name: string; subdomains: Array<{ id: string; name: string }> }>;
}

export interface NCAAssessmentDto {
  id: string;
  title: string;
  status: string;
  score?: number;
  createdAt: string;
}

export interface NCAAssessmentDetailDto extends NCAAssessmentDto {
  items: Array<{ controlId: string; status: string; score: number; evidence?: string }>;
}

export interface OnboardingAssessmentDto {
  id: string;
  status: string;
  createdAt: string;
}

export interface IntelligenceReportDto {
  assessmentId: string;
  summary: string;
  recommendations: string[];
  maturityLevel: string;
}

export interface AssessmentDraftDto {
  assessmentId: string;
  answers: Record<string, unknown>;
  activeCategoryKey: string;
  currentQuestionIndex: number;
  completionPercent: number;
}

export interface ConsensusStatusDto {
  status: string;
  reviewers: Array<{ userId: string; decision?: string; comments?: string }>;
}

export interface AssessmentTemplateFilterParams {
  category?: string;
  industry?: string;
  difficulty?: string;
  search?: string;
  sector?: string;
}

@Injectable({ providedIn: 'root' })
export class AssessmentApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // ═══ Onboarding ═══
  getQuestions(): Observable<{ questions: OnboardingQuestion[]; totalSteps: number }> {
    return this.http.get<{ questions: OnboardingQuestion[]; totalSteps: number }>(`${this.base}/onboarding/questions`);
  }

  startOnboardingAssessment(): Observable<OnboardingAssessmentDto> {
    return this.http.post<OnboardingAssessmentDto>(`${this.base}/onboarding/start-assessment`, {});
  }

  completePhase1(assessmentId: string, responses: Array<Record<string, unknown>>): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/onboarding/phase1-complete`, { assessmentId, responses });
  }

  saveAssessmentResponses(assessmentId: string, responses: Array<Record<string, unknown>>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/maturity/${assessmentId}/respond`, { responses });
  }

  getIntelligenceReport(assessmentId: string): Observable<IntelligenceReportDto> {
    return this.http.get<IntelligenceReportDto>(`${this.base}/maturity/${assessmentId}/intelligence`);
  }

  buildWorkspaceFromAssessment(data: { assessmentId: string; orgName?: string; industry?: string; orgSize?: string; regions?: string[] }): Observable<{ workspaceId: string; message: string }> {
    return this.http.post<{ workspaceId: string; message: string }>(`${this.base}/onboarding/build-workspace`, data);
  }

  // ═══ Assessment Draft ═══
  saveAssessmentDraft(data: AssessmentDraftDto): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/onboarding/save-draft`, data);
  }

  loadAssessmentDraft(): Observable<AssessmentDraftDto> {
    return this.http.get<AssessmentDraftDto>(`${this.base}/onboarding/load-draft`);
  }

  // ═══ Assessment Consensus ═══
  submitForConsensus(reviewerUserIds: string[]): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/onboarding/submit-for-consensus`, { reviewerUserIds });
  }

  submitConsensusDecision(decision: string, comments?: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/onboarding/consensus-decision`, { decision, comments });
  }

  getConsensusStatus(): Observable<ConsensusStatusDto> {
    return this.http.get<ConsensusStatusDto>(`${this.base}/onboarding/consensus-status`);
  }

  // ═══ Maturity Assessment ═══
  getMaturityQuestions(category?: string): Observable<MaturityQuestionDto[]> {
    return this.http.get<MaturityQuestionDto[]>(`${this.base}/maturity/questions${category ? '?category=' + category : ''}`);
  }

  getMaturityCategories(): Observable<MaturityCategoryDto[]> {
    return this.http.get<MaturityCategoryDto[]>(`${this.base}/maturity/categories`);
  }

  startMaturityAssessment(): Observable<MaturityAssessmentDto> {
    return this.http.post<MaturityAssessmentDto>(`${this.base}/maturity/start`, {});
  }

  getLatestMaturity(): Observable<MaturityAssessmentDto> {
    return this.http.get<MaturityAssessmentDto>(`${this.base}/maturity/latest`);
  }

  saveMaturityResponses(id: string, responses: Array<Record<string, unknown>>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/maturity/${id}/respond`, { responses });
  }

  getMaturityScore(id: string): Observable<MaturityScoreDto> {
    return this.http.get<MaturityScoreDto>(`${this.base}/maturity/${id}/score`);
  }

  autoDeployMaturity(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/maturity/${id}/auto-deploy`, {});
  }

  // ═══ Assessment Templates ═══
  getAssessmentTemplates(filters?: AssessmentTemplateFilterParams): Observable<AssessmentTemplateDto[]> {
    let params = new HttpParams();
    if (filters) {
      if (filters.category) params = params.set('category', filters.category);
      if (filters.industry) params = params.set('industry', filters.industry);
      if (filters.difficulty) params = params.set('difficulty', filters.difficulty);
      if (filters.search) params = params.set('search', filters.search);
      if (filters.sector) params = params.set('sector', filters.sector);
    }
    return this.http.get<AssessmentTemplateDto[]>(`${this.base}/assessment-templates`, { params });
  }

  getAssessmentTemplateById(id: string): Observable<AssessmentTemplateDto> {
    return this.http.get<AssessmentTemplateDto>(`${this.base}/assessment-templates/${id}`);
  }

  getAssessmentTemplateDetail(id: string): Observable<AssessmentTemplateDetailDto> {
    return this.http.get<AssessmentTemplateDetailDto>(`${this.base}/assessment-templates/${id}/detail`);
  }

  getAssessmentTemplateQuestions(id: string): Observable<AssessmentQuestionDto[]> {
    return this.http.get<AssessmentQuestionDto[]>(`${this.base}/assessment-templates/${id}/questions`);
  }

  getAssessmentTemplateCategories(): Observable<MaturityCategoryDto[]> {
    return this.http.get<MaturityCategoryDto[]>(`${this.base}/assessment-templates/categories`);
  }

  getQuestionAIGuide(templateId: string, questionId: string): Observable<AIGuideDto> {
    return this.http.get<AIGuideDto>(`${this.base}/assessment-templates/${templateId}/ai-guide/${questionId}`);
  }

  startAssessmentFromTemplate(templateId: string, title?: string): Observable<AssessmentDto> {
    return this.http.post<AssessmentDto>(`${this.base}/assessment-templates/${templateId}/start`, { title });
  }

  getAssessmentProgress(assessmentId: string): Observable<AssessmentProgressDto> {
    return this.http.get<AssessmentProgressDto>(`${this.base}/assessment-templates/assessment/${assessmentId}/progress`);
  }

  getAssessmentAISummary(assessmentId: string): Observable<AssessmentAISummaryDto> {
    return this.http.get<AssessmentAISummaryDto>(`${this.base}/assessment-templates/assessment/${assessmentId}/ai-summary`);
  }

  saveAssessmentResponse(assessmentId: string, questionId: string, answer: unknown, score: number): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/assessment-templates/assessment/${assessmentId}/respond`, { questionId, answer, score });
  }

  getTenantTemplateConfig(): Observable<TenantTemplateConfigDto> {
    return this.http.get<TenantTemplateConfigDto>(`${this.base}/assessment-templates/tenant-config`);
  }

  updateTenantTemplateConfig(configs: { templateId: string; enabled: boolean }[]): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/assessment-templates/tenant-config`, { configs });
  }

  createAssessmentTemplate(data: Partial<AssessmentTemplateDto>): Observable<AssessmentTemplateDto> {
    return this.http.post<AssessmentTemplateDto>(`${this.base}/assessment-templates`, data);
  }

  updateAssessmentTemplate(id: string, data: Partial<AssessmentTemplateDto>): Observable<AssessmentTemplateDto> {
    return this.http.put<AssessmentTemplateDto>(`${this.base}/assessment-templates/${id}`, data);
  }

  deleteAssessmentTemplate(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/assessment-templates/${id}`);
  }

  // ═══ Scoring Policies ═══
  getScoringPolicies(): Observable<ScoringPolicyDto[]> {
    return this.http.get<ScoringPolicyDto[]>(`${this.base}/scoring-policies`);
  }

  createScoringPolicy(data: Partial<ScoringPolicyDto>): Observable<ScoringPolicyDto> {
    return this.http.post<ScoringPolicyDto>(`${this.base}/scoring-policies`, data);
  }

  applyScoringPolicy(policyId: string, assessmentId: string): Observable<{ score: number }> {
    return this.http.post<{ score: number }>(`${this.base}/scoring-policies/${policyId}/apply/${assessmentId}`, {});
  }

  updateScoringPolicy(id: string, data: Partial<ScoringPolicyDto>): Observable<ScoringPolicyDto> {
    return this.http.put<ScoringPolicyDto>(`${this.base}/scoring-policies/${id}`, data);
  }

  deleteScoringPolicy(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/scoring-policies/${id}`);
  }

  // ═══ NCA ECC Self-Assessment ═══
  getNCAStructure(): Observable<NCAStructureDto> {
    return this.http.get<NCAStructureDto>(`${this.base}/nca-assessment/structure`);
  }

  listNCAAssessments(): Observable<NCAAssessmentDto[]> {
    return this.http.get<NCAAssessmentDto[]>(`${this.base}/nca-assessment`);
  }

  createNCAAssessment(data?: { title?: string }): Observable<NCAAssessmentDto> {
    return this.http.post<NCAAssessmentDto>(`${this.base}/nca-assessment`, data || {});
  }

  getNCAAssessment(id: string): Observable<NCAAssessmentDetailDto> {
    return this.http.get<NCAAssessmentDetailDto>(`${this.base}/nca-assessment/${id}`);
  }

  updateNCAItems(id: string, updates: Array<{ controlId: string; status: string; score: number }>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/nca-assessment/${id}/items`, { updates });
  }

  deleteNCAAssessment(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/nca-assessment/${id}`);
  }

  exportNCAAssessment(id: string, format: 'pdf' | 'excel' | 'html', lang?: string): string {
    const langParam = format === 'pdf' && lang ? `?lang=${lang}` : '';
    return `${this.base}/nca-assessment/${id}/export/${format}${langParam}`;
  }
}
