import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { EventBusService } from './event-bus.service';

describe('EventBusService', () => {
  let service: EventBusService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(EventBusService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should emit events locally', (done) => {
    const testEvent = {
      eventId: 'evt-1',
      timestamp: new Date().toISOString(),
      eventType: 'test',
      source: 'test',
      payload: {},
    } as any;
    service.events$.subscribe(event => {
      expect(event.eventType).toBe('test');
      done();
    });
    service.emit(testEvent);
  });

  it('should publish events to backend', () => {
    service.publish({
      eventType: 'user.action',
      source: 'frontend',
      payload: { action: 'click' },
    } as any).subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/api/platform/events'));
    expect(req.request.method).toBe('POST');
    req.flush({ eventId: 'evt-2' });
  });

  it('should get recent events', () => {
    service.getRecent(10).subscribe(events => {
      expect(Array.isArray(events)).toBe(true);
    });
    const req = httpMock.expectOne(r => r.url.includes('/api/platform/events'));
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
