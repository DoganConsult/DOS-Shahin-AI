import { TestBed } from '@angular/core/testing';
import { SequencingEngineService } from './sequencing-engine.service';

describe('SequencingEngineService', () => {
  let service: SequencingEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SequencingEngineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have a context signal', () => {
    expect(service.context()).toBeDefined();
  });

  it('should update context', () => {
    service.updateContext({ role: 'admin' } as any);
    expect(service.context().role).toBe('admin');
  });

  it('should rank capabilities', () => {
    const caps = [
      { id: 'c1', tags: ['governance'], requiredRole: 'admin' },
      { id: 'c2', tags: ['risk'], requiredRole: 'viewer' },
    ];
    const scored = service.rankCapabilities(caps as any);
    expect(scored.length).toBe(2);
    expect(scored[0]).toHaveProperty('score');
  });

  it('should group scored capabilities by stage', () => {
    const caps = [
      { id: 'c1', tags: ['governance'], requiredRole: 'admin' },
    ];
    const scored = service.rankCapabilities(caps as any);
    const grouped = service.groupByStage(scored);
    expect(Array.isArray(grouped)).toBe(true);
  });
});
