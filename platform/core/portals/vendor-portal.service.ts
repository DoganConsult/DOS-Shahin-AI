import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { StorageService } from '@app/blueprint/core/dos/shell/storage.service';

export interface VendorProfile {
  id?: string;
  vendorId?: string;
  name: string;
  category: string;
  riskTier: string;
  status?: string;
}

export interface ComplianceStatus {
  vendorId?: string;
  status?: 'compliant' | 'non_compliant' | 'pending';
  score?: number;
  lastAudit?: string;
  overallScore?: number;
  openQuestionnaires?: number;
  pendingActionItems?: number;
  engagementScore?: number;
  riskTier?: string;
  frameworkCoverage?: number;
  lastAssessmentDate?: string | null;
}

export interface QuestionnaireQuestion {
  text?: string;
  question?: string;
  textEn?: string;
}

export interface QuestionnaireResponse {
  answer?: string;
}

export interface Questionnaire {
  id?: string;
  questionnaireId?: string;
  vendorId?: string;
  title: string;
  status: 'draft' | 'sent' | 'submitted' | 'completed';
  dueDate?: string;
  questions?: Array<QuestionnaireQuestion | string>;
  responses?: Array<QuestionnaireResponse | string>;
}

export interface ActionItem {
  actionItemId: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  dueDate?: string;
  createdAt?: string;
}

export interface VendorDocument {
  documentId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy?: string;
  createdAt?: string;
}

export interface VendorMessage {
  messageId?: string;
  sender: string;
  senderRole?: string;
  senderType?: string;
  content: string;
  createdAt?: string;
}

export interface QuestionnaireListResponse {
  questionnaires: Questionnaire[];
  count: number;
}

export interface ActionItemListResponse {
  actionItems: ActionItem[];
  count: number;
}

export interface VendorDocumentListResponse {
  documents: VendorDocument[];
  count: number;
}

export interface VendorMessageListResponse {
  messages: VendorMessage[];
  count: number;
}

export interface SubmitQuestionnaireResponse {
  submitted: boolean;
  submissionId?: string;
}

@Injectable({ providedIn: 'root' })
export class VendorPortalService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);
  private readonly base = `${environment.apiUrl}/vendor-portal`;

  getVendorId(): string | null {
    return this.storage.get('externalUserId');
  }

  getProfile(): Observable<VendorProfile> {
    return this.http.get<VendorProfile>(`${this.vendorBasePath()}/profile`, this.authOptions());
  }

  getComplianceStatus(): Observable<ComplianceStatus> {
    return this.http.get<ComplianceStatus>(`${this.vendorBasePath()}/compliance-status`, this.authOptions());
  }

  getQuestionnaires(): Observable<QuestionnaireListResponse> {
    return this.http.get<QuestionnaireListResponse>(`${this.vendorBasePath()}/questionnaires`, this.authOptions());
  }

  respondToQuestionnaire(questionnaireId: string, responses: Array<{ answer: string }>): Observable<SubmitQuestionnaireResponse> {
    return this.http.post<SubmitQuestionnaireResponse>(
      `${this.vendorBasePath()}/questionnaires/${questionnaireId}/respond`,
      { responses },
      this.authOptions(),
    );
  }

  getActionItems(): Observable<ActionItemListResponse> {
    return this.http.get<ActionItemListResponse>(`${this.vendorBasePath()}/action-items`, this.authOptions());
  }

  updateActionItem(id: string, data: { status?: string }): Observable<ActionItem> {
    return this.http.put<ActionItem>(`${this.vendorBasePath()}/action-items/${id}`, data, this.authOptions());
  }

  getDocuments(): Observable<VendorDocumentListResponse> {
    return this.http.get<VendorDocumentListResponse>(`${this.vendorBasePath()}/documents`, this.authOptions());
  }

  uploadDocument(data: { fileName: string; fileType: string; fileSize: number }): Observable<VendorDocument> {
    return this.http.post<VendorDocument>(`${this.vendorBasePath()}/documents`, data, this.authOptions());
  }

  getMessages(): Observable<VendorMessageListResponse> {
    return this.http.get<VendorMessageListResponse>(`${this.vendorBasePath()}/messages`, this.authOptions());
  }

  sendMessage(content: string): Observable<VendorMessage> {
    return this.http.post<VendorMessage>(
      `${this.vendorBasePath()}/messages`,
      { subject: 'Vendor Portal Message', body: content },
      this.authOptions(),
    );
  }

  private vendorBasePath(): string {
    const vendorId = this.getVendorId() ?? '';
    return `${this.base}/${encodeURIComponent(vendorId)}`;
  }

  private authOptions(): { headers?: HttpHeaders } {
    const token = this.storage.get('scopedJwt');
    if (!token) {
      return {};
    }

    return {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
    };
  }
}
