import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

export interface AGUIEvent {
  type: 'token' | 'tool_call' | 'progress' | 'approval' | 'artifact' | 'error' | 'complete' | 'subscription_confirmed';
  timestamp: string;
  agentId?: string;
  runId?: string;
  data: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class AgUiWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private params: { agentId?: string; runId?: string } = {};

  connected = signal(false);
  subscriptionId = signal<string | null>(null);

  events$ = new Subject<AGUIEvent>();
  tokens$ = new Subject<AGUIEvent>();
  toolCalls$ = new Subject<AGUIEvent>();
  progress$ = new Subject<AGUIEvent>();
  errors$ = new Subject<AGUIEvent>();

  connect(opts?: { agentId?: string; runId?: string; eventTypes?: string[] }): void {
    this.disconnect();
    this.params = opts || {};
    this.reconnectAttempts = 0;
    this.openConnection(opts);
  }

  disconnect(): void {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.reconnectAttempts = 0;
    if (this.ws) {
      this.ws.onclose = null;
      if (this.ws.readyState === WebSocket.OPEN) this.ws.close();
      this.ws = null;
    }
    this.connected.set(false);
    this.subscriptionId.set(null);
  }

  private openConnection(opts?: { agentId?: string; runId?: string; eventTypes?: string[] }): void {
    const loc = window.location;
    const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    const port = loc.port === '4200' ? '8081' : loc.port;
    const params = new URLSearchParams();
    if (opts?.agentId) params.set('agentId', opts.agentId);
    if (opts?.runId) params.set('runId', opts.runId);
    if (opts?.eventTypes?.length) params.set('eventTypes', opts.eventTypes.join(','));
    const qs = params.toString();
    const url = `${protocol}//${loc.hostname}:${port}/ag-ui/stream${qs ? '?' + qs : ''}`;

    try {
      this.ws = new WebSocket(url);
      this.ws.onopen = () => { this.connected.set(true); this.reconnectAttempts = 0; };
      this.ws.onmessage = (ev: MessageEvent) => this.handleMessage(ev);
      this.ws.onclose = () => { this.connected.set(false); this.ws = null; this.reconnect(); };
      this.ws.onerror = () => {};
    } catch {
      this.connected.set(false);
      this.reconnect();
    }
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= 5) return;
    const delay = Math.min(2000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.openConnection(this.params), delay);
  }

  private handleMessage(ev: MessageEvent): void {
    try {
      const event: AGUIEvent = JSON.parse(ev.data);
      if (event.type === 'subscription_confirmed') {
        this.subscriptionId.set((event as any).subscriptionId || null);
        return;
      }
      this.events$.next(event);
      if (event.type === 'token') this.tokens$.next(event);
      else if (event.type === 'tool_call') this.toolCalls$.next(event);
      else if (event.type === 'progress') this.progress$.next(event);
      else if (event.type === 'error') this.errors$.next(event);
    } catch { /* ignore parse errors */ }
  }
}
