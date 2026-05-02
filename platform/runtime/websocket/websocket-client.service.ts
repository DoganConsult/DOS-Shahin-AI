import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

export interface WSNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  read: boolean;
}

export interface WSWorkflowUpdate {
  workflowId: string;
  status: string;
  stepId?: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class WebSocketClientService {
  connected = signal(false);
  notifications$ = new Subject<WSNotification>();
  workflowUpdates$ = new Subject<WSWorkflowUpdate>();
}
