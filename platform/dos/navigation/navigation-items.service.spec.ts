import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { NavigationItemsService } from './navigation-items.service';

describe('NavigationItemsService', () => {
  let service: NavigationItemsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(NavigationItemsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have items signal', () => {
    expect(service.items()).toBeDefined();
  });

  it('should have loading signal', () => {
    expect(typeof service.loading()).toBe('boolean');
  });

  it('should have error signal', () => {
    expect(service.error()).toBeDefined();
  });
});
