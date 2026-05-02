import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DestroyRef } from '@angular/core';
import { Subject } from 'rxjs';
import { NotificationStore, AppNotification } from './notification.store';
import { WebSocketService, WSEvent } from '@app/websocket';
import { ensurePlatform } from '../../../../products/shahin-ai/app/src/app/test-utils';

describe('NotificationStore — unread-count reactivity', () => {
  let store: NotificationStore;
  let httpMock: HttpTestingController;
  let notificationsSubject: Subject<WSEvent>;
  let reconnectedSubject: Subject<void>;

  beforeEach(() => {
    ensurePlatform();
    notificationsSubject = new Subject<WSEvent>();
    reconnectedSubject = new Subject<void>();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        NotificationStore,
        {
          provide: WebSocketService,
          useValue: {
            notifications$: notificationsSubject.asObservable(),
            reconnected$: reconnectedSubject.asObservable(),
            connected: { set: vi.fn() },
          },
        },
        {
          provide: DestroyRef,
          useValue: { onDestroy: vi.fn() },
        },
      ],
    });

    store = TestBed.inject(NotificationStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('starts with 0 unreadCount', () => {
    expect(store.unreadCount()).toBe(0);
    expect(store.hasUnread()).toBe(false);
  });

  describe('loadHistory', () => {
    it('sets notifications from API and computes unreadCount', () => {
      store.loadHistory();

      const req = httpMock.expectOne('/api/notifications');
      req.flush({
        notifications: [
          { id: 'n1', type: 'info', title: 'A', body: '', read: false, createdAt: '2026-01-01' },
          { id: 'n2', type: 'info', title: 'B', body: '', read: true, createdAt: '2026-01-02' },
          { id: 'n3', type: 'info', title: 'C', body: '', read: false, createdAt: '2026-01-03' },
        ],
      });

      expect(store.notifications()).toHaveLength(3);
      expect(store.unreadCount()).toBe(2);
      expect(store.hasUnread()).toBe(true);
      expect(store.loaded()).toBe(true);
    });

    it('does not load twice (idempotent)', () => {
      store.loadHistory();
      httpMock.expectOne('/api/notifications').flush({ notifications: [] });

      store.loadHistory();
      httpMock.expectNone('/api/notifications');
    });
  });

  describe('markRead', () => {
    it('marks single notification read and updates unreadCount', () => {
      store.loadHistory();
      httpMock.expectOne('/api/notifications').flush({
        notifications: [
          { id: 'n1', type: 'info', title: 'A', body: '', read: false, createdAt: '2026-01-01' },
          { id: 'n2', type: 'info', title: 'B', body: '', read: false, createdAt: '2026-01-02' },
        ],
      });

      expect(store.unreadCount()).toBe(2);

      store.markRead('n1');
      httpMock.expectOne('/api/notifications/n1/read');

      expect(store.unreadCount()).toBe(1);
      expect(store.notifications().find(n => n.id === 'n1')!.read).toBe(true);
    });
  });

  describe('markAllRead', () => {
    it('marks all notifications read and sets unreadCount to 0', () => {
      store.loadHistory();
      httpMock.expectOne('/api/notifications').flush({
        notifications: [
          { id: 'n1', type: 'info', title: 'A', body: '', read: false, createdAt: '2026-01-01' },
          { id: 'n2', type: 'info', title: 'B', body: '', read: false, createdAt: '2026-01-02' },
        ],
      });

      expect(store.unreadCount()).toBe(2);

      store.markAllRead();
      httpMock.expectOne('/api/notifications/mark-all-read');

      expect(store.unreadCount()).toBe(0);
      expect(store.hasUnread()).toBe(false);
    });
  });

  describe('clear', () => {
    it('resets notifications and loaded state', () => {
      store.loadHistory();
      httpMock.expectOne('/api/notifications').flush({
        notifications: [
          { id: 'n1', type: 'info', title: 'A', body: '', read: false, createdAt: '2026-01-01' },
        ],
      });

      expect(store.unreadCount()).toBe(1);

      store.clear();

      expect(store.notifications()).toHaveLength(0);
      expect(store.unreadCount()).toBe(0);
      expect(store.loaded()).toBe(false);
    });
  });

  describe('WebSocket push', () => {
    it('prepends incoming WS notification and increments unreadCount', () => {
      expect(store.unreadCount()).toBe(0);

      notificationsSubject.next({
        type: 'notification.created',
        data: { notificationId: 'ws-1', type: 'alert', title: 'WS Alert', body: 'test' },
        timestamp: '2026-01-05T00:00:00Z',
      });

      expect(store.notifications()).toHaveLength(1);
      expect(store.unreadCount()).toBe(1);
      expect(store.notifications()[0].id).toBe('ws-1');
      expect(store.notifications()[0].read).toBe(false);
    });
  });
});
